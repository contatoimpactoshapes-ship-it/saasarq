# ARCHITECTURE — DOUTRINA ESTRUTURAL E ENGENHARIA DE SISTEMAS

> DOCUMENTO SOBERANO DE ARQUITETURA. TODAS AS IMPLEMENTAÇÕES DEVEM SUBORDINAÇÃO ESTRITA A ESTAS DIRETRIZES.

## 1. VISÃO GERAL DA ARQUITETURA
O sistema foi concebido sob a premissa de uma arquitetura estritamente desacoplada. O ecossistema prioriza a orientação a componentes e estado isolado na camada de apresentação ("Anti-Gravity"), e serviços distribuídos/stateless no server-side. O objetivo basilar é garantir performance extrema e previsibilidade lógica em toda a stack.

## 2. FILOSOFIA ARQUITETURAL
- **Simplicidade (KISS):** O menor número possível de partes móveis. Abstrações devem solucionar gargalos tangíveis, nunca cenários puramente hipotéticos.
- **Escalabilidade Horizontal:** Componentes de infraestrutura são desenhados sem retenção de estado de sessão na memória de processos individuais.
- **Legibilidade > Esperteza:** A coesão do código favorece a auditoria humana. Arquiteturas de código denso de uma linha são rejeitadas em favor de passos lógicos limpos.
- **Baixo Acoplamento:** Fronteiras de domínio rígidas. Alterações em um módulo não devem irradiar quebras invisíveis no sistema.

## 3. ESTRUTURA GLOBAL DO PROJETO
Adota-se uma topologia baseada em limites lógicos claros de um monorepo ou diretório unificado: a infraestrutura de conhecimento e doutrina (`/docs`) separada estritamente do código de execução primário (`/src`).

## 4. ESTRUTURA DE PASTAS
Árvore topológica Next.js (App Router):
```text
/docs           # Doutrina IA, regras estáticas e registro arquitetural
/src
  /app          # App Router: rotas, páginas e Server Components
  /components   # Estruturas visuais reusáveis e componentes UI (Radix/Tailwind)
  /lib          # Utilitários, configurações de Prisma, validações e lógicas
  /stores       # Gerenciamento de estado global Client-Side (Zustand)
```

## 5. SEPARAÇÃO DE RESPONSABILIDADES
- **Client Components (`"use client"`):** Puramente responsáveis por reatividade de UI, animações (Framer Motion) e estado efêmero local.
- **Server Components (RSC):** Busca de dados diretamente no banco, injetando payload estático ou serializado para os clients, reduzindo peso do JS enviado.
- **Server Actions:** Concentra algoritmos de transformação, validações Zod e transações Prisma em Server-side. Substituem a tradicional "Business Logic Layer" isolada.

## 6. FRONTEND ARCHITECTURE
- Estruturação focada em React e Tailwind CSS.
- Abordagem primária em SSG (Static Generation) ou SSR (Server-Side Rendering) nativa do Next.js.
- Camada de Animação isolada via `framer-motion` acionando propriedades de GPU (`y`, `opacity`), dispensando scripts manuais de observador.

## 7. BACKEND ARCHITECTURE
- O Backend coabita o Monorepo via Server Actions e API Routes (Route Handlers).
- O fluxo comum foca em: `Server Action -> Validação Zod -> Transação Prisma`.
- Arquitetura Serverless estrita: sem sessões em memória do nó. Auth delegada à nuvem via Clerk.

## 8. DATABASE ARCHITECTURE
- RDBMS (Relacional) primário para regras transacionais com forte tipagem e integridade referencial. Bancos em memória (ex: Redis) ou documentais estritos para sessões efêmeras ou logs.
- Todo acesso de leitura em massa deve estar acoplado a estratégias de paginação ou streaming para evitar colapso de memória.
- ORMs/Query Builders são mandatórios; strings SQL concatenadas cruas são banidas.

## 9. API ARCHITECTURE
- Interface **RESTful Level 2+** ou **GraphQL**.
- Versionamento agressivo diretamente no namespace ou no header (ex: `/api/v1/`).
- Padronização global de payload de retorno (envelope `data`, `meta`, `errors`).

