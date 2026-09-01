import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./env.js";
import { initSocket } from "./sockets/io.js";

const app = createApp();
const httpServer = createServer(app);

initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`[app-livo] servidor rodando na porta ${env.PORT} (${env.NODE_ENV})`);
});
