# Auditoria Noturna — SaaSArq: Relatório Técnico Completo

**Data:** 2026-05-25  
**Escopo:** Codebase completo — segurança, performance, bugs, arquitetura  
**Modo:** Read-only. Nenhuma alteração aplicada sem aprovação.

---

## Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Segurança](#segurança)
3. [Performance e Banco de Dados](#performance-e-banco-de-dados)
4. [Bugs Conhecidos](#bugs-conhecidos)
5. [Lacunas de Arquitetura](#lacunas-de-arquitetura)
6. [Matriz de Prioridade](#matriz-de-prioridade)
7. [Plano por Fases](#plano-por-fases)
8. [Prompts Prontos para Executar](#prompts-prontos-para-executar)

---

## Resumo Executivo

O SaaSArq tem uma base sólida: Next.js 14 App Router, Prisma v5, Clerk, Stripe e FAL bem integrados, admin dashboard completo com APIs reais (Fases 1–4 concluídas). A aplicação **funciona** e **gera receita**. As falhas encontradas são de maturidade de produto — nenhuma é catastrófica isoladamente, mas duas combinadas (TOCTOU de créditos + ausência de rate limiting) representam risco real de prejuízo financeiro direto.

**Contagem de issues:** 4 P0 · 6 P1 · 8 P2 · 5 P3

---

## Segurança

### [S1] P0 — Race condition TOCTOU no sistema de créditos

**Arquivo:** `src/lib/credits.ts`

```typescript
// Padrão atual — NÃO É ATÔMICO:
const ok = await hasEnoughCredits(userId, cost);  // leitura
if (!ok) return 402;
await debitCredits(userId, cost);                 // escrita separada
```

Entre `hasEnoughCredits` e `debitCredits`, outro request simultâneo do mesmo usuário pode passar pela verificação e ambos debitarem, resultando em saldo **negativo**. Em produção com múltiplas abas abertas ou re-renders simultâneos, isso é explorável.

**Impacto:** Usuário com 100 créditos consegue disparar gerações que custam 200+ créditos. Prejuízo de custo de API (FAL/OpenAI) sem receita correspondente.

**Solução:** Substituir por `UPDATE ... WHERE credits >= cost RETURNING credits` — operação atômica no Postgres. Alternativa: `$transaction` com `select for update`.

---

### [S2] P0 — Páginas `/admin/*` não protegidas pelo middleware

**Arquivo:** `src/middleware.ts`

```typescript
// Matcher atual protege apenas /app
export const config = {
  matcher: ["/app(.*)"],
};
```

As rotas de **API** admin têm `requireAdmin()` em cada handler — estão protegidas. Porém as **páginas** `/admin/*` (Next.js Server Components estáticos) não passam pelo middleware. Um usuário não autenticado recebe o HTML das páginas admin. Os dados reais só são bloqueados no fetch das APIs, mas o shell da UI fica exposto (estrutura de navegação, labels, etc.).

**Solução:** Adicionar `/admin(.*)` ao matcher.

---

### [S3] P1 — Dois caminhos de criação de usuário com créditos divergentes

**Arquivos:** `src/app/api/webhooks/clerk/route.ts` · `src/lib/credits.ts`

| Caminho | Créditos iniciais |
|---------|------------------|
| Clerk webhook `user.created` | **0** |
| `getOrCreateUser()` (primeiro request autenticado) | **20.000** |

Se o webhook chega antes do primeiro request (comportamento padrão), o usuário é criado com 0 créditos. O `getOrCreateUser()` usa `upsert` — se o usuário já existe, o `create` não roda, então os 20.000 nunca são atribuídos. **Usuários novos estão provavelmente recebendo 0 créditos de boas-vindas.**

**Solução:** Remover a criação de usuário do webhook Clerk (deixar como evento de logging apenas), ou sincronizar os dois para 20.000 créditos, ou trocar `upsert` por `update` + criar só via webhook com os créditos corretos.

---

### [S4] P1 — `getOrCreateUser()` chama `currentUser()` em todo request autenticado

**Arquivo:** `src/lib/credits.ts` — chamado em 15+ rotas

`currentUser()` é um round-trip à API do Clerk a cada request. Em rotas como `/api/generate/*` que já recebem userId via `auth()` (dado local do JWT), chamar `currentUser()` é desnecessário e lento (~100–300ms adicionados ao cold path).

**Impacto:** Latência de geração artificialmente elevada. Se o Clerk tiver instabilidade, todas as rotas de geração falham com 503.

**Solução:** Separar `getOrCreateUser()` em `ensureUserExists(userId)` (sem `currentUser()`) + `syncUserMetadata()` (com `currentUser()`, chamado só quando necessário). Usar `auth()` para obter userId e buscar o user direto no DB.

---

### [S5] P2 — Modelo Claude desatualizado no assistente

**Arquivo:** `src/app/api/assistant/route.ts`

```typescript
model: "claude-haiku-20240307",  // modelo depreciado
```

Este é o Haiku antigo (Claude 3 Haiku). O modelo atual é `claude-haiku-4-5-20251001`. Modelos depreciados podem ser removidos pela Anthropic sem aviso prévio, quebrando o assistente silenciosamente.

---

### [S6] P2 — `/api/assistant` sem rate limiting

**Arquivo:** `src/app/api/assistant/route.ts`

Nenhuma proteção contra uso excessivo. Um usuário pode enviar centenas de mensagens por minuto, gerando custo Anthropic ilimitado. Não há verificação de créditos para o assistente.

---

## Performance e Banco de Dados

### [P1] P0 — Indexes faltando na tabela `Generation`

**Arquivo:** `prisma/schema.prisma`

Indexes existentes em `Generation`:
- `@@index([userId])`
- `@@index([falRequestId])`
- `@@index([projectId])`

**Indexes ausentes** que todas as rotas admin + agentes consultam constantemente:

| Query | Index necessário |
|-------|-----------------|
| `WHERE status = 'PROCESSING' AND updatedAt <= X` (health, infra-agent) | `(status, updatedAt)` |
| `WHERE createdAt >= X` (stats, custo, receita) | `(createdAt)` |
| `WHERE userId = X AND createdAt >= X` (abuse-agent) | `(userId, createdAt)` |
| `WHERE status IN (...)` (múltiplos) | `(status)` |

Sem esses indexes, essas queries fazem **full table scan** em toda a tabela de gerações. Com volume crescente, latência cresce linearmente.

**Solução:** Adicionar ao schema (requer migration):
```prisma
@@index([status])
@@index([createdAt])
@@index([status, updatedAt])
@@index([userId, createdAt])
```

---

### [P2] P1 — `/api/generations` retorna 200 linhas sem paginação

**Arquivo:** `src/app/api/generations/route.ts`

```typescript
const generations = await prisma.generation.findMany({
  where: { userId },
  take: 200,
  orderBy: { createdAt: "desc" },
});
```

A página de histórico do usuário carrega sempre 200 gerações de uma vez. Usuários com histórico longo recebem payload grande desnecessariamente. Não há cursor nem paginação.

---

### [P3] P1 — Upload para R2 é sequencial (fetch → upload)

**Arquivo:** `src/lib/r2.ts`

Para cada imagem gerada, o servidor: (1) faz fetch da URL do FAL, (2) faz upload para o R2. Se uma geração produz 4 imagens, os 4 uploads são feitos sequencialmente. Com `Promise.all` seriam paralelos.

---

### [P4] P2 — `getOrCreateUser()` faz DB upsert em todo request

O upsert tem custo de write-lock even quando o usuário já existe. Em alta frequência de requests (geração, polling de status), isso cria contenção desnecessária. Uma flag em memória ou cache TTL 60s eliminaria 95% dos upserts.

---

### [P5] P2 — Ausência de índice composto em `CreditTransaction`

**Arquivo:** `prisma/schema.prisma`

O abuse-agent e o admin/costs fazem:
```sql
WHERE userId = X AND type = 'DEBIT' AND createdAt >= X
```

O index existente `@@index([userId])` não cobre `type` e `createdAt`. Adicionar `@@index([userId, type, createdAt])` aceleraria essas queries multi-coluna.

---

## Bugs Conhecidos

### [B1] P1 — Usuários novos provavelmente recebem 0 créditos de boas-vindas

Conforme [S3] — o webhook Clerk cria com 0, o `getOrCreateUser()` só cria se não existe. Na prática: novos usuários → 0 créditos na conta → experiência quebrada no primeiro login.

**Verificação rápida:** `SELECT credits FROM "User" WHERE "createdAt" > NOW() - INTERVAL '7 days' ORDER BY "createdAt" DESC LIMIT 20;`

---

### [B2] P1 — `src/lib/config.ts` é dead code com risco de divergência

**Arquivo:** `src/lib/config.ts`

Contém `AI_MODELS` e `PLANS` — duplicatas do que já está em `src/lib/models.ts` e `src/lib/plans.ts`. Apenas `src/lib/model-lookup.ts` usa `config.ts` como fallback. Se alguém adicionar um modelo em `models.ts` mas esquecer de adicionar em `config.ts`, o fallback retorna dados errados silenciosamente.

**Solução:** Remover `config.ts` e corrigir `model-lookup.ts` para usar diretamente `models.ts`.

---

### [B3] P2 — Stripe webhook reseta créditos ao renovar assinatura

**Arquivo:** `src/app/api/webhooks/stripe/route.ts`

```typescript
// No customer.subscription.updated:
credits: PLAN_CREDITS[newPlan],  // SET, não INCREMENT
```

Quando uma assinatura renova (monthly), `customer.subscription.updated` dispara e **zera + redefine** os créditos para o valor do plano. Isso é intencional para evitar acúmulo, mas significa que créditos não utilizados do mês anterior são perdidos sem aviso ao usuário.

Não é um bug técnico, mas é uma decisão de produto que pode gerar churn e chargebacks.

---

### [B4] P2 — `debitCredits()` registra valor positivo para DEBIT

**Arquivo:** `src/lib/credits.ts`

```typescript
await prisma.creditTransaction.create({
  data: {
    type: "DEBIT",
    amount: cost,  // positivo
  }
});
```

Mas a lógica de leitura em `src/app/api/admin/costs/route.ts` usa `Math.abs()` assumindo que DEBITs são negativos. Há inconsistência: o schema permite negativos, o admin assume negativos, mas `debitCredits()` salva positivos. Verificar se o banco tem registros com valores negativos ou todos positivos — a inconsistência pode ser só documentação, ou pode ser um bug real.

---

### [B5] P3 — `canvasData` shallow merge pode perder dados de outros workflows

**Arquivo:** `src/app/api/spaces/[id]/route.ts`

```typescript
canvasData: { ...existing.canvasData, [wfId]: newData }
```

Se `existing.canvasData` tem a estrutura `{ "canvas:wf1": {...}, "canvas:wf2": {...} }`, o spread funciona. Mas se `canvasData` for `null` ou tiver formato diferente do esperado (campo legado), o merge pode sobrescrever dados silenciosamente.

---

## Lacunas de Arquitetura

### [A1] P1 — Sem rate limiting em nenhuma rota

Nenhuma rota da aplicação tem rate limiting. Vetores de abuso:
- `/api/generate/*`: geração em massa consome FAL sem limite
- `/api/assistant`: custo Anthropic ilimitado
- `/api/checkout`: criação de sessões Stripe em massa
- `/api/admin/*`: enumeração de dados via brute-force

**Solução recomendada:** Upstash Rate Limit + Redis (serverless-friendly com Next.js).

---

### [A2] P1 — Sem cron jobs (stuck jobs acumulam, créditos nunca expiram)

Não há nenhum job agendado. Consequências:
- Gerações com status `PROCESSING` stuck por horas ficam para sempre (não há cleanup automático)
- Créditos mensais não são resetados automaticamente (depende 100% do webhook Stripe)
- Nenhum snapshot diário de métricas (admin/revenue sempre recalcula do zero)

**Solução:** Vercel Cron Jobs (já disponível no plano Pro) ou endpoint `GET /api/cron/[job]` com `Authorization: Bearer CRON_SECRET`.

Jobs necessários:
1. `cleanup-stuck` — a cada hora: `PROCESSING` → `FAILED` se `updatedAt < now - 30min`
2. `daily-snapshot` — meia-noite: salvar MRR, usuários ativos, gerações do dia
3. `credit-monthly-reset` — primeiro do mês: resetar créditos para usuários PRO/PREMIUM sem webhook Stripe

---

### [A3] P2 — Zero cobertura de testes

Nenhum framework de testes instalado. Camadas críticas sem cobertura:
- Lógica de créditos (`credits.ts`) — TOCTOU, admin bypass, planos
- Cálculo de custos (`ai-costs.ts`) — USD/BRL, fallbacks
- `requireAdmin()` — camada de segurança central
- Agents (5 agentes) — thresholds, métricas, alertas

**Risco imediato:** Qualquer refactor em `credits.ts` pode introduzir regressão silenciosa.

---

### [A4] P2 — Sem charting library (gráficos são barras decorativas)

`package.json` não tem `recharts`, `chart.js`, ou similar. O admin dashboard tem progress bars proporcionais mas nenhum gráfico de linha/área de tendência temporal. O produto seria significativamente mais valioso para o operador com gráficos de MRR ao longo do tempo, gerações por dia, etc.

---

### [A5] P3 — Sem tabela `AdminLog` (audit trail é sintético)

`/api/admin/audit` gera um trail sintético a partir de User, Generation e CreditTransaction. Não há tabela real de eventos administrativos. Ações do admin (alterar plano, grant créditos) não ficam logadas. Futuramente necessário para compliance.

---

### [A6] P3 — Sem página `/admin/users/[id]`

A API `GET /api/admin/users/[id]` existe (Fase 2) mas a página de detalhe do usuário nunca foi criada. Operadores não conseguem ver detalhes individuais, gerações de um usuário específico, ou histórico de transações pelo admin.

---

### [A7] P3 — Sem DailySnapshot para métricas históricas

Admin revenue e overview sempre recalculam do zero. MRR de "mês passado" não existe — só o MRR atual. Para gráficos de tendência e comparações period-over-period, é necessário uma tabela `DailySnapshot { date, mrr, activeUsers, totalGenerations, totalCostUSD }` populada por cron job.

---

### [A8] P3 — `src/app/api/generate/inpaint/route.ts` com status modificado

**Arquivo modificado mas não commitado** (visível no `git status`). Verificar se a modificação é intencional ou um trabalho em andamento antes do próximo deploy.

---

## Matriz de Prioridade

| ID | Título | Prioridade | Impacto | Esforço |
|----|--------|-----------|---------|---------|
| S1 | TOCTOU créditos (race condition) | **P0** | Financeiro direto | Médio |
| S2 | Middleware não protege `/admin/*` | **P0** | Segurança | Mínimo |
| P1 | Indexes faltando em `Generation` | **P0** | Performance crítica em escala | Mínimo* |
| B1 | Novos usuários recebem 0 créditos | **P0** | Churn imediato | Pequeno |
| S3 | Dual creation paths (0 vs 20k créditos) | **P1** | Produto | Médio |
| S4 | `currentUser()` em todo request | **P1** | Latência + resiliência | Médio |
| P2 | `/api/generations` sem paginação | **P1** | UX e performance | Pequeno |
| B2 | `config.ts` dead code (divergência) | **P1** | Correctness | Pequeno |
| A1 | Sem rate limiting | **P1** | Segurança + custo | Médio |
| A2 | Sem cron jobs | **P1** | Operacional | Médio |
| S5 | Modelo Claude desatualizado | **P2** | Risco de deprecação | Mínimo |
| S6 | `/api/assistant` sem rate limit | **P2** | Custo | Pequeno |
| P3 | R2 upload sequencial | **P2** | Performance | Pequeno |
| B3 | Stripe reset zera créditos não usados | **P2** | Produto/churn | Decisão |
| B4 | DEBIT amount positivo vs negativo | **P2** | Correctness | Investigar |
| A3 | Zero testes | **P2** | Qualidade | Grande |
| A4 | Sem charting library | **P2** | Produto | Médio |
| P4 | upsert em todo request | **P2** | Performance | Pequeno |
| B5 | Canvas shallow merge frágil | **P3** | Edge case | Pequeno |
| A5 | Sem `AdminLog` | **P3** | Compliance | Grande |
| A6 | Sem `/admin/users/[id]` | **P3** | Produto | Médio |
| A7 | Sem DailySnapshot | **P3** | Analytics | Grande |
| A8 | `inpaint/route.ts` modificado sem commit | **P3** | Deploy risk | Verificar |

*Requer migration Prisma

---

## Plano por Fases

### Fase 5 — Hotfixes Críticos (1–2 horas)

Foco: P0s sem migration, sem breaking change.

1. **Middleware admin** — adicionar `/admin(.*)` ao matcher
2. **Modelo Claude** — atualizar para `claude-haiku-4-5-20251001`
3. **Verificar créditos de novos usuários** — SQL no banco para confirmar o bug B1
4. **Corrigir criação de usuário** — alinhar webhook Clerk com 20.000 créditos
5. **Commit e deploy**

---

### Fase 6 — Indexes + Paginação (30 minutos + migration)

Foco: Performance antes de crescimento.

1. **Migration Prisma** — adicionar 4 indexes em `Generation` + 1 em `CreditTransaction`
2. **Paginação em `/api/generations`** — cursor-based igual ao admin
3. **`config.ts` removal** — remover dead code, ajustar `model-lookup.ts`

---

### Fase 7 — Atomicidade de Créditos + Rate Limiting (3–4 horas)

Foco: Eliminar risco financeiro e abuso.

1. **Crédito atômico** — reescrever `hasEnoughCredits + debitCredits` como raw SQL atômico
2. **Rate limiting** — instalar `@upstash/ratelimit` + `@upstash/redis`, aplicar em `/api/generate/*` e `/api/assistant`
3. **Testes unitários para `credits.ts`** — instalar vitest, cobrir os casos críticos

---

### Fase 8 — Cron Jobs + DailySnapshot (4–6 horas)

Foco: Operacional e analytics histórico.

1. **`daily-snapshot` cron** — schema migration + handler + vercel.json
2. **`cleanup-stuck` cron** — sem migration, só lógica
3. **Gráficos no admin** — instalar recharts, adicionar sparklines em overview e revenue

---

### Fase 9 — Admin UX Completo (2–3 horas)

Foco: Completar o produto admin.

1. **`/admin/users/[id]`** — página de detalhe com gerações, transações, ações
2. **`AdminLog` schema** — migration + registro de ações admin
3. **PATCH/POST admin** — grant créditos, mudar plano, suspender usuário

---

## Prompts Prontos para Executar

### Prompt 5A — Middleware + Claude Model Fix

```
Corrigir dois hotfixes críticos no SaaSArq:

1. MIDDLEWARE: Adicionar proteção das páginas admin.
   Arquivo: src/middleware.ts
   Alterar o matcher de ["/app(.*)"] para ["/app(.*)", "/admin(.*)"]
   Verificar que o middleware Clerk já lida com redirecionamento de não-autenticados.

2. MODELO CLAUDE: Atualizar o modelo no assistente.
   Arquivo: src/app/api/assistant/route.ts
   Trocar "claude-haiku-20240307" por "claude-haiku-4-5-20251001"

Regras: tsc --noEmit limpo, next build limpo, commit e push ao final.
```

---

### Prompt 5B — Fix Dual User Creation (créditos de boas-vindas)

```
Bug crítico no SaaSArq: novos usuários estão sendo criados com 0 créditos.

Causa: src/app/api/webhooks/clerk/route.ts cria usuário com credits: 0.
       src/lib/credits.ts getOrCreateUser() cria com 20000 mas só roda se usuário não existe.
       Como o webhook chega primeiro, o upsert no getOrCreateUser não executa o create.

Solução: Alterar src/app/api/webhooks/clerk/route.ts para criar usuários com credits: 20000.
         Manter consistência com getOrCreateUser().

Não alterar: schema Prisma, Stripe, FAL, workflow, Spaces.
Regras: tsc --noEmit limpo, next build limpo, commit e push ao final.
Verificação: adicionar log no webhook para confirmar que o credits correto está sendo salvo.
```

---

### Prompt 6A — Indexes de Performance (requer migration)

```
Adicionar indexes críticos que estão faltando no SaaSArq para suportar as queries admin e agents.

Arquivo: prisma/schema.prisma

No model Generation, adicionar após os indexes existentes:
  @@index([status])
  @@index([createdAt])
  @@index([status, updatedAt])
  @@index([userId, createdAt])

No model CreditTransaction, adicionar:
  @@index([userId, type, createdAt])

Após alterar o schema:
  npx prisma migrate dev --name add-generation-indexes
  tsc --noEmit
  next build

Não alterar: nenhuma lógica de negócio, só schema.
Commit e push ao final com mensagem clara sobre a migration.
```

---

### Prompt 6B — Remover dead code config.ts

```
Remover dead code de src/lib/config.ts no SaaSArq.

Contexto: config.ts contém AI_MODELS e PLANS duplicados de models.ts e plans.ts.
          Apenas src/lib/model-lookup.ts usa config.ts como fallback legacy.

Tarefa:
1. Ler src/lib/model-lookup.ts e entender como AI_MODELS de config.ts é usado.
2. Substituir o import de config.ts por import direto de models.ts (mesmo tipo de dado).
3. Verificar que nenhum outro arquivo importa config.ts (grep para confirmar).
4. Deletar src/lib/config.ts.

Regras: tsc --noEmit limpo, next build limpo.
Não alterar: nenhuma lógica além do import swap.
Commit e push ao final.
```

---

### Prompt 7A — Atomicidade de Créditos

```
Corrigir race condition crítica (TOCTOU) no sistema de créditos do SaaSArq.

Arquivo principal: src/lib/credits.ts

Problema atual:
  const ok = await hasEnoughCredits(userId, cost);  // leitura
  if (!ok) throw new Error("Insufficient credits");
  await debitCredits(userId, cost);                  // escrita separada — não atômico

Solução: Implementar debitCreditsAtomic() usando Prisma executeRaw com SQL atômico:
  UPDATE "User"
  SET credits = credits - $cost
  WHERE id = $userId AND credits >= $cost
  RETURNING credits

Se o UPDATE retornar 0 rows, significa créditos insuficientes — retornar erro 402.
Se retornar 1 row, operação bem-sucedida — registrar CreditTransaction normalmente.

Substituir todas as chamadas hasEnoughCredits() + debitCredits() por debitCreditsAtomic() nas rotas de geração:
  src/app/api/generate/image/route.ts
  src/app/api/generate/video/route.ts  
  src/app/api/generate/tts/route.ts
  src/app/api/generate/inpaint/route.ts
  (verificar outras com grep "hasEnoughCredits")

Manter hasEnoughCredits() para uso informativo (UI de preview), mas não para autorização.
Regras: sem Prisma migration, tsc limpo, build limpo, commit e push.
```

---

### Prompt 7B — Rate Limiting

```
Implementar rate limiting nas rotas críticas do SaaSArq.

Instalar: npm install @upstash/ratelimit @upstash/redis

Criar src/lib/rate-limit.ts com configurações:
  - generateLimiter: 10 requests / 60 segundos por userId (rotas de geração)
  - assistantLimiter: 20 requests / 60 segundos por userId

Aplicar generateLimiter em:
  src/app/api/generate/image/route.ts
  src/app/api/generate/video/route.ts
  src/app/api/generate/tts/route.ts
  src/app/api/generate/inpaint/route.ts

Aplicar assistantLimiter em:
  src/app/api/assistant/route.ts

Resposta ao ser bloqueado: 429 com { error: "Rate limit exceeded", retryAfter: X }

Variáveis de ambiente necessárias: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
Adicionar ao .env.example (não ao .env real).

Regras: tsc limpo, build limpo. Não alterar Stripe/Clerk/FAL.
Commit e push ao final.
```

---

### Prompt 8A — Cron Jobs (cleanup-stuck + daily-snapshot)

```
Implementar cron jobs operacionais no SaaSArq.

PARTE 1 — cleanup-stuck (sem migration):
  Criar src/app/api/cron/cleanup-stuck/route.ts
  GET handler protegido por: Authorization: Bearer $CRON_SECRET
  Lógica: Generation WHERE status = 'PROCESSING' AND updatedAt <= now() - 30min → SET status = 'FAILED', errorMessage = 'Timeout automático pelo sistema'
  Retornar { cleaned: N, timestamp }

PARTE 2 — daily-snapshot (requer migration):
  Adicionar ao prisma/schema.prisma:
    model DailySnapshot {
      id           String   @id @default(cuid())
      date         DateTime @unique
      mrr          Float
      arr          Float
      totalUsers   Int
      activeUsers  Int
      newUsers     Int
      totalGens    Int
      completedGens Int
      failedGens   Int
      totalCostUSD Float
      createdAt    DateTime @default(now())
    }
  
  Criar src/app/api/cron/daily-snapshot/route.ts
  GET handler protegido por CRON_SECRET
  Lógica: coletar dados do dia (reusar queries do /api/admin/stats e /api/admin/costs)
  Criar DailySnapshot com upsert por date (idempotente)

  Migration: npx prisma migrate dev --name add-daily-snapshot

PARTE 3 — vercel.json:
  Criar/atualizar vercel.json com:
  {
    "crons": [
      { "path": "/api/cron/cleanup-stuck", "schedule": "0 * * * *" },
      { "path": "/api/cron/daily-snapshot", "schedule": "0 0 * * *" }
    ]
  }

Variável: CRON_SECRET no .env.example

Regras: tsc limpo, build limpo. Crons chamam internamente, não expõem dados.
Commit e push ao final.
```

---

### Prompt 9A — Página de Detalhe do Usuário

```
Criar a página /admin/users/[id] no SaaSArq usando a API GET /api/admin/users/[id] já existente.

A API retorna: { user: { id, email, name, plan, credits, isAdmin, createdAt, generations[], creditTransactions[] } }

Criar: src/app/admin/users/[id]/page.tsx

Layout da página:
  - Header com nome/email do usuário, badge de plano, badge admin (se aplicável)
  - Cards: créditos atuais, total de gerações, gerações bem-sucedidas, data de cadastro
  - Tabela de gerações recentes (últimas 20): tool, model, status, custo, data
  - Tabela de transações de crédito recentes (últimas 20): tipo, valor, data
  - Botão voltar para /admin/users

Visual: manter padrão premium dark (bg-[#0a0a0a], border-white/5, zinc palette) igual às outras páginas admin.
Loading: animate-pulse skeletons em todos os painéis.
Error: banner rose-500/10.

Regras: "use client", fetch real da API, sem mocks, tsc limpo, build limpo.
Commit e push ao final.
```

---

**Fim do relatório.**  
**Próximo passo recomendado:** Executar Prompt 5A (middleware + modelo Claude) — zero risco, 2 minutos, deploy imediato.
