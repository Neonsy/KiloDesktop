CREATE TABLE worktrees (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workspace_fingerprint TEXT NOT NULL REFERENCES workspace_roots(fingerprint) ON DELETE CASCADE,
    branch TEXT NOT NULL,
    base_branch TEXT NOT NULL,
    absolute_path TEXT NOT NULL,
    path_key TEXT NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'missing', 'broken', 'removed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_worktrees_profile_path_key
    ON worktrees(profile_id, path_key);

CREATE UNIQUE INDEX idx_worktrees_profile_workspace_branch
    ON worktrees(profile_id, workspace_fingerprint, branch);

CREATE INDEX idx_worktrees_profile_workspace_updated_at
    ON worktrees(profile_id, workspace_fingerprint, updated_at DESC);

ALTER TABLE threads
    ADD COLUMN execution_environment_mode TEXT NOT NULL DEFAULT 'local';

ALTER TABLE threads
    ADD COLUMN execution_branch TEXT NULL;

ALTER TABLE threads
    ADD COLUMN base_branch TEXT NULL;

ALTER TABLE threads
    ADD COLUMN worktree_id TEXT NULL REFERENCES worktrees(id) ON DELETE SET NULL;

ALTER TABLE sessions
    ADD COLUMN worktree_id TEXT NULL REFERENCES worktrees(id) ON DELETE SET NULL;

ALTER TABLE checkpoints
    ADD COLUMN worktree_id TEXT NULL REFERENCES worktrees(id) ON DELETE SET NULL;

CREATE INDEX idx_threads_profile_worktree_updated_at
    ON threads(profile_id, worktree_id, updated_at DESC);

CREATE INDEX idx_sessions_profile_worktree_updated_at
    ON sessions(profile_id, worktree_id, updated_at DESC);
