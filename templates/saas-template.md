# TEMPLATE OPERACIONAL: SAAS (SOFTWARE AS A SERVICE)

> ARTEFATO DE INICIALIZAÇÃO. ESTE DOCUMENTO DEFINE A ESTRUTURA SOBERANA PARA ACELERAR A CRIAÇÃO DE APLICAÇÕES SAAS COM ALTO RIGOR TÉCNICO E VELOCIDADE DE EXECUÇÃO.

## 1. OBJETIVO DO TEMPLATE
Prover um modelo arquitetural imutável, focado em alta velocidade de prototipação sem sacrificar a escalabilidade futura. Padronizar as decisões operacionais para que Agentes de IA operem de forma previsível, modular e segura ao construir um SaaS.

## 2. ESTRUTURA INICIAL DO PROJETO
Adoção mandatória do *Logical Monorepo*. Separação física e lógica irrestrita entre a "Landing Page" (otimizada para aquisição e SEO estático) e o "Application Core" (Dashboard transacional otimizado para estado e retenção).

## 3. ARQUITETURA RECOMENDADA
- **Frontend:** Single Page Application (SPA) para painéis autenticados; Server-Side Rendering (SSR) ou SSG para áreas públicas indexáveis.
- **Backend:** Arquitetura API-First.
- **Desacoplamento:** O Frontend é agnóstico à persistência de banco; o Backend é agnóstico à renderização da View.

## 4. STACK RECOMENDADA
- **Linguagem Base:** TypeScript (Para blindagem de tipos sistêmicos em produção escalável).
- **UI Runtime:** React, Next.js ou Vite.
- **I/O Runtime:** Node.js (Fastify ou Express) / Edge Serverless.
- **Banco de Dados:** PostgreSQL (Para integridade referencial rígida ACID).
- **Camada de Dados:** Prisma ORM, Kysely ou Drizzle.

## 5. ESTRUTURA DE FRONTEND
- Divisão hierárquica severa: *Pages* (Roteamento), *Views* (Agregação de contexto), *Components* (UI atômica reaproveitável), e *Hooks* (Gerenciamento de reatividade isolada).
- Rotas protegidas invariavelmente encapsuladas por HOCs (Higher Order Components) ou Middlewares de verificação estrita de contexto local.

## 6. ESTRUTURA DE BACKEND
- Direcionamento estrito pela via: `Routes -> Controllers -> Services -> Repositories`.
- **Controllers:** Atuam apenas como porteiros. Extraem DTOs, invocam a lógica e devolvem formatação HTTP.
- **Services:** Guardiões da regra de negócio cruzada, desconectados do ecossistema HTTP.

## 7. ESTRUTURA DE BANCO DE DADOS
- **Multi-tenancy Mandatório:** Adoção absoluta da coluna `tenant_id` (ou `workspace_id`) atrelada indissociavelmente às tabelas transacionais do core.
- Delegações de destruição controladas por constraints `ON DELETE CASCADE` ou Soft Deletes programados.
- Controle evolutivo exclusivamente mantido por Migrations automatizadas pelo ORM.

## 8. SISTEMA DE AUTENTICAÇÃO
- Emissão de Tokens OIDC / JWT para controle de estado descentralizado.
- Defesa contra extração: Transporte mandatário via Cookies assinados, dotados de diretivas `HttpOnly`, `Secure` e `SameSite=Lax`.
- Cisão estrutural do pipeline de *Autenticação* (Você existe?) e do fluxo hierárquico de *Autorização* (Você possui privilégios neste Tenant?).

## 9. ESTRUTURA DE DASHBOARD
- Shell Layout modularizado: Renderização da Sidebar (Navegação Espacial), Header (Contexto/Ações Globais) e Main Canvas persistindo fixos, recalculando estritamente a janela central de dados para omitir piscadas massivas no DOM.

## 10. ESTRUTURA DE APIs
- Versionamento ostensivo obrigatório em rotas (`/api/v1/`).
- Padrão sintático de respostas: Envelopes de status global (`{ data, meta, error }`).
- Adoção sistêmica de Cursores (Cursor-based pagination) sobre Offsets lógicos em retornos massivos de dados estruturados.

