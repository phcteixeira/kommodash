# Kommodash — contexto do projeto

Dashboard Next.js que lê dados da API da Kommo CRM (conta `carlaloureiro`) e
apresenta relatórios em `/dashboard/*`. Modo demo (dados mockados) quando
`KOMMO_SUBDOMAIN`/`KOMMO_ACCESS_TOKEN` não estão configurados — ver
`lib/kommo/config.ts`.

## Regras de negócio desta conta Kommo (importante para qualquer relatório)

**O resultado real do negócio não é "lead ganho" — é "serviço contratado".**
Ao propor ou construir qualquer relatório que meça sucesso/conversão, a
métrica primária deve ser **contratos** (produtos vinculados ao lead), não o
status "ganho" do lead. "Ganho" só indica que uma venda aconteceu naquele
lead, mas não diz quais serviços foram vendidos — quem responde isso são os
produtos vinculados.

O fluxo de atendimento, na ordem, é:
1. **SDR** identifica quais serviços o cliente pode precisar → marca no campo
   de lead **"Serviço"** (multiselect).
2. **Especialista/consultora** dá seguimento e formaliza propostas → marca no
   campo de lead **"Propostas Enviadas"** (multiselect, mesmas opções de
   "Serviço" — nem todo serviço identificado vira proposta).
3. Serviços **efetivamente contratados** são registrados como **Produtos**
   vinculados ao lead (`catalog_element_ids` / `_embedded.catalog_elements`)
   — nem toda proposta enviada vira contrato. Um lead pode gerar vários
   produtos contratados (não é 1:1 lead→contrato).

Essa cadeia (Serviço → Propostas Enviadas → Produtos) já é o funil da página
"Performance de leads" (`lib/kommo/aggregate.ts#buildLeadPerformanceFunnel`).
A página "Contratos" lista os fechamentos (produto × lead × data) e é a fonte
de verdade de "o que foi vendido" (`lib/kommo/aggregate.ts#buildClosings`).

**Ao construir qualquer relatório novo que meça performance/conversão**
(marketing, vendedores, campanhas, etc.), preferir contar **produtos
contratados** (via `catalog_element_ids` do lead, ou os eventos de vínculo
quando a data exata do fechamento importa) em vez de `status_id`/"ganho" —
e, quando fizer sentido, mostrar **quais produtos/serviços** foram
contratados, não só a contagem.

## Confiabilidade de dados por campo (leads)

- **`Serviço`, `Propostas Enviadas`, `catalog_element_ids` (Produtos)**:
  confiáveis — preenchidos como parte do processo operacional.
- **UTM (`utm_source`, `utm_campaign`, `utm_content`, tipo `tracking_data`)**:
  confiáveis, preenchidos automaticamente pela integração de anúncio
  (Facebook Ads, hoje o único canal pago desta conta).
- **`utm_term` e `fbclid`**: **quebrados** — sempre o literal
  `"{{adset.name}}"`/`"{{fbclid}}"` (parâmetro dinâmico do Facebook não
  resolvido na configuração do anúncio). Não usar.
- **`Origem Lead`** (select manual: Tráfego/Indicação/Já Cliente/Orgânico):
  preenchimento manual, **sem confiabilidade garantida** — não usar como base
  de relatório (removido da página Marketing digital por esse motivo).
- **`price` do lead**: não preenchido nesta conta (sempre 0) — sem dado de
  receita por lead. Não há investimento/gasto de anúncio integrado na Kommo.
  Relatórios de marketing/vendas não têm como calcular ROI ou custo por lead
  a partir da API.
- **`normalizeStatusType` (`lib/kommo/api.ts`)**: `type` da API não indica
  ganho/perda — só os IDs fixos 142 (ganho) e 143 (perdido) são confiáveis
  (bug já corrigido; ver histórico do arquivo se precisar de contexto).
