# Workspace Execution and Effective Workspace Resolution

The app separates conversation lineage from execution environment.

## Core Terms

- `workspaceFingerprint`: stable identity for the base workspace
- `worktreeId`: optional managed execution overlay for agent/orchestrator runs
- `ResolvedWorkspaceContext`: backend-owned result that tells runtime code whether execution is:
  - detached
  - base workspace
  - managed worktree

## Rules

- `chat` uses conversation branches only. It does not get filesystem authority.
- `agent` and `orchestrator` can execute in either the base workspace or a managed worktree.
- Runtime services must resolve the effective workspace context before touching the filesystem.
- Tool execution, registry workspace discovery, diff capture, checkpoint rollback, and shell execution all use the resolved effective path, not raw thread metadata.

## Why It Matters

- The UI can talk about conversation branches and execution environments without overloading the same term.
- Safety policy, permissions, diffs, checkpoints, and worktrees all depend on one backend authority for path resolution.
- Worktree support stays consistent because runtime code does not guess which path is active.
