# KiloDesktop UI Demo

Renderer-only Electron UI prototype for an AI manager workspace.

This demo is intentionally fixture-driven:

- deterministic scenarios
- no real filesystem execution
- no real terminal execution
- no real LSP backend
- no real cloud session backend

## Run

```bash
pnpm install
pnpm dev
```

## What The Demo Currently Does

### Core shell

- Dark-mode first UI
- Top bar with:
    - workspace selector pill (`Workspace: ...`)
    - policy/safety status chips
    - scenario picker (dev)
- Left workspace panel is integrated in layout (not floating)
- Left panel can be shown/collapsed from header
- Left panel is resizable

### Modes

- `Chat`
- `Assistant`
- `Orchestrator`

Assistant also supports:

- `Task` surface
- `Plan` surface

### Workspace + execution environment

- Workspace & Environment sheet from top-right workspace pill
- Environments:
    - `Local`
    - `Worktree` (sandbox copy semantics)
    - `Cloud` (placeholder session)
- Sandbox config UI:
    - exclusions
    - `.gitignore` / `.kilocodeignore` toggles
    - whitelist exceptions
    - preview + create/rebuild/reset progress simulation
- Cloud panel with connected/disconnected placeholder state
- Workspace and environment state persisted in localStorage

### Timeline + chat behavior

- Compact horizontal runtime graph at top of stream
- Optional expandable log (`Show log`)
- Timeline/chat stream focuses on AI-agent activity
- UI control changes (like environment switching) are not injected as agent chat events

### Arc-like glance/peek/pin

- Hover glance cards for inspectable items
- Click to open peek inspector
- Pin to right-side peek stack rail

### Workbench

- Stub tabs:
    - Diffs
    - Terminal
    - Problems
    - Files
    - Context
    - Browser
    - Providers
    - Agents
    - Specs
- Diff tab includes file tree + +/- badges + diff preview
- Browser tab includes inspect-to-source chip insertion

### Responsive behavior

- Wide: integrated left panel + side workbench when width allows
- Smaller widths: workbench falls back to footer panel
- Narrow: left panel becomes overlay

## Scenario Player (Dev)

Use the top-bar `Scenario` selector in dev mode:

- `chat_explain_code`
- `assistant_sandbox_setup`
- `orchestrator_subtasks_peek`

## Notes

- This is a UI prototype, not production backend behavior.
- Data and progress are deterministic fixtures for UX validation.
