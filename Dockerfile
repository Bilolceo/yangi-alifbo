# Yangi alifbo: web ilova + REST API, bitta konteyner (on-premise)
#   docker build -t yangi-alifbo .
#   docker run -p 8080:8080 -e API_KEYS=maxfiy-kalit yangi-alifbo
FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/office/package.json packages/office/
COPY packages/cli/package.json packages/cli/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/word-addin/package.json apps/word-addin/
RUN npm ci --no-audit --no-fund
COPY packages packages
COPY apps apps
RUN npm run build -w apps/api && npm run build -w apps/web

FROM node:22-alpine
ENV NODE_ENV=production PORT=8080 STATIC_DIR=/app/web
WORKDIR /app
COPY --from=build /src/apps/api/dist/server.js ./server.js
COPY --from=build /src/apps/web/dist ./web
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/health || exit 1
CMD ["node", "server.js"]
