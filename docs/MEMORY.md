# MEMORY — SISTEMA PERSISTENTE DE MEMÓRIA OPERACIONAL

> ARQUIVO DE ESTADO GLOBAL. ESTE DOCUMENTO GARANTE A CONTINUIDADE LÓGICA E CONTEXTUAL ENTRE SESSÕES E AGENTES IA.

## 1. OBJETIVO DA MEMÓRIA OPERACIONAL
Armazenar e recuperar decisões arquiteturais, o estado consolidado da aplicação e regras de longo prazo. O objetivo estrito é impedir a amnésia contextual, retrabalho estrutural ou a adoção de lógicas conflitantes por diferentes instâncias de agentes em sessões variadas.

## 2. ESTADO ATUAL DO PROJETO
- **Produto:** SaaS de geração de mídia com IA (imagem, vídeo, áudio, ferramentas criativas).
- **Fase:** Fase 11 do Roadmap — Foco total na construção do Workflow Visual Profissional (Spaces).
- **Diretório Raiz:** `C:\Users\Administrador\saasarq` (monorepo único — sem sub-diretório de projeto).
- **Deploy Target:** Vercel (configurado via `vercel.json`).
- **Pendências Ativas:** Ver `docs/TASKS.md` — prioridade máxima para persistência do workflow, auto-save e multi-image no React Flow.

## 3. DECISÕES ARQUITETURAIS APROVADAS
- Adoção oficial do Next.js 14 (App Router) como base de todo o SaaS.
- Layout baseado em Mobile-First com Tailwind CSS.
- Separação mandatória: Server Components para busca de dados e Client Components restritos a interatividade UI.
- Centralização de conhecimento arquitetural isolada estritamente na pasta `/docs`.
- Backend via Route Handlers (`/api/*`) como padrão atual. Server Actions são o target arquitetural futuro para mutações internas conforme `ARCHITECTURE.md §5`.
- FAL.ai como provedor exclusivo de modelos de IA generativa. Padrão assíncrono de fila obrigatório.
- Cloudflare R2 como storage permanente de outputs de geração.
- Stripe como gateway de pagamentos e billing recorrente.
- Clerk como provedor de autenticação — sem manipulação manual de sessões ou JWTs.

## 4. STACK OFICIAL
- **Linguagens Base:** TypeScript, React, Tailwind CSS.
- **Framework Core:** Next.js 14.2.5 (App Router).
- **Auth:** Clerk (`@clerk/nextjs` v5).
- **ORM + Banco:** Prisma v5 + PostgreSQL (Supabase).
- **Validação:** Zod.
- **Estado Global:** Zustand.
- **Animações:** Framer Motion.
- **UI Components:** Radix UI + shadcn/ui.
- **Formulários:** React Hook Form.
- **Tipografia:** Geist (via `geist` package, importado em `src/app/layout.tsx`).
- **IA e Geração:** `@fal-ai/client` (FAL.ai).
- **Pagamentos:** `stripe` v16.
- **Storage de Mídia:** Cloudflare R2 via `@aws-sdk/client-s3`.
- **Workflow Visual:** `@xyflow/react` (escopo restrito a `src/components/workflow/*`).
- **Utilitários aprovados:** `lucide-react`, `sonner`, `next-themes`, `svix`, `tailwind-merge`, `class-variance-authority`, `tailwindcss-animate`.

## 5. CONVENÇÕES GLOBAIS
- **Nomenclatura de Arquivos:** Formato `kebab-case` para arquivos utilitários; PascalCase para componentes React.
- **Escopo CSS:** Variáveis globais declaradas em `src/app/globals.css` sob `:root`.
- **Idioma do Código:** Nomenclatura de variáveis, funções e classes em inglês. Copywriting da UI em português (pt-BR).
- **Moeda:** BRL (Real). Checkout Stripe configurado com `locale: "pt-BR"`, `currency: "brl"`.

## 6. ARQUITETURA DE ROTAS
- `/` — Landing page pública.
- `/pricing` — Página de planos (pública).
- `/stock` — Acesso a banco de imagens stock.
- `/login`, `/signup` — Auth via Clerk Hosted UI.
- `/app/*` — Área protegida (middleware Clerk obrigatório).
- `/app/ai-image-generator` — Gerador de imagens com modelos FAL.
- `/app/ai-video-generator` — Gerador de vídeos com modelos FAL.
- `/app/projects` — CRUD de projetos do usuário.
- `/app/spaces` — Gestão de Spaces (Projetos Mestre) contendo múltiplos workflows com canvases independentes.
- `/app/tools/*` — Ferramentas especializadas (3D, Audio, Image, Video).
- `/app/assistant` — Chat AI assistido.
- `/api/*` — Route Handlers (geração, projetos, créditos, checkout, webhooks).

## 7. SCHEMA DE DADOS (RESUMO)
- `User` — vinculado ao `clerkId`, possui `Plan` enum, `credits` Int, `stripeCustomerId`.
- `Generation` — rastreamento de cada job de IA: `ToolType`, `model`, `status`, `falRequestId`, `outputUrls[]`, `creditsCost`.
- `Project` — agrupador de gerações por usuário.
- `Space` — workspace canvas com `canvasData: Json`.
- `CreditTransaction` — ledger imutável de débitos e reembolsos de créditos.
- `PinnedTool` — ferramentas fixadas na sidebar por usuário.

## 8. PLANOS E CRÉDITOS
| Plano | Créditos/mês | Preço Mensal |
|---|---|---|
| FREE | 0 | R$ 0 |
| ESSENTIAL | 8.000 | R$ 10 |
| PREMIUM | 20.000 | R$ 20 |
| PREMIUM+ | 45.000 | R$ 45 |
| PRO | 300.000 | R$ 280 |

