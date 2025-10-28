# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json tsconfig.base.json ./

# Copy workspace configuration
COPY apps ./apps
COPY libs ./libs

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Build all Nx applications and libraries
RUN npx nx run-many --target=build --all --prod

# Stage 2: Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    python3 \
    make \
    g++

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Create data directory with proper permissions
RUN mkdir -p /data && \
    chown -R nodejs:nodejs /data /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the API application
CMD ["node", "dist/apps/api/main.js"]
