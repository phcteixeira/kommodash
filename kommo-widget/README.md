# Widget "Botclaude" — integração privada da Kommo

Pacote do widget usado na integração privada **Botclaude**
(`client_id` guardado em `KOMMO_INTEGRATION_CLIENT_ID`, fora do repo), com
localização `salesbot_designer`. É este widget que faz o step "Responder
com IA (Botclaude)" aparecer no Designer de Salesbot da conta `carlaloureiro`.

Não tem lógica de IA nenhuma aqui — só devolve, ao salvar o step no
Designer, a definição do step `widget_request` apontando pra
`app/api/agent/webhook` (ver `manifest.json` → `salesbot_designer.ai_reply.
settings.webhook_url`). Quem processa a mensagem e chama a IA é o backend
Next.js do dashboard, não este widget.

## Como reempacotar e subir uma atualização

```bash
cd kommo-widget
zip -r ../botclaude-widget.zip . -x "README.md"
```

Depois, na Kommo: Configurações → Integrações → **Botclaude** → Editar
integração → Fazer upload → Integração com código personalizado → subir o
zip gerado.

## Se a URL do deploy mudar

Atualizar `manifest.json` → `salesbot_designer.ai_reply.settings.
webhook_url.default_value` com a nova URL, reempacotar e subir de novo (ou,
mais simples, editar o valor direto no step já configurado no Designer de
Salesbot — o campo é editável por lá, `"manual": true`).

## Validação de logos (aprendida por tentativa/erro nesta conta)
A documentação pública da Kommo não é precisa sobre os tamanhos exigidos.
Os valores abaixo foram confirmados pela própria validação de upload:
- `logo_min.png`: 84×84px
- `logo_small.png`: 108×108px
- `logo.png`, `logo_medium.png`, `logo_main.png`: ainda usando os tamanhos
  genéricos da doc (130×100, 240×84, 400×272) — não geraram erro até agora,
  mas se a Kommo reclamar de algum, ajustar aqui e documentar o tamanho real.