## 10. FLUXO DE DADOS
- Fluxo de estado estritamente **Unidirecional**.
- No Client: `Ação do Usuário -> Dispatch de Evento -> Modificação de Estado Central/Local -> Re-renderização`.
- Na Rede: DTOs (Data Transfer Objects) validam entradas e saídas nas bordas do sistema.

## 11. SISTEMA DE AUTENTICAÇÃO
- Autenticação descentralizada (JWT - JSON Web Tokens ou padrão OAuth2).
- Os tokens nunca repousarão acessíveis no `localStorage`. Devem ser confinados em cookies criptografados marcados como `HttpOnly`, `Secure` e `SameSite=Strict`.

## 12. ESTRATÉGIA DE ESTADO GLOBAL
- O estado global é reservado estritamente para metadados que atravessam árvores profundas da UI (sessão de usuário, preferências de tema, carrinho de compras global).
- Estados de visibilidade temporal (ex: dropdown aberto) moram exclusivamente no componente que os gerencia.

## 13. ESTRATÉGIA DE COMPONENTIZAÇÃO
- Dicotomia **Container vs. Presentational**: Componentes 'burros' renderizam UI pura com base nas propriedades recebidas. Componentes 'inteligentes' injetam as propriedades obtidas dos serviços e escutam os eventos.

## 14. ESTRATÉGIA DE SERVIÇOS
- Serviços operam através de injeção de dependências ou importações controladas para garantir testabilidade.
- Funções expostas pelos serviços devem ser puras (ou possuir side-effects amplamente documentados e encapsulados).

## 15. ESTRATÉGIA DE ESCALABILIDADE
- Topologia **Shared-Nothing**: Os contêineres e lambdas podem ser duplicados ao infinito sem conflitos lógicos.
- Content Delivery Networks (CDN) mandatórias para distribuição de rotas estáticas e mídia, servindo tráfego diretamente das bordas geográficas.

## 16. ESTRATÉGIA DE SEGURANÇA
- Aplicação dogmática da política *Zero Trust*.
- Validação paramétrica rigorosa nas bordas da rede utilizando parsers de schemas (ex: Zod).
- Headers de segurança HTTP exigidos por padrão (CSP, HSTS, X-Frame-Options).

## 17. ESTRATÉGIA DE PERFORMANCE
- Scripts não cruciais para o tempo de primeira pintura devem ser importados de forma deferida/assíncrona.
- Code Splitting adotado por padrão nas camadas lógicas, baixando pacotes correspondentes à rota em atividade (Lazy Loading).
- Otimização algorítmica constante: rejeitar complexidades geométricas `O(n²)` ocultas em map/filter em grandes arrays.

## 18. ESTRATÉGIA DE VERSIONAMENTO
- Repositório mantido sob os padrões de **Trunk-Based Development** ou fluxo derivado otimizado para entregas atômicas.
- Rastreamento obrigatório do escopo através do padrão **Conventional Commits** para automatização da esteira semântica.

## 19. ESTRATÉGIA DE TESTES
- Triangulação de qualidade estrita baseada na Pirâmide de Testes: Cobertura maçante em Testes Unitários de módulos lógicos.
- Testes de E2E focados nos "happy paths" críticos de conversão.
- Qualquer alteração destrutiva sem teste unitário correspondente reprova o pipeline (CI).

## 20. CONVENÇÕES ARQUITETURAIS OBRIGATÓRIAS
1. **Zero Hardcoding Ambiental:** Ambientes (staging, prod) diferem apenas pelas strings resgatadas do ambiente em runtime (`.env`), nunca por diretivas `if (env === 'prod')` hardcoded massivamente no negócio.
2. **Fail Fast & Graceful Degradation:** Lógicas bloqueiam execuções inválidas instantaneamente nas bordas (early returns), porém sem quebrar toda a UI para o usuário (degradação graciosa).
3. **No Magic:** Códigos que dependem de premissas ocultas ou efeitos de injeção de framework complexos requerem documentação na raiz do módulo.
4. **Tratamento Universal de Falhas:** I/O sempre possui estratégia de fallback ou retry. Nenhuma promessa deve ser feita à rede sem contemplar o seu eventual rompimento temporal.
