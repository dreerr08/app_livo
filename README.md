# App LIVO — Marmitas Congeladas

Sistema de pedidos com duas portas de entrada (app do cliente + painel do
restaurante) sobre um banco de dados único. Pedido pago cai em tempo real
na fila do restaurante.

Status atual: **Épicos 0–12 implementados** (fundação, pagamento, catálogo,
carrinho, login, endereço/entrega, checkout, acompanhamento, histórico,
kanban do painel, gestão de cardápio e de zonas de entrega). Falta apenas
o Épico 13 (relatórios), fora do MVP combinado até aqui.

## Arquitetura (monorepo)

```
server/   API única (Node + Express + TypeScript + Prisma + PostgreSQL)
          + WebSocket (Socket.io) + integração Mercado Pago (Pix/cartão)
          + autenticação por OTP (JWT)
client/   App do cliente — Next.js (PWA, mobile-first)
admin/    Painel do restaurante — React + Vite (desktop)
```

Um único backend serve os dois front-ends. `CORS_ORIGIN` no `server/.env`
aceita uma lista separada por vírgula, pois client e admin rodam em
origens diferentes (`http://localhost:3000` e `http://localhost:5173` em
dev). O painel recebe pedidos pagos em tempo real via WebSocket (sala
`restaurant`), e o app do cliente acompanha o próprio pedido numa sala
`order:<id>` — ambos reagem a `order:created`/`order:updated`.

## Modelo de dados

`Customer`, `Address`, `DeliveryZone`, `Product` (avulso ou combo fixo via
`ComboItem`), `Order`, `OrderItem`, `Payment`, `OtpCode` — ver
`server/prisma/schema.prisma`.

Regra central: um pedido nasce em `AWAITING_PAYMENT` e só entra na fila de
preparo (`RECEIVED`) quando o pagamento é confirmado — nunca antes.

## Autenticação (Épico 4)

Login por telefone + código de verificação (OTP), sem exigir senha. O
cliente navega e monta o carrinho sem login; login só é pedido no
checkout. Endereços e pedidos sempre usam o `customerId` do token JWT,
nunca um valor vindo do corpo da requisição.

**Limitação conhecida**: não há integração com provedor de SMS. Em
qualquer ambiente que não seja `production`, o código gerado volta na
própria resposta da API (`devCode`) e é exibido na tela de login, para
permitir testar o app sem SMS real. Antes de ir para produção, plugue um
provedor (Twilio, Zenvia etc.) em `server/src/services/auth.service.ts`.

## Pagamento (Mercado Pago)

- Pix: gera QR Code + copia-e-cola no checkout; confirmação via webhook
  (`POST /webhooks/mercadopago`) atualiza o pedido para pago em segundos.
- Cartão de crédito: captura síncrona, com tratamento de recusa.
- `payment.gatewayPaymentId` é o `payment_id` rastreável no gateway.
- A integração fica atrás da interface `PaymentProvider`
  (`server/src/services/payment/`), para trocar de gateway sem mexer no
  resto do sistema. Um provedor fake (`fakePaymentProvider.ts`) é usado
  automaticamente quando `NODE_ENV=test`, tanto pelos testes automatizados
  quanto para rodar o app localmente sem uma conta Mercado Pago real.

**Limitação conhecida (cartão)**: o formulário de cartão no checkout do
client é um placeholder. Por segurança/PCI, a tokenização do cartão
**precisa** ser feita no navegador com o SDK do Mercado Pago (Checkout
Bricks) antes de chamar nossa API — o número do cartão nunca deve chegar
ao nosso backend. Isso ainda não foi plugado porque exige uma conta
Mercado Pago real (chave pública). O Pix não tem essa limitação: já
funciona ponta a ponta.

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
URL pública gerada. Alternativamente, rode com `NODE_ENV=test` para usar
o provedor de pagamento fake e testar o fluxo completo sem conta Mercado
Pago (é assim que este projeto foi validado ponta a ponta em ambiente
sandbox, incluindo Pix, cartão, webhook, tempo real e kanban).

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
sobe a API de verdade contra um banco Postgres de teste, usando o
provedor de pagamento fake (sem chamar o Mercado Pago). Cobre as regras
de negócio centrais: pedido só entra na fila após pagamento, CEP fora da
zona bloqueia entrega, item esgotado bloqueia pedido, cliente não vê
pedido de outro cliente, fluxo completo de Pix (criação → webhook →
fila → transição de status), cartão aprovado/recusado, login por OTP
(incluindo a recuperação do fluxo de primeiro acesso sem nome), e CORS
liberando as duas origens do front-end.

```bash
cd server
npm run test:migrate   # aplica as migrations no banco app_livo_test (server/.env.test)
npm test
```

Roda automaticamente no GitHub Actions a cada push (`.github/workflows/test.yml`),
junto com o typecheck do client e do admin.

Além dos testes automatizados, o fluxo completo (catálogo → carrinho →
login → checkout com endereço/frete → pagamento → acompanhamento em
tempo real → painel kanban → cardápio → zonas de entrega) foi validado
manualmente em navegador real (Playwright) antes de cada entrega — foi
assim que dois bugs reais foram encontrados e corrigidos: o código OTP
sendo consumido antes de checar se o nome era obrigatório (quebrava o
primeiro cadastro), e o CORS liberando só a origem do client, bloqueando
o painel.

## Ambientes

`NODE_ENV` distingue `development` / `homolog` / `production` (mais
`test`, usado só pela suíte automatizada e opcionalmente para rodar o
app localmente com o pagamento fake). Use bancos de dados e credenciais
do Mercado Pago **diferentes** em cada ambiente — nunca reutilize o banco
ou as chaves de produção em homologação.

## Backlog de produto

O roadmap completo (épicos, prioridades, sequência de sprints) está
documentado no board do produto.

1. ✅ Épico 0 + 1 — Backend, API, tempo real, pagamento
2. ✅ Épicos 2–6 — Fluxo de compra do cliente (catálogo, carrinho, login,
   endereço/entrega, checkout)
3. ✅ Épicos 7, 8 — Acompanhamento em tempo real e histórico/recompra
4. ✅ Épicos 9–12 — Operação do painel (kanban, pagamento, cardápio, zonas)
5. ⬜ Épico 13 — Relatórios (fora do escopo combinado até aqui)

Itens 🟡/🟢 do backlog (fase 2/3 — filtros de busca, combo personalizado,
login social, janela de entrega, notificações push/WhatsApp, estorno via
gateway, controle de estoque, atribuição de entregador, roteirização,
favoritos, assinatura, cupons, fidelidade, avaliações, app nativo) não
foram implementados, conforme a priorização definida.
