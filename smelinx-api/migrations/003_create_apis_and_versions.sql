CREATE TABLE IF NOT EXISTS apis (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_versions (
    id TEXT PRIMARY KEY,
    api_id TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT CHECK(status IN ('active','deprecated','sunset')) NOT NULL DEFAULT 'active',
    sunset_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE
);
