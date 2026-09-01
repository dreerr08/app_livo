export type ComboItem = { id: string; itemId: string; quantity: number; item: Product };

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  price: string;
  type: "AVULSO" | "COMBO";
  category?: string | null;
  isAvailable: boolean;
  comboItems?: ComboItem[];
};

export type DeliveryZone = {
  id: string;
  name: string;
  cepPrefixes: string[];
  fee: string;
  freeShippingThreshold: string | null;
  active: boolean;
};

export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "RECEIVED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "AWAITING_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "REFUSED" | "REFUNDED" | "CANCELLED";

export type Order = {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryMode: "DELIVERY" | "PICKUP";
  subtotal: string;
  deliveryFee: string;
  total: string;
  createdAt: string;
  items: { id: string; quantity: number; product: { name: string } }[];
  address?: { street: string; number: string; neighborhood: string; city: string } | null;
  customer: { name: string; phone: string };
  payments: { method: "PIX" | "CREDIT_CARD"; status: PaymentStatus }[];
};
