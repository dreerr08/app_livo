import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth, optionalAuth } from "../middlewares/requireAuth.js";
import * as auth from "../controllers/auth.controller.js";
import * as products from "../controllers/products.controller.js";
import * as customers from "../controllers/customers.controller.js";
import * as addresses from "../controllers/addresses.controller.js";
import * as deliveryZones from "../controllers/deliveryZones.controller.js";
import * as orders from "../controllers/orders.controller.js";
import * as webhooks from "../controllers/webhooks.controller.js";

export const router = Router();

// Autenticação (Épico 4)
router.post("/auth/otp/request", asyncHandler(auth.requestOtp));
router.post("/auth/otp/verify", asyncHandler(auth.verifyOtp));

// Produtos / combos (Épico 2, 11)
router.get("/products", asyncHandler(products.listProducts));
router.get("/products/:id", asyncHandler(products.getProduct));
router.post("/products", asyncHandler(products.createProduct));
router.put("/products/:id", asyncHandler(products.updateProduct));
router.patch("/products/:id/availability", asyncHandler(products.setAvailability));
router.delete("/products/:id", asyncHandler(products.deleteProduct));

// Cliente autenticado (Épico 4, 8)
router.get("/me", requireAuth, asyncHandler(customers.getMe));
router.get("/me/orders", requireAuth, asyncHandler(customers.listMyOrders));

// Endereços (Épico 5) — sempre do cliente autenticado
router.post("/addresses", requireAuth, asyncHandler(addresses.createAddress));
router.get("/me/addresses", requireAuth, asyncHandler(addresses.listMyAddresses));
router.delete("/addresses/:id", requireAuth, asyncHandler(addresses.deleteAddress));

// Zonas de entrega (Épico 5, 12)
router.get("/delivery-zones", asyncHandler(deliveryZones.listDeliveryZones));
router.post("/delivery-zones", asyncHandler(deliveryZones.createDeliveryZone));
router.put("/delivery-zones/:id", asyncHandler(deliveryZones.updateDeliveryZone));
router.get("/delivery-zones/quote", asyncHandler(deliveryZones.getDeliveryQuote));

// Pedidos (Épico 3, 6, 7, 9, 10)
router.post("/orders/quote", asyncHandler(orders.quoteOrder));
router.post("/orders", requireAuth, asyncHandler(orders.createOrder));
router.get("/orders/queue", asyncHandler(orders.getKitchenQueue));
router.get("/orders/pending-payment", asyncHandler(orders.getPendingPaymentOrders));
router.get("/orders/:id", optionalAuth, asyncHandler(orders.getOrder));
router.patch("/orders/:id/status", asyncHandler(orders.updateOrderStatus));

// Webhook do gateway de pagamento (Épico 1)
router.post("/webhooks/mercadopago", asyncHandler(webhooks.mercadoPagoWebhook));
