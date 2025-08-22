// smelinx-api/cmd/api/store-api.go
package main

import (
	"context"
	"database/sql"
	"time"
)

type API struct {
	ID           string     `json:"id"`
	OrgID        string     `json:"org_id"`
	Name         string     `json:"name"`
	Description  string     `json:"description"`
	BaseURL      *string    `json:"base_url,omitempty"`
	DocsURL      *string    `json:"docs_url,omitempty"`
	ContactEmail *string    `json:"contact_email,omitempty"`
	OwnerTeam    *string    `json:"owner_team,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	DeletedAt    *time.Time `json:"-"`
}

func (s *Store) ListAPIs(ctx context.Context, orgID string) ([]API, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, org_id, name, COALESCE(description,''), base_url, docs_url, contact_email, owner_team, created_at, deleted_at
		FROM apis
		WHERE org_id = ? AND deleted_at IS NULL
		ORDER BY datetime(created_at) DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []API
	for rows.Next() {
		var a API
		var baseURL, docsURL, contactEmail, ownerTeam sql.NullString
		var deletedAt sql.NullTime
		if err := rows.Scan(
			&a.ID, &a.OrgID, &a.Name, &a.Description,
			&baseURL, &docsURL, &contactEmail, &ownerTeam,
			&a.CreatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}
		if baseURL.Valid {
			a.BaseURL = &baseURL.String
		}
		if docsURL.Valid {
			a.DocsURL = &docsURL.String
		}
		if contactEmail.Valid {
			a.ContactEmail = &contactEmail.String
		}
		if ownerTeam.Valid {
			a.OwnerTeam = &ownerTeam.String
		}
		if deletedAt.Valid {
			a.DeletedAt = &deletedAt.Time
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) CreateAPI(ctx context.Context, orgID, name, desc string, meta *APIMeta) (*API, error) {
	id := newID()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO apis (id, org_id, name, description, base_url, docs_url, contact_email, owner_team)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		id, orgID, name, desc,
		nullable(meta, func(m *APIMeta) any { return m.BaseURL }),
		nullable(meta, func(m *APIMeta) any { return m.DocsURL }),
		nullable(meta, func(m *APIMeta) any { return m.ContactEmail }),
		nullable(meta, func(m *APIMeta) any { return m.OwnerTeam }),
	)
	if err != nil {
		return nil, err
	}
	return s.GetAPIByID(ctx, id)
}

type APIMeta struct {
	BaseURL      *string
	DocsURL      *string
	ContactEmail *string
	OwnerTeam    *string
}

func nullable[T any](m *APIMeta, f func(*APIMeta) T) any {
	if m == nil {
		return nil
	}
	return f(m)
}

func (s *Store) GetAPIByID(ctx context.Context, id string) (*API, error) {
	var a API
	var baseURL, docsURL, contactEmail, ownerTeam sql.NullString
	var deletedAt sql.NullTime

	err := s.db.QueryRowContext(ctx, `
		SELECT id, org_id, name, COALESCE(description,''), base_url, docs_url, contact_email, owner_team, created_at, deleted_at
		FROM apis
		WHERE id = ?`, id).
		Scan(&a.ID, &a.OrgID, &a.Name, &a.Description,
			&baseURL, &docsURL, &contactEmail, &ownerTeam,
			&a.CreatedAt, &deletedAt)
	if err != nil {
		return nil, err
	}
	if baseURL.Valid {
		a.BaseURL = &baseURL.String
	}
	if docsURL.Valid {
		a.DocsURL = &docsURL.String
	}
	if contactEmail.Valid {
		a.ContactEmail = &contactEmail.String
	}
	if ownerTeam.Valid {
		a.OwnerTeam = &ownerTeam.String
	}
	if deletedAt.Valid {
		a.DeletedAt = &deletedAt.Time
	}
	return &a, nil
}

func (s *Store) UpdateAPI(ctx context.Context, id, name, desc string, meta *APIMeta) (*API, error) {
	_, err := s.db.ExecContext(ctx, `
		UPDATE apis
		SET name = ?, description = ?, base_url = ?, docs_url = ?, contact_email = ?, owner_team = ?
		WHERE id = ? AND deleted_at IS NULL`,
		name, desc,
		nullable(meta, func(m *APIMeta) any { return m.BaseURL }),
		nullable(meta, func(m *APIMeta) any { return m.DocsURL }),
		nullable(meta, func(m *APIMeta) any { return m.ContactEmail }),
		nullable(meta, func(m *APIMeta) any { return m.OwnerTeam }),
		id,
	)
	if err != nil {
		return nil, err
	}
	return s.GetAPIByID(ctx, id)
}

// Soft delete (keeps history; versions cascade via FK only if hard delete — so we keep soft here)
func (s *Store) DeleteAPI(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE apis SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`, id)
	return err
}
