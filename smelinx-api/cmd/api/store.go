package main

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

type Store struct{ db *sql.DB }

func NewStore(db *sql.DB) *Store { return &Store{db: db} }
func newID() string              { return uuid.New().String() }

type User struct {
	ID           string
	Email        string
	PasswordHash string
}
type Org struct {
	ID   string
	Name string
}

// Users/Orgs
func (s *Store) CreateUser(ctx context.Context, email, hash string) (*User, error) {
	id := newID()
	_, err := s.db.ExecContext(ctx, `INSERT INTO users (id,email,password_hash) VALUES (?,?,?)`, id, email, hash)
	if err != nil {
		return nil, err
	}
	return &User{ID: id, Email: email, PasswordHash: hash}, nil
}
func (s *Store) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := s.db.QueryRowContext(ctx, `SELECT id,email,password_hash FROM users WHERE email = ?`, email).
		Scan(&u.ID, &u.Email, &u.PasswordHash)
	if err != nil {
		return nil, err
	}
	return &u, nil
}
func (s *Store) CreateOrgWithOwner(ctx context.Context, name, ownerID string) (*Org, error) {
	oid := newID()
	if _, err := s.db.ExecContext(ctx, `INSERT INTO organizations (id,name) VALUES (?,?)`, oid, name); err != nil {
		return nil, err
	}
	if _, err := s.db.ExecContext(ctx, `INSERT INTO org_members (org_id,user_id,role) VALUES (?,?,?)`, oid, ownerID, "owner"); err != nil {
		return nil, err
	}
	return &Org{ID: oid, Name: name}, nil
}
func (s *Store) GetUserPrimaryOrg(ctx context.Context, uid string) (*Org, error) {
	var o Org
	err := s.db.QueryRowContext(ctx, `
		SELECT o.id,o.name
		FROM organizations o
		JOIN org_members m ON m.org_id=o.id
		WHERE m.user_id=? LIMIT 1`, uid).Scan(&o.ID, &o.Name)
	if err != nil {
		return nil, err
	}
	return &o, nil
}
