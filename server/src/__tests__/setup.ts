import { beforeEach, afterAll } from "vitest";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { fakePaymentProvider } from "../services/payment/fakePaymentProvider.js";

const TABLES = ["Payment", "OrderItem", "Order", "ComboItem", "Product", "DeliveryZone", "Address", "OtpCode", "Customer"];

// TRUNCATE é destrutivo — trava por segurança para nunca rodar contra o
// banco de dev/homolog/produção caso alguém esqueça o wrapper `npm test`.
if (env.NODE_ENV !== "test" || !env.DATABASE_URL.includes("test")) {
  throw new Error(
    "Testes recusaram rodar: NODE_ENV/DATABASE_URL não apontam para o banco de teste. Use `npm test` (não `vitest` direto)."
  );
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
  fakePaymentProvider.__reset();
});

afterAll(async () => {
  await prisma.$disconnect();
});
