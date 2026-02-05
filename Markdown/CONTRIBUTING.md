# This document provides an overview for all who contribute to KiloDesktop.

## Branch Gate Strategy

KiloDesktop uses a three-tier branch gate system to ensure code quality and deployment stability:

### Development Flow

**Work-in-Progress Branches**

-   Any branch outside of the 3 main branches (`dev`, `prev`, `main`) represents work-in-progress, prototypes, and ideas
-   These branches have no special meaning and are for experimentation and feature development

**dev → prev → main**

1. **dev branch** - Current Development State

    - Collects work-in-progress features from feature branches
    - Reflects the current active development state
    - All feature branches should target `dev` for pull requests

2. **prev branch** - Staging Environment

    - Takes everything from `dev` branch that has passed initial checks
    - Generates preview deployments and publishes to the beta channel
    - Acts as a staging gate before production

3. **main branch** - Production Ready
    - Receives stable changes from `prev` branch
    - Should only contain thoroughly tested, stable code
    - Triggers production deployment when all checks pass on PR merge
    - Represents the stable/production state

### Deployment Pipeline

-   **dev** → CI checks only
-   **prev** → CI checks + preview deployment generation
-   **main** → CI checks + production deployment (on merge)

This ensures progressive stability validation as code moves through the development pipeline.

## Changesets & Releases

-   Changesets are required for PRs targeting `prev` or `main` **when files under `Project/**` change**.
-   PRs targeting `dev` do **not** require changesets.
-   The changelog lives in `Project/CHANGELOG.md` and is generated from changesets.
-   Stable releases are automated on `main` via version PRs created by Changesets.
-   Pre-releases are triggered by tags:
    -   `dev`: `vX.Y.Z-alpha.N` (alpha channel)
    -   `prev`: `vX.Y.Z-beta.N` (beta channel)

## Labels Guide

### Automation / CI Status

| Label Title | When to use it |

### Issue Types

| Label Title | When to use it |

### PR Scope / Areas

| Label Title | When to use it |

### Priority / Severity

| Label Title | When to use it |

### Status

| Label Title | When to use it |
