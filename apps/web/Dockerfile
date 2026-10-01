FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile || bun install

FROM deps AS builder
WORKDIR /app
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3102
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN bun --cwd apps/web build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3101
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3101
CMD ["bun", "apps/web/server.js"]

