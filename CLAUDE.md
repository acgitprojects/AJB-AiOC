# AJB-AiOC

## Runtime: Bun everywhere

All build and dev tooling uses **Bun** — both services in Docker and locally.
`npm`/`node` are not used in any Dockerfile. Local dev still uses `tsx --watch` for api-server.

## Docker build context

Both services use the **repo root** as build context so they can access `contract/`.

```yaml
# docker-compose.yml
api-server: { context: .,  dockerfile: api-server/Dockerfile }
frontend:   { context: .,  dockerfile: frontend/Dockerfile   }
```

Any new service that depends on `@ajb/contract` must also use `context: .`.

## Workspace package.json rule

The root `package.json` declares all three workspaces (`contract`, `frontend`, `api-server`).
`bun install` errors if any workspace is missing its `package.json` in the build context.
**Always copy all three workspace `package.json` files before `bun install`:**

```dockerfile
COPY package.json ./
COPY contract/package.json ./contract/
COPY frontend/package.json ./frontend/
COPY api-server/package.json ./api-server/
RUN bun install --frozen-lockfile
```

## api-server Dockerfile (bun compile → single binary)

`bun build --compile` bundles TS + all deps into a self-contained binary.
Runtime image contains only the binary — no node_modules, no runtime to install.

```
builder:  oven/bun:alpine  →  bun build src/index.ts --compile --target=bun --outfile=dist/server
runtime:  oven/bun:alpine  →  COPY dist/server, CMD ["./server"]
```

`bun build --compile` resolves `@ajb/contract` automatically via `api-server/tsconfig.json` paths.

## frontend Dockerfile (bun install + next build → nginx)

```
builder:  oven/bun:alpine  →  bun install, cd frontend && bun run build
runtime:  nginx:alpine     →  /app/frontend/out → /usr/share/nginx/html
```

## @ajb/contract path alias

Both `api-server/tsconfig.json` and `frontend/tsconfig.json` map:
`"@ajb/contract": ["../contract/src/index.ts"]`

## Testing: no mocks — use the isolated Docker Compose test stack

**Never write mock-based unit tests for code that talks to external services** (databases, WebSocket servers, HTTP APIs, Docker). Mocks diverge from reality silently and catch nothing real.

Use the isolated Docker Compose test stack instead:
- `docker-compose.test.yml` overlays `docker-compose.yml` to create an isolated stack per test run
- E2E tests in `tests/e2e/` spin up real containers (postgres, api-server) and test against them
- When openclaw is absent the api-server must degrade gracefully — test that, not a mock

Unit tests (`api-server/tests/unit/`) are only appropriate for pure logic with no external I/O (e.g. password hashing, schema validation, pure data transforms).

## Stop hook: bun build + tsc

`.claude/hooks/validate-contract.sh` runs on every Stop event when `.ts`/`.tsx` files changed:

1. `bun build --compile` on api-server entry point → proves TS + deps compile to binary
2. `tsc --noEmit` on `contract/`, `api-server/`, `frontend/` → full type safety check

tsc binary: `node_modules/.bin/tsc` (root workspace — frontend node_modules are gitignored)
