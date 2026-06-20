# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Set DATABASE_URL for prisma generate (required by prisma.config.ts)
# .env is excluded via .dockerignore, so we set it here for the build
ENV DATABASE_URL="file:./data/nest-api.db"

RUN npx prisma generate

RUN npx nest build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

RUN mkdir -p /app/data

# better-sqlite3 is a native module - install build deps, compile, then remove them
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci --omit=dev

RUN apk del python3 make g++

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/src/main.js"]