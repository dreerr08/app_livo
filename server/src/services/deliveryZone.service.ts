import { prisma } from "../prisma.js";

export type DeliveryQuote =
  | { inZone: true; zoneId: string; fee: number; freeShippingThreshold: number | null }
  | { inZone: false };

const onlyDigits = (cep: string) => cep.replace(/\D/g, "");

// Zona é definida por prefixos de CEP (ex: "013" cobre 01300-000 a 01399-999).
// Escolhe a zona com o prefixo mais específico (mais longo) que casar.
export async function quoteDelivery(cep: string): Promise<DeliveryQuote> {
  const cleanCep = onlyDigits(cep);
  const zones = await prisma.deliveryZone.findMany({ where: { active: true } });

  let best: { zone: (typeof zones)[number]; prefixLength: number } | null = null;
  for (const zone of zones) {
    for (const prefix of zone.cepPrefixes) {
      if (cleanCep.startsWith(prefix) && (!best || prefix.length > best.prefixLength)) {
        best = { zone, prefixLength: prefix.length };
      }
    }
  }

  if (!best) return { inZone: false };

  return {
    inZone: true,
    zoneId: best.zone.id,
    fee: Number(best.zone.fee),
    freeShippingThreshold: best.zone.freeShippingThreshold ? Number(best.zone.freeShippingThreshold) : null,
  };
}
