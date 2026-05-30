# TEMPLATE OPERACIONAL: SISTEMA MULTIAGENTES DE IA

> ARTEFATO DE INICIALIZAÇÃO. ESTE DOCUMENTO ESTABELECE A DOUTRINA ARQUITETURAL PARA A ORQUESTRAÇÃO DE SISTEMAS INTELIGENTES, PRIORIZANDO O CONTROLE DETERMINÍSTICO E A PREVISIBILIDADE DA EXECUÇÃO.

## 1. OBJETIVO DO TEMPLATE
Fornecer um arcabouço estrutural rigoroso para a construção de aplicações baseadas em LLMs (Large Language Models) e Agentes Autônomos. A premissa central é subjugar o caos inerente à geração probabilística através de arquiteturas de contexto estritas, memória persistente e governança militar.

## 2. ARQUITETURA DE AGENTES
- **Topologia Hierárquica:** Adoção compulsória do modelo de orquestração Supervisor-Worker. Um *Router/Supervisor Agent* processa a intenção, fraciona as tarefas e repassa aos *Specialist Agents* de domínio fechado.
- Limitação letal do escopo (*Princípio do Menor Privilégio Computacional*). O agente de pesquisa não recebe a ferramenta de reescrita em disco sob nenhuma circunstância.

## 3. ESTRUTURA DE MEMÓRIA
- **Curto Prazo (Working Memory):** Contexto temporal limpo na abertura da requisição e expurgado ao finalizar a esteira. Mantém a sanidade atencional.
- **Longo Prazo (Episodic/Semantic Memory):** Acoplamento inegociável a Bancos Vetoriais (Pinecone, Qdrant) viabilizando RAG (Retrieval-Augmented Generation). O modelo "lembra" resgatando similaridade do banco, não empilhando infinitamente o prompt.

## 4. ESTRUTURA DE CONTEXTO
- Injeção paramétrica de meta-diretrizes. Variáveis cruciais moldam as `system_instructions` no nível mais profundo de autoridade.
- Geometria de Prompt: `[LEIS FUNDAMENTAIS]` -> `[CONTEXTO GLOBAL]` -> `[AÇÃO/INTENÇÃO]` -> `[FORMATO DE SAÍDA EXIGIDO]`.
- O payload montado tem obrigatoriedade de ser aferido matematicamente para não exceder limites crônicos da *Context Window*.

## 5. SISTEMA DE GOVERNANÇA
- **Regime Human-in-the-Loop:** Decisões atômicas que modifiquem infraestrutura, consumam recursos monetários massivos ou deflagrem e-mails para terceiros exigem tranca manual (Trigger approval).
- Autonomia é confinada a um cercadinho (Sandbox) previamente delimitado pela malha.

## 6. SISTEMA DE PROMPTS
- Modularidade. *Hardcoded strings* são rejeitadas. Prompts nascem de templates versionados de maneira semântica para que atualizações obedeçam ao Git (ex: `PromptTemplates` acoplados a variáveis).
- Técnica de *Chain-of-Thought (CoT)* e *Scratchpad* enforçada. Todo Agente Sênior é obrigado a documentar sua linha orgânica de pensamento interno `[THINK]` antes de instanciar a resposta atômica.

## 7. SISTEMA DE EXECUÇÃO
- Negação da palavra crua. O output das LLMs é tratado invariavelmente como dado poluído, sendo despejado em *Output Parsers* rigorosos (ex: Zod em TypeScript). O sistema quebra se o formato JSON exato falhar.
- Retroalimentação corretiva programada. Erros de Parsing reciclam a chamada com avisos estritos ("Fix your output formatting") com Backoff progressivo.

## 8. SISTEMA DE TAREFAS
- Conversão da intenção livre em Directed Acyclic Graphs (DAGs). O Grafo determina ordem.
- Dependência mecânica: O Agente Revisor é convocado mecanicamente apenas no exato milissegundo em que o Agente Criador entrega e valida sua *Promise*.

## 9. SISTEMA DE AUDITORIA
- Todo output que modifique arquivos críticos é registrado forensemente (Quem gerou, Qual prompt gerou, Qual timestamp).
- Teste Cego (*A/B Testing* entre LLMs) executado contra Golden Datasets sintéticos mantidos inalterados pela QA arquitetural.

