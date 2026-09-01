export type ComboItem = { id: string; quantity: number; item: Product };

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  price: string;
  type: "AVULSO" | "COMBO";
  category?: string | null;
  calories?: number | null;
  weightGrams?: number | null;
  ingredients: string[];
  isAvailable: boolean;
  comboItems?: ComboItem[];
};

export type Customer = { id: string; name: string; phone: string; email?: string | null };

export type Address = {
  id: string;
  label?: string | null;
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
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

export type Payment = {
  id: string;
  method: "PIX" | "CREDIT_CARD";
  status: PaymentStatus;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  pixCopyPaste?: string | null;
};

export type OrderItem = { id: string; productId: string; quantity: number; unitPrice: string; subtotal: string; product: Product };

export type Order = {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryMode: "DELIVERY" | "PICKUP";
  subtotal: string;
  deliveryFee: string;
  total: string;
  items: OrderItem[];
  address?: Address | null;
  payments: Payment[];
  createdAt: string;
};
