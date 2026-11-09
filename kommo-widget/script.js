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
        renderContractsPanel();
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

    // --- Registro de contratos (location "lcard-1", painel lateral do
    // card do lead) — v1: só seleciona o produto e salva. Cada clique vira
    // uma nota nova no lead (lib/kommo/contracts-notes.ts na Vercel),
    // sem limite e com a data/hora que a própria Kommo grava na nota.
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

    function renderContractsPanel() {
      // Log incondicional pra diferenciar "render não foi chamado" de
      // "foi chamado e não achou o que precisava" — útil pra depurar sem
      // precisar adivinhar (a Kommo não loga nada sozinha sobre isso).
      console.log('[botclaude] renderContractsPanel chamado');

      var settings = (self.get_settings && self.get_settings()) || {};
      var leadId = extractLeadId();
      console.log('[botclaude] leadId:', leadId, 'settings:', settings);
      if (!leadId) return; // sem lead carregado (ex.: outra área, ou card novo sem id ainda)

      var productsUrl = settings.contracts_products_url;
      var registerUrl = settings.contracts_register_url;
      var secret = settings.contracts_secret;
      if (!productsUrl || !registerUrl || !secret) {
        console.log('[botclaude] campos de configuração do widget vazios, não vai renderizar');
        return;
      }

      $.ajax({ url: productsUrl + '?secret=' + encodeURIComponent(secret), method: 'GET', dataType: 'json' })
        .done(function (response) {
          console.log('[botclaude] resposta de /products:', response);
          if (response && response.ok) {
            renderPanelWithProducts(response.products || [], leadId, registerUrl, secret);
          }
        })
        .fail(function (xhr, status, err) {
          console.log('[botclaude] falha ao buscar produtos:', status, err, xhr && xhr.responseText);
        });
    }

    function renderPanelWithProducts(products, leadId, registerUrl, secret) {
      // HTML com estilo próprio em vez de self.render()/twig: os templates
      // nativos da Kommo saíram sem contraste nesse contexto (controle
      // nativo do navegador herdando modo escuro do SO, sem o CSS da
      // Kommo "vestir" por cima) — forçar cor aqui garante legibilidade
      // independente de tema claro/escuro.
      var selectId = 'botclaude-contracts-select';
      var optionsHtml = products
        .map(function (p) {
          return '<option value="' + p.id + '">' + p.name + '</option>';
        })
        .join('');
      var selectHtml =
        '<select id="' + selectId + '" style="width:100%;padding:6px;border-radius:4px;border:1px solid #ccc;background:#fff;color:#111;font-size:13px;">' +
        '<option value="">Selecione o produto</option>' +
        optionsHtml +
        '</select>';
      var buttonHtml =
        '<button class="botclaude-contracts-save" style="margin-top:8px;width:100%;padding:7px;border-radius:4px;border:none;background:#2a78d6;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Registrar</button>';

      self.render_template(
        {
          caption: { class_name: 'botclaude-contracts-panel' },
          body: '',
          render:
            '<div class="botclaude-contracts" style="padding:10px;background:#fff;border-radius:6px;">' +
            selectHtml +
            buttonHtml +
            '<div class="botclaude-contracts__feedback" style="display:none;font-size:12px;margin-top:6px;color:#111;"></div>' +
            '</div>'
        },
        {}
      );

      $('.botclaude-contracts-save')
        .off('click')
        .on('click', function () {
          var productId = Number($('#' + selectId).val());
          var $feedback = $('.botclaude-contracts__feedback');
          if (!productId) return;
          $feedback.hide().text('');

          $.ajax({
            url: registerUrl,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ leadId: leadId, productId: productId, secret: secret })
          })
            .done(function (response) {
              $feedback.text(response && response.ok ? 'Contrato registrado!' : 'Falha ao registrar. Tente de novo.').show();
            })
            .fail(function () {
              $feedback.text('Falha ao registrar. Tente de novo.').show();
            });
        });
    }

    return self;
  };
});
