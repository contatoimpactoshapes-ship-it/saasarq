# ROADMAP — MAPA ESTRATÉGICO E DIRETRIZES DE EXECUÇÃO

> CRONOGRAMA TÁTICO OFICIAL. A EXECUÇÃO FORA DE ORDEM DESTE ROADMAP É ESTRITAMENTE PROIBIDA SEM AUTORIZAÇÃO DO ARQUITETO-CHEFE.

## 1. VISÃO GERAL DO ROADMAP
O presente roadmap estabelece a sequência cronológica e as dependências críticas para a execução da engenharia deste software. O ciclo de desenvolvimento baseia-se na entrega atômica: consolidação inicial da doutrina, fundação de UI, ramificação para serviços de backend (se aplicável), e blindagem de segurança para escala de produção.

## 2. OBJETIVO MACRO DO PROJETO
Desenvolver, validar e dispor em produção um produto digital íntegro, de altíssima taxa de conversão e estabilidade extrema. A execução começará por interfaces premium ("Anti-Gravity") e progredirá rumo à escala full-stack controlada, aderindo dogmaticamente às convenções impostas em `/docs`.

## 3. FASE 0 — PREPARAÇÃO E DOCUMENTAÇÃO
- Implantação e preenchimento dos artefatos da constituição do sistema (`MASTER_PROMPT.md`, `AI_RULES.md`, `ARCHITECTURE.md`, `STACK.md`, `MEMORY.md`, `TASKS.md`, `ROADMAP.md`).
- Consolidação do ecossistema operacional dos Agentes de IA.
- Absorção rígida das restrições e diretrizes impostas.

## 4. FASE 1 — FUNDAÇÃO TÉCNICA
- Inicialização da árvore raiz de diretórios (`/src`, `/assets`, `/css`, `/js`).
- Estabelecimento do design system agnóstico: tokens, root CSS vars de cores, tipografia e curvas de animação.
- Configuração do motor base de visualização e arquivos de reset globais.

## 5. FASE 2 — ESTRUTURA INICIAL DO PRODUTO
- Estruturação do esqueleto HTML Semântico principal.
- Criação do "Hero" e do Grid de Features (Layouts premium).
- Estabelecimento responsivo do viewport base e containers fluidos de espaçamento.

## 6. FASE 3 — FUNCIONALIDADES PRINCIPAIS
- Intersecção de Controladores de DOM (IntersectionObserver) para orquestrar as animações de rolagem e efeitos cinematográficos.
- Implementação total do estado local (Dark/Light mode e triggers UI).
- Garantia de paridade 1:1 de design em telas móveis e larguras ultrawide.

## 7. FASE 4 — AUTENTICAÇÃO E BANCO DE DADOS
- Transição da stack estática para conectividade (Caso a arquitetura exija).
- Definição do schema relacional no ORM.
- Implementação de middleware transacional, rotas isoladas e Gateway de Autenticação (OIDC/JWT/HttpOnly Cookies).

## 8. FASE 5 — DASHBOARD E INTERFACE
- Desenvolvimento das camadas restritas de Dashboard/Painel (Áreas pós-login).
- Hidratação dos componentes com os dados provindos dos endpoints protegidos.
- Verificação exaustiva de acesso indevido (Rotas guardadas no Frontend).

## 9. FASE 6 — INTEGRAÇÕES EXTERNAS
- Acoplamento seguro de Gateways de Pagamento via injeção de SDK.
- Configuração de disparo assíncrono para envios de transações de e-mail e mensageria.
- Recepção, sanitização e registro de webhooks de provedores de terceiros.

## 10. FASE 7 — TESTES E VALIDAÇÃO
- Criação e execução completa da suíte de Testes Unitários nas lógicas de domínio (`Business Services`).
- Execução mecânica dos cenários felizes e caminhos de exceção crítica via Testes E2E (Playwright).
- Análise sintética multi-dispositivo.

## 11. FASE 8 — SEGURANÇA E PERFORMANCE
- Blindagem anti-XSS, CSRF e SQLi. Adição restritiva de HTTP Security Headers (CSP, HSTS).
- Auditoria autônoma do peso dos payloads transportados (Minificação avançada de mídia, deferência de imports lentos).
- Profiling de uso de thread-pool e de conexões ao banco.

## 12. FASE 9 — DEPLOY
- Parametrização da esteira CI/CD em conformidade com o branch *main/master*.
- Inserção silenciosa de Secrets em Vaults da provedora Cloud (AWS, Vercel, Netlify).
- Lançamento inicial de infraestrutura controlada (Smoke Testing em produção).

## 13. FASE 10 — EVOLUÇÃO E ESCALA
- Monitoramento heurístico em tempo real do log de erros (APM).
- Instalação tática de Edge Caching em rotas identificadas como pesadas.
- Manutenção orgânica e mapeamento estratégico de refatorações futuras (v2.0).

## 14. FASE 11 — WORKFLOW VISUAL PROFISSIONAL (SPACES)
- **Centro Operacional do Arquiteto:** Elevar o "Space" ao status de Cliente/Projeto Mestre.
- **Micro-Ambientes/Workflows:** O Space deixará de ser uma tela plana para suportar organização interna em workflows ou ambientes separados (Sala, Cozinha, Quarto, Fachada, Renders aprovados, Referências, Assets), cada um com seu próprio canvas independente.
- Adoção contínua da biblioteca `@xyflow/react` para criar a lógica interna dessas sub-telas com canvases isolados.
- **Persistência de Estado:** Garantir o auto-save de nodes e edges, com mapeamento correto de coordenadas (XY) da tela no banco de dados.
- **Workflow Multivariado:** Implementação do conceito multi-image, permitindo seleção de múltiplos nós (multi-selection) e conexões não lineares.

## 15. CRITÉRIOS DE CONCLUSÃO POR FASE
O aceite de avanço de fase está condicionado a:
1. Zero Débito Documental (Código purgado de abstrações invisíveis ou "TODOs" infinitos).
2. Estabilidade visual atestada e código livre de quebras nos logs.
3. Respeito irrestrito às ferramentas estipuladas no arquivo `STACK.md`.

## 15. DEPENDÊNCIAS ENTRE FASES
- A progressão não transige a linearidade. Sob nenhuma conjectura, a **Fase 4** e posteriores devem se iniciar sobre código visual de tela estilhaçada proveniente da **Fase 2**. Funcionalidade só se estende sobre fundações solidificadas.

## 16. RISCOS TÉCNICOS
- Propensão à alucinação de agentes instalando bibliotecas não homologadas (`STACK.md` override).
- Regressão acidental provinda de modificação atômica em arquivos CSS transversais sem validação estrita.
- Gargalos de assincronismo em banco ocultos em iterações de laços (N+1 Queries).

## 17. PONTOS DE VALIDAÇÃO OBRIGATÓRIOS
- **Checkpoint Visual (Fim da Fase 3):** Exige validação humana atestando o padrão "Apple-like" na interface antes de evoluir a stack.
- **Checkpoint de Contrato (Fim da Fase 6):** Exige prova de acoplamento seguro (rotas funcionais, autenticadas e testadas).
- **Checkpoint de Produção (Fim da Fase 8):** Relatório verde no Lighthouse e varreduras SAST isentas de criticidade alta/média.
