# 1. Base image
FROM node:20-alpine

# 2. Create app directory
WORKDIR /app

# 3. Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# 4. Copy Prisma schema + migrations (🔥 IMPORTANT FIX)
COPY prisma ./prisma

# 5. Copy rest of the application
COPY . .

# 6. Generate Prisma Client
RUN npx prisma generate

# 7. Build NestJS app
RUN npm run build

# 8. Runtime command (IMPORTANT for migrations)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]d