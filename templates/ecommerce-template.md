# TEMPLATE OPERACIONAL: E-COMMERCE MODERNO

> ARTEFATO DE INICIALIZAÇÃO. ESTE DOCUMENTO DEFINE A ESTRUTURA SOBERANA PARA A CRIAÇÃO DE PLATAFORMAS DE COMÉRCIO ELETRÔNICO FOCADAS EM ESCALABILIDADE, ESTABILIDADE TRANSACIONAL E CONVERSÃO EXTREMA.

## 1. OBJETIVO DO TEMPLATE
Prover uma infraestrutura arquitetural padronizada, imutável em seus preceitos de segurança. A tática repousa sobre a imposição de fluxos sem fricção cognitiva para o usuário e extrema blindagem do pipeline de Checkout, suportado por uma vitrine (Storefront) moldada em Edge Computing para tempo de resposta milissegundos.

## 2. ESTRUTURA GERAL DO E-COMMERCE
A arquitetura repudia a coexistência do motor de vendas acoplado organicamente ao motor de exibição (Monólito Legado). Separa-se de forma irreversível o *Storefront* (apresentação otimizada para SEO agressivo) da camada de *Order Management* e *Payments* (Silo transacional rígido).

## 3. ARQUITETURA RECOMENDADA
- **Tática Headless Commerce:** Cisão sumária de Front-end e Back-end.
- **Frontend App:** Next.js, Nuxt ou Remix. Obrigatório o emprego de ISR (Incremental Static Regeneration) ou SSG para escalabilidade estática da cauda longa de produtos.
- **Backend Core:** Consumo de plataformas Headless maduras (Shopify Plus API, Swell, Medusa) ou infraestrutura autoral em microserviços/serverless.

## 4. ESTRUTURA DE CATÁLOGO
- Implementação de taxonomia semântica plana. URLs limpas limitadas a domínios diretos (`/categoria/nome-produto`).
- Proibido fardos de I/O de Banco por buscas `LIKE`. Adoção orgânica de motores de busca focados em digitação permissiva (Typo-tolerance) processados em borda (Algolia, Meilisearch).

## 5. ESTRUTURA DE PRODUTOS
- Geometria da PDP (Product Detail Page) com fixação obrigatória da Mídia (Galeria) e CTAs "Above the Fold".
- Gerenciamento de SKUs em Matrizes Locais (State Array). A troca de cor/tamanho de uma mercadoria recusa estritamente o recarregamento total da rede, agindo instantaneamente na interface.

## 6. ESTRUTURA DE CHECKOUT
- Injeção forçada do formato **One-Page Checkout** (ou Stepped Isolado). Ambiente recluso e focado (Cabeçalho de navegação estripado, abolindo saídas e distrações).
- Oferta compulsória de *Guest Checkout* (Pagamento sem exigência bloqueante de geração de senha/cadastro prévio formal).

## 7. SISTEMA DE AUTENTICAÇÃO
- Autenticação de "Baixo Atrito": Uso massivo de *Magic Links* (Envio de Auth via E-mail) ou OTP por SMS/WhatsApp, preterindo a gestão obsoleta de recuperação de senhas textuais.
- Tokens JWT trancados contra vazamentos XSS via Cookies Severos (`HttpOnly`, `SameSite=Strict`, `Secure`).

## 8. ESTRATÉGIA DE PAGAMENTOS
- Subordinação às regras do padrão **PCI Compliance**. 
- A aplicação local abstém-se inteiramente de manipular, processar ou arquivar as strings cruas referentes a Cartões de Crédito ou CVV. Os dados trafegam exclusivamente via SDK tokenizado ou iframe dos Adquirentes (Stripe, Pagar.me, etc).

## 9. ESTRATÉGIA DE CARRINHO
- Carrinho Lateral (Mini-Cart / Drawer) prioritário em detrimento de uma página estática de carrinho, retendo o cliente no fluxo de vitrine.
- Adoção de *Optimistic UI*: Modificações de quantidade de produtos no carrinho acionam os manipuladores visuais do DOM antes da latência real de servidor retornar.

## 10. ESTRATÉGIA DE ESTOQUE
- Desvinculação algorítmica de Estoque Físico vs Virtual (Reserva em Memória). Em flash sales, exige-se Timeout Rígido no carrinho para expirar a custódia.
- Controle de Concorrência Otimista na persistência do BD para coibir anomalias em instâncias de compra simultânea do último artefato estocado.

