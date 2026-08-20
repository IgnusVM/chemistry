FROM node:24-alpine

WORKDIR /app

# Prisma's driver-adapter mode (@prisma/adapter-pg) doesn't need the Rust
# query engine binary, but libc6-compat/openssl are cheap insurance on Alpine.
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
RUN npm ci

COPY . .

# DATABASE_URL is only needed here so `prisma generate`/build can resolve the
# schema; it never connects. The real value comes from the container env at
# runtime — see docker-compose.prod.yml.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# On startup: apply any pending migrations, upsert reference/help-article
# seed data (both scripts are upsert-based, safe to rerun every deploy),
# then start the app.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx prisma/seed-help.ts; npm start"]
