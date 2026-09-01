import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { router } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true, env: env.NODE_ENV }));

  app.use(router);

  app.use(errorHandler);

  return app;
}