## 10. SISTEMA DE ANTI-ALUCINAÇÃO
- **Ancoragem Factual Estrita (Grounding):** Diretiva central instila no modelo a obrigatoriedade absoluta de citar a referência crua provida no RAG. Na ausência geométrica da resposta na memória do banco, a diretriz impõe que o agente emita falha formal em vez de "inventar" correlações estatísticas rasas.

## 11. SISTEMA DE LOGS
- Absorção irrestrita de Raw Completions atrelados a um *Trace ID*. Cada ramificação dos agentes compartilha o mesmo identificador na sessão raiz.
- Log de *Cost Monitoring*: Extração compulsória da contagem de Tokens (Prompt/Completion) por request e soma holística limitante.

## 12. SISTEMA DE PERSISTÊNCIA
- Transações da IA não flutuam. Todas as ramificações analíticas de raciocínio são armazenadas no DB transacional em estado estacionário, viabilizando continuação da esteira de pensamento caso a rede rompa transitoriamente.

## 13. ESTRATÉGIA DE COORDENAÇÃO ENTRE AGENTES
- Comunicação controlada por *Message Bus*. Agentes não conversam livremente em prosa romântica via threads; transmitem e processam envelopes de dados imutáveis via eventos.

## 14. ESTRATÉGIA DE ESCALABILIDADE
- Arquitetura nativamente tolerante ao limite (Rate Limits das provedoras). Throttle dinâmico de requests com inserção passiva em filas para absorver requisições `429 Too Many Requests`.
- Contêineres isolados ou Lambdas orquestrando agentes sem preservação nativa de estado.

## 15. ESTRATÉGIA DE OBSERVABILIDADE
- Infraestrutura acoplada a *Tracing* de IA (LangSmith, Braintrust ou telemetria open-source). O mapa completo da latência de geração de token e das execuções sistêmicas das *Tools* será legível instantaneamente no Painel Central.

## 16. ESTRATÉGIA DE SEGURANÇA
- A assepsia de Chaves (API Keys) processa-se em *Backend Vaults*. Frontends clientes jamais tocam endpoints da provedora IA primária diretamente.
- Oposição bélica a *Prompt Injections*. O *payload* recebido pelo usuário atravessa um classificador leve descartável focado em barrar engenharia hostil de contexto antes que o roteador principal acorde.

## 17. ESTRUTURA INICIAL DE PASTAS
```text
/src
  /agents          # Identidade, Boundaries, Regras e Instâncias LLM
  /tools           # Arsenal Instrumental delimitado e isolado
  /memory          # Orquestração do RAG, Embeddings e Conector Vetorial
  /orchestrator    # Motor de Grafo (DAG), Delegações e Message Bus
  /config          # Limiares heurísticos (Temperature, Top_p) e Zod Parsers
/docs              # Contratos Fundamentais 
```

## 18. PIPELINE OPERACIONAL RECOMENDADO
1. **Modelagem Semântica:** Imposição do Contrato, Criação do Roteador/Supervisor e Definição das Personas Operárias.
2. **Sistema Nervoso e Tooling:** Integração do Vector DB, estruturação das Ferramentas Matemáticas externas.
3. **Barreiras de Parsers:** Implementação da camada coercitiva formatadora (JSON validation).
4. **Acoplamento Cerebral (Conexão LLM):** Afinação de Prompts e RAG Pipeline para eliminação da alucinação.
5. **Ensaio de Estresse:** Provocação artificial de Prompt Injection e métricas de Recuperação.

## 19. CHECKLIST OBRIGATÓRIO
- [ ] As respostas do Agente são coercitivamente empacotadas em JSON testável em vez de blocos genéricos de texto livre?
- [ ] Há barreiras tangíveis impedindo chamadas recursivas infinitas das Tools pela máquina?
- [ ] O Grounding foi checado? A IA declara sua "ignorância" frente a um conceito alienígena em vez de divagar?
- [ ] A arquitetura monitora a integridade de token budget por usuário?
- [ ] Operações transacionais possuem *Trigger Manual* no ciclo?

## 20. REGRAS OBRIGATÓRIAS PARA AGENTES IA
- O Agente invocado age invariavelmente como Arquiteto de Sistemas Multi-Agent. A engenharia e a governança prevalecem sobre a abstração criativa do LLM.
- Desvios procedimentais ou complexidade sistêmica (Overengineering no RAG) contrários ao mandamento KISS são vetados por padrão.
- Qualquer arquitetura submetida à leitura deve demonstrar falibilidade aceita e recuperação preestabelecida frente a colapsos gerativos inevitáveis da rede de inferência.
