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
      calories: 480,
      weightGrams: 400,
      ingredients: ["Frango", "Arroz", "Feijão", "Cenoura", "Brócolis"],
      isPublished: true,
    },
  });

  const carne = await prisma.product.create({
    data: {
      name: "Marmita Carne Moída",
      description: "Carne moída ao molho, arroz e purê",
      price: 23.9,
      type: "AVULSO",
      category: "tradicional",
      calories: 520,
      weightGrams: 420,
      ingredients: ["Carne moída", "Molho de tomate", "Arroz", "Batata", "Leite"],
      isPublished: true,
    },
  });

  const fit = await prisma.product.create({
    data: {
      name: "Marmita Fitness Frango",
      description: "Frango, batata doce e brócolis",
      price: 26.9,
      type: "AVULSO",
      category: "fitness",
      calories: 380,
      weightGrams: 350,
      ingredients: ["Frango", "Batata doce", "Brócolis", "Azeite"],
      isPublished: true,
    },
  });

  // Rascunho proposital: aparece só no painel, não no app do cliente,
  // para demonstrar o fluxo de publicação.
  await prisma.product.create({
    data: {
      name: "Marmita Vegana (em preparação)",
      description: "Ainda em teste de receita",
      price: 24.9,
      type: "AVULSO",
      category: "vegano",
      isPublished: false,
    },
  });

  await prisma.product.create({
    data: {
      name: "Combo Semana (5 marmitas)",
      description: "5 marmitas tradicionais para a semana toda",
      price: 99.9,
      type: "COMBO",
      category: "combo",
      isPublished: true,
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
