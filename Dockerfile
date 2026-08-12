# Stage 1: Build stage
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY src ./src

RUN npm ci
RUN npx prisma generate
RUN npm run build

# Stage 2: Test runner stage
FROM builder AS tester
COPY jest.config.json ./
COPY test ./test
ENV DATABASE_URL="file::memory:?cache=shared"
RUN npx prisma migrate deploy && npm test

# Stage 3: Production runner stage
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma.config.ts ./

# Install production dependencies only, skip postinstall (prisma generate not available without devDeps)
RUN npm ci --omit=dev --ignore-scripts

# Copy pre-compiled query engine binary from builder (generated for linux-musl/Alpine Linux target)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/build ./build
COPY --from=builder /app/src/prisma ./src/prisma

EXPOSE 8000
CMD ["sh", "-c", "npx prisma migrate deploy && node build/main.js"]
