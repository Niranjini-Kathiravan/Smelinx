// smelinx-api/cmd/api/auth_service.go
package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

/* ---------------------------- types ---------------------------- */

type AuthService struct{ store *Store }

func NewAuthService(s *Store) *AuthService { return &AuthService{store: s} }

type jwtClaims struct {
	Sub   string `json:"sub"`
	OrgID string `json:"org_id"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

type ctxKeyUser struct{}

/* ---------------------------- helpers ---------------------------- */

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (a *AuthService) hashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

func (a *AuthService) parseToken(tok string) (jwtClaims, error) {
	var claims jwtClaims
	key := []byte(os.Getenv("JWT_SIGNING_KEY"))
	token, err := jwt.ParseWithClaims(tok, &claims, func(*jwt.Token) (any, error) { return key, nil })
	if err != nil || !token.Valid {
		return jwtClaims{}, errors.New("invalid token")
	}
	if iss := os.Getenv("JWT_ISSUER"); iss != "" && claims.Issuer != iss {
		return jwtClaims{}, errors.New("invalid issuer")
	}
	return claims, nil
}

func (a *AuthService) issueTokens(userID, orgID, role string) (string, string, error) {
	key := []byte(os.Getenv("JWT_SIGNING_KEY"))
	issuer := os.Getenv("JWT_ISSUER")
	ttlMin, _ := strconv.Atoi(getenv("JWT_ACCESS_TTL_MIN", "15"))
	ttlRefH, _ := strconv.Atoi(getenv("JWT_REFRESH_TTL_HR", "168"))
	now := time.Now()

	accessClaims := jwtClaims{
		Sub:   userID,
		OrgID: orgID,
		Role:  role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(ttlMin) * time.Minute)),
		},
	}
	refreshClaims := jwtClaims{
		Sub:   userID,
		OrgID: orgID,
		Role:  role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(ttlRefH) * time.Hour)),
		},
	}

	at, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(key)
	if err != nil {
		return "", "", err
	}
	rt, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(key)
	if err != nil {
		return "", "", err
	}
	return at, rt, nil
}

func (a *AuthService) setSessionCookies(w http.ResponseWriter, access, refresh string) {
	// Dev (localhost): Domain=localhost, SameSite=Lax, Secure=false so the web app (3000) and API (8080) can share cookies.
	// Prod (HTTPS): SameSite=None + Secure=true; Domain comes from COOKIE_DOMAIN if provided.
	isProd := os.Getenv("ENV") == "prod"

	var domain string
	var sameSite http.SameSite
	secure := false

	if isProd {
		domain = os.Getenv("COOKIE_DOMAIN") // e.g. ".smelinx.com" (optional)
		sameSite = http.SameSiteNoneMode
		secure = true
	} else {
		// dev defaults
		domain = "localhost"
		sameSite = http.SameSiteLaxMode
		secure = false
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    access,
		Path:     "/",
		Domain:   domain,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refresh,
		Path:     "/",
		Domain:   domain,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
	// Presence flag for Next.js middleware
	http.SetCookie(w, &http.Cookie{
		Name:     "smx",
		Value:    "1",
		Path:     "/",
		Domain:   domain,
		HttpOnly: false,
		Secure:   secure,
		SameSite: sameSite,
	})
}

func clearSessionCookies(w http.ResponseWriter) {
	// Mirror the domain logic for dev/prod when clearing
	isProd := os.Getenv("ENV") == "prod"
	domain := "localhost"
	if isProd {
		if d := os.Getenv("COOKIE_DOMAIN"); d != "" {
			domain = d
		} else {
			domain = "" // if not set in prod, clear without domain
		}
	}

	for _, n := range []string{"access_token", "refresh_token", "smx"} {
		http.SetCookie(w, &http.Cookie{
			Name:   n,
			Value:  "",
			Path:   "/",
			Domain: domain,
			MaxAge: -1,
		})
	}
}

/* ---------------------------- handlers ---------------------------- */

type signupReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	OrgName  string `json:"org_name"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a *AuthService) SignupHandler(w http.ResponseWriter, r *http.Request) {
	var req signupReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	if !validEmail(req.Email) || !strongPassword(req.Password) || len(strings.TrimSpace(req.OrgName)) < 2 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid input"})
		return
	}

	hash, _ := a.hashPassword(req.Password)
	u, err := a.store.CreateUser(r.Context(), strings.ToLower(strings.TrimSpace(req.Email)), hash)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user exists?"})
		return
	}

	org, err := a.store.CreateOrgWithOwner(r.Context(), strings.TrimSpace(req.OrgName), u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "org create failed"})
		return
	}

	// For security, signup does not auto-login. Tell client to login next.
	writeJSON(w, http.StatusCreated, map[string]any{
		"message": "account created; please sign in",
		"user_id": u.ID, "org_id": org.ID, "role": "owner",
	})
}

func (a *AuthService) LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	u, err := a.store.GetUserByEmail(r.Context(), strings.ToLower(strings.TrimSpace(req.Email)))
	if err != nil || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)) != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	org, err := a.store.GetUserPrimaryOrg(r.Context(), u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "no org for user"})
		return
	}

	at, rt, err := a.issueTokens(u.ID, org.ID, "owner")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token issue failed"})
		return
	}
	a.setSessionCookies(w, at, rt)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *AuthService) RefreshHandler(w http.ResponseWriter, r *http.Request) {
	rc, err := r.Cookie("refresh_token")
	if err != nil || rc.Value == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no refresh token"})
		return
	}
	claims, err := a.parseToken(rc.Value)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid refresh"})
		return
	}

	at, rt, err := a.issueTokens(claims.Sub, claims.OrgID, claims.Role)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token issue failed"})
		return
	}
	a.setSessionCookies(w, at, rt)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *AuthService) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	clearSessionCookies(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *AuthService) MeHandler(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	writeJSON(w, http.StatusOK, map[string]any{"user_id": claims.Sub, "org_id": claims.OrgID, "role": claims.Role})
}

/* ---------------------------- middleware ---------------------------- */

func (a *AuthService) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("access_token")
		if err != nil || c.Value == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		claims, err := a.parseToken(c.Value)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), ctxKeyUser{}, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

/* ---------------------------- validation ---------------------------- */

func validEmail(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) < 6 || len(s) > 254 {
		return false
	}
	at := strings.IndexByte(s, '@')
	dot := strings.LastIndexByte(s, '.')
	return at > 0 && dot > at+1 && dot < len(s)-1
}

func strongPassword(s string) bool {
	if len(s) < 8 {
		return false
	}
	hasNum, hasLet := false, false
	for _, r := range s {
		if r >= '0' && r <= '9' {
			hasNum = true
		}
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			hasLet = true
		}
	}
	return hasNum && hasLet
}
