/**
 * Tipos do contrato "widget_request" do Salesbot, fixados a partir de um
 * payload real capturado da conta carlaloureiro (não da documentação
 * pública, que é imprecisa nesses detalhes) — ver histórico do endpoint de
 * spike em app/api/agent/webhook/route.ts.
 */

/** Corpo recebido no POST do Salesbot — vem como application/x-www-form-urlencoded,
 * não JSON, com os campos de `data` em notação de colchetes (`data[message_text]`). */
export interface KommoWidgetRequestPayload {
  token: string;
  data: {
    from: string;
    message_text: string;
    lead_id: string;
    contact_name: string;
  };
  return_url: string;
}

/** Claims do JWT enviado em `token`, assinado com HS512 usando o
 * client_secret da integração privada (`KOMMO_INTEGRATION_CLIENT_SECRET`). */
export interface KommoSalesbotJwtClaims {
  iss: string;
  iat: number;
  aud: string;
  nbf: number;
  exp: number;
  account_id: number;
  bot_type: string;
  subdomain: string;
  /** String numérica do tipo de entidade da API v2 legada ("2" = lead). */
  entity_type: string;
  entity_id: number;
  client_uuid: string;
}
