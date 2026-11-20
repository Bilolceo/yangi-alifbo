const options = {
  type: "object",
  additionalProperties: false,
  properties: {
    from: { type: "string", enum: ["auto", "latin", "cyrillic"], default: "auto" },
    normalizeTutuq: { type: "boolean", default: true },
    protectForeign: { type: "boolean", default: true },
    protectedWords: { type: "array", items: { type: "string" } },
    exceptions: { type: "array", items: { type: "string" }, example: ["is|hoq"] },
    insertTutuq: { type: "boolean", default: true },
    protectSpecial: { type: "boolean", default: true },
  },
};

const warning = {
  type: "object",
  properties: {
    start: { type: "integer" },
    end: { type: "integer" },
    word: { type: "string" },
    reason: { type: "string", enum: ["foreign", "protected", "exception"] },
  },
};

const result = {
  type: "object",
  properties: {
    text: { type: "string" },
    changes: { type: "integer", description: "Oʻzgargan soʻzlar soni" },
    warnings: { type: "array", items: warning },
  },
};

const error = { type: "object", properties: { error: { type: "string" } } };
const errors = {
  400: { description: "Notoʻgʻri soʻrov", content: { "application/json": { schema: error } } },
  401: { description: "API kalit yoʻq" },
  403: { description: "API kalit notoʻgʻri" },
  413: { description: "Soʻrov juda katta" },
};

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Yangi alifbo API",
    version: "0.1.0",
    description:
      "Eski oʻzbek lotin (1995) va kirill yozuvidagi matn va hujjatlarni 2026-yilgi yangi lotin alifbosiga (OʻRQ-1184) oʻgirish.",
  },
  components: {
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer" },
      apiKey: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
  },
  security: [{ bearer: [] }, { apiKey: [] }],
  paths: {
    "/health": {
      get: { summary: "Holat", security: [], responses: { 200: { description: "OK" } } },
    },
    "/v1/convert": {
      post: {
        summary: "Matnni oʻgirish (bitta yoki toʻplam)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: { type: "string", example: "Oʻzbekiston Respublikasi, Toshkent shahri" },
                  texts: { type: "array", items: { type: "string" }, maxItems: 1000 },
                  direction: { type: "string", enum: ["new", "old"], default: "new" },
                  options,
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Natija (`text` yuborilsa — bitta obyekt, `texts` — `results` massivi)",
            content: {
              "application/json": {
                schema: { oneOf: [result, { type: "object", properties: { results: { type: "array", items: result } } }] },
              },
            },
          },
          ...errors,
        },
      },
    },
    "/v1/convert/file": {
      post: {
        summary: "Faylni oʻgirish (DOCX, XLSX, PPTX, TXT, CSV, MD, HTML, JSON, XML, SRT)",
        description: "Soʻrov tanasi — faylning oʻzi (binary). Javob — oʻgirilgan fayl.",
        parameters: [
          { name: "filename", in: "query", required: true, schema: { type: "string" }, example: "buyruq.docx" },
          { name: "options", in: "query", required: false, schema: { type: "string" }, description: "JSON koʻrinishidagi sozlamalar" },
        ],
        requestBody: { required: true, content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } },
        responses: {
          200: {
            description: "Oʻgirilgan fayl. Sarlavhalar: X-Words-Changed, X-Warnings",
            content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } },
          },
          415: { description: "Format qoʻllab-quvvatlanmaydi" },
          422: { description: "Fayl shikastlangan" },
          ...errors,
        },
      },
    },
    "/v1/normalize": {
      post: {
        summary: "Qidiruv uchun kanonik shakl (oʻzbek, o'zbek, ўзбек → özbek)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { text: { type: "string" }, texts: { type: "array", items: { type: "string" } } } } } },
        },
        responses: { 200: { description: "OK" }, ...errors },
      },
    },
    "/v1/detect": {
      post: {
        summary: "Yozuvni aniqlash",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { text: { type: "string" } } } } } },
        responses: {
          200: {
            description: "OK",
            content: { "application/json": { schema: { type: "object", properties: { script: { type: "string", enum: ["cyrillic", "latin-old", "latin-new", "mixed", "unknown"] } } } } },
          },
          ...errors,
        },
      },
    },
  },
};
