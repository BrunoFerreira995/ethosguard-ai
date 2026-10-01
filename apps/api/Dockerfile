FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/package.json
RUN bun install --frozen-lockfile || bun install

COPY apps/api apps/api
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3102
CMD ["bun", "src/local.ts"]
