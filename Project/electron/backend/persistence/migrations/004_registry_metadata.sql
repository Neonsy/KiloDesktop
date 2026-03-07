ALTER TABLE mode_definitions ADD COLUMN asset_key TEXT NOT NULL DEFAULT '';
ALTER TABLE mode_definitions ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'system_seed';
ALTER TABLE mode_definitions ADD COLUMN scope TEXT NOT NULL DEFAULT 'system';
ALTER TABLE mode_definitions ADD COLUMN workspace_fingerprint TEXT NULL;
ALTER TABLE mode_definitions ADD COLUMN origin_path TEXT NULL;
ALTER TABLE mode_definitions ADD COLUMN description TEXT NULL;
ALTER TABLE mode_definitions ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE mode_definitions ADD COLUMN precedence INTEGER NOT NULL DEFAULT 0;

UPDATE mode_definitions
SET asset_key = mode_key
WHERE asset_key = '';

ALTER TABLE rulesets ADD COLUMN asset_key TEXT NOT NULL DEFAULT '';
ALTER TABLE rulesets ADD COLUMN scope TEXT NOT NULL DEFAULT 'workspace';
ALTER TABLE rulesets ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'session_override';
ALTER TABLE rulesets ADD COLUMN origin_path TEXT NULL;
ALTER TABLE rulesets ADD COLUMN description TEXT NULL;
ALTER TABLE rulesets ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';

UPDATE rulesets
SET
    asset_key = lower(replace(name, ' ', '_')),
    scope = CASE
        WHEN workspace_fingerprint IS NULL THEN 'global'
        ELSE 'workspace'
    END,
    source_kind = CASE
        WHEN source = 'system' THEN 'system_seed'
        WHEN workspace_fingerprint IS NULL THEN 'global_file'
        ELSE 'workspace_file'
    END
WHERE asset_key = '';

ALTER TABLE skillfiles ADD COLUMN asset_key TEXT NOT NULL DEFAULT '';
ALTER TABLE skillfiles ADD COLUMN scope TEXT NOT NULL DEFAULT 'workspace';
ALTER TABLE skillfiles ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'session_override';
ALTER TABLE skillfiles ADD COLUMN origin_path TEXT NULL;
ALTER TABLE skillfiles ADD COLUMN description TEXT NULL;
ALTER TABLE skillfiles ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';

UPDATE skillfiles
SET
    asset_key = lower(replace(name, ' ', '_')),
    scope = CASE
        WHEN workspace_fingerprint IS NULL THEN 'global'
        ELSE 'workspace'
    END,
    source_kind = CASE
        WHEN source = 'system' THEN 'system_seed'
        WHEN workspace_fingerprint IS NULL THEN 'global_file'
        ELSE 'workspace_file'
    END
WHERE asset_key = '';

CREATE INDEX idx_mode_definitions_profile_tab_scope ON mode_definitions(profile_id, top_level_tab, scope, workspace_fingerprint);
CREATE INDEX idx_rulesets_profile_scope ON rulesets(profile_id, scope, workspace_fingerprint);
CREATE INDEX idx_skillfiles_profile_scope ON skillfiles(profile_id, scope, workspace_fingerprint);
