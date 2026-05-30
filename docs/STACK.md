# STACK — ECOSSISTEMA TECNOLÓGICO SOBERANO

> DOCUMENTO OFICIAL DA STACK. O USO DE TECNOLOGIAS NÃO LISTADAS NESTE ARQUIVO É ESTRITAMENTE PROIBIDO.

## 1. FILOSOFIA DA STACK
A seleção tecnológica deste projeto repousa sobre o pragmatismo da engenharia. A prioridade absoluta é estabilidade estrutural. Rejeita-se categoricamente ecossistemas experimentais em prol de ferramentas consolidadas (mature ecosystem), manutenção clara, escalabilidade nativa, performance intransigente e simplicidade.

## 2. STACK FRONTEND OFICIAL
- **Framework Core:** Next.js (App Router) e React.
- **Estilização e Componentes:** Tailwind CSS para estilos base e Radix UI para componentes semânticos acessíveis.
- **Comportamento & Animação:** `framer-motion` para orquestrar as animações de rolagem (Padrão "Anti-Gravity").
- **Gestão de Estado & Validação:** Zustand, React Hook Form e Zod.

## 3. STACK BACKEND OFICIAL
- **Core Runtime:** Next.js Server Components e Server Actions.
- **Arquitetura Secundária:** API Routes e funções Serverless Vercel para Webhooks e integrações externas pesadas.

## 4. STACK DE BANCO DE DADOS
- **RDBMS Primário:** PostgreSQL (Gerenciado via Supabase).
- **Data Access:** Prisma ORM (Garante type-safety estrito nas operações, proibido strings SQL cruas).

## 5. STACK DE AUTENTICAÇÃO
- **Provedor:** Clerk (`@clerk/nextjs`).
- O Clerk abstrai toda a complexidade transacional de JWT e controle de cookies de sessão, gerenciando a persistência com segurança corporativa. É proibida a manipulação manual de sessões ou cookies de auth que interfiram no fluxo do Clerk.

## 6. STACK DE APIs
- **Paradigma de Comunicação:** RESTful (Level 2/3 de maturidade de Richardson).
- **Contrato Obrigatório:** Especificação OpenAPI 3.0+ (Swagger). Nenhuma rota pode ser concebida sem seu respectivo contrato documentado.
- **Validação:** Zod (Para validação estrita de payload nas bordas da aplicação, garantindo integridade e inferência estática futura caso TS seja adotado).

## 7. STACK DE DEPLOY
- **Hosting Frontend (Static/Edge):** Vercel, Netlify ou arquitetura CloudFront + S3.
- **Hosting Backend:** AWS (ECS/EKS) ou PaaS consolidados (Render/Railway), dependendo da carga e fase estrutural.
- **Automação (IaC):** Terraform (Para descrever infraestrutura primária como código, proibindo alterações manuais no painel das provedoras cloud).

## 8. STACK DE TESTES
- **Testes Unitários:** Vitest (Rapidez excepcional) ou Jest.
- **Testes E2E (End-to-End):** Playwright (Preferível sobre Cypress devido à arquitetura multi-thread, isolamento estrito de contexto e performance).
- **CI/CD:** GitHub Actions.

## 9. STACK DE MONITORAMENTO
- **APM:** Datadog ou Sentry (Para rastreio de anomalias em tempo de execução e análise de gargalos (bottlenecks)).
- **Observabilidade Universal:** OpenTelemetry.
- **Uptime:** Ping e verificação sintética via BetterUptime ou UptimeRobot.

## 10. STACK DE LOGS
- **Formatação Primária:** Logs puramente estruturados em formato JSON (NDJSON).
- **Ferramentas de Captura (Backend):** Pino (Node.js) visando zero overhead de I/O.
- **Agregador (Observabilidade):** Datadog Logs ou ELK Stack (Elasticsearch, Logstash, Kibana).

## 11. STACK DE ANALYTICS
- **Estratégia Tracking:** First-party data. Minimizar chamadas a trackers externos que bloqueiem a thread principal de UI.
- **Coletores Aprovados:** Plausible Analytics (Estratégia Lightweight/Privacy-first) ou GA4 assíncrono estritamente acoplado via GTM com deferência de execução.

