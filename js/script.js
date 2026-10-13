// =====================================================
// SCRIPT.JS — Regras de cálculo da indenização
// -----------------------------------------------------
// Contém as fórmulas (peso sinistrado, proporção, gross-up,
// ICMS, PIS, COFINS e total). Alterações aqui mudam valores
// financeiros: valide com os cenários de regressão do README.
// A apresentação (status, resumo, validação) fica em js/ui.js.
// =====================================================

// Função para formatar dinheiro no padrão brasileiro (R$)
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata peso com pontos de milhar, sem decimais
function formatarPeso(valor) {
    return Math.round(valor).toLocaleString('pt-BR');
}

// Formata percentual no padrão brasileiro, com 2 casas (ex.: 1,67%)
// Mesmo arredondamento de antes (toFixed); só troca o ponto pela vírgula.
function formatarPercentual(valor) {
    return valor.toFixed(2).replace('.', ',') + '%';
}

// Lê a alíquota de ICMS do campo automático.
// Aceita "19,5" (formato exibido) e "19.5".
function lerAliquotaIcms() {
    const campo = document.getElementById('aliquota-icms');
    const texto = String(campo ? campo.value : '').replace(',', '.');
    return parseFloat(texto) || 0;
}

// Produtos com PIS e COFINS recuperáveis (regra existente — alterar só com validação fiscal)
const PRODUTOS_COM_PIS_COFINS = ['MILHO', 'ALGODAO', 'ALGODÃO', 'SORGO'];

function produtoTemPisCofins(produto) {
    const produtoUpper = String(produto || '').toUpperCase();
    return PRODUTOS_COM_PIS_COFINS.some(p => produtoUpper.includes(p));
}

// Mostra o aviso "PIS e COFINS não se aplicam" assim que o produto é escolhido
function atualizarAvisoPisCofins() {
    const aviso = document.getElementById('info-piscofins');
    const campoProduto = document.getElementById('produto');
    const produto = campoProduto ? campoProduto.value : '';
    if (aviso) aviso.style.display = (produto && !produtoTemPisCofins(produto)) ? 'block' : 'none';
}

// Verifica se é operação em MT (sem gross-up)
function ehOperacaoMT() {
    const ufOrigem = document.getElementById('uf-origem').value;
    return ufOrigem === 'MT';
}

// Exibir aviso de MT
function atualizarAvisoMT() {
    const avisoMT = document.getElementById('aviso-mt');
    if (avisoMT) avisoMT.style.display = ehOperacaoMT() ? 'block' : 'none';
}

// Calcula apenas o peso perdido
function calcularSinistro() {
    const pesoSaida    = parseFloat(document.getElementById('peso-saida').value.replace(/\./g, '')) || 0;
    const pesoDestino  = parseFloat(document.getElementById('peso-destino').value.replace(/\./g, '')) || 0;

    // ── Melhoria 3: aviso se destino > saída ──
    const avisoNegativo = document.getElementById('aviso-peso-negativo');
    if (pesoDestino > pesoSaida && pesoSaida > 0) {
        if (avisoNegativo) avisoNegativo.style.display = 'block';
        document.getElementById('peso-sinistrado').value = '0';
        document.getElementById('percentual-perda').value = formatarPercentual(0);
        limparResultados();
        return;
    }
    if (avisoNegativo) avisoNegativo.style.display = 'none';

    let pesoSinistrado = pesoSaida - pesoDestino;
    if (pesoSinistrado < 0) pesoSinistrado = 0;

    // ── Melhoria 1: peso sinistrado com milhar ──
    document.getElementById('peso-sinistrado').value = formatarPeso(pesoSinistrado);

    // Calcula o percentual de perda
    let percentualPerda = 0;
    if (pesoSaida > 0) {
        percentualPerda = (pesoSinistrado / pesoSaida) * 100;
    }
    document.getElementById('percentual-perda').value = formatarPercentual(percentualPerda);

    calcularFinanceiro();
}

