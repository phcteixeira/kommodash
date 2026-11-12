/**
 * Produtos/serviços descontinuados — a API da Kommo não permite excluir um
 * elemento de catálogo (só renomear/criar, ver lib/kommo/api.ts), então um
 * item aposentado continua existindo na conta pra sempre. Esta lista
 * marca, pelo nome, o que não deve aparecer nos seletores do widget nem
 * nas contagens dos relatórios do Kommodash — mesmo que o item siga
 * presente no catálogo real da Kommo.
 *
 * "Contencioso Administrativo - adm": deu lugar a dois produtos novos
 * ("Contencioso ADM – Gestão" e "Contencioso ADM – Pronta"). Os registros
 * antigos sob esse nome (demandas/propostas/contratos) ficam de fora dos
 * relatórios por decisão do negócio — não há como repartir retroativamente
 * entre os dois novos.
 */
export const DISCONTINUED_PRODUCT_NAMES = new Set<string>(["Contencioso Administrativo - adm"]);
