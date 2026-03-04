# ── Stage 1: Compile ──────────────────────────────────────────────────────────
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY contract/package.json ./contract/
COPY frontend/package.json ./frontend/
COPY api-server/package.json ./api-server/

RUN bun install --frozen-lockfile

COPY contract/src ./contract/src
COPY api-server/src ./api-server/src
COPY api-server/tsconfig.json ./api-server/tsconfig.json

# Compile TypeScript + all dependencies into a single standalone binary
RUN cd api-server && bun build src/index.ts \
      --compile \
      --target=bun \
      --outfile=dist/server

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM oven/bun:alpine AS runtime
WORKDIR /app

COPY --from=builder /app/api-server/dist/server ./server

EXPOSE 3001
CMD ["./server"]