## 11. ESTRATÉGIA DE COMPONENTIZAÇÃO
- Dicção estrita entre *Smart Components* (Acarretam lógica de submissão e conversam com Hooks) e *Dumb Components* (Componentes burros e inertes, alimentados unicamente por Props limpas).
- Construção paralela de um mini Design System in-house garantindo a constância atômica.

## 12. ESTRATÉGIA DE RESPONSIVIDADE
- Tratamento Mobile-First inegociável na via pública (Acquisition Landing Pages).
- Para o Painel SaaS, design focado em densidade de dados para Desktop/Tablet, acompanhado de degradação graciosa estruturada (Listas expandidas viram Data Cards retráteis) nas instâncias de Viewports compactas.

## 13. ESTRATÉGIA DE PERFORMANCE
- Divisão orgânica do pacote inicial (Code Splitting/Lazy Loading) isolando o peso de rotas não primárias.
- Ferramental agressivo de Cache In-Memory (ex: React Query, SWR) para mitigação de Fetchings sucessivos redundantes na montagem do arvoredo DOM.
- Respostas paginadas do Backend compressas via algoritmos de borda (Brotli/Gzip).

## 14. ESTRATÉGIA DE SEGURANÇA
- Rate-Limiting parametrizado com castigos logarítmicos nas rotas suscetíveis a Brute Force.
- Higienização agressiva de Input: Barreiras de Schema Validator (Zod) aniquilando objetos divergentes do contrato antes que eles alcancem o fluxo lógico.
- Blindagem severa contra IDOR (Insecure Direct Object Reference). O Banco rejeita implicitamente consultas que não carreguem o cruzamento seguro de `$tenant_id == requisitante`.

## 15. ESTRATÉGIA DE DEPLOY
- Configuração engessada em Continuous Deployment (CD). Merge em branch `main` executa rollout determinístico sem interferência humana.
- Ambientes santificados: Isolação de `Production` (Protegida) de instâncias transitórias `Preview/Staging` (Testes).

## 16. ESTRATÉGIA DE ESCALABILIDADE
- Arquitetura de "Shared Nothing": Processos Node efêmeros não conservam o usuário localmente. O Backend pode duplicar 100x na nuvem horizontal sem quebra de sessão.
- Tráfego massivo e transações bloqueantes aliviados para *Workers* assíncronos baseados em filas genéricas (Message Brokers) caso excedam 500ms lógicos.

## 17. ESTRUTURA INICIAL DE PASTAS
```text
/src
  /api             # Endpoints, Middlewares e Schemas de Input
  /services        # Coração das Regras de Negócios 
  /models          # Instância do BD e Repositórios
  /web             # Diretório Raiz do Dashboard
    /components    # Ui Atômica (Dumb)
    /hooks         # Reatividade customizada
    /styles        # Root CSS Variables e Global Styles
/docs              # Artefatos da IA e Engenharia (Soberanos)
```

## 18. PIPELINE RECOMENDADO DE EXECUÇÃO
1. **Fase de Dados:** Modelagem estrita de schemas ACID no ORM e isolamento estrutural do `Tenant`.
2. **Fase de Acesso:** Gateway, Autenticação, Proteção criptográfica e Middlewares de Rota.
3. **Fase de Negócio:** Fabricação unida do Service Core (API) com cobertura de falha.
4. **Fase de Apresentação:** Injeção do Skeleton Dashboard, acoplamento de estados React.
5. **Fase de Sintonia:** Refinamento de I/O, UX micro-interativa e blindagem de segurança cibernética.

## 19. CHECKLIST INICIAL DO PROJETO
- [ ] O banco impede nativamente vazamentos transversais de clientes (Isolamento Multi-Tenant)?
- [ ] O CORS repudia ativamente tráfegos provindos de hosts não homologados na whitelist?
- [ ] A arquitetura isolou de forma coesa a apresentação, habilitando a troca hipotética de DB sem esfacelar a UI?
- [ ] Há esquemas validadores punitivos alocados na borda da API?

## 20. REGRAS OBRIGATÓRIAS PARA AGENTES IA
- Ao inicializar o maquinário sob este template, o Agente assume a postura tática de Arquiteto-Sênior.
- Se ordens subsequentes confrontarem as métricas de simplicidade (KISS) estipuladas nesta doutrina, o agente veta o movimento agressivo instantaneamente.
- Esquivas ao isolamento obrigatório de `Tenant_id` em buscas backend constituem Falha Crítica de Sistema, resultando em interrupção do pipeline.