// Calcula todo o Gross Up e Impostos COM DETALHES
function calcularFinanceiro() {
    const valorNfSaida   = getNumerico('valor-nf-saida');
    const pesoSaida      = parseFloat(document.getElementById('peso-saida').value.replace(/\./g, '')) || 0;
    const pesoSinistrado = parseFloat(document.getElementById('peso-sinistrado').value.replace(/\./g, '')) || 0;
    const valorFrete     = getNumerico('valor-frete');
    const aliquotaIcms   = lerAliquotaIcms();

    // O aviso de PIS/COFINS depende só do produto: atualiza antes de qualquer retorno
    atualizarAvisoPisCofins();

    if (pesoSaida === 0 || pesoSinistrado === 0) {
        limparResultados();
        return;
    }

    // Determina se PIS/COFINS se aplicam ao produto selecionado
    const produto = (document.getElementById('produto') && document.getElementById('produto').value) ? document.getElementById('produto').value : '';
    const aplicaPisCofins = produtoTemPisCofins(produto);
    const aliqPis    = aplicaPisCofins ? 1.65 : 0;
    const aliqCofins = aplicaPisCofins ? 7.60 : 0;
    const operacaoMT = ehOperacaoMT();

    // PASSO 1: Proporção de perda
    const proporcao      = pesoSinistrado / pesoSaida;
    const baseMercadoria = valorNfSaida * proporcao;
    const baseFrete      = valorFrete * proporcao;

    let icmsMerc = 0, pisMerc = 0, cofinsMerc = 0, icmsFrete = 0;

    if (operacaoMT) {
        icmsMerc   = baseMercadoria * (aliquotaIcms / 100);
        pisMerc    = baseMercadoria * (aliqPis / 100);
        cofinsMerc = baseMercadoria * (aliqCofins / 100);
        if (baseFrete > 0) icmsFrete = baseFrete * (aliquotaIcms / 100);
    } else {
        const fatorMercadoria      = (100 - (aliquotaIcms + aliqPis + aliqCofins)) / 100;
        const valorGrossMercadoria = baseMercadoria / fatorMercadoria;
        icmsMerc   = valorGrossMercadoria * (aliquotaIcms / 100);
        pisMerc    = valorGrossMercadoria * (aliqPis / 100);
        cofinsMerc = valorGrossMercadoria * (aliqCofins / 100);
        if (baseFrete > 0) {
            const fatorFrete      = (100 - aliquotaIcms) / 100;
            const valorGrossFrete = baseFrete / fatorFrete;
            icmsFrete = valorGrossFrete * (aliquotaIcms / 100);
        }
    }

    const totalImpostos = icmsMerc + pisMerc + cofinsMerc + icmsFrete;
    const totalPagar    = baseMercadoria + totalImpostos;

    // Detalhes
    document.getElementById('detalhe-base-merc').textContent  = 'R$ ' + formatarMoeda(baseMercadoria);
    document.getElementById('detalhe-base-frete').textContent = 'R$ ' + formatarMoeda(baseFrete);
    document.getElementById('detalhe-icms-merc').textContent  = 'R$ ' + formatarMoeda(icmsMerc);
    document.getElementById('detalhe-icms-frete').textContent = 'R$ ' + formatarMoeda(icmsFrete);
    document.getElementById('detalhe-pis').textContent        = 'R$ ' + formatarMoeda(pisMerc);
    document.getElementById('detalhe-cofins').textContent     = 'R$ ' + formatarMoeda(cofinsMerc);

    // ── Resumo: mercadoria, impostos e total ──
    setResultado('res-mercadoria', baseMercadoria);
    setResultado('res-impostos',   totalImpostos);
    setResultado('res-total',      totalPagar, true);

    window.dadosCalculo = { baseMercadoria, baseFrete, icmsMerc, icmsFrete, pisMerc, cofinsMerc, totalImpostos, totalPagar, operacaoMT };

}

// Atualiza um valor do resumo. A aparência fica no CSS (css/index.css);
// o parâmetro "destaque" é mantido por compatibilidade.
function setResultado(id, valor, destaque) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = 'R$ ' + formatarMoeda(valor);
    el.classList.add('tem-valor');
}

// Limpar todos os resultados
function limparResultados() {
    // Sem resultado válido, a nota não pode usar dados de um cálculo anterior
    window.dadosCalculo = null;

    document.getElementById('peso-sinistrado').value = '0';
    document.getElementById('percentual-perda').value = formatarPercentual(0);
    document.getElementById('detalhe-base-merc').textContent  = 'R$ 0,00';
    document.getElementById('detalhe-base-frete').textContent = 'R$ 0,00';
    document.getElementById('detalhe-icms-merc').textContent  = 'R$ 0,00';
    document.getElementById('detalhe-icms-frete').textContent = 'R$ 0,00';
    document.getElementById('detalhe-pis').textContent        = 'R$ 0,00';
    document.getElementById('detalhe-cofins').textContent     = 'R$ 0,00';
    ['res-mercadoria','res-impostos','res-total'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = 'R$ 0,00';
            el.classList.remove('tem-valor');
        }
    });
}

// --- EVENT LISTENERS ---
document.getElementById('uf-origem').addEventListener('change', function() {
    buscarAliquota();
    atualizarAvisoMT();
    calcularFinanceiro();
});
document.getElementById('uf-destino').addEventListener('change', buscarAliquota);
document.getElementById('peso-saida').addEventListener('input', calcularSinistro);
document.getElementById('peso-destino').addEventListener('input', calcularSinistro);
document.getElementById('valor-nf-saida').addEventListener('input', calcularFinanceiro);
document.getElementById('valor-frete').addEventListener('input', calcularFinanceiro);
document.getElementById('aliquota-icms').addEventListener('input', calcularFinanceiro);

const produtoSelect = document.getElementById('produto');
if (produtoSelect) produtoSelect.addEventListener('change', calcularFinanceiro);

document.addEventListener('DOMContentLoaded', atualizarAvisoMT);