# Provider Metadata Adapter Onboarding

Use this checklist when adding a new provider metadata adapter.

1. Implement `ProviderMetadataAdapter` in `providers/metadata/adapters.ts`.
2. Choose catalog strategy:
    - `kilo`: dynamic provider API discovery.
    - non-kilo: static registry via `providers/metadata/staticCatalog`.
3. Return `ProviderCatalogSyncResult` with model entries and raw snapshots.
4. Run through `ProviderMetadataOrchestrator` only (no provider-specific sync bypass).
5. Add or update conformance tests under `providers/metadata/__tests__`.
6. Add scoped overrides only for verified upstream gaps, with reason and timestamp.
7. Verify:
    - `pnpm --dir Project run lint`
    - `pnpm --dir Project run typecheck`
    - `pnpm --dir Project run test`
