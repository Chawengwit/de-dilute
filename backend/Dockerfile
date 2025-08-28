# ==============================
# Build stage
# ==============================
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# ==============================
# Production stage
# ==============================
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules & source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "src/server.js"]
