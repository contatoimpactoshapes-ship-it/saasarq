# TASKS — GESTÃO DE DÉBITOS TÉCNICOS E BACKLOG DE SPRINT

> ARQUIVO DE CONTROLE DE FRAGMENTOS. ITENS RESOLVIDOS NÃO SÃO EXCLUÍDOS — SERVEM DE TRILHA DE AUDITORIA.

---

## SPRINT ATUAL — FASE B: CONFORMIDADE ARQUITETURAL

### [CRÍTICO] Segurança

- [ ] **B.1** — Implementar validação de assinatura HMAC no webhook FAL
  - Arquivo: `src/app/api/webhooks/fal/route.ts`
  - Contexto: Endpoint aceita qualquer POST externo sem verificar origem. Atacante pode marcar gerações como COMPLETED com URLs falsas ou forçar reembolsos via status ERROR.
  - Ação: Validar header de assinatura da FAL.ai antes de processar payload.

- [ ] **B.2** — Bloquear modelo `sora-2` com erro explícito `501 Not Implemented`
  - Arquivo: `src/lib/models.ts`, `src/app/api/generate/video/route.ts`
  - Contexto: Modelo listado com `provider: "openai"` mas todos os handlers chamam `submitFalJobRaw()`. Créditos são debitados e a geração falha silenciosamente.

### [ALTO] Qualidade e Consistência

- [ ] **B.3** — Remover `@fal-ai/serverless-client` do `package.json`
  - Contexto: Pacote deprecado coexiste com `@fal-ai/client` (substituto oficial). Risco de bundle conflict em edge functions.

- [ ] **B.4** — Diferenciar `falId` de `nano-banana-pro` e `flux2-pro`
  - Arquivo: `src/lib/models.ts:28,41`
  - Contexto: Ambos apontam para `fal-ai/flux-pro/v1.1` com preços diferentes (150 vs 120 créditos). Output idêntico com cobrança diferenciada.

- [ ] **B.5** — Tornar leitura de `process.env` nos Stripe Price IDs lazy
  - Arquivo: `src/lib/plans.ts:39`
  - Contexto: Array `PLANS` captura `process.env.STRIPE_*_PRICE_ID` na importação do módulo. Em build-time no Vercel/edge, os valores podem ser `undefined` sem erro explícito.

- [ ] **B.6** — Consolidar `saveImageFromUrl` → `saveMediaFromUrl`
  - Arquivo: `src/lib/r2.ts`, `src/app/api/webhooks/fal/route.ts`
  - Contexto: Dois funções com responsabilidades sobrepostas. `saveImageFromUrl` é limitada a imagens. `saveMediaFromUrl` cobre image/video/audio. DRY violado.

### [MÉDIO] Arquitetura — Prompt Architect (novos — 2026-05-29)

- [ ] **B.PA-1** — Consolidar `getDbUser()` em `analyses/route.ts` com `getOrCreateUser()` de `credits.ts`
  - Contexto: Duas implementações paralelas da mesma lógica de upsert de usuário. `analyses/route.ts` usa `auth() + currentUser()` separados; `credits.ts` encapsula a mesma operação em `getOrCreateUser`. DRY violado.

- [ ] **B.PA-2** — Atualizar modelo em `/api/assistant/route.ts`
  - Arquivo: `src/app/api/assistant/route.ts:47`
  - Contexto: Rota legacy usa `claude-haiku-20240307` (deprecated). Modelo atual: `claude-haiku-4-5-20251001`. Pode falhar silenciosamente em produção.

- [ ] **B.PA-3** — Eliminar double-upload de imagem no fluxo de análise
  - Contexto: A imagem de referência é enviada do cliente para o servidor duas vezes — primeiro para `POST /api/assistant/prompt-architect` (visão Claude) e depois para `POST /api/assistant/analyses` (upload R2). Otimização: `prompt-architect` pode subir para R2 e retornar o URL junto com a análise.

- [ ] **B.PA-4** — Substituir `Date.now()` por `cuid()` na chave R2 de análises
  - Arquivo: `src/app/api/assistant/analyses/route.ts:110`
  - Contexto: `prompt-analyses/${user.id}/${Date.now()}.${ext}` — colisão possível (baixíssima probabilidade) em requests concorrentes do mesmo usuário. Usar `cuid()` ou `crypto.randomUUID()`.

- [ ] **B.PA-5** — Adicionar cap de registros por usuário em `PromptAnalysis`
  - Contexto: Nenhum limite no nível de banco ou API. Usuário pode criar registros ilimitados. Sugestão: soft cap de 500 por usuário com prompt de limpeza no frontend.

