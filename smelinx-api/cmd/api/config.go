package main

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	_ "modernc.org/sqlite"
)

func loadConfig() {
	_ = godotenv.Load()
	if os.Getenv("SQLITE_PATH") == "" {
		_ = os.Setenv("SQLITE_PATH", "./data/smelinx.db")
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func mustOpenDB() *sql.DB {
	path := os.Getenv("SQLITE_PATH")
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Fatalf("mkdir data dir: %v", err)
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		log.Fatalf("open sqlite: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("ping sqlite: %v", err)
	}
	runMigrations(db)
	return db
}
