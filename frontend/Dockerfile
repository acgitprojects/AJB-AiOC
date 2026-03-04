# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY package.json ./
COPY contract/package.json ./contract/
COPY frontend/package.json ./frontend/
COPY api-server/package.json ./api-server/

RUN bun install --frozen-lockfile

COPY contract/src ./contract/src
COPY frontend ./frontend

RUN cd frontend && bun run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/frontend/out /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