- [ ] **B.PA-6** — Definir política de monetização do Prompt Architect
  - Contexto: `POST /api/assistant/prompt-architect` não debita créditos. A análise Claude Haiku tem custo (~$0.0003/req). Em escala, cobrança ou rate-limiting por plano é necessário.

- [ ] **B.PA-7** — Implementar paginação no histórico de análises
  - Arquivo: `src/app/(dashboard)/app/assistant/page.tsx`
  - Contexto: `limit=30` hardcoded sem paginação. Usuários com histórico extenso perdem acesso a análises antigas. Implementar cursor-based pagination ou "load more".

- [ ] **B.PA-8** — Feedback visual de save no Prompt Architect Studio
  - Contexto: `saveAnalysis()` não exibe toast de confirmação nem indicador de salvamento. Usuário não sabe se a análise foi persistida. Adicionar ícone de "Salvo" discreto no header do studio.

### [MÉDIO] Arquitetura

- [ ] **B.7** — Implementar rate limiting nas rotas de geração
  - Arquivos: `src/app/api/generate/*`
  - Contexto: Sem throttle por usuário. `ARCHITECTURE.md §8` exige Rate Limiting dinâmico.
  - Ação: Upstash Rate Limit (Cloudflare-compatible) ou middleware Vercel.

- [ ] **B.8** — Padronizar envelope de resposta das API Routes
  - Arquivos: `src/app/api/**`
  - Contexto: Shapes de resposta inconsistentes entre rotas. `ARCHITECTURE.md §9` exige `{ data, meta, errors }`.

- [ ] **B.9** — Adicionar versionamento `/api/v1/` nas rotas públicas
  - Contexto: `ARCHITECTURE.md §9` exige versionamento no namespace. Sem versionamento, mudanças de contrato são silenciosamente destrutivas.

- [ ] **B.10** — Corrigir default `canvasData` no schema Prisma
  - Arquivo: `prisma/schema.prisma:95`
  - Contexto: `@default("{}")` injeta string, não objeto JSON. Comportamento de parse não determinístico dependendo do driver.

- [ ] **B.11** — Remover `CREDIT_COSTS` de `models.ts` ou conectá-lo aos handlers
  - Arquivo: `src/lib/models.ts:179`
  - Contexto: Mapa `CREDIT_COSTS` nunca é lido pelos route handlers (que usam `imageModel.credits`). Fonte de verdade duplicada e órfã.

### [BAIXO] Limpeza

- [ ] **B.12** — Adicionar `src_backup_root/` e `.claude_backup_root/` ao `.gitignore`
  - Contexto: Artefatos de backup manual no working directory. Risco de commit acidental de código legado.

---

## SPRINT FUTURA — FASE C: TESTES E CI

- [ ] **C.1** — Instalar e configurar Vitest
- [ ] **C.2** — Testes unitários: `src/lib/credits.ts`, `src/lib/plans.ts`, `src/lib/models.ts`, `src/lib/r2.ts`
- [ ] **C.3** — Configurar GitHub Actions: lint → type-check → test
- [ ] **C.4** — Playwright E2E: fluxo de geração (happy path) + checkout Stripe (test mode)
- [ ] **C.5** — Criar especificações OpenAPI 3.0 para as rotas públicas (`/api/generate/*`, `/api/generations`, `/api/projects`)

---

## SPRINT FUTURA — FASE D: EXPANSÃO DE AGENTES

- [x] **D.1** — Criar `/agents/ai-agent.md` `[2026-05-23]`
- [x] **D.2** — Criar `/agents/payments-agent.md` `[2026-05-23]`
- [x] **D.3** — Atualizar `START_HERE.md` com os dois novos agentes `[2026-05-23]`
- [ ] **D.4** — Criar `docs/INTEGRATIONS.md` com contratos de FAL.ai, Stripe, R2, Clerk

---

## CONCLUÍDOS

- [x] `[2026-05-22]` Inicialização do sistema operacional estático de agentes (pasta `/docs`)
- [x] `[2026-05-23]` Transição documental: Vanilla/Jamstack → Stack React/Next.js/Tailwind/Prisma/Clerk
- [x] `[2026-05-23]` Análise de conformidade arquitetural (Relatório Fase A)
- [x] `[2026-05-23]` Sincronização documental completa (Fase A): STACK.md, MEMORY.md, TASKS.md, INTEGRATIONS.md, ai-agent.md, payments-agent.md, START_HERE.md

