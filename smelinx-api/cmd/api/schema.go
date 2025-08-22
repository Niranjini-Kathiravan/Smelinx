package main

import (
	"database/sql"
	"log"
)

func runMigrations(db *sql.DB) {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT (datetime('now'))
		);`,
		`CREATE TABLE IF NOT EXISTS organizations (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT (datetime('now'))
		);`,
		`CREATE TABLE IF NOT EXISTS org_members (
			org_id  TEXT NOT NULL,
			user_id TEXT NOT NULL,
			role    TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
			PRIMARY KEY (org_id, user_id),
			FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS apis (
			id          TEXT PRIMARY KEY,
			org_id      TEXT NOT NULL,
			name        TEXT NOT NULL,
			description TEXT,
			created_at  TIMESTAMP NOT NULL DEFAULT (datetime('now')),
			deleted_at  TIMESTAMP,
			FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS api_versions (
			id           TEXT PRIMARY KEY,
			api_id       TEXT NOT NULL,
			version      TEXT NOT NULL,
			status       TEXT NOT NULL CHECK (status IN ('active','deprecated','sunset')) DEFAULT 'active',
			sunset_date  DATE,
			created_at   TIMESTAMP NOT NULL DEFAULT (datetime('now')),
			deleted_at   TIMESTAMP,
			UNIQUE (api_id, version),
			FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE
		);`,
		// notifications table
		`CREATE TABLE IF NOT EXISTS notifications (
			id            TEXT PRIMARY KEY,
			api_id        TEXT NOT NULL,
			version_id    TEXT NOT NULL,
			type          TEXT NOT NULL CHECK (type IN ('deprecate','sunset')),
			scheduled_at  TIMESTAMP NOT NULL,
			status        TEXT NOT NULL CHECK (status IN ('pending','sent','canceled')) DEFAULT 'pending',
			created_at    TIMESTAMP NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE,
			FOREIGN KEY (version_id) REFERENCES api_versions(id) ON DELETE CASCADE
		);`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			log.Fatalf("migration failed: %v", err)
		}
	}

	// Optional nullable columns on apis (safe add if missing)
	addColumnIfMissing(db, "apis", "base_url", "base_url TEXT")
	addColumnIfMissing(db, "apis", "docs_url", "docs_url TEXT")
	addColumnIfMissing(db, "apis", "contact_email", "contact_email TEXT")
	addColumnIfMissing(db, "apis", "owner_team", "owner_team TEXT")

	// Reliability columns on notifications (safe add if missing)
	addColumnIfMissing(db, "notifications", "attempts", "attempts INTEGER NOT NULL DEFAULT 0")
	addColumnIfMissing(db, "notifications", "retry_after", "retry_after TIMESTAMP")
	addColumnIfMissing(db, "notifications", "last_error", "last_error TEXT")
}

// SQLite helper: add column if it does not exist
func addColumnIfMissing(db *sql.DB, table, col, decl string) {
	var name string
	row := db.QueryRow(`SELECT name FROM pragma_table_info('`+table+`') WHERE name = ?`, col)
	_ = row.Scan(&name)
	if name == col {
		return // already exists
	}
	_, err := db.Exec(`ALTER TABLE ` + table + ` ADD COLUMN ` + decl)
	if err != nil {
		log.Printf("[migrations] add column failed for %s.%s: %v", table, col, err)
	}
}
