package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

/* -------------------- request shapes -------------------- */

type createVersionReq struct {
	Version    string  `json:"version"`               // e.g. "v1"
	Status     string  `json:"status"`                // active | deprecated | sunset (default: active)
	SunsetDate *string `json:"sunset_date,omitempty"` // optional, "YYYY-MM-DD"
}

type updateVersionReq struct {
	Status     string  `json:"status"`                // active | deprecated | sunset
	SunsetDate *string `json:"sunset_date,omitempty"` // optional, "YYYY-MM-DD"
}

/* -------------------- helpers -------------------- */

func parseDatePtrYYYYMMDD(s *string) (*time.Time, error) {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", strings.TrimSpace(*s))
	if err != nil {
		return nil, err
	}
	return &t, nil
}

/* -------------------- handlers -------------------- */

// GET /apis/{id}/versions
func (a *AuthService) ListVersionsHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	apiID := chi.URLParam(r, "id")

	// org-scope check
	api, err := a.store.GetAPIByID(r.Context(), apiID)
	if err != nil || api.OrgID != claims.OrgID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	vers, err := a.store.ListVersions(r.Context(), apiID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list versions failed: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, vers)
}

// POST /apis/{id}/versions
func (a *AuthService) CreateVersionHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	apiID := chi.URLParam(r, "id")

	// org-scope check
	api, err := a.store.GetAPIByID(r.Context(), apiID)
	if err != nil || api.OrgID != claims.OrgID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	var req createVersionReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	ver := strings.TrimSpace(req.Version)
	if ver == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "version required"})
		return
	}

	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status == "" {
		status = "active"
	}
	if status != "active" && status != "deprecated" && status != "sunset" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid status"})
		return
	}

	sunsetTime, err := parseDatePtrYYYYMMDD(req.SunsetDate)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid sunset_date (YYYY-MM-DD)"})
		return
	}

	v, err := a.store.CreateVersion(r.Context(), apiID, ver, status, sunsetTime)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create version failed: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, v)
}

// PUT /versions/{versionID}
func (a *AuthService) UpdateVersionHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	versionID := chi.URLParam(r, "versionID")

	// load version + api to enforce org scope
	v, err := a.store.GetVersionByID(r.Context(), versionID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	api, err := a.store.GetAPIByID(r.Context(), v.APIID)
	if err != nil || api.OrgID != claims.OrgID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	var req updateVersionReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "active" && status != "deprecated" && status != "sunset" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid status"})
		return
	}
	sunsetTime, err := parseDatePtrYYYYMMDD(req.SunsetDate)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid sunset_date (YYYY-MM-DD)"})
		return
	}

	updated, err := a.store.UpdateVersionStatus(r.Context(), versionID, status, sunsetTime)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "update failed: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// DELETE /versions/{versionID}
func (a *AuthService) DeleteVersionHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	versionID := chi.URLParam(r, "versionID")

	// load version + api to enforce org scope
	v, err := a.store.GetVersionByID(r.Context(), versionID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	api, err := a.store.GetAPIByID(r.Context(), v.APIID)
	if err != nil || api.OrgID != claims.OrgID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if err := a.store.DeleteVersion(r.Context(), versionID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "delete failed: " + err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
