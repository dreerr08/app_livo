import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import * as products from "../controllers/products.controller.js";
import * as customers from "../controllers/customers.controller.js";
import * as addresses from "../controllers/addresses.controller.js";
import * as deliveryZones from "../controllers/deliveryZones.controller.js";
import * as orders from "../controllers/orders.controller.js";
import * as webhooks from "../controllers/webhooks.controller.js";

export const router = Router();

// Produtos / combos (Épico 2, 11)
router.get("/products", asyncHandler(products.listProducts));
router.get("/products/:id", asyncHandler(products.getProduct));
router.post("/products", asyncHandler(products.createProduct));
router.put("/products/:id", asyncHandler(products.updateProduct));
router.patch("/products/:id/availability", asyncHandler(products.setAvailability));
router.delete("/products/:id", asyncHandler(products.deleteProduct));

// Clientes (Épico 4)
router.post("/customers", asyncHandler(customers.createCustomer));
router.get("/customers/:id", asyncHandler(customers.getCustomer));
router.get("/customers/:id/orders", asyncHandler(customers.listCustomerOrders));

// Endereços (Épico 5)
router.post("/addresses", asyncHandler(addresses.createAddress));
router.get("/customers/:customerId/addresses", asyncHandler(addresses.listCustomerAddresses));

// Zonas de entrega (Épico 5, 12)
router.get("/delivery-zones", asyncHandler(deliveryZones.listDeliveryZones));
router.post("/delivery-zones", asyncHandler(deliveryZones.createDeliveryZone));
router.put("/delivery-zones/:id", asyncHandler(deliveryZones.updateDeliveryZone));
router.get("/delivery-zones/quote", asyncHandler(deliveryZones.getDeliveryQuote));

// Pedidos (Épico 6, 7, 9)
router.post("/orders", asyncHandler(orders.createOrder));
router.get("/orders/queue", asyncHandler(orders.getKitchenQueue));
router.get("/orders/:id", asyncHandler(orders.getOrder));
router.patch("/orders/:id/status", asyncHandler(orders.updateOrderStatus));

// Webhook do gateway de pagamento (Épico 1)
router.post("/webhooks/mercadopago", asyncHandler(webhooks.mercadoPagoWebhook));
