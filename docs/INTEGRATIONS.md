# INTEGRATIONS — CONTRATOS E FLUXOS DE INTEGRAÇÕES EXTERNAS

> DOCUMENTO TÉCNICO DE REFERÊNCIA. Descreve os contratos, fluxos e responsabilidades de cada integração externa operacional no sistema.

---

## 1. FAL.AI — PROVEDOR DE MODELOS DE IA

### Propósito
Execução assíncrona de modelos de geração de imagem, vídeo, áudio e inpainting via fila gerenciada.

### SDK
- `@fal-ai/client` (versão atual) — único pacote autorizado.
- `@fal-ai/serverless-client` — **DEPRECADO**, deve ser removido.

### Autenticação
- Variável de ambiente: `FAL_KEY`
- Configurada via `fal.config({ credentials: process.env.FAL_KEY })` em `src/lib/fal.ts`

### Padrão de Integração (Queue Submit → Webhook Callback)

```
[Frontend]
  POST /api/generate/{type}
    → Validação Zod
    → debitCredits(user.id, cost)
    → prisma.generation.create(status: PENDING)
    → fal.queue.submit(modelId, input, { webhookUrl })
    → Retorna { generationId, falRequestId }

[FAL.ai] (assíncrono)
  POST /api/webhooks/fal?generationId={id}
    → Validar assinatura HMAC (PENDENTE — débito B.1)
    → extractOutputUrls(payload)
    → saveMediaFromUrl() → Cloudflare R2
    → prisma.generation.update(status: COMPLETED, outputUrls)
    — on error →
      refundCredits(user.id, creditsCost)
      prisma.generation.update(status: FAILED)
```

### Variáveis de Ambiente Necessárias
| Variável | Descrição |
|---|---|
| `FAL_KEY` | Chave de API do FAL.ai |
| `FAL_WEBHOOK_URL` | URL pública do webhook de callback (`https://dominio.com/api/webhooks/fal`) |

### Modelos Ativos
Ver `src/lib/models.ts` para o catálogo completo de modelos de imagem (`IMAGE_MODELS`) e vídeo (`VIDEO_MODELS`).

### Regras de Operação
- Nunca usar `fal.run()` (síncrono) em produção — apenas `fal.queue.submit()`.
- `falRequestId` retornado deve ser persistido no `Generation.falRequestId` para auditoria e reprocessamento.
- O polling de status (`/api/generate/[id]/status`) é fallback secundário ao webhook. O webhook é o canal primário.

---

## 2. STRIPE — PAGAMENTOS E SUBSCRIPTIONS

### Propósito
Gestão de planos de assinatura (SaaS billing), checkout, portal do cliente e renovações automáticas.

### SDK
- `stripe` v16 (Node.js server-side only — nunca expor no cliente)

### Autenticação
- Variável de ambiente: `STRIPE_SECRET_KEY` (server-side)
- Webhook signature secret: `STRIPE_WEBHOOK_SECRET`

### Padrão de Integração (Checkout → Webhook → Plan Upgrade)

```
[Frontend]
  POST /api/checkout
    → getOrCreateStripeCustomer(userId, email)
    → stripe.checkout.sessions.create({ priceId, customerId, metadata: { userId } })
    → Retorna { url } → Redireciona para Stripe Hosted Checkout

[Stripe] (assíncrono)
  POST /api/webhooks/stripe
    → Validar assinatura via svix/stripe.webhooks.constructEvent()
    → Eventos tratados:
      - checkout.session.completed → prisma.user.update(plan, stripeSubId)
      - customer.subscription.updated → atualiza plan e credits
      - customer.subscription.deleted → rebaixa para FREE
      - invoice.payment_failed → notificação de falha

[Frontend]
  POST /api/checkout (Customer Portal)
    → stripe.billingPortal.sessions.create({ customerId })
    → Redireciona para portal Stripe
```

