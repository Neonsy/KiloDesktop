CREATE TABLE provider_secrets (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    secret_kind TEXT NOT NULL,
    secret_value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_provider_secrets_profile_provider_kind
    ON provider_secrets(profile_id, provider_id, secret_kind);
