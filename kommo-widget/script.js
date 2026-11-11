define(['jquery'], function ($) {
  'use strict';

  // Widget mínimo: não tem UI própria no cliente. A única responsabilidade
  // dele é, quando o admin adiciona o step no Designer de Salesbot, devolver
  // a definição do step "widget_request" apontando pra URL configurada
  // (settings.webhook_url) — é a Kommo quem chama essa URL a cada mensagem
  // recebida, com o texto da mensagem e o JWT assinado.
  return function CustomWidget() {
    var self = this;

    this.callbacks = {
      init: function () {
        return true;
      },

      bind_actions: function () {
        return true;
      },

      render: function () {
        renderRegistrationPanel();
        return true;
      },

      settings: function () {
        return true;
      },

      onSave: function () {
        return true;
      },

      // Chamado pelo Designer de Salesbot ao salvar o step deste widget.
      // `params` traz os valores preenchidos pelo admin (aqui, a URL do
      // nosso endpoint). Retorna o step do bot em JSON — handler fixo
      // "widget_request", `data` é o que chega no corpo do POST pro nosso
      // servidor (o texto da mensagem via placeholder do Salesbot).
      onSalesbotDesignerSave: function (_handlerCode, params) {
        var webhookUrl = (params && params.webhook_url) || '';

        var step = {
          question: [
            {
              handler: 'widget_request',
              params: {
                url: webhookUrl,
                data: {
                  from: 'botclaude',
                  message_text: '{{message_text}}',
                  lead_id: '{{lead.id}}',
                  contact_name: '{{contact.name}}'
                }
              }
            }
          ],
          require: []
        };

        return JSON.stringify([step]);
      },

      destroy: function () {
        return true;
      }
    };

    // --- Registro manual (location "lcard-1", painel lateral do card do
    // lead): Contratos e Propostas Enviadas, mesmo padrão pros dois. Cada
    // clique vira uma nota nova no lead (lib/kommo/contracts-notes.ts e
    // lib/kommo/proposals-notes.ts na Vercel), sem limite e com a data/hora
    // que a própria Kommo grava na nota — resolve o problema de registrar
    // o mesmo serviço/produto mais de uma vez pro mesmo lead e a soma
    // continuar certa (vínculo nativo de "Produtos"/campo multiselect só
    // marca "sim/não", não conta repetição).
    //
    // `APP.data.current_card.id` (o caminho sugerido pela documentação)
    // não existe de verdade — confirmado no console da conta real: o id
    // fica dentro de uma chave aninhada (ex.: `current_card.eu.id`). Como
    // não há garantia de que esse nome de chave seja estável (pode mudar
    // por build/conta), `extractLeadId` não fixa o nome "eu" — pega o id
    // direto se existir, senão procura no primeiro valor aninhado do
    // objeto, que é o formato observado.
    function extractLeadId() {
      var cardData = window.APP && APP.data && APP.data.current_card;
      if (!cardData) return null;
      if (typeof cardData.id !== 'undefined') return cardData.id;
      var keys = Object.keys(cardData);
      for (var i = 0; i < keys.length; i++) {
        var nested = cardData[keys[i]];
        if (nested && typeof nested.id !== 'undefined') return nested.id;
      }
      return null;
    }

    // HTML com estilo próprio em vez de self.render()/twig: os templates
    // nativos da Kommo saíram sem contraste no ambiente real (controle
    // nativo do navegador herdando modo escuro do SO, sem o CSS da Kommo
    // "vestir" por cima) — forçar cor aqui garante legibilidade
    // independente de tema claro/escuro.
    function buildSectionHtml(title, selectId, placeholder, options, buttonClass) {
      var optionsHtml = options
        .map(function (o) {
          return '<option value="' + o.id + '">' + o.name + '</option>';
        })
        .join('');
      return (
        '<div style="margin-bottom:14px;">' +
        '<div style="font-weight:600;font-size:12px;color:#444;margin-bottom:4px;">' + title + '</div>' +
        '<select id="' + selectId + '" style="width:100%;padding:6px;border-radius:4px;border:1px solid #ccc;background:#fff;color:#111;font-size:13px;">' +
        '<option value="">' + placeholder + '</option>' +
        optionsHtml +
        '</select>' +
        '<button class="' + buttonClass + '" style="margin-top:6px;width:100%;padding:7px;border-radius:4px;border:none;background:#2a78d6;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Registrar</button>' +
        '<div class="' + buttonClass + '-feedback" style="display:none;font-size:12px;margin-top:4px;color:#111;"></div>' +
        '</div>'
      );
    }

    // Wire genérico pro clique de uma seção: lê o select, chama o
    // endpoint de registro com o payload específico de cada seção
    // (idKey varia: productId pra contratos, optionId pra propostas).
    function wireSection(selectId, buttonClass, registerUrl, secret, leadId, idKey) {
      $('.' + buttonClass)
        .off('click')
        .on('click', function () {
          var selectedId = Number($('#' + selectId).val());
          var $feedback = $('.' + buttonClass + '-feedback');
          if (!selectedId) return;
          $feedback.hide().text('');

          var payload = { leadId: leadId, secret: secret };
          payload[idKey] = selectedId;

          $.ajax({
            url: registerUrl,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
          })
            .done(function (response) {
              $feedback.text(response && response.ok ? 'Registrado!' : 'Falha ao registrar. Tente de novo.').show();
            })
            .fail(function () {
              $feedback.text('Falha ao registrar. Tente de novo.').show();
            });
        });
    }

    function renderRegistrationPanel() {
      // Log incondicional pra diferenciar "render não foi chamado" de
      // "foi chamado e não achou o que precisava" — útil pra depurar sem
      // precisar adivinhar (a Kommo não loga nada sozinha sobre isso).
      console.log('[botclaude] renderRegistrationPanel chamado');

      var settings = (self.get_settings && self.get_settings()) || {};
      var leadId = extractLeadId();
      console.log('[botclaude] leadId:', leadId, 'settings:', settings);
      if (!leadId) return; // sem lead carregado (ex.: outra área, ou card novo sem id ainda)

      var productsUrl = settings.contracts_products_url;
      var contractsRegisterUrl = settings.contracts_register_url;
      var secret = settings.contracts_secret;
      var proposalsOptionsUrl = settings.proposals_options_url;
      var proposalsRegisterUrl = settings.proposals_register_url;
      var demandsOptionsUrl = settings.demands_options_url;
      var demandsRegisterUrl = settings.demands_register_url;
      if (!productsUrl || !contractsRegisterUrl || !secret) {
        console.log('[botclaude] campos de configuração do widget vazios, não vai renderizar');
        return;
      }

      function fetchOptions(url) {
        return url
          ? $.ajax({ url: url + '?secret=' + encodeURIComponent(secret), method: 'GET', dataType: 'json' })
          : $.Deferred().resolve({ ok: true, options: [], products: [] });
      }

      var productsReq = fetchOptions(productsUrl);
      var proposalsReq = fetchOptions(proposalsOptionsUrl);
      var demandsReq = fetchOptions(demandsOptionsUrl);

      $.when(productsReq, proposalsReq, demandsReq).done(function (productsResult, proposalsResult, demandsResult) {
        var productsResponse = productsResult[0] || productsResult;
        var proposalsResponse = proposalsResult[0] || proposalsResult;
        var demandsResponse = demandsResult[0] || demandsResult;
        console.log(
          '[botclaude] resposta de /products:', productsResponse,
          '/proposals/options:', proposalsResponse,
          '/demands/options:', demandsResponse
        );

        renderPanel({
          leadId: leadId,
          products: (productsResponse && productsResponse.ok && productsResponse.products) || [],
          contractsRegisterUrl: contractsRegisterUrl,
          proposalOptions: (proposalsResponse && proposalsResponse.ok && proposalsResponse.options) || [],
          proposalsRegisterUrl: proposalsRegisterUrl,
          demandOptions: (demandsResponse && demandsResponse.ok && demandsResponse.options) || [],
          demandsRegisterUrl: demandsRegisterUrl,
          secret: secret
        });
      }).fail(function (xhr, status, err) {
        console.log('[botclaude] falha ao buscar dados do painel:', status, err);
      });
    }

    function renderPanel(data) {
      var demandsSelectId = 'botclaude-demands-select';
      var demandsButtonClass = 'botclaude-demands-save';
      var proposalsSelectId = 'botclaude-proposals-select';
      var proposalsButtonClass = 'botclaude-proposals-save';
      var contractsSelectId = 'botclaude-contracts-select';
      var contractsButtonClass = 'botclaude-contracts-save';

      // A faixa de cabeçalho (caption) é gerada pela própria Kommo — o
      // objeto `caption` não documenta uma opção de cor, então força por
      // CSS em cima da classe que a gente já passa nela (`class_name`).
      // O retângulo escuro que aparecia ali NÃO era um fundo CSS — era a
      // própria logo do widget (<img class="card-widgets__widget_caption_logo">)
      // que a Kommo insere automaticamente (confirmado via inspeção real
      // do DOM). CSS de `background` não tem efeito sobre o conteúdo de
      // uma <img> — por isso esconde a imagem em vez de tentar recolorir.
      var captionStyleHtml =
        '<style>' +
        '.botclaude-contracts-panel{background:#2a78d6 !important;color:#fff !important;}' +
        '.botclaude-contracts-panel *{background:transparent !important;color:#fff !important;}' +
        '.botclaude-contracts-panel img{display:none !important;}' +
        '</style>';

      // Título dentro do próprio conteúdo que a gente controla 100% (em
      // vez de confiar no texto nativo do caption da Kommo, que não é
      // garantido renderizar visível) — área branca, sempre previsível.
      var headerHtml =
        '<div style="background:#2a78d6;color:#fff;font-weight:600;font-size:13px;padding:8px 10px;border-radius:6px 6px 0 0;margin:-10px -10px 10px -10px;">Registros</div>';

      // Ordem segue o funil Serviço → Propostas Enviadas → Produtos (ver
      // CLAUDE.md): Demandas Identificadas primeiro, Contratos por
      // último. "Demandas Identificadas" é só o rótulo no widget — o
      // campo na Kommo chama "Serviço" (mesmo campo usado no card do
      // lead, ligado ao card "Serviço").
      var demandsHtml = data.demandsRegisterUrl
        ? buildSectionHtml('Demandas identificadas', demandsSelectId, 'Selecione o serviço', data.demandOptions, demandsButtonClass)
        : '';
      var proposalsHtml = data.proposalsRegisterUrl
        ? buildSectionHtml('Propostas enviadas', proposalsSelectId, 'Selecione o serviço', data.proposalOptions, proposalsButtonClass)
        : '';
      var contractsHtml = buildSectionHtml('Contratos', contractsSelectId, 'Selecione o produto', data.products, contractsButtonClass);

      self.render_template(
        {
          caption: { class_name: 'botclaude-contracts-panel', text: 'Registros' },
          body: '',
          render:
            captionStyleHtml +
            '<div class="botclaude-contracts" style="padding:10px;background:#fff;border-radius:6px;">' +
            headerHtml +
            demandsHtml +
            proposalsHtml +
            contractsHtml +
            '</div>'
        },
        {}
      );

      if (data.demandsRegisterUrl) {
        wireSection(demandsSelectId, demandsButtonClass, data.demandsRegisterUrl, data.secret, data.leadId, 'optionId');
      }
      if (data.proposalsRegisterUrl) {
        wireSection(proposalsSelectId, proposalsButtonClass, data.proposalsRegisterUrl, data.secret, data.leadId, 'optionId');
      }
      wireSection(contractsSelectId, contractsButtonClass, data.contractsRegisterUrl, data.secret, data.leadId, 'productId');
    }

    return self;
  };
});