### SPRINT PROMPT ARCHITECT V2 — CONCLUÍDA `[2026-05-29]`

- [x] Novo modelo `PromptAnalysis` no schema Prisma — `userId`, `spaceId?`, `imageUrl?`, `imageName?`, `prompt`, `imageSummary?`, `qualityScore`, `recommendedModel`, `recommendedAspectRatio`, `suggestions[]`, `createdAt`; relações `User.promptAnalyses[]`, `Space.promptAnalyses[]`; índices em `userId`, `spaceId`, `createdAt`; `prisma db push` aplicado
- [x] `/api/assistant/prompt-architect` — POST multimodal: FormData + imagem opcional, visão Claude Haiku, system prompt de 8 camadas de prioridade, fallback estruturado sem API key, `qualityScore` 0–100, `recommendedModel`, `recommendedAspectRatio`
- [x] `src/lib/assistant/prompt-architect.ts` — system prompt oficial + tipos `PromptArchitectResponse` e `PromptArchitectMode`
- [x] `/api/assistant/analyses` — GET (lista filtrada por userId/spaceId, limit max 50) + POST (save com upload R2 opcional, validação de ownership do spaceId, R2 graceful fallback)
- [x] `/api/assistant/analyses/[id]` — GET (single, ownership check) + DELETE (ownership check)
- [x] `/app/assistant` — reescrita completa: Studio layout dois-colunas (sidebar esquerda + painel de resultados), Quality Score animado com cores semânticas, Detected Elements, Recommendations Panel, Generated Prompt com copy, Refinement Suggestions, Deploy to Workspace (handoff prompt+model+aspectRatio para gerador), Space Selector, History Panel (empty + studio states), auto-save pós-análise, restore análise do histórico, delete com guard HTTP
- [x] `/admin/spaces` — dashboard operacional com dados reais: 6 KPIs, gráfico 7 dias, ranking top users, tabela de spaces com canvas node/edge counts
- [x] `/api/admin/spaces` — API admin com 2 batches Prisma paralelos: counts, top spaces (user include), daily timestamps, top users by count, canvas analysis, generation/credit metrics por owner
- [x] QA completo: 3 bugs encontrados e corrigidos (R2 fallback, spaceId ownership, delete guard), build limpo, tsc limpo, Prisma DB verificado
- [x] Commits: `8aca420`, `6727118`, `1c1e219`, `b5dd731`, `f435a21`, `0478e4e`

---

## SPRINT ATUAL — FASE E: WORKFLOW PROFISSIONAL (Spaces)

### [ÉPICO MACRO] O Centro Operacional do Arquiteto
- [ ] **E.0** — Visão Space = Cliente/Projeto Mestre.
  - Contexto: Spaces não são apenas "telas brancas". Cada Space representa um cliente ou um projeto mestre.
- [ ] **E.0.1** — Sub-ambientes no Space com canvases independentes.
  - Contexto: Dentro do projeto mestre, o arquiteto deverá poder organizar sub-ambientes ou abas/workflows separados (ex: Sala, Cozinha, Quarto, Fachada, Renders Aprovados, Referências e Assets), cada um possuindo seu próprio canvas independente.

### [CRÍTICO] Estabilidade e Retenção de Dados
- [ ] **E.1** — Persistência do workflow e auto-save.
  - Contexto: O canvas de nós do usuário deve ser salvo no banco e restaurado ao reabrir o projeto.
- [ ] **E.2** — Persistência exata de nodes e edges no React Flow.
  - Contexto: Garantir que as posições XY e os estados de seleção de cada nó não se percam.

### [ALTO] UX e Funcionalidades Core
- [ ] **E.3** — Multi-image workflow.
  - Contexto: Permitir cadeias de geração onde múltiplas imagens convergem, ou uma imagem gera 4 variações simultâneas.
- [ ] **E.4** — Multi-selection.
  - Contexto: Possibilitar a seleção, movimentação e exclusão de múltiplos nós simultaneamente (arrasto/box selection).
- [ ] **E.5** — Organização de imagens geradas.
  - Contexto: Painel ou galeria estruturada dentro ou fora do canvas para acessar históricos.

### [MÉDIO] Produto
- [ ] **E.6** — Integração com Projects/Spaces.
  - Contexto: Cada Space precisa pertencer a um Project claro na hierarquia do Prisma.
- [ ] **E.7** — Workflow contínuo para arquitetos.
  - Contexto: Otimizar o layout e o painel de propriedades do xyflow especificamente para geração in-paint/render 3D focados no mercado arquitetônico.
