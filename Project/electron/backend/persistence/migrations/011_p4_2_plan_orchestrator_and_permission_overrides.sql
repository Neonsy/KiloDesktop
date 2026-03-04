CREATE TABLE IF NOT EXISTS plan_records (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    top_level_tab TEXT NOT NULL CHECK (top_level_tab IN ('chat', 'agent', 'orchestrator')),
    mode_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('awaiting_answers', 'draft', 'approved', 'implementing', 'implemented', 'failed', 'cancelled')),
    source_prompt TEXT NOT NULL,
    summary_markdown TEXT NOT NULL,
    questions_json TEXT NOT NULL DEFAULT '[]',
    answers_json TEXT NOT NULL DEFAULT '{}',
    workspace_fingerprint TEXT NULL,
    implementation_run_id TEXT NULL,
    orchestrator_run_id TEXT NULL,
    approved_at TEXT NULL,
    implemented_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(implementation_run_id) REFERENCES runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_records_profile_session
    ON plan_records(profile_id, session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS plan_items (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'aborted')),
    run_id TEXT NULL,
    error_message TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(plan_id) REFERENCES plan_records(id) ON DELETE CASCADE,
    FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_items_plan_sequence
    ON plan_items(plan_id, sequence);

CREATE TABLE IF NOT EXISTS orchestrator_runs (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'aborted', 'failed')),
    active_step_index INTEGER NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT NULL,
    aborted_at TEXT NULL,
    error_message TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(plan_id) REFERENCES plan_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_profile_session
    ON orchestrator_runs(profile_id, session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS orchestrator_steps (
    id TEXT PRIMARY KEY,
    orchestrator_run_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'aborted')),
    run_id TEXT NULL,
    error_message TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(orchestrator_run_id) REFERENCES orchestrator_runs(id) ON DELETE CASCADE,
    FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orchestrator_steps_run_sequence
    ON orchestrator_steps(orchestrator_run_id, sequence);

CREATE TABLE IF NOT EXISTS permission_policy_overrides (
    profile_id TEXT NOT NULL,
    scope_key TEXT NOT NULL,
    resource TEXT NOT NULL,
    policy TEXT NOT NULL CHECK (policy IN ('ask', 'allow', 'deny')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (profile_id, scope_key, resource)
);

CREATE INDEX IF NOT EXISTS idx_permission_policy_overrides_scope
    ON permission_policy_overrides(profile_id, scope_key);