## 12. STACK DE SEGURANÇA
- **Filtro de Tráfego:** Cloudflare WAF.
- **Isolamento de Segredos:** AWS Secrets Manager ou Doppler (Gestão de variáveis `.env` blindada e descentralizada).
- **Análise Estática (SAST):** SonarQube integrado à esteira de pipelines de Pull Requests.

## 13. STACK DE PERFORMANCE
- **Network Level:** Transporte via protocolo HTTP/2 (ou HTTP/3 QUIC se suportado pelo Edge). Compressão Brotli preferida sobre Gzip.
- **Resource Delivery:** Imagens dimensionadas dinamicamente (`srcset`) e minificação compulsória de todos os bundles estáticos de estilo e JS.

## 14. FERRAMENTAS PERMITIDAS
- **Linting:** ESLint acoplado com Prettier (Garantindo que debates de estilo de código sejam invalidados pelo auto-formater).
- **Hooks de Proteção:** Husky e lint-staged em ambiente de desenvolvimento local.
- **Version Control:** Git (Uso de rebase ao invés de merge em features branches locais para árvore linear).
- **Ícones:** `lucide-react` (padrão de ícones do ecossistema shadcn/ui — único pacote de ícones autorizado).
- **Notificações Toast:** `sonner` (toast notifications leves, compatível com Tailwind e shadcn/ui).
- **Dark Mode:** `next-themes` (provider de tema Dark/Light integrado ao Next.js App Router).
- **shadcn/ui Utilities:** `class-variance-authority`, `tailwind-merge`, `tailwindcss-animate` (dependências do ecossistema shadcn/ui, autorizadas implicitamente pelo uso de shadcn/ui).
- **Webhook Validation:** `svix` (validação de assinaturas de webhooks Clerk — uso restrito a `src/app/api/webhooks/clerk`).

## 15. FERRAMENTAS PROIBIDAS
- **Moment.js:** Massivamente obsoleto e custoso (substituir pelas APIs nativas `Intl` ou `date-fns`).
- **jQuery:** Proibido em absoluto. O DOM é manipulado via React.
- **CSS Vanilla Isolado:** Proibido criar arquivos `.css` grandes. A regra mandatória é utilizar Tailwind CSS inline nas tags.
- Bibliotecas em versão Alpha, Beta ou Release Candidate (RC) são sumariamente vetadas em ambiente principal.

## 16. CONVENÇÕES DE DEPENDÊNCIAS
- Tolerância arquitetural zero para pacotes frívolos fora do ecossistema principal.
- Dependências visuais de UI devem se restringir aos padrões do `Radix UI` e bibliotecas compatíveis geradas em Tailwind (ex: `shadcn/ui`), evitando ao máximo empilhar bibliotecas que conflitem em estilo.
- Exceção aprovada: `@xyflow/react` é autorizado exclusivamente para o módulo de Workflow Visual (`src/components/workflow/*`). Uso fora desse escopo requer aprovação do Arquiteto-Chefe.

## 17. ESTRATÉGIA DE VERSIONAMENTO
- **Versão Semântica Rigorosa:** SemVer (Major.Minor.Patch).
- A base do versionamento e dos bloqueios de pacote será garantida pela imutabilidade humana no arquivo `package-lock.json`. Modificações lógicas nesse arquivo devem advir exclusivamente do CLI do NPM.

## 18. ESTRATÉGIA DE ATUALIZAÇÃO DE LIBS
- Automação de mitigação de risco: O pacote Dependabot (ou Renovate) deve varrer vulnerabilidades críticas.
- Atualizações de nível `Patch` e `Minor` ocorrem com aprovação automatizada por CI (se a suíte E2E passar em verde). `Major` updates requerem auditoria de quebra de contrato.

