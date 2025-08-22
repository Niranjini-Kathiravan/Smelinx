package main

import (
	"context"
	"database/sql"
	"time"
)

type APIVersion struct {
	ID         string     `json:"id"`
	APIID      string     `json:"api_id"`
	Version    string     `json:"version"`
	Status     string     `json:"status"`                // active | deprecated | sunset
	SunsetDate *time.Time `json:"sunset_date,omitempty"` // nullable
	CreatedAt  time.Time  `json:"created_at"`
}

func (s *Store) ListVersions(ctx context.Context, apiID string) ([]APIVersion, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, api_id, version, status, sunset_date, created_at
		FROM api_versions
		WHERE api_id = ?
		ORDER BY created_at DESC`, apiID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []APIVersion
	for rows.Next() {
		var v APIVersion
		var sd sql.NullTime
		if err := rows.Scan(&v.ID, &v.APIID, &v.Version, &v.Status, &sd, &v.CreatedAt); err != nil {
			return nil, err
		}
		if sd.Valid {
			v.SunsetDate = &sd.Time
		}
		out = append(out, v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *Store) CreateVersion(ctx context.Context, apiID, version, status string, sunset *time.Time) (*APIVersion, error) {
	id := newID()
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO api_versions (id, api_id, version, status, sunset_date)
		VALUES (?, ?, ?, ?, ?)`,
		id, apiID, version, status, sunset); err != nil {
		return nil, err
	}
	return s.GetVersionByID(ctx, id)
}

func (s *Store) GetVersionByID(ctx context.Context, id string) (*APIVersion, error) {
	var v APIVersion
	var sd sql.NullTime
	err := s.db.QueryRowContext(ctx, `
		SELECT id, api_id, version, status, sunset_date, created_at
		FROM api_versions WHERE id = ?`, id).
		Scan(&v.ID, &v.APIID, &v.Version, &v.Status, &sd, &v.CreatedAt)
	if err != nil {
		return nil, err
	}
	if sd.Valid {
		v.SunsetDate = &sd.Time
	}
	return &v, nil
}

func (s *Store) UpdateVersionStatus(ctx context.Context, id, status string, sunset *time.Time) (*APIVersion, error) {
	if _, err := s.db.ExecContext(ctx, `
		UPDATE api_versions
		SET status = ?, sunset_date = ?
		WHERE id = ?`, status, sunset, id); err != nil {
		return nil, err
	}
	return s.GetVersionByID(ctx, id)
}

func (s *Store) DeleteVersion(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM api_versions WHERE id = ?`, id)
	return err
}
