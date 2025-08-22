// smelinx-api/cmd/api/handler-api.go
package main

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

type createAPIReq struct {
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	BaseURL      *string `json:"base_url,omitempty"`
	DocsURL      *string `json:"docs_url,omitempty"`
	ContactEmail *string `json:"contact_email,omitempty"`
	OwnerTeam    *string `json:"owner_team,omitempty"`
}

type updateAPIReq struct {
	Name         *string `json:"name"`
	Description  *string `json:"description"`
	BaseURL      *string `json:"base_url,omitempty"`
	DocsURL      *string `json:"docs_url,omitempty"`
	ContactEmail *string `json:"contact_email,omitempty"`
	OwnerTeam    *string `json:"owner_team,omitempty"`
}

// List APIs (org-scoped)
func (a *AuthService) ListAPIsHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	apis, err := a.store.ListAPIs(r.Context(), claims.OrgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list failed: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, apis)
}

// Create API
func (a *AuthService) CreateAPIHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)

	var req createAPIReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name required"})
		return
	}
	if req.ContactEmail != nil && !validEmail(*req.ContactEmail) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid contact_email"})
		return
	}

	api, err := a.store.CreateAPI(r.Context(), claims.OrgID, req.Name, req.Description, &APIMeta{
		BaseURL:      req.BaseURL,
		DocsURL:      req.DocsURL,
		ContactEmail: req.ContactEmail,
		OwnerTeam:    req.OwnerTeam,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create failed"})
		return
	}
	writeJSON(w, http.StatusCreated, api)
}

// Get one API by ID (org scoped)
func (a *AuthService) GetAPIHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	id := chi.URLParam(r, "id")

	api, err := a.store.GetAPIByID(r.Context(), id)
	if err != nil || api.OrgID != claims.OrgID || api.DeletedAt != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, api)
}

// Update API (org scoped)
func (a *AuthService) UpdateAPIHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	id := chi.URLParam(r, "id")

	current, err := a.store.GetAPIByID(r.Context(), id)
	if err != nil || current.OrgID != claims.OrgID || current.DeletedAt != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	var req updateAPIReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	if req.ContactEmail != nil && !validEmail(*req.ContactEmail) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid contact_email"})
		return
	}

	newName := current.Name
	newDesc := current.Description
	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		newName = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		newDesc = *req.Description
	}

	meta := &APIMeta{
		BaseURL:      coalescePtr(current.BaseURL, req.BaseURL),
		DocsURL:      coalescePtr(current.DocsURL, req.DocsURL),
		ContactEmail: coalescePtr(current.ContactEmail, req.ContactEmail),
		OwnerTeam:    coalescePtr(current.OwnerTeam, req.OwnerTeam),
	}

	updated, err := a.store.UpdateAPI(r.Context(), id, newName, newDesc, meta)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "update failed"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// Delete API (soft delete)
func (a *AuthService) DeleteAPIHandler(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(ctxKeyUser{}).(jwtClaims)
	id := chi.URLParam(r, "id")

	api, err := a.store.GetAPIByID(r.Context(), id)
	if err != nil || api.OrgID != claims.OrgID || api.DeletedAt != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err := a.store.DeleteAPI(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "delete failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// coalescePtr returns b if provided (even if empty string), otherwise a.
func coalescePtr(a, b *string) *string {
	if b != nil {
		return b
	}
	return a
}
