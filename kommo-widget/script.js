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

    return self;
  };
});
