import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const frango = await prisma.product.create({
    data: {
      name: "Marmita Frango Grelhado",
      description: "Frango grelhado, arroz, feijão e legumes",
      price: 22.9,
      type: "AVULSO",
      category: "tradicional",
    },
  });

  const carne = await prisma.product.create({
    data: {
      name: "Marmita Carne Moída",
      description: "Carne moída ao molho, arroz e purê",
      price: 23.9,
      type: "AVULSO",
      category: "tradicional",
    },
  });

  const fit = await prisma.product.create({
    data: {
      name: "Marmita Fitness Frango",
      description: "Frango, batata doce e brócolis",
      price: 26.9,
      type: "AVULSO",
      category: "fitness",
    },
  });

  await prisma.product.create({
    data: {
      name: "Combo Semana (5 marmitas)",
      description: "5 marmitas tradicionais para a semana toda",
      price: 99.9,
      type: "COMBO",
      category: "combo",
      comboItems: {
        create: [
          { itemId: frango.id, quantity: 3 },
          { itemId: carne.id, quantity: 2 },
        ],
      },
    },
  });

  await prisma.deliveryZone.create({
    data: {
      name: "Centro",
      cepPrefixes: ["01310", "01311", "01312"],
      fee: 8.0,
      freeShippingThreshold: 80.0,
    },
  });

  console.log("Seed concluído:", { frango: frango.id, carne: carne.id, fit: fit.id });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
