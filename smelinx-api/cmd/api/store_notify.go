package main

import (
	"context"
	"database/sql"
	"strings"
	"time"
)

type APINotification struct {
	ID          string    `json:"id"`
	APIID       string    `json:"api_id"`
	VersionID   string    `json:"version_id"`
	Type        string    `json:"type"` // deprecate | sunset
	ScheduledAt time.Time `json:"scheduled_at"`
	Status      string    `json:"status"` // pending | sent | canceled
	CreatedAt   time.Time `json:"created_at"`
}

func (s *Store) CreateNotification(ctx context.Context, apiID, versionID, typ string, when time.Time) (*APINotification, error) {
	id := newID()
	// store RFC3339 UTC so SQLite julianday() can parse
	whenRFC3339 := when.UTC().Format(time.RFC3339)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO notifications (id, api_id, version_id, type, scheduled_at, status)
		VALUES (?, ?, ?, ?, ?, 'pending')
	`, id, apiID, versionID, strings.ToLower(typ), whenRFC3339)
	if err != nil {
		return nil, err
	}
	return s.GetNotificationByID(ctx, id)
}

func (s *Store) GetNotificationByID(ctx context.Context, id string) (*APINotification, error) {
	var n APINotification
	err := s.db.QueryRowContext(ctx, `
		SELECT id, api_id, version_id, type, scheduled_at, status, created_at
		FROM notifications
		WHERE id = ?
	`, id).
		Scan(&n.ID, &n.APIID, &n.VersionID, &n.Type, &n.ScheduledAt, &n.Status, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

// Org-scoped list for one API.
func (s *Store) ListNotifications(ctx context.Context, apiID, orgID string) ([]APINotification, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT n.id, n.api_id, n.version_id, n.type, n.scheduled_at, n.status, n.created_at
		FROM notifications n
		JOIN apis a ON a.id = n.api_id
		WHERE n.api_id = ? AND a.org_id = ?
		ORDER BY datetime(n.scheduled_at) ASC, datetime(n.created_at) DESC
	`, apiID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []APINotification
	for rows.Next() {
		var n APINotification
		if err := rows.Scan(&n.ID, &n.APIID, &n.VersionID, &n.Type, &n.ScheduledAt, &n.Status, &n.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (s *Store) UpdateNotificationStatus(ctx context.Context, id, status string) (*APINotification, error) {
	_, err := s.db.ExecContext(ctx, `
		UPDATE notifications SET status = ? WHERE id = ?
	`, status, id)
	if err != nil {
		return nil, err
	}
	return s.GetNotificationByID(ctx, id)
}

// Payload used by the dispatcher: enrich with API + Version info & target email.
type dueNotification struct {
	NoteID       string
	APIID        string
	OrgID        string
	APIName      string
	VersionID    string
	Version      string
	Type         string
	ContactEmail sql.NullString
	DocsURL      sql.NullString
	BaseURL      sql.NullString
	ScheduledAt  time.Time
	Attempts     int
}

// ListDueNotifications returns "pending" notes whose scheduled_at <= now
// and (retry_after is null or <= now). limit guards each batch.
func (s *Store) ListDueNotifications(ctx context.Context, limit int) ([]dueNotification, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT
			n.id,
			a.id,
			a.org_id,
			a.name,
			v.id,
			v.version,
			n.type,
			a.contact_email,
			a.docs_url,
			a.base_url,
			n.scheduled_at,
			COALESCE(n.attempts, 0)
		FROM notifications n
		JOIN apis a ON a.id = n.api_id
		JOIN api_versions v ON v.id = n.version_id
		WHERE n.status = 'pending'
		  AND julianday(n.scheduled_at) <= julianday('now')
		  AND (n.retry_after IS NULL OR julianday(n.retry_after) <= julianday('now'))
		  AND a.deleted_at IS NULL
		  AND v.deleted_at IS NULL
		ORDER BY n.scheduled_at ASC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []dueNotification
	for rows.Next() {
		var d dueNotification
		if err := rows.Scan(
			&d.NoteID,
			&d.APIID,
			&d.OrgID,
			&d.APIName,
			&d.VersionID,
			&d.Version,
			&d.Type,
			&d.ContactEmail,
			&d.DocsURL,
			&d.BaseURL,
			&d.ScheduledAt,
			&d.Attempts,
		); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) MarkNotificationSent(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE notifications SET status = 'sent' WHERE id = ?`, id)
	return err
}

func (s *Store) ScheduleNotificationRetry(ctx context.Context, id string, next time.Time, attempts int, lastErr string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE notifications
		SET attempts = ?, retry_after = ?, last_error = ?
		WHERE id = ?
	`, attempts, next.UTC().Format(time.RFC3339), lastErr, id)
	return err
}

func (s *Store) AutoCancelNotification(ctx context.Context, id string, reason string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE notifications
		SET status = 'canceled', last_error = ?
		WHERE id = ?
	`, reason, id)
	return err
}
