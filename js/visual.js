// =====================================================
// VISUAL.JS — Nota de débito para impressão e PDF
// Monta a nota em A4 numa nova janela e abre a impressão do
// navegador ("Salvar como PDF" ou impressora). A validação dos
// campos antes de gerar a nota fica em js/ui.js.
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

    // Segurança: escapa caracteres especiais de HTML nos textos digitados pelo usuário
    // antes de inseri-los na nota (evita que um texto como "<b>" ou "<script>" altere o documento).
    const _esc = v => String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const filial          = _esc(document.getElementById('filial').value)          || 'Não informado';
    const razaoSocial     = _esc(document.getElementById('razao-social').value)    || 'Não informado';
    const cnpj            = _esc(document.getElementById('cnpj').value)            || 'Não informado';
    const produto         = _esc(document.getElementById('produto').value)         || 'Não selecionado';
    const nfLote          = _esc(document.getElementById('nf-lote').value)         || '-';
    const dataNfLote      = formatarDataBR(_esc(document.getElementById('data-nf-lote').value));
    const cte             = _esc(document.getElementById('cte').value)             || '-';
    const dataCte         = formatarDataBR(_esc(document.getElementById('data-cte').value));
    const nfVenda         = _esc(document.getElementById('nf-venda').value)        || '-';
    const dataNfVenda     = formatarDataBR(_esc(document.getElementById('data-nf-venda').value));
    const pesoSaida       = _esc(document.getElementById('peso-saida').value)      || '0';
    const pesoDestino     = _esc(document.getElementById('peso-destino').value)    || '0';
    const pesoSinistrado  = _esc(document.getElementById('peso-sinistrado').value) || '0';
    const percentualPerda = _esc(document.getElementById('percentual-perda').value) || '0%';
    const valorNf         = _esc(document.getElementById('valor-nf-saida').value)  || '0';
    const valorFrete      = _esc(document.getElementById('valor-frete').value)     || '0';
    const ufOrigem        = _esc(document.getElementById('uf-origem').value)       || '-';
    const ufDestino       = _esc(document.getElementById('uf-destino').value)      || '-';
    const aliquotaIcms    = _esc(document.getElementById('aliquota-icms').value)   || '0';
    const fornecedorNome  = _esc(document.getElementById('fornecedor-nome').value) || 'Não informado';
    const fornecedorDoc   = _esc(document.getElementById('fornecedor-doc').value)  || 'Não informado';

    // Logo ADM para o cabeçalho da nota (URL absoluta, pois a nota abre em nova janela)
    let logoURL = '';
    try { logoURL = new URL('img/adm-logo-color.png', document.baseURI).href; } catch (e) { logoURL = ''; }

    // Documento: "número — data", ou só o que foi informado
    const docLinha = (numero, data) => {
        const temNumero = numero && numero !== '-';
        const temData   = data && data !== '-';
        if (temNumero && temData) return `${numero} — ${data}`;
        if (temNumero) return numero;
        if (temData)   return `Sem número — ${data}`;
        return 'Não informado';
    };

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
        body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #1a1a1a; background: #fff; width: 186mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #8BC400; padding-bottom: 6px; margin-bottom: 8px; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .header-left img { height: 15mm; width: auto; display: block; }
        .header h1 { font-size: 13pt; color: #012169; }
        .header p  { font-size: 8pt; color: #555; margin-top: 2px; }
        .header-right { text-align: right; font-size: 8pt; color: #444; }

        .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 7.5pt; font-weight: bold; color: #fff; background: #012169; }
        .badge-warning { background: #8BC400; color: #012169; }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }

        .box { border: 1px solid #d1d5db; border-radius: 4px; padding: 5px 7px; }
        .box h2 { font-size: 8.5pt; color: #012169; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 5px; }

        .row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #e5e7eb; font-size: 8.5pt; }
        .row:last-child { border-bottom: none; }
        .lbl { color: #555; }
        .val { font-weight: 600; text-align: right; max-width: 55%; word-break: break-word; }
        .val.hl { color: #7A1414; }

        .impostos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
        .imp { display: flex; justify-content: space-between; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; padding: 3px 6px; font-size: 8pt; }

        .totais { border: 2px solid #012169; border-radius: 5px; overflow: hidden; margin-top: 6px; }
        .totais .row { padding: 4px 10px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; }
        .totais .row:last-child { border-bottom: none; }
        .totais .row.grand { background: #012169; color: #fff; font-size: 11pt; font-weight: 800; }
        .totais .row.grand .val { color: #fff; }

        .doc-footer { margin-top: 8px; text-align: center; font-size: 7.5pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 4px; }
    </style>
</head>
<body>

    <div class="header">
        <div class="header-left">
            ${logoURL ? `<img src="${_esc(logoURL)}" alt="ADM" onerror="this.style.display='none'">` : ''}
            <div>
                <h1>CÁLCULO DE INDENIZAÇÃO</h1>
                <p>Nota de Débito por Sinistro em Transporte</p>
            </div>
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
            <div class="row"><span class="lbl">NF Lote</span><span class="val">${docLinha(nfLote, dataNfLote)}</span></div>
            <div class="row"><span class="lbl">CT-e</span><span class="val">${docLinha(cte, dataCte)}</span></div>
            <div class="row"><span class="lbl">NF Venda</span><span class="val">${docLinha(nfVenda, dataNfVenda)}</span></div>
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

// Abre a nota numa nova janela e chama a impressão do navegador.
// Retorna false se não houver cálculo ou se o navegador bloquear a janela.
function _abrirNotaParaImpressao(mensagemSemCalculo) {
    if (!window.dadosCalculo) {
        alert(mensagemSemCalculo);
        return false;
    }
    const win = window.open('', '', 'height=900,width=800');
    if (!win) return false; // bloqueador de pop-ups
    win.document.write(_gerarHTMLA4().replace('</body>', '<script>window.onload = () => window.print();<\/script></body>'));
    win.document.close();
    return true;
}

// ── IMPRIMIR ──────────────────────────────────────────
function imprimirResultado() {
    return _abrirNotaParaImpressao('Calcule primeiro antes de imprimir.');
}

// ── GERAR PDF ─────────────────────────────────────────
function gerarPDF() {
    return _abrirNotaParaImpressao('Calcule primeiro antes de gerar PDF.');
}