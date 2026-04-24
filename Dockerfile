# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apk update && apk add openssl

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npx tsc

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install openssl for Prisma in production
RUN apk update && apk add openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production
RUN npx prisma@5 generate

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000

# Start script
CMD ["node", "dist/index.js"]
