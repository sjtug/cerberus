# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cerberus is a Caddy plugin that protects open source infrastructure using sha256 PoW challenges. It's designed as an aggressive last-line defense against abusive traffic, diverging from Anubis by requiring frequent challenge solving.

## Development Commands

### Code Generation
Before developing, generate necessary Go files:
```bash
devenv tasks run go:codegen --mode before
```

### Building Web Assets
After modifying web assets:
```bash
devenv tasks run dist:build --mode before
```

### Testing
**Important**: Avoid using `devenv test` as it can timeout due to dependency downloads. Run tests separately:

```bash
# Run Go tests (fast, ~2 seconds)
go test ./...

# Run Playwright tests (requires Caddy build, can take several minutes on first run)
# Build Caddy if needed:
xcaddy build --with github.com/sjtug/cerberus=.
# Then run Playwright tests (Chromium only for faster execution):
cd web && pnpm exec playwright test --project=chromium
```

### Linting
```bash
devenv tasks run go:lint --mode before
```

### Testing Requirements
**Important**: When modifying or adding functionality:
1. Always run tests after changes to ensure existing functionality is not broken
2. Add or modify tests for the changed functionality:
   - For pure Go changes: Add/modify Go tests in corresponding `*_test.go` files
   - For UI or authentication flow changes: Add/modify Playwright tests in `web/tests/`
3. Ensure all tests pass before considering the task complete

## Architecture

### Module Structure
- **cerberus.go**: Main entry point that registers Caddy modules (App, Middleware, Endpoint) and loads i18n translations
- **core/**: Core functionality
  - `config.go`: Configuration and Ed25519 key management
  - `instance.go`: Shared singleton instance across Caddy runtime
  - `state.go`: Runtime state management with LRU caches for pending/blocked IPs and approvals
  - `pool.go`: Resource pooling utilities
- **directives/**: Caddy directive handlers
  - `app.go`: Global Caddy app that maintains the shared Instance
  - `middleware.go`: Main challenge middleware that validates cookies/tokens and invokes challenges
  - `endpoint.go`: Handles challenge answer verification and serves static files
  - `caddyfile.go`: Caddyfile parsing logic
- **internal/**: Internal utilities
  - `ipblock/`: IP prefix block handling for subnet-based blocking
  - `expiremap/`: TTL-based map implementation for nonce tracking
  - `randpool/`: Random number generation pool
- **web/**: Frontend assets (templates, JS, CSS) embedded via go:embed
  - `index.templ`: Go templ templates for server-side HTML generation
  - `js/main.mjs`: Core frontend logic for PoW solving, UI updates, and form submission
  - `js/pow.mjs`: WebAssembly loader for blake3 PoW computation
  - `js/pow.worker.js`: Web Worker for non-blocking PoW computation
  - `js/assets.mjs`: Ensures all images are included in Vite manifest
  - `tests/`: Playwright e2e tests for UI and auth flow
  - `vite.config.mjs`: Builds and bundles frontend assets with manifest
- **pow/**: Rust WASM module for blake3 PoW computation

### Key Design Patterns

1. **Singleton Instance**: One `core.Instance` shared across all middleware/endpoint handlers in the Caddy runtime via the global `App`
2. **State Management**: Three LRU caches (pending requests, blocked IPs, approvals) with TTL-based expiration
3. **Challenge Flow**:
   - Middleware checks cookie → validates JWT → verifies approval count → checks challenge fingerprint
   - If validation fails, generates new challenge with nonce/timestamp/signature
   - User solves PoW challenge → submits to Endpoint
   - Endpoint validates solution → issues approval ID → signs JWT cookie
4. **IP Blocking**: Tracks pending challenges per IP prefix block; blocks if exceeds `max_pending` threshold
5. **Nonce Reuse Prevention**: Tracks used nonces in expiring map with TTL
6. **Frontend Architecture**:
   - Server renders initial HTML with templ templates containing challenge parameters
   - JavaScript detects WebAssembly support and starts PoW computation in Web Worker
   - Progress updates shown via UI callbacks from worker
   - On solution found, auto-submits form to `/answer` endpoint
   - I18n support with MessageFormat for multiple languages

### Configuration Compatibility
When updating config via `Instance.UpdateWithConfig()`, state is reset only if incompatible (different TTLs, AccessPerApproval, MaxMemUsage, or PrefixCfg).

## Build Pipeline

- **master branch**: Source code only
- **dist branch**: Source + generated artifacts (for xcaddy consumption)

To release: Update `core/const.go` version → Run "Build and Update Dist Branch" GitHub Action with version tag.

## Development Environment

Uses devenv.nix with:
- Go (with templ for HTML templating)
- Rust toolchain (for WASM compilation)
- pnpm (for frontend builds)
- xcaddy (for building Caddy with plugin)
- playwright (for e2e tests)

### Timeout Considerations
When working with this codebase, be aware that:
- Commands involving dependency downloads or builds may timeout (default ~2-5 minutes)
- Use plain commands (e.g., `go test`) instead of devenv wrappers when possible
- For long-running operations (building Caddy, downloading dependencies), consider running in background mode
- Initial Playwright test runs require building Caddy with all dependencies, which can take 10+ minutes