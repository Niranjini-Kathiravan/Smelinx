package main

import (
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	loadConfig()
	db := mustOpenDB()
	store := NewStore(db)
	auth := NewAuthService(store)

	// --- Mailer wiring ---
	var mailer Mailer
	sgKey := getenv("SENDGRID_API_KEY", "")
	sgFrom := getenv("SENDGRID_FROM", "")
	if sgKey != "" && sgFrom != "" {
		m, err := NewSendGridMailer()
		if err != nil {
			log.Printf("[mailer] sendgrid init failed: %v; falling back to console", err)
			mailer = consoleMailer{}
		} else {
			log.Printf("[mailer] using SendGrid sender")
			mailer = m
		}
	} else {
		log.Printf("[mailer] SENDGRID_API_KEY/SENDGRID_FROM not set; using console sender")
		mailer = consoleMailer{}
	}

	// Start background dispatcher
	startNotificationDispatcher(store, mailer)

	// --- HTTP router ---
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(middleware.StripSlashes)

	// Security headers
	r.Use(securityHeaders())

	// Simple IP rate limiter (60 req/min per IP)
	r.Use(rateLimit(60, time.Minute))

	// CORS for Next.js dev
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Set-Cookie"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"name":"Smelinx API","status":"running"}`))
	})
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })

	// Public auth
	r.Route("/auth", func(r chi.Router) {
		r.Post("/signup", auth.SignupHandler)
		r.Post("/login", auth.LoginHandler)
		r.Post("/refresh", auth.RefreshHandler)
		r.Post("/logout", auth.LogoutHandler)
	})

	// Protected
	r.Group(func(r chi.Router) {
		r.Use(auth.AuthMiddleware)

		r.Get("/me", auth.MeHandler)

		// APIs collection
		r.Get("/apis", auth.ListAPIsHandler)
		r.Post("/apis", auth.CreateAPIHandler)

		// APIs item + nested resources
		r.Route("/apis/{id}", func(r chi.Router) {
			r.Get("/", auth.GetAPIHandler)
			r.Put("/", auth.UpdateAPIHandler)
			r.Delete("/", auth.DeleteAPIHandler)

			// Versions (nested)
			r.Get("/versions", auth.ListVersionsHandler)
			r.Post("/versions", auth.CreateVersionHandler)

			// Notifications (nested under API)
			r.Get("/notifications", auth.ListNotificationsHandler)
			r.Post("/notifications", auth.CreateNotificationHandler)
		})

		// Version item
		r.Put("/versions/{versionID}", auth.UpdateVersionHandler)
		r.Delete("/versions/{versionID}", auth.DeleteVersionHandler)

		// Notification item
		r.Put("/notifications/{noteID}", auth.UpdateNotificationHandler)
	})

	addr := ":" + getenv("PORT", "8080")
	log.Printf("API listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}

// ---------- middlewares ----------

// Basic security headers (adjust CSP as needed)
func securityHeaders() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "no-referrer")
			// For local dev CSP is permissive; tighten for prod domains.
			w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:8080 http://127.0.0.1:8080")
			next.ServeHTTP(w, r)
		})
	}
}

// Simple fixed-window IP rate limiter
func rateLimit(max int, per time.Duration) func(http.Handler) http.Handler {
	type bucket struct {
		count int
		reset time.Time
	}
	var (
		mu   sync.Mutex
		data = make(map[string]*bucket)
	)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			now := time.Now()
			mu.Lock()
			b, ok := data[ip]
			if !ok || now.After(b.reset) {
				b = &bucket{count: 0, reset: now.Add(per)}
				data[ip] = b
			}
			b.count++
			remain := max - b.count
			resetSecs := int(b.reset.Sub(now).Seconds())
			mu.Unlock()

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(max))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remain))
			w.Header().Set("X-RateLimit-Reset", strconv.Itoa(resetSecs))

			if b.count > max {
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	// Trust X-Forwarded-For first if present (behind proxy), else RemoteAddr
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
