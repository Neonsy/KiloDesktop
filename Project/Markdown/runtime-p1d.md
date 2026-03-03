# Runtime P1D: Kilo Parity Schema and Contract Completion

This document tracks the P1D implementation in `Project/electron`.

## What Was Added

1. New migration `004_p1d_kilo_parity.sql` adding parity tables:
    - `mode_definitions`
    - `rulesets`
    - `skillfiles`
    - `marketplace_packages`
    - `marketplace_assets`
    - `kilo_account_snapshots`
    - `kilo_org_snapshots`
    - `secret_references`
2. Runtime snapshot is now explicitly profile-scoped:
    - `runtime.getSnapshot({ profileId })`
    - no implicit default-profile fallback in snapshot paths
3. Runtime snapshot extended with read-only parity slices:
    - `modeDefinitions`
    - `rulesets`
    - `skillfiles`
    - `marketplacePackages`
    - `kiloAccountContext`
    - `secretReferences`
4. Added parity persistence stores:
    - `modeStore`
    - `rulesetStore`
    - `skillfileStore`
    - `marketplaceStore`
    - `accountSnapshotStore`
    - `secretReferenceStore`
5. Reset semantics upgraded:
    - `workspace` and `workspace_all` now include workspace-scoped `rulesets` and `skillfiles`
    - `profile_settings` now resets profile-scoped parity rows
    - `full` reset now includes all parity rows and marketplace rows
    - secret cleanup now uses `secret_references` entries instead of hardcoded provider keys
6. Baseline seeding expanded:
    - mode definitions for `chat`, `agent.*`, and `orchestrator.*`
    - default profile account snapshot seeded with `auth_state = logged_out`

## Breaking Changes

1. `runtime.getSnapshot()` was replaced with `runtime.getSnapshot({ profileId })`.
2. `RuntimeSnapshotV1` now includes parity slices listed above.
3. `RuntimeResetCounts` now includes parity-domain counters.

## Deferred

1. P2 provider transport/auth execution remains next after P1D.
2. No new end-user parity UI screen in P1D.
3. Cloud session implementation remains deferred to roadmap `P11`.