## 11. ESTRATÉGIA DE PERFORMANCE
- Diluição da carga da infraestrutura via ISR: Milhões de produtos servidos unicamente de caches (CDN), sendo revalidados assincronamente sem derrubar a base operacional.
- Otimização Inquisitiva de Imagens. Todo raster gerado no sistema obriga formato avif/webp, hospedado na borda com redimensionamento `srcset` reativo.

## 12. ESTRATÉGIA DE SEO
- Engrenagem autônoma de sitemaps segmentados por Produtos e Coleções lógicas.
- Injeção obrigatória do *Schema Markup* rico (JSON-LD Product, Offer, Reviews) consolidado na raiz nativa.
- Domínio férreo sobre *Canonical Tags* para eliminar penalidades de conteúdo duplicado proveniente de paginações randômicas.

## 13. ESTRATÉGIA MOBILE
- Tática *Mobile-First* visceral. Operações e botões transacionais (`Comprar`, `Checkout`) adotam o padrão `Sticky Bottom` adaptados aos "Thumb Zones" (Zona segura de polegares).
- Scrollers visuais geridos pelas flags CSS nativas (`scroll-snap`), renegando pesados carrosséis importados do ambiente JavaScript.

## 14. ESTRATÉGIA DE SEGURANÇA
- Rotação ostensiva do WAF Cloudflare e *Rate Limiting* em checkouts para banir tráfego gerador de *Card Testing* automático.
- Preço à prova de forjamento: O Backend recalcula cegamente todos os IDs recebidos confrontando as tabelas fixas em Banco. Sob nenhuma métrica deve o sistema crer no Subtotal enviado por requisição frontal do navegador.

## 15. ESTRATÉGIA DE ANALYTICS
- Arquitetura de observação padronizada no DataLayer (Ex: `view_item`, `add_to_cart`, `purchase`).
- Para conversão estrita (Checkout Effected), impõe-se a via Server-Side Tracking (API Conversions), evitando as cortinas sintéticas provindas de AdBlockers estritos do Client.

## 16. ESTRATÉGIA DE ESCALABILIDADE
- Execução isolada (*Serverless/Stateless*). Picos colossais diluídos através de arquitetura paralela sem colapso por limitação de RAM em hospedagens compartilhadas.
- Mensageria de segundo plano: Disparos de E-mails confirmacionais, relatórios e NF despachados exclusivamente para filas robustas secundárias (Message Queues) aliviando o fluxo HTTP.

## 17. ESTRUTURA INICIAL DE PASTAS
```text
/src
  /api             # Backend Proxy e Invocação Headless Externa
  /components
    /cart          # Contexto e estado local efêmero da Drawer
    /checkout      # Refúgio transacional blindado
    /product       # Organismos dinâmicos da PDP
  /lib             # Terceirização acoplada (SDKs, Algolia)
  /app (ou pages)  # Rotas em Edge Rendering (SSG/ISR)
/docs              # Registro Operacional Governamental
```

## 18. PIPELINE RECOMENDADO
1. **Engrenagem e BD:** Estabelecimento do ecossistema Headless e Taxonomia de Catálogo.
2. **Vitrine Dinâmica:** Criação das malhas SSR, coleções, facetas de busca.
3. **Persistência de Carrinho:** Lógica modular em Client-side otimista e efêmera.
4. **Checkout Engine (O Núcleo):** Operacionalização PCI-compliant e Gateway transacional sem erros colaterais.
5. **Automação Pós-Venda:** Disparo transacional via Webhooks e confirmação rigorosa de captura financeira.

## 19. CHECKLIST OBRIGATÓRIO
- [ ] O fluxo do Checkout sobrevive inalterado e protegido sem exigir recarregamentos massivos ou migrações de URL arriscadas?
- [ ] O backend confirma ceticamente os valores totais dos SKUs no momento da cobrança, ignorando cegamente a soma da UI?
- [ ] O Javascript principal causa Reflow bloqueando a visualização ágil das imagens da Hero Image PDP?
- [ ] Há esquemas JSON-LD nativos na DOM operando a conversão do tráfego orgânico?
- [ ] O Token do provedor de pagamento (Adquirente) não possui rastros remanescentes nas sessões brutas?

## 20. REGRAS OBRIGATÓRIAS PARA AGENTES IA
- O agente se imbui da essência do Engenheiro de Software em Headless Commerce.
- Falhas introduzidas sob alegações cosméticas que firam o fluxo canônico de checkout geram interrupção e reprovação sumária do agente pela governança.
- Quaisquer arquiteturas de banco de dados inventadas que corrompam as ramificações temporais de Produto e Pedido passado caracterizam-se como ofensa letal aos preceitos de dados.
