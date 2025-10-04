# ==============================
# Build stage
# ==============================
FROM node:20-alpine AS builder
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# ==============================
# Production stage
# ==============================
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Tools for healthcheck + TLS certs
RUN apk add --no-cache curl ca-certificates

# Copy production node_modules and source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Expose container port (Render sets $PORT at runtime)
EXPOSE 3000

# Healthcheck to /api/health (use $PORT if provided)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD sh -c 'curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1'

CMD ["node", "src/server.js"]
