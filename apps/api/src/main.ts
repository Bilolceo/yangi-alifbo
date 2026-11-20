import { createServer, VERSION } from "./server.js";

const env = process.env;
const port = Number(env.PORT ?? 8080);
const apiKeys = (env.API_KEYS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const server = createServer({
  apiKeys,
  maxBody: Number(env.MAX_BODY_MB ?? 25) * 1024 * 1024,
  corsOrigin: env.CORS_ORIGIN || undefined,
  maxBatch: Number(env.MAX_BATCH ?? 1000),
  staticDir: env.STATIC_DIR || undefined,
});

server.requestTimeout = 60_000;
server.listen(port, () => {
  console.log(`Yangi alifbo API v${VERSION} — http://0.0.0.0:${port}`);
  if (!apiKeys.length) console.warn("⚠ API_KEYS oʻrnatilmagan — autentifikatsiya oʻchirilgan (faqat ichki tarmoq uchun).");
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
