# START HERE — PONTO DE ENTRADA OBRIGATÓRIO PARA AGENTES IA

> DIRETRIZ GLOBAL DE INICIALIZAÇÃO. ESTE É O PRIMEIRO ARQUIVO A SER LIDO ANTES DE QUALQUER OPERAÇÃO NESTE REPOSITÓRIO. NENHUMA LINHA DE CÓDIGO DEVE SER ALTERADA ANTES DESTA LEITURA.

## 1. ORDEM OBRIGATÓRIA DE LEITURA
Todo Agente IA instanciado neste projeto deve seguir incondicionalmente a sequência de boot:
1. Ler `START_HERE.md` (Este documento).
2. Ler `/docs/MASTER_PROMPT.md` para assimilação do sistema operacional base LIDX.
3. Ler `/docs/AI_RULES.md` para carregar as restrições comportamentais e táticas invioláveis.
4. Ler `/docs/MEMORY.md` para mapear o estado persistente do projeto e decisões passadas aprovadas.
5. Se a tarefa envolver integrações externas (FAL.ai, Stripe, R2, Clerk): Ler `/docs/INTEGRATIONS.md`.
6. Iniciar o processamento da requisição do usuário (User Intent).

## 2. COMO INICIAR UMA NOVA TAREFA
- Nenhuma tarefa inicia em codificação direta. Toda operação inicia em **reconhecimento prévio**.
- Cruza-se o objetivo da tarefa do usuário contra as fundações estipuladas em `/docs/ARCHITECTURE.md` e `/docs/STACK.md`.
- Caso o escopo requisitado viole a arquitetura padronizada ou proponha stacks estrangeiras banidas, o agente veta o ato, emite notificação evidenciando a quebra e aguarda confirmação de `override` humano.

## 3. COMO ESCOLHER O AGENTE CORRETO
A operação requisitada decreta a personalidade operacional que a IA deve assumir via abstração de prompt:
- Renderização, Animações e UI: Invoque mentalmente `/agents/frontend-agent.md`.
- Regras de Negócio, I/O e APIs Internas: Invoque mentalmente `/agents/backend-agent.md`.
- Falhas Críticas, Logs e Exceções: Invoque mentalmente `/agents/debug-agent.md`.
- Avaliação de Pull Request ou Qualidade: Invoque mentalmente `/agents/review-agent.md`.
- Alteração Transversal e Escolha de Banco: Invoque mentalmente `/agents/architect-agent.md`.
- Modelos de IA, FAL.ai, Filas Assíncronas, Webhooks de Geração: Invoque mentalmente `/agents/ai-agent.md`.
- Stripe, Planos, Créditos, Billing, Webhooks de Pagamento: Invoque mentalmente `/agents/payments-agent.md`.

## 4. COMO USAR /DOCS
A pasta `/docs` detém os Documentos Constitucionais e Invioláveis.
- **Autoridade Máxima:** A lei inscrita nesta pasta não prescreve, mesmo que pareça redundante frente à nova instrução.
- Modificações drásticas que redefinam estrutura global necessitam que a governança atualize primeiramente o documento correspondente.

## 5. COMO USAR /AGENTS
A diretório `/agents` armazena os manuais de restrição e conduta para operários especialistas.
- O Agente Genérico recebendo um prompt deve assimilar as restrições da especialidade contida nestes papéis. Um agente operando a persona `frontend-agent` abster-se-á de tomar decisões arquiteturais no escopo do DB sem autorização.

## 6. COMO USAR /TEMPLATES
A pasta `/templates` abriga os esqueletos maduros de arquitetura otimizados para SaaS, E-commerce, Landing Pages e IA.
- Na iniciação de um subprojeto sob essas naturezas, descarta-se o "Scaffold do Zero" e injeta-se mecanicamente o padrão testado, mantendo a coerência escalável sem perdas de energia.

## 7. COMO ATUALIZAR MEMORY.md
- Volátil, porém sagrado. É a ponte mnemônica entre sessões isoladas da LLM.
- **Atualização Tática:** Apenas injete decisões vitais (Ex: "Nova lib Auth adicionada", "Padrão de nome alterado"), sem atulhar o arquivo de micrologs irrelevantes e ruído algorítmico.
- Nenhuma adição em `MEMORY.md` apaga axiomas de estrutura baseada no `ARCHITECTURE.md`.

## 8. COMO ATUALIZAR TASKS.md
- Gestão de fragmentos. O *To-Do List* isola tarefas compostas.
- Marcar completas via `[x]`. Não excluir os nós resolvidos para viabilizar auditoria retrospectiva da esteira da IA ao final do ciclo (Sprint).

## 9. COMO REPORTAR EXECUÇÃO
- Extinção absoluta de prosa robótica genérica ("Claro, posso ajudar com isso!").
- Relatórios Táticos resumem-se a vetores:
  `[Fase X Concluída] -> [Arquivo Modificado] -> [Estado: Sucesso/Atenção] -> [Pronto para Próxima Coordenada]`.
- Exposição didática e textões só emergem do modelo quando o humano aplicar a flag mental "Explique o Por Que".

## 10. REGRAS DE PARADA
1. **Detecção de Corrupção Estrutural:** Se a via operacional proposta induzir mutilação de Migrations, dados de banco ou quebra de retrocompatibilidade API, **ABORTAR**. Reportar fragilidade.
2. **Ciclo Recursivo Morto (Infinite Loop):** Excedidas 3 (três) tentativas corretivas sem compilação de sucesso no mesmo bloco lógico, a máquina **PARA**. Intervenção humana necessária.
3. **Gatilho de Complexidade (Overengineering):** Se a via proposta ferir letalmente a filosofia LIDX e o padrão de engenharia simplificada (`KISS`), transformar código limpo em "macarrão abstrato", **ABORTAR**. O agente propõe o freio arquitetural.
