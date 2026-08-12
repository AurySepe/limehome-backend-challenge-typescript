# Stage 1: Build stage
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY src ./src

# Install build tools needed to compile sqlite3 native addon
RUN apk add --no-cache python3 make g++ py3-setuptools
RUN npm ci
RUN npx prisma generate
RUN npm run build

## Stage 2: Test runner stage
FROM builder AS tester
COPY jest.config.json ./
COPY test ./test
ENV DATABASE_URL="file:./test.db" 
RUN npx prisma migrate deploy && npm test && touch /tests-passed

# Stage 3: Prune stage (crea i node_modules per la produzione)
FROM builder AS pruner
RUN npm prune --omit=dev

# Stage 4: Production runner stage
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma.config.ts ./

# Copiamo i node_modules dal pruner, non dal builder!
COPY --from=pruner /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/src/prisma ./src/prisma

# Import test gate marker: forces Docker BuildKit to execute the tester stage.
COPY --from=tester /tests-passed /tests-passed

EXPOSE 8000
CMD ["sh", "-c", "npx prisma migrate deploy && node build/main.js"]