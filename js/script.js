// Função para formatar dinheiro no padrão brasileiro (R$)
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata peso com pontos de milhar, sem decimais
function formatarPeso(valor) {
    return Math.round(valor).toLocaleString('pt-BR');
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
        document.getElementById('percentual-perda').value = '0%';
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
    document.getElementById('percentual-perda').value = percentualPerda.toFixed(2) + '%';

    calcularFinanceiro();
}

// Calcula todo o Gross Up e Impostos COM DETALHES
function calcularFinanceiro() {
    const valorNfSaida   = getNumerico('valor-nf-saida');
    const pesoSaida      = parseFloat(document.getElementById('peso-saida').value.replace(/\./g, '')) || 0;
    const pesoSinistrado = parseFloat(document.getElementById('peso-sinistrado').value.replace(/\./g, '')) || 0;
    const valorFrete     = getNumerico('valor-frete');
    const aliquotaIcms   = parseFloat(document.getElementById('aliquota-icms').value) || 0;

    if (pesoSaida === 0 || pesoSinistrado === 0) {
        limparResultados();
        return;
    }

    // Determina se PIS/COFINS se aplicam ao produto selecionado
    const produto = (document.getElementById('produto') && document.getElementById('produto').value) ? document.getElementById('produto').value : '';
    const produtoUpper = produto.toUpperCase();
    const aplicaPisCofins = ['MILHO','ALGODAO','ALGODÃO','SORGO'].some(p => produtoUpper.includes(p));
    const aliqPis    = aplicaPisCofins ? 1.65 : 0;
    const aliqCofins = aplicaPisCofins ? 7.60 : 0;
    const operacaoMT = ehOperacaoMT();

    const avisoPisCofins = document.getElementById('info-piscofins');
    if (avisoPisCofins) avisoPisCofins.style.display = aplicaPisCofins ? 'none' : 'block';

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

    // ── Melhoria 2: campos resultado como texto destacado ──
    setResultado('res-mercadoria', baseMercadoria);
    setResultado('res-impostos',   totalImpostos);
    setResultado('res-total',      totalPagar, true);

    window.dadosCalculo = { baseMercadoria, baseFrete, icmsMerc, icmsFrete, pisMerc, cofinsMerc, totalImpostos, totalPagar, operacaoMT };

}

// Atualiza campo de resultado com formatação e destaque
function setResultado(id, valor, destaque) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = 'R$ ' + formatarMoeda(valor);
    el.style.fontWeight = 'bold';
    el.style.fontSize   = destaque ? '1.2rem' : '1rem';
    el.style.color      = destaque ? '#d9534f' : '#012169';
    el.style.background = destaque
        ? 'linear-gradient(135deg, #fff8e1, #fff3cd)'
        : '#f0f6ff';
    el.style.border     = destaque ? '2px solid #F6802E' : '1px solid #c8d8f0';
    el.style.borderRadius = '6px';
    el.style.padding    = '10px 14px';
}

// Limpar todos os resultados
function limparResultados() {
    // ── Melhoria 1: peso sinistrado zerado com milhar ──
    document.getElementById('peso-sinistrado').value = '0';
    document.getElementById('percentual-perda').value = '0%';
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
            el.style = '';
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