## 19. ESTRATÉGIA DE AMBIENTES
- **Local (`development`):** Ambiente agnóstico do engenheiro rodando com mocks pesados e tolerância a logs massivos em modo verbose.
- **Homologação (`staging`):** Espelho paritário e estrito de produção. Operará contra bancos de dados com schema idêntico, mas carga populacional filtrada e mascarada por compliance.
- **Produção (`production`):** Santuário de disponibilidade. Modificações manuais de estado (acesso SSH ao nó, scripts injetados ao vivo) são infrações operacionais críticas.

## 20. REGRAS DE CONSISTÊNCIA TECNOLÓGICA
- A stack apresentada acima é finita e vinculativa. A introdução de uma nova sub-tecnologia que inflija os propósitos de simplicidade e maturidade requer a aprovação expressa do Arquiteto-Chefe.
- Refazer componentes funcionais preexistentes em uma linguagem concorrente meramente por conveniência subjetiva do agente ou tendência de mercado está sumariamente vetado.

---

## 21. STACK DE IA E GERAÇÃO

> Homologada em `2026-05-23`. Núcleo do produto SaaS.

- **Provedor Primário de Modelos:** FAL.ai (`@fal-ai/client`).
  - Suporta: geração de imagem, geração de vídeo, inpainting, TTS, render arquitetural.
  - Padrão de uso: fila assíncrona via `fal.queue.submit()`. `fal.run()` é vetado em produção.
  - Contratos e fluxos documentados em `docs/INTEGRATIONS.md §1`.
- **Pacote Deprecado (remover):** `@fal-ai/serverless-client` — substituído por `@fal-ai/client`. Coexistência é vetada.
- **Catálogo de Modelos:** `src/lib/models.ts` — fonte de verdade para IDs, custos em créditos e endpoints FAL.
- **Editor Visual de Workflow:** `@xyflow/react` — autorizado exclusivamente em `src/components/workflow/*` para construção de pipelines visuais de geração.

## 22. STACK DE PAGAMENTOS

> Homologada em `2026-05-23`. Billing e subscriptions.

- **Provedor:** Stripe (`stripe` v16, server-side only).
  - Suporta: Checkout hospedado, subscriptions recorrentes, Customer Portal, webhooks.
  - Contratos e fluxos documentados em `docs/INTEGRATIONS.md §2`.
- **Catálogo de Planos:** `src/lib/plans.ts` — fonte de verdade para tiers (FREE → PRO), créditos e Stripe Price IDs.
- **Ledger de Créditos:** `src/lib/credits.ts` — operações de débito, reembolso e consulta de saldo.
- **Validação de Webhooks Stripe:** Via `stripe.webhooks.constructEvent()`. Assinatura obrigatória antes de qualquer processamento.

## 23. STACK DE STORAGE DE MÍDIA

> Homologada em `2026-05-23`. Persistência de outputs de geração.

- **Provedor:** Cloudflare R2 (compatível com S3 API).
- **SDK:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (S3-compatible interface).
- **Propósito:** Archivar outputs de geração de IA (imagens, vídeos, áudios) que seriam efêmeros nos CDNs dos provedores.
- **Interface de Acesso:** `src/lib/r2.ts` — `uploadToR2()`, `saveMediaFromUrl()`, `getPresignedUrl()`.
- **Estrutura de Keys:** `generations/{generationId}/{index}.{ext}` e `uploads/{userId}/{timestamp}.{ext}`.
- Contratos documentados em `docs/INTEGRATIONS.md §3`.

## 24. EXCEÇÕES ARQUITETURAIS APROVADAS

> Registra desvios da arquitetura padrão aprovados explicitamente pelo Arquiteto-Chefe.

| Biblioteca | Desvio | Justificativa | Escopo de Uso | Data |
|---|---|---|---|---|
| `@xyflow/react` | Fora do ecossistema Radix/shadcn | Capacidade de diagrama/workflow sem alternativa equivalente no ecossistema padrão | `src/components/workflow/*` apenas | 2026-05-23 |
| `svix` | Backend utility não previsto | Exigido pela Clerk para validação segura de webhooks com header parsing | `src/app/api/webhooks/clerk` apenas | 2026-05-23 |
