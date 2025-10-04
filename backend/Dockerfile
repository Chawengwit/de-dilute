# ==============================
# Build stage
# ==============================
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (production only)
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

# (Optional) timezone/ca-certificates ถ้าต้อง
# RUN apk add --no-cache tzdata ca-certificates

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy node_modules & source & package files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Expose container port (Render จะตั้ง PORT runtime เอง)
EXPOSE 3000

# Healthcheck ไปยัง /api/health
# ใช้ $PORT ถ้ามี (Render จะตั้งให้) มิฉะนั้น fallback 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD sh -c 'curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1'

CMD ["node", "src/server.js"]
