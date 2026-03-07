DROP INDEX IF EXISTS idx_mode_definitions_profile_tab_mode;
DROP INDEX IF EXISTS idx_rulesets_profile_scope_name;
DROP INDEX IF EXISTS idx_skillfiles_profile_scope_name;

CREATE UNIQUE INDEX idx_mode_definitions_profile_registry_asset
    ON mode_definitions(profile_id, top_level_tab, scope, ifnull(workspace_fingerprint, ''), asset_key);

CREATE UNIQUE INDEX idx_rulesets_profile_registry_asset
    ON rulesets(profile_id, scope, ifnull(workspace_fingerprint, ''), asset_key);

CREATE UNIQUE INDEX idx_skillfiles_profile_registry_asset
    ON skillfiles(profile_id, scope, ifnull(workspace_fingerprint, ''), asset_key);
