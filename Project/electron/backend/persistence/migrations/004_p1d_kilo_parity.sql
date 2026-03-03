CREATE TABLE IF NOT EXISTS mode_definitions (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    top_level_tab TEXT NOT NULL,
    mode_key TEXT NOT NULL,
    label TEXT NOT NULL,
    prompt_json TEXT NOT NULL,
    execution_policy_json TEXT NOT NULL,
    source TEXT NOT NULL,
    enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mode_definitions_profile_tab_mode
    ON mode_definitions(profile_id, top_level_tab, mode_key);

CREATE TABLE IF NOT EXISTS rulesets (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workspace_fingerprint TEXT NULL,
    name TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    source TEXT NOT NULL,
    enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    precedence INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rulesets_profile_scope_name
    ON rulesets(profile_id, ifnull(workspace_fingerprint, ''), name);

CREATE INDEX IF NOT EXISTS idx_rulesets_workspace_fingerprint
    ON rulesets(workspace_fingerprint);

CREATE TABLE IF NOT EXISTS skillfiles (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workspace_fingerprint TEXT NULL,
    name TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    source TEXT NOT NULL,
    enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    precedence INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skillfiles_profile_scope_name
    ON skillfiles(profile_id, ifnull(workspace_fingerprint, ''), name);

CREATE INDEX IF NOT EXISTS idx_skillfiles_workspace_fingerprint
    ON skillfiles(workspace_fingerprint);

CREATE TABLE IF NOT EXISTS marketplace_packages (
    id TEXT PRIMARY KEY,
    package_kind TEXT NOT NULL,
    slug TEXT NOT NULL,
    version TEXT NOT NULL,
    enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    pinned INTEGER NOT NULL CHECK (pinned IN (0, 1)),
    source_json TEXT NOT NULL,
    installed_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_packages_kind_slug
    ON marketplace_packages(package_kind, slug);

CREATE TABLE IF NOT EXISTS marketplace_assets (
    package_id TEXT NOT NULL REFERENCES marketplace_packages(id) ON DELETE CASCADE,
    asset_kind TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (package_id, asset_kind, asset_id)
);

CREATE TABLE IF NOT EXISTS kilo_account_snapshots (
    profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    account_id TEXT NULL,
    display_name TEXT NOT NULL,
    email_masked TEXT NOT NULL,
    auth_state TEXT NOT NULL,
    token_expires_at TEXT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kilo_org_snapshots (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL CHECK (is_active IN (0, 1)),
    entitlement_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kilo_org_snapshots_profile_org
    ON kilo_org_snapshots(profile_id, organization_id);

CREATE TABLE IF NOT EXISTS secret_references (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL,
    secret_key_ref TEXT NOT NULL,
    secret_kind TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_secret_references_profile_provider_kind
    ON secret_references(profile_id, provider_id, secret_kind);
