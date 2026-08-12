# Kommodash

Dashboard web de relatórios conectado à API v4 da [Kommo CRM](https://www.kommo.com/), construído com Next.js (App Router) + TypeScript.

## Relatórios incluídos

- **Leads e funil de vendas** — distribuição dos leads por etapa, taxa de conversão
- **Desempenho de vendedores** — ranking por faturamento, leads ganhos/perdidos, ticket médio
- **Faturamento e negócios fechados** — evolução do valor ganho ao longo do tempo
- **Atividades e tarefas** — concluídas, atrasadas e futuras por responsável
- **Produtos e campos personalizados** — catálogo de produtos e campos customizados da conta

Sem uma conta conectada, o dashboard funciona em **modo demonstração** com dados fictícios, para você navegar pela interface antes de configurar o acesso real.

## Pré-requisitos

- Node.js 20+
- Uma conta Kommo com permissão para criar uma integração privada

## Como gerar o token de longa duração

1. Na sua conta Kommo, acesse **Ajustes → Integrações → Criar integração**.
2. Preencha os dados obrigatórios e salve a integração.
3. Abra a integração criada e vá até a aba **Chaves e escopos**.
4. Gere um **token de longa duração** (long-lived token) para a própria conta.
5. Anote também o **subdomínio** da sua conta (se a URL é `https://suaempresa.kommo.com`, o subdomínio é `suaempresa`).

## Configuração

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```
KOMMO_SUBDOMAIN=suaempresa
KOMMO_ACCESS_TOKEN=xxxxx.xxxxx (token de longa duração)
```

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 — você será redirecionado para `/dashboard`.

## Build de produção

```bash
npm run build
npm run start
```

## Arquitetura

- `lib/kommo/client.ts` — wrapper de fetch autenticado com paginação e retry/backoff em rate limit (429)
- `lib/kommo/api.ts` — funções de acesso a cada recurso da API (leads, pipelines, users, tasks, custom fields, catalogs)
- `lib/kommo/aggregate.ts` — funções puras de agregação usadas pelos relatórios
- `lib/kommo/dataset.ts` — orquestra a busca de dados e decide entre dados reais/demo
- `app/dashboard/*` — páginas do dashboard (React Server Components; o token nunca é exposto ao navegador)
- Filtros de período/funil são aplicados via parâmetros de URL (`?range=`, `?pipeline=`)

## Limitações conhecidas

- A API v4 da Kommo não expõe endpoints de "relatório" prontos — os dados são buscados via `/leads`, `/tasks` etc. e agregados na aplicação.
- Consultas com período "Todo o período" podem ser mais lentas em contas com grande volume de leads (paginação limitada a 40 páginas de 250 registros por padrão).