### Mapeamento de Price IDs
Cada plano possui dois Price IDs (mensal e anual), configurados via variáveis de ambiente:

| Variável | Plano | Ciclo |
|---|---|---|
| `STRIPE_ESSENTIAL_PRICE_ID` | Essential | Mensal |
| `STRIPE_ESSENTIAL_ANNUAL_PRICE_ID` | Essential | Anual |
| `STRIPE_PREMIUM_PRICE_ID` | Premium | Mensal |
| `STRIPE_PREMIUM_ANNUAL_PRICE_ID` | Premium | Anual |
| `STRIPE_PREMIUM_PLUS_PRICE_ID` | Premium+ | Mensal |
| `STRIPE_PREMIUM_PLUS_ANNUAL_PRICE_ID` | Premium+ | Anual |
| `STRIPE_PRO_PRICE_ID` | Pro | Mensal |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Pro | Anual |

### Regras de Operação
- `STRIPE_SECRET_KEY` nunca deve estar em código client-side ou em logs.
- Todo webhook deve validar assinatura antes de processar. Usar `stripe.webhooks.constructEvent()`.
- Em caso de `checkout.session.completed`, sempre verificar `payment_status === 'paid'` antes de upgradar plano.
- A lógica de créditos pós-upgrade deve ser atômica: `prisma.$transaction([updatePlan, updateCredits])`.

---

## 3. CLOUDFLARE R2 — STORAGE DE MÍDIA GERADA

### Propósito
Armazenamento persistente de outputs das gerações (imagens, vídeos, áudios). Substitui links temporários da FAL.ai que expiram.

### SDK
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (API S3-compatible)

### Autenticação
| Variável | Descrição |
|---|---|
| `R2_ACCOUNT_ID` | ID da conta Cloudflare |
| `R2_ACCESS_KEY_ID` | Access key S3-compat |
| `R2_SECRET_ACCESS_KEY` | Secret key S3-compat |
| `R2_BUCKET_NAME` | Nome do bucket |
| `R2_PUBLIC_URL` | URL pública do bucket (custom domain ou `pub-*.r2.dev`) |

### Padrão de Operação

```
[Webhook FAL callback]
  → saveMediaFromUrl(falUrl, generationId, index)
    → fetch(falUrl)             # Download da mídia do CDN da FAL
    → inferMedia(url, headers)  # Detecta tipo: image/video/audio
    → uploadToR2(key, buffer, contentType)
      → key = generations/{generationId}/{index}.{ext}
    → Retorna URL pública R2
  → generation.outputUrls = [r2Url1, r2Url2, ...]
```

### Estrutura de Keys
```
generations/{generationId}/{index}.{ext}   # Outputs de geração
uploads/{userId}/{timestamp}.{ext}         # Uploads diretos do usuário
```

### Regras de Operação
- Usar exclusivamente `saveMediaFromUrl()` para arquivar outputs. `saveImageFromUrl()` está deprecada (débito B.6).
- URLs públicas do R2 são permanentes. Links FAL.ai são temporários (expiram em ~1h).
- Para assets privados, gerar Presigned URLs com TTL de 1h via `getPresignedUrl()`.
- Nunca expor `R2_SECRET_ACCESS_KEY` em logs ou em respostas de API.

---

## 4. CLERK — AUTENTICAÇÃO E GESTÃO DE USUÁRIOS

### Propósito
Autenticação completa (email/senha, OAuth, SSO), gestão de sessões e sincronização de usuários com o banco local via webhooks.

### SDK
- `@clerk/nextjs` v5

### Padrão de Integração (Signup → Webhook → User DB)

