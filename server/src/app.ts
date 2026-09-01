import path from "node:path";
import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { router } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

// CORS_ORIGIN aceita uma lista separada por vírgula, pois a mesma API
// serve dois front-ends em origens diferentes (app do cliente e painel).
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: allowedOrigins.includes("*") ? true : allowedOrigins,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true, env: env.NODE_ENV }));

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use(router);

  app.use(errorHandler);

  return app;
}
