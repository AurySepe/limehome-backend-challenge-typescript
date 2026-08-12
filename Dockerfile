FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma.config.ts ./
COPY src/prisma src/prisma
RUN npm ci
EXPOSE 8000
CMD ["sh", "-c", "npx prisma db push && npx tsx watch src/server.ts"]