```
[Usuário]
  → Signup via Clerk Hosted UI (/login, /signup)
  → Clerk emite webhook user.created

[Clerk]
  POST /api/webhooks/clerk
    → Validar assinatura via svix (Webhook-Id, Webhook-Timestamp, Webhook-Signature)
    → Evento user.created → prisma.user.create({ clerkId, email, name })
    → Evento user.updated → prisma.user.update({ name, email, avatarUrl })
    → Evento user.deleted → tratamento de soft/hard delete

[Runtime de Qualquer Rota]
  → auth() → { userId: clerkId }
  → currentUser() → dados do perfil Clerk
  → getOrCreateUser(clerkId, email) → User do banco local
```

### Middleware de Proteção
Configurado em `src/middleware.ts`:
- Rotas protegidas: `/app(.*)` — exige autenticação ativa.
- Redirecionamento automático para `/login` com `redirect_url` preservado.

### Variáveis de Ambiente Necessárias
| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Chave pública (client-side) |
| `CLERK_SECRET_KEY` | Chave secreta (server-side only) |
| `CLERK_WEBHOOK_SECRET` | Secret de validação de webhooks Clerk (via svix) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup` |

### Regras de Operação
- `CLERK_SECRET_KEY` jamais exposta no cliente ou em logs.
- Todo webhook deve validar assinatura via `svix` antes de processar.
- A entidade `User` no banco local é sempre derivada do `clerkId`. Nunca criar usuários locais sem vínculo com Clerk.

---

## 5. FLUXO DE CRÉDITOS — LEDGER TRANSACIONAL

### Propósito
Controle de saldo de créditos por usuário, auditoria de débitos/reembolsos e validação de capacidade antes de cada geração.

### Arquivo de Referência
`src/lib/credits.ts`

### Operações Disponíveis

| Função | Descrição |
|---|---|
| `getOrCreateUser(clerkId, email)` | Retorna ou cria usuário local |
| `hasEnoughCredits(userId, cost)` | Verifica saldo antes de gerar |
| `debitCredits(userId, amount, description)` | Débita créditos + registra em `CreditTransaction` |
| `refundCredits(userId, amount, description)` | Estorna créditos em caso de falha |

### Fluxo Padrão por Geração

```
1. hasEnoughCredits(user.id, totalCost)          # Validação de saldo
2. debitCredits(user.id, totalCost, description) # Débito pré-geração
3. submitFalJobRaw(...)                          # Envio para FAL
  → on FAL error:
    refundCredits(user.id, totalCost, ...)       # Reembolso imediato
  → on webhook error (status FAILED):
    refundCredits(user.id, creditsCost, ...)     # Reembolso via webhook
```

### Modelo de Dados
- `User.credits` — saldo atual (Int)
- `CreditTransaction` — ledger imutável de todas as movimentações (débitos, reembolsos, recargas)
- `User.creditsReset` — data de próximo reset de créditos (ciclo de assinatura)

### Regras de Operação
- Débito sempre ocorre ANTES do envio para FAL. Nunca após.
- Reembolso é obrigatório em toda falha: FAL submit error, webhook FAILED, timeout.
- Todas as operações de crédito devem registrar entrada em `CreditTransaction` para auditoria.
- `debitCredits` e `refundCredits` não devem ser chamadas diretamente de componentes client-side. Exclusivamente de Route Handlers ou Server Actions.

---

## 6. WEBHOOKS — MATRIZ DE ENDPOINTS

| Endpoint | Provedor | Validação de Assinatura | Eventos Tratados |
|---|---|---|---|
| `/api/webhooks/fal` | FAL.ai | HMAC (PENDENTE — débito B.1) | Completion, Error |
| `/api/webhooks/stripe` | Stripe | `stripe.webhooks.constructEvent()` | checkout.completed, sub.updated, sub.deleted |
| `/api/webhooks/clerk` | Clerk | svix headers | user.created, user.updated, user.deleted |

### Regra Universal de Webhooks
> Todo endpoint de webhook que não valide a assinatura do provedor constitui uma vulnerabilidade crítica de segurança. A validação de assinatura é não-negociável e deve ocorrer como primeira operação do handler, antes de qualquer lógica de negócio.
