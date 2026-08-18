// =====================================================
// VISUAL.JS — Impressão e Geração de PDF
// (gerarVisual removido — apenas imprimir e PDF)
// =====================================================

// Monta o HTML A4 completo para impressão/PDF
function _gerarHTMLA4() {
    const dados = window.dadosCalculo || {};

    const formatarDataBR = (data) => {
        if (!data) return '-';
        const partes = data.split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
    };

    // ── Parsers e formatadores BR-aware ───────────────────
    // Converte qualquer entrada ("1.000", "1.000,00", "1234.56", 1234.56) em número
    const parseBR = s => {
        if (s === null || s === undefined || s === '') return 0;
        if (typeof s === 'number') return s;
        const num = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
        return isNaN(num) ? 0 : num;
    };

    // Valores em R$: 2 casas decimais com ponto de milhar (ex: 1.234,56)
    const fmt = v => parseBR(v).toLocaleString('pt-BR', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });

    // Pesos em kg: sem decimais, com ponto de milhar (ex: 1.000)
    const fmtPeso = v => Math.round(parseBR(v)).toLocaleString('pt-BR');

    const filial          = document.getElementById('filial').value          || 'Não informado';
    const razaoSocial     = document.getElementById('razao-social').value    || 'Não informado';
    const cnpj            = document.getElementById('cnpj').value            || 'Não informado';
    const produto         = document.getElementById('produto').value         || 'Não selecionado';
    const nfLote          = document.getElementById('nf-lote').value         || '-';
    const dataNfLote      = formatarDataBR(document.getElementById('data-nf-lote').value);
    const cte             = document.getElementById('cte').value             || '-';
    const dataCte         = formatarDataBR(document.getElementById('data-cte').value);
    const nfVenda         = document.getElementById('nf-venda').value        || '-';
    const dataNfVenda     = formatarDataBR(document.getElementById('data-nf-venda').value);
    const pesoSaida       = document.getElementById('peso-saida').value      || '0';
    const pesoDestino     = document.getElementById('peso-destino').value    || '0';
    const pesoSinistrado  = document.getElementById('peso-sinistrado').value || '0';
    const percentualPerda = document.getElementById('percentual-perda').value || '0%';
    const valorNf         = document.getElementById('valor-nf-saida').value  || '0';
    const valorFrete      = document.getElementById('valor-frete').value     || '0';
    const ufOrigem        = document.getElementById('uf-origem').value       || '-';
    const ufDestino       = document.getElementById('uf-destino').value      || '-';
    const aliquotaIcms    = document.getElementById('aliquota-icms').value   || '0';
    const fornecedorNome  = document.getElementById('fornecedor-nome').value || 'Não informado';
    const fornecedorDoc   = document.getElementById('fornecedor-doc').value  || 'Não informado';

    const tipoCalculo = dados.operacaoMT ? 'SEM GROSS-UP (MT)' : 'COM GROSS-UP';
    const agora       = new Date();
    const dataGeracao = agora.toLocaleDateString('pt-BR');
    const horaGeracao = agora.toLocaleTimeString('pt-BR');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Nota de Débito - ${dataGeracao}</title>
    <style>
        @page { size: A4 portrait; margin: 10mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #1a1a1a; background: #fff; width: 186mm; }

        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #001240; padding-bottom: 6px; margin-bottom: 8px; }
        .header h1 { font-size: 13pt; color: #001240; }
        .header p  { font-size: 8pt; color: #555; margin-top: 2px; }
        .header-right { text-align: right; font-size: 8pt; color: #444; }

        .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 7.5pt; font-weight: bold; color: #fff; background: #001240; }
        .badge-warning { background: #B8960C; }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }

        .box { border: 1px solid #d1d5db; border-radius: 4px; padding: 5px 7px; }
        .box h2 { font-size: 8.5pt; color: #001240; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 5px; }

        .row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #e5e7eb; font-size: 8.5pt; }
        .row:last-child { border-bottom: none; }
        .lbl { color: #555; }
        .val { font-weight: 600; text-align: right; max-width: 55%; word-break: break-word; }
        .val.hl { color: #7A1414; }

        .impostos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
        .imp { display: flex; justify-content: space-between; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; padding: 3px 6px; font-size: 8pt; }

        .totais { border: 2px solid #001240; border-radius: 5px; overflow: hidden; margin-top: 6px; }
        .totais .row { padding: 4px 10px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; }
        .totais .row:last-child { border-bottom: none; }
        .totais .row.grand { background: #001240; color: #fff; font-size: 11pt; font-weight: 800; }
        .totais .row.grand .val { color: #fff; }

        .doc-footer { margin-top: 8px; text-align: center; font-size: 7.5pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 4px; }
    </style>
</head>
<body>

    <div class="header">
        <div>
            <h1>CÁLCULO DE INDENIZAÇÃO</h1>
            <p>Nota de Débito por Sinistro em Transporte</p>
        </div>
        <div class="header-right">
            <p><strong>Emissão:</strong> ${dataGeracao} às ${horaGeracao}</p>
            <p><strong>Cálculo:</strong> <span class="badge ${dados.operacaoMT ? 'badge-warning' : ''}">${tipoCalculo}</span></p>
        </div>
    </div>

    <div class="grid-2">
        <div class="box">
            <h2>Transportador</h2>
            <div class="row"><span class="lbl">Filial</span><span class="val">${filial}</span></div>
            <div class="row"><span class="lbl">Razão Social</span><span class="val">${razaoSocial}</span></div>
            <div class="row"><span class="lbl">CNPJ</span><span class="val">${cnpj}</span></div>
        </div>
        <div class="box">
            <h2>Fornecedor / Remetente</h2>
            <div class="row"><span class="lbl">Razão Social</span><span class="val">${fornecedorNome}</span></div>
            <div class="row"><span class="lbl">CPF/CNPJ</span><span class="val">${fornecedorDoc}</span></div>
        </div>
    </div>

    <div class="grid-2">
        <div class="box">
            <h2>Documentos</h2>
            <div class="row"><span class="lbl">NF Lote</span><span class="val">${nfLote} — ${dataNfLote}</span></div>
            <div class="row"><span class="lbl">CT-e</span><span class="val">${cte} — ${dataCte}</span></div>
            <div class="row"><span class="lbl">NF Venda</span><span class="val">${nfVenda} — ${dataNfVenda}</span></div>
        </div>
        <div class="box">
            <h2>Informações Fiscais</h2>
            <div class="row"><span class="lbl">Produto</span><span class="val">${produto}</span></div>
            <div class="row"><span class="lbl">Rota</span><span class="val">${ufOrigem} → ${ufDestino}</span></div>
            <div class="row"><span class="lbl">ICMS</span><span class="val">${aliquotaIcms}%</span></div>
        </div>
    </div>

    <div class="grid-2">
        <div class="box">
            <h2>Pesos (kg)</h2>
            <div class="row"><span class="lbl">Saída</span><span class="val">${fmtPeso(pesoSaida)} kg</span></div>
            <div class="row"><span class="lbl">Destino</span><span class="val">${fmtPeso(pesoDestino)} kg</span></div>
            <div class="row"><span class="lbl">Sinistrado</span><span class="val hl">${fmtPeso(pesoSinistrado)} kg (${percentualPerda})</span></div>
        </div>
        <div class="box">
            <h2>Valores (R$)</h2>
            <div class="row"><span class="lbl">NF Saída</span><span class="val">R$ ${fmt(valorNf)}</span></div>
            <div class="row"><span class="lbl">Frete</span><span class="val">R$ ${fmt(valorFrete)}</span></div>
            <div class="row"><span class="lbl">Base Mercadoria</span><span class="val">R$ ${fmt(dados.baseMercadoria)}</span></div>
            <div class="row"><span class="lbl">Base Frete</span><span class="val">R$ ${fmt(dados.baseFrete)}</span></div>
        </div>
    </div>

    <div class="box" style="margin-bottom:6px;">
        <h2>Impostos Recuperáveis</h2>
        <div class="impostos-grid">
            <div class="imp"><span>ICMS Mercadoria</span><strong>R$ ${fmt(dados.icmsMerc)}</strong></div>
            <div class="imp"><span>ICMS Frete</span><strong>R$ ${fmt(dados.icmsFrete)}</strong></div>
            <div class="imp"><span>PIS</span><strong>R$ ${fmt(dados.pisMerc)}</strong></div>
            <div class="imp"><span>COFINS</span><strong>R$ ${fmt(dados.cofinsMerc)}</strong></div>
        </div>
    </div>

    <div class="totais">
        <div class="row"><span class="lbl">Ressarcimento Mercadoria</span><span class="val">R$ ${fmt(dados.baseMercadoria)}</span></div>
        <div class="row"><span class="lbl">Ressarcimento Impostos</span><span class="val">R$ ${fmt(dados.totalImpostos)}</span></div>
        <div class="row grand"><span>TOTAL A PAGAR</span><span class="val">R$ ${fmt(dados.totalPagar)}</span></div>
    </div>

    <div class="doc-footer">
        Documento gerado em ${dataGeracao} às ${horaGeracao} — ADM do Brasil · Uso interno
    </div>

</body>
</html>`;
}

// ── IMPRIMIR ──────────────────────────────────────────
function imprimirResultado() {
    if (!window.dadosCalculo) {
        alert('Calcule primeiro antes de imprimir.');
        return;
    }
    const win = window.open('', '', 'height=900,width=800');
    win.document.write(_gerarHTMLA4().replace('</body>', '<script>window.onload = () => window.print();<\/script></body>'));
    win.document.close();
}

// ── GERAR PDF ─────────────────────────────────────────
function gerarPDF() {
    if (!window.dadosCalculo) {
        alert('Calcule primeiro antes de gerar PDF.');
        return;
    }
    const win = window.open('', '', 'height=900,width=800');
    win.document.write(_gerarHTMLA4().replace('</body>', '<script>window.onload = () => window.print();<\/script></body>'));
    win.document.close();
}