Fonte de verdade: `src/lib/plans.ts`.

## 9. REGRAS DE CONTINUIDADE
- Nenhuma sessão paralela ou futura deve reverter diretrizes consolidadas neste arquivo sem aprovação taxativa do Arquiteto-Chefe.
- Ao retomar código preexistente, o agente deve recuperar as dependências observadas em imports, abstendo-se de substituí-las baseando-se em achismos.
- O estado atual e real do código no ambiente sobrepõe qualquer conhecimento pré-treinado do modelo. Ler os arquivos antes de agir.

## 10. REGRAS DE PRESERVAÇÃO DE CONTEXTO
- Modificações em sub-features não justificam a reformatação estética/estrutural massiva do bloco de código original.
- A árvore de arquivos consolidada no disco deve ser preservada. Adições são permitidas; exclusões requerem consenso sistêmico.

## 11. REGRAS DE COMPATIBILIDADE
- Lógicas de JavaScript devem deter retrocompatibilidade razoável (ES6 suportado em browsers majoritários modernos).
- UI responsiva amparada no uso nativo de `clamp()`, Flexbox e Grid CSS moderno.
- É vetado o uso de pré-processadores CSS pesados (SCSS/LESS).

## 12. REGISTRO DE DECISÕES FUTURAS
- [PENDENTE] Migração das mutações de Route Handlers para Server Actions (conforme `ARCHITECTURE.md §5`).
- [PENDENTE] Implementação de versionamento de API `/api/v1/`.
- [PENDENTE] Implementação de validação de assinatura HMAC no webhook FAL (`débito B.1`).
- [AGUARDANDO] Implementação real do modelo `sora-2` (atualmente bloqueado sem handler OpenAI).

## 13. REGISTRO DE MUDANÇAS CRÍTICAS
- `2026-05-22`: Inicialização do sistema operacional estático de agentes (Pasta `/docs`).
- `2026-05-23`: Transição da doutrina LIDX de arquitetura Vanilla/Jamstack para Stack React/Next.js com Tailwind, Prisma e Clerk.
- `2026-05-23`: Análise de conformidade arquitetural completa. Identificação de 12 débitos técnicos.
- `2026-05-23`: Correções de upload na Vercel e endpoints de inpainting (flux-pro/v1/fill).
- `2026-05-23`: Abertura da Sprint Fase E — Foco total no Workflow Profissional (Spaces).
- `2026-05-24`: Atualização da definição de Spaces: Space é agora considerado o Cliente/Projeto Mestre, capaz de abrigar múltiplos sub-ambientes e galerias (Sala, Cozinha, Referências, Assets).
- `2026-05-25`: Atualização da arquitetura de Spaces: Sub-ambientes/workflows agora possuem seus próprios canvases independentes.

## 14. REGRAS PARA EVITAR REGRESSÃO
- Regressões visuais são inaceitáveis. Avalie as ramificações de impacto antes de reescrever qualquer variável CSS global (`:root`).
- Funções declaradas não podem ser suprimidas sem varredura completa evidenciando que não existem referências vivas na codebase.
- `src/lib/credits.ts` é camada crítica — alterações requerem revisão pelo `payments-agent`.
- `src/lib/fal.ts` e `src/lib/models.ts` são camadas críticas — alterações requerem revisão pelo `ai-agent`.

## 15. REGRAS PARA EVITAR REGRESSÃO
- Regressões visuais são inaceitáveis. Avalie as ramificações de impacto antes de reescrever qualquer variável CSS global (`:root`).
- Funções declaradas não podem ser suprimidas sem varredura completa (via ferramentas de texto) evidenciando que não existem referências vivas na codebase.

## 16. HISTÓRICO ARQUITETURAL
- **[v1.0.0]** — Gênese Documental. Preparação do terreno e constituição arquitetural inicial.
- **[v1.1.0]** — Transição para Stack full-stack React/Next.js. Dashboard, geração IA, pagamentos e storage operacionais.
- **[v1.2.0]** — Sincronização Documental (Fase A). Doutrina atualizada para refletir estado real do produto.

## 17. REGRAS DE SINCRONIZAÇÃO ENTRE AGENTES
- Um agente, ao ser invocado, deve assimilar que a sua memória efêmera local é submissa a este arquivo.
- Instâncias distintas (Claude, Gemini, GPT) deverão alinhar suas inferências lógicas à última versão salva desta documentação.
- Ao completar uma tarefa que altere decisões arquiteturais, o agente deve propor atualização deste arquivo ao Arquiteto-Chefe.

## 18. REGRAS DE LEITURA OBRIGATÓRIA ANTES DE EXECUTAR TAREFAS
1. Escanear `MASTER_PROMPT.md` para reabsorver as restrições comportamentais do projeto.
2. Ler `MEMORY.md` para herdar o estado real e a stack imposta.
3. Ler `docs/INTEGRATIONS.md` se a tarefa envolver FAL.ai, Stripe, R2 ou Clerk.
4. Inspecionar o disco no escopo da `[TAREFA ATUAL]`.

## 19. ESTADO OFICIAL DO PROJETO COMO FONTE ABSOLUTA DA VERDADE
- A realidade incontestável do projeto não está nos pesos de treinamento do agente, mas sim nos artefatos fixados no workspace e nesta documentação.
- Supor dependências não listadas na "Stack Oficial" constitui desobediência crítica de protocolo, classificada como alucinação autônoma.
- Em caso de conflito entre este arquivo e o código em disco: o código em disco é a verdade factual; este arquivo é a intenção arquitetural. Reportar divergência ao Arquiteto-Chefe.
