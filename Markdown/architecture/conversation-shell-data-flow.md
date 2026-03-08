# Conversation Shell Data Flow

The conversation shell is a composition layer, not the place for business logic.

## Responsibilities

- `shell.tsx` composes the sidebar, workspace panels, composer, and tab state.
- `shell/useConversationShellQueries.ts` owns query creation for shell-level data.
- `shell/useConversationShellRefetch.ts` owns the explicit query groups that may be refetched after known mutation boundaries.
- `shell/useConversationShellWorkspaceActions.ts` owns workspace- and permission-oriented mutation flows that need coordinated refetch behavior.
- `hooks/` own feature-specific UI state such as composer state, edit flow, and session actions.

## Freshness Rules

- Runtime events are the primary freshness mechanism.
- Manual refetch is allowed only at explicit mutation boundaries where the renderer must pull updated lists immediately.
- Shell refetches are grouped by intent:
  - `refetchThreadChrome`: sidebar and shell-wide chrome
  - `refetchSessionIndex`: session list and thread row state
  - `refetchSessionWorkspace`: session timeline and run workspace
  - `refetchPlanWorkspace`: plan/orchestrator surfaces

## Why This Shape Exists

- Query ownership stays discoverable in one place.
- Mutation handlers can request a named refresh group instead of assembling ad hoc refetch chains.
- The shell remains readable because view composition is separated from data invalidation policy.
