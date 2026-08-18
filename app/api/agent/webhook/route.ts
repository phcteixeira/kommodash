import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint de SPIKE (temporário) do agente de IA no WhatsApp.
 *
 * Ainda não valida JWT, não chama IA e não responde ao `return_url`.
 * Serve só para capturar o payload real que a Kommo envia no step
 * "Widget request" do Salesbot (formato de `data`, claims do JWT,
 * headers), já que a documentação pública é genérica e a conta real pode
 * divergir em detalhes. Depois de capturarmos um payload real (ver plano
 * "Primeiro passo (spike)"), este handler é substituído pelo definitivo:
 * validação de assinatura, montagem de contexto, chamada à IA e callback
 * para `return_url`.
 *
 * Loga só metadados + o corpo bruto em nível de log de desenvolvimento —
 * como isso ainda vai carregar texto de mensagens reais de cliente durante
 * o teste manual, não deixar este handler em produção além do necessário
 * para o spike (ver seção "Segurança" do plano).
 */
export async function POST(request: NextRequest) {
  const headers = Object.fromEntries(request.headers.entries());
  const rawBody = await request.text();

  let parsedBody: unknown = rawBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    // Corpo não é JSON — mantém como texto bruto para inspeção.
  }

  console.log(
    "[agent/webhook spike] request recebida",
    JSON.stringify({ headers, body: parsedBody }, null, 2)
  );

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Endpoint de spike do agente de IA ativo. Aguardando POST do Salesbot.",
  });
}
