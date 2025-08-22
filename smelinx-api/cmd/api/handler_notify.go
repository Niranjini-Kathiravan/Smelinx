package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

/* -------------------- request/response shapes -------------------- */

type createNotificationReq struct {
	VersionID   string `json:"version_id"`   // required
	Type        string `json:"type"`         // "deprecate" | "sunset"
	ScheduledAt string `json:"scheduled_at"` // RFC3339 or "2006-01-02" (local date) – required
}

type updateNotificationReq struct {
	Status string `json:"status"` // "pending" | "sent" | "canceled"
}

/* -------------------- small helpers -------------------- */

// deref returns the string value of a *string, or "" if nil.
func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// trimPtr returns strings.TrimSpace on a *string (safe if nil).
func trimPtr(p *string) string {
	return strings.TrimSpace(deref(p))
}

// parseWhen tries RFC3339 first, then YYYY-MM-DD (interpreted as 00:00:00 local).
func parseWhen(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, fmt.Errorf("scheduled_at required")
	}
	// Try RFC3339
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	// Try YYYY-MM-DD
	if d, err := time.Parse("2006-01-02", s); err == nil {
		return d, nil
	}
	return time.Time{}, fmt.Errorf("scheduled_at must be RFC3339 or YYYY-MM-DD")
}

/*
sendNotificationEmail is a compile-safe stub.

It logs what would be sent. Kept here for future direct-send use,
but the dispatcher is the source of truth for sending.
*/
func sendNotificationEmail(to, subject, _ string) error {
	to = strings.TrimSpace(to)
	if to == "" {
		log.Printf("[notify] no recipient email provided; skipping send")
		return nil
	}
	if os.Getenv("SENDGRID_API_KEY") == "" {
		log.Printf("[notify] SENDGRID_API_KEY not set; would send to %s | subject=%q", to, subject)
		return nil
	}
	log.Printf("[notify] (stub) email sent to %s | subject=%q", to, subject)
	return nil
}

/* -------------------- handlers -------------------- */

// GET /apis/{id}/notifications
func (a *AuthService) ListNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	apiID := chi.URLParam(r, "id")

	api, err := a.store.GetAPIByID(r.Context(), apiID)
	if err != nil || api.OrgID != claims.OrgID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	// FIX: parameter order (apiID, orgID)
	notes, err := a.store.ListNotifications(r.Context(), apiID, claims.OrgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list notifications failed: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, notes)
}

// POST /apis/{id}/notifications
func (a *AuthService) CreateNotificationHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	apiID := chi.URLParam(r, "id")

	api, err := a.store.GetAPIByID(r.Context(), apiID)
	if err != nil || api.OrgID != claims.OrgID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	var req createNotificationReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	req.Type = strings.ToLower(strings.TrimSpace(req.Type))
	if req.Type != "deprecate" && req.Type != "sunset" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "type must be 'deprecate' or 'sunset'"})
		return
	}
	versionID := strings.TrimSpace(req.VersionID)
	if versionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "version_id required"})
		return
	}
	when, err := parseWhen(req.ScheduledAt)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// org-scope check for the version
	v, err := a.store.GetVersionByID(r.Context(), versionID)
	if err != nil || v.APIID != apiID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	note, err := a.store.CreateNotification(r.Context(), apiID, versionID, req.Type, when)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create failed: " + err.Error()})
		return
	}

	// CHANGE: do NOT send here; let the background dispatcher send when due.
	// This avoids duplicate logic and respects centralized retry behavior.

	writeJSON(w, http.StatusCreated, note)
}

// PUT /notifications/{noteID}
func (a *AuthService) UpdateNotificationHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	noteID := chi.URLParam(r, "noteID")

	note, err := a.store.GetNotificationByID(r.Context(), noteID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	// Ensure the note's API is within the user's org
	api, err := a.store.GetAPIByID(r.Context(), note.APIID)
	if err != nil || api.OrgID != claims.OrgID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	var req updateNotificationReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "pending" && status != "sent" && status != "canceled" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "status must be pending|sent|canceled"})
		return
	}

	updated, err := a.store.UpdateNotificationStatus(r.Context(), noteID, status)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "update failed: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

/* -------------------- tiny helpers for email templating -------------------- */

func safeDash(s string) string {
	if strings.TrimSpace(s) == "" {
		return "—"
	}
	return s
}
