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
    // ATENÇÃO: diferente do handler do Salesbot (já validado em produção),
    // essa parte NÃO foi testada contra a conta real — a documentação da
    // Kommo não confirma de onde vem o id do lead disponível pro widget
    // nem garante que `APP.data.current_card.id` é o campo certo aqui.
    // Testar ao vivo depois de instalar/atualizar o widget e ajustar se o
    // painel não aparecer ou o id do lead vier errado (abrir o console do
    // navegador numa ficha de lead e inspecionar `APP.data.current_card`).
    function renderContractsPanel() {
      var settings = (self.get_settings && self.get_settings()) || {};
      var leadId = window.APP && APP.data && APP.data.current_card && APP.data.current_card.id;
      if (!leadId) return; // sem lead carregado (ex.: outra área, ou card novo sem id ainda)

      var productsUrl = settings.contracts_products_url;
      var registerUrl = settings.contracts_register_url;
      var secret = settings.contracts_secret;
      if (!productsUrl || !registerUrl || !secret) return; // campos da instalação não preenchidos

      $.ajax({ url: productsUrl + '?secret=' + encodeURIComponent(secret), method: 'GET', dataType: 'json' })
        .done(function (response) {
          if (response && response.ok) {
            renderPanelWithProducts(response.products || [], leadId, registerUrl, secret);
          }
        });
    }

    function renderPanelWithProducts(products, leadId, registerUrl, secret) {
      var selectId = 'botclaude-contracts-select';
      var selectHtml = self.render(
        { ref: '/tmpl/controls/select.twig' },
        {
          items: products.map(function (p) {
            return { option: p.name, id: p.id };
          }),
          class_name: 'botclaude-contracts-select',
          id: selectId
        }
      );
      var buttonHtml = self.render(
        { ref: '/tmpl/controls/button.twig' },
        { text: 'Registrar', class_name: 'botclaude-contracts-save' }
      );

      self.render_template(
        {
          caption: { class_name: 'botclaude-contracts-panel' },
          body: '',
          render:
            '<div class="botclaude-contracts">' +
            '<div class="botclaude-contracts__select">' + selectHtml + '</div>' +
            '<div class="botclaude-contracts__button">' + buttonHtml + '</div>' +
            '<div class="botclaude-contracts__feedback" style="display:none;font-size:12px;margin-top:6px;"></div>' +
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
