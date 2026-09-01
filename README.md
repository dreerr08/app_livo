# App LIVO — Marmitas Congeladas

Sistema de pedidos com duas portas de entrada (app do cliente + painel do
restaurante) sobre um banco de dados único. Pedido pago cai em tempo real
na fila do restaurante.

Status atual: **Épico 0 (Backend, API e tempo real) + Épico 1 (Integração
de pagamento)** implementados. Próximas fases seguem o backlog de produto.

## Arquitetura (monorepo)

```
server/   API única (Node + Express + TypeScript + Prisma + PostgreSQL)
          + WebSocket (Socket.io) + integração Mercado Pago (Pix/cartão)
client/   App do cliente — Next.js (PWA, mobile-first)
admin/    Painel do restaurante — React + Vite (desktop)
```

Um único backend serve os dois front-ends. O painel recebe pedidos pagos
em tempo real via WebSocket (sala `restaurant`, eventos `order:created` e
`order:updated`).

## Modelo de dados

`Customer`, `Address`, `DeliveryZone`, `Product` (avulso ou combo fixo via
`ComboItem`), `Order`, `OrderItem`, `Payment` — ver `server/prisma/schema.prisma`.

Regra central: um pedido nasce em `AWAITING_PAYMENT` e só entra na fila de
preparo (`RECEIVED`) quando o pagamento é confirmado — nunca antes.

## Pagamento (Mercado Pago)

- Pix: gera QR Code + copia-e-cola no checkout; confirmação via webhook
  (`POST /webhooks/mercadopago`) atualiza o pedido para pago em segundos.
- Cartão de crédito: captura síncrona, com tratamento de recusa.
- `payment.gatewayPaymentId` é o `payment_id` rastreável no gateway.
- A integração fica atrás da interface `PaymentProvider`
  (`server/src/services/payment/`), para trocar de gateway sem mexer no
  resto do sistema.

## Rodando localmente

### 1. Banco de dados

```bash
docker compose up -d
```

### 2. Backend

```bash
cd server
cp .env.example .env   # preencha MERCADOPAGO_ACCESS_TOKEN de teste
npm install
npm run prisma:migrate
npm run seed
npm run dev             # http://localhost:3333
```

Para o webhook do Mercado Pago funcionar localmente, exponha o backend
com um túnel (ex: `ngrok http 3333`) e configure `PUBLIC_BASE_URL` com a
URL pública gerada.

### 3. App do cliente

```bash
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:3000
```

### 4. Painel do restaurante

```bash
cd admin
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Testes automatizados

O backend tem uma suíte de testes de integração (Vitest + Supertest) que
sobe a API de verdade contra um banco Postgres de teste, usando um
provedor de pagamento fake (sem chamar o Mercado Pago). Cobre as regras
de negócio centrais: pedido só entra na fila após pagamento, CEP fora da
zona bloqueia entrega, item esgotado bloqueia pedido, cliente não vê
pedido de outro cliente, fluxo completo de Pix (criação → webhook →
fila → transição de status), cartão aprovado/recusado, login por OTP.

```bash
cd server
npm run test:migrate   # aplica as migrations no banco app_livo_test (server/.env.test)
npm test
```

Roda automaticamente no GitHub Actions a cada push (`.github/workflows/test.yml`),
junto com o typecheck do client e do admin.

## Ambientes

`NODE_ENV` distingue `development` / `homolog` / `production`. Use bancos
de dados e credenciais do Mercado Pago **diferentes** em cada ambiente —
nunca reutilize o banco ou as chaves de produção em homologação.

## Backlog de produto

O roadmap completo (épicos, prioridades, sequência de sprints) está
documentado no board do produto. Ordem de construção:

1. ✅ Épico 0 + 1 — Backend, API, tempo real, pagamento
2. Épicos 2–6 — Fluxo de compra do cliente
3. Épicos 9–12 — Operação do painel do restaurante
4. Épicos 7, 8, 13 — Acompanhamento, recompra, relatórios
