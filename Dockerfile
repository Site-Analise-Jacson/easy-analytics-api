# ===============================
# Etapa 1 - Build
# ===============================
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Instala Chromium e dependências
RUN apt-get update && apt-get install -y \
    libnss3 \
    libxss1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libatspi2.0-0 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Instala pnpm
RUN npm install -g pnpm

# Copia manifestos de dependências
COPY pnpm-lock.yaml package.json ./

# Instala todas as dependências (dev + prod)
RUN pnpm install --frozen-lockfile

# Copia código e Prisma schema
COPY . .

# Gera Prisma Client
RUN pnpm prisma generate

# Build do projeto
RUN pnpm run build

# ===============================
# Etapa 2 - Produção
# ===============================
FROM node:20-bullseye-slim AS production

WORKDIR /app

# Instala Chromium e pnpm
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libxss1 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

# Copia arquivos necessários
COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/ ./node_modules/

EXPOSE 3000
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
