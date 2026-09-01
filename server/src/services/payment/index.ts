import { env } from "../../env.js";
import { paymentProvider as mercadoPagoProvider } from "./mercadoPagoProvider.js";
import { fakePaymentProvider } from "./fakePaymentProvider.js";
import type { PaymentProvider } from "./paymentProvider.js";

// Em testes automatizados, nunca chamamos o gateway de verdade.
export const paymentProvider: PaymentProvider = env.NODE_ENV === "test" ? fakePaymentProvider : mercadoPagoProvider;
