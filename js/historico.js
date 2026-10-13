// =====================================================
// HISTORICO.JS — Histórico de notas geradas
// -----------------------------------------------------
// Guarda no localStorage DESTE navegador cada nota gerada em
// "Gerar PDF da nota" (ui.js chama Historico.registrar()).
// Nada é enviado para fora do computador.
//
// Cada registro guarda os valores dos campos do formulário
// (para reabrir a nota) e um resumo para a lista. Ao abrir,
// os campos são preenchidos e os eventos normais disparam o
// cálculo em script.js — o histórico NÃO guarda nem reaplica
// valores calculados, então o resultado é sempre recalculado
// pelas regras vigentes.
//
// Depende de: ui.js (classe "js" e Historico.registrar) e das
// funções globais formatarMoeda (script.js).
// =====================================================
(function () {
    'use strict';

    const CHAVE = 'calculadoraNotaDebito.historico.v1';
    const LIMITE = 100; // registros mais antigos saem quando passa disso

    // Campos guardados, na ordem em que são restaurados
    const CAMPOS = [
        'produto', 'uf-origem', 'uf-destino',
        'peso-saida', 'peso-destino', 'valor-nf-saida', 'valor-frete',
        'filial', 'razao-social', 'cnpj', 'fornecedor-nome', 'fornecedor-doc',
        'nf-lote', 'data-nf-lote', 'cte', 'data-cte', 'nf-venda', 'data-nf-venda'
    ];
    const SELECTS = ['produto', 'uf-origem', 'uf-destino'];

    const $ = (id) => document.getElementById(id);
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ── Armazenamento (pode falhar: modo privado, bloqueio, cota) ──
    let disponivel = true;

    function ler() {
        try {
            const bruto = window.localStorage.getItem(CHAVE);
            if (!bruto) return [];
            const dados = JSON.parse(bruto);
            return Array.isArray(dados.itens) ? dados.itens : [];
        } catch (e) {
            disponivel = false;
            return [];
        }
    }

    function gravar(itens) {
        const salvar = (lista) => window.localStorage.setItem(CHAVE, JSON.stringify({ versao: 1, itens: lista }));
        try {
            salvar(itens);
            return true;
        } catch (e) {
            // Cota cheia: tenta de novo guardando só a metade mais recente
            try {
                salvar(itens.slice(0, Math.ceil(itens.length / 2)));
                return true;
            } catch (e2) {
                disponivel = false;
                return false;
            }
        }
    }

    // ── Montagem do registro ────────────────────────────
    function valorCampo(id) {
        const el = $(id);
        return el ? String(el.value) : '';
    }

    function textoOpcao(id) {
        const el = $(id);
        if (!el || el.selectedIndex < 1) return '';
        return el.options[el.selectedIndex].text;
    }

    function montarRegistro() {
        const campos = {};
        CAMPOS.forEach(id => { campos[id] = valorCampo(id); });
        const dados = window.dadosCalculo || {};
        return {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            criadoEm: new Date().toISOString(),
            campos: campos,
            resumo: {
                produto: textoOpcao('produto'),
                origem: campos['uf-origem'],
                destino: campos['uf-destino'],
                aliquota: valorCampo('aliquota-icms'),
                pesoSinistrado: valorCampo('peso-sinistrado'),
                perda: valorCampo('percentual-perda'),
                total: Number(dados.totalPagar) || 0,
                semGrossUp: !!dados.operacaoMT,
                transportador: campos['razao-social'],
                fornecedor: campos['fornecedor-nome'],
                nfLote: campos['nf-lote'],
                cte: campos['cte'],
                nfVenda: campos['nf-venda']
            }
        };
    }

    function mesmosCampos(a, b) {
        return CAMPOS.every(id => (a.campos[id] || '') === (b.campos[id] || ''));
    }

    // Chamado por ui.js depois que a nota abriu
    function registrar() {
        const itens = ler();
        const novo = montarRegistro();

        // A mesma nota gerada de novo só atualiza a data, sem duplicar
        if (itens.length && mesmosCampos(itens[0], novo)) {
            itens[0].criadoEm = novo.criadoEm;
        } else {
            itens.unshift(novo);
        }
        gravar(itens.slice(0, LIMITE));
        renderizar();
    }

    // ── Formatação ──────────────────────────────────────
    function dataHora(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('pt-BR') + ' às ' +
            d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function moeda(valor) {
        return 'R$ ' + (typeof formatarMoeda === 'function'
            ? formatarMoeda(valor)
            : Number(valor).toFixed(2).replace('.', ','));
    }

    function descricao(r) {
        const partes = [];
        if (r.produto) partes.push(r.produto);
        if (r.origem && r.destino) partes.push(r.origem + ' → ' + r.destino);
        if (r.pesoSinistrado) partes.push('perda de ' + r.pesoSinistrado + ' kg' + (r.perda ? ' (' + r.perda + ')' : ''));
        if (r.semGrossUp) partes.push('sem gross-up');
        return partes.join(', ');
    }

    function documentos(r) {
        const partes = [];
        if (r.nfLote) partes.push('NF de lote ' + r.nfLote);
        if (r.cte) partes.push('CT-e ' + r.cte);
        if (r.nfVenda) partes.push('NF de venda ' + r.nfVenda);
        return partes.join(', ');
    }

    // Texto para busca: sem acentos e em minúsculas
    function normalizar(texto) {
        return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    function textoBusca(item) {
        const r = item.resumo;
        return normalizar([r.transportador, r.fornecedor, r.produto, r.origem, r.destino,
            r.nfLote, r.cte, r.nfVenda, item.campos.cnpj, item.campos['fornecedor-doc'],
            dataHora(item.criadoEm), moeda(r.total)].join(' '));
    }

    // ── Elementos ───────────────────────────────────────
    function el(tag, classe, texto) {
        const e = document.createElement(tag);
        if (classe) e.className = classe;
        if (texto !== undefined) e.textContent = texto;
        return e;
    }

    function botao(classe, texto) {
        const b = el('button', classe, texto);
        b.type = 'button';
        return b;
    }

    function formularioPreenchido() {
        return CAMPOS.some(id => {
            const v = valorCampo(id).trim();
            return v !== '' && v !== '0,00';
        });
    }

    function criarItem(item) {
        const r = item.resumo;
        const li = el('li', 'history-item');
        li.dataset.id = item.id;

        const principal = el('div', 'history-main');
        principal.appendChild(el('p', 'history-party', r.transportador || 'Transportador não informado'));
        const desc = descricao(r);
        if (desc) principal.appendChild(el('p', 'history-meta', desc));
        const docs = documentos(r);
        if (docs) principal.appendChild(el('p', 'history-meta', docs));

        const valor = el('div', 'history-value');
        valor.appendChild(el('span', 'history-total', moeda(r.total)));
        const quando = el('time', 'history-date', dataHora(item.criadoEm));
        quando.dateTime = item.criadoEm;
        valor.appendChild(quando);

        const acoes = el('div', 'history-actions');
        const abrir = botao('btn btn-secondary btn-sm', 'Abrir');
        abrir.setAttribute('aria-label', 'Abrir no formulário a nota de ' + dataHora(item.criadoEm));
        const excluir = botao('btn btn-ghost btn-sm', 'Excluir');
        excluir.setAttribute('aria-label', 'Excluir do histórico a nota de ' + dataHora(item.criadoEm));
        acoes.appendChild(abrir);
        acoes.appendChild(excluir);

        // Confirmação para substituir o que já está preenchido
        const confirma = el('div', 'confirm history-confirm');
        confirma.hidden = true;
        confirma.appendChild(el('p', '', 'O formulário já tem dados. Substituir pelos desta nota?'));
        const linha = el('div', 'confirm-actions');
        const sim = botao('btn btn-primary btn-sm', 'Substituir');
        const nao = botao('btn btn-secondary btn-sm', 'Cancelar');
        linha.appendChild(sim);
        linha.appendChild(nao);
        confirma.appendChild(linha);

        abrir.addEventListener('click', () => {
            if (formularioPreenchido()) {
                confirma.hidden = false;
                nao.focus();
            } else {
                restaurar(item);
            }
        });
        sim.addEventListener('click', () => { confirma.hidden = true; restaurar(item); });
        nao.addEventListener('click', () => { confirma.hidden = true; abrir.focus(); });
        confirma.addEventListener('keydown', e => {
            if (e.key === 'Escape') { confirma.hidden = true; abrir.focus(); }
        });
        excluir.addEventListener('click', () => excluirItem(item.id));

        li.appendChild(principal);
        li.appendChild(valor);
        li.appendChild(acoes);
        li.appendChild(confirma);
        return li;
    }

    // ── Lista ───────────────────────────────────────────
    function renderizar() {
        const itens = ler();
        const lista = $('historico-lista');
        const termo = normalizar($('historico-busca').value.trim());
        const visiveis = termo ? itens.filter(i => textoBusca(i).indexOf(termo) !== -1) : itens;

        lista.textContent = '';
        visiveis.forEach(i => lista.appendChild(criarItem(i)));

        $('historico-vazio').hidden = itens.length > 0;
        $('historico-sem-resultado').hidden = !(itens.length && !visiveis.length);
        $('historico-ferramentas').hidden = itens.length === 0;

        const contador = $('historico-contador');
        if (contador) {
            contador.textContent = itens.length ? String(itens.length) : '';
            contador.hidden = itens.length === 0;
        }

        if (!disponivel) {
            mostrarAviso('O histórico não está disponível: este navegador bloqueou o armazenamento local (por exemplo, em janela anônima).');
        }
    }

    // ── Aviso com "Desfazer" ────────────────────────────
    let ultimoExcluido = null;

    function mostrarAviso(texto, comDesfazer) {
        const aviso = $('historico-aviso');
        aviso.textContent = texto;
        if (comDesfazer) {
            const desfazer = botao('link-button', 'Desfazer');
            desfazer.addEventListener('click', () => {
                if (!ultimoExcluido) return;
                const itens = ler();
                itens.splice(Math.min(ultimoExcluido.indice, itens.length), 0, ultimoExcluido.item);
                gravar(itens.slice(0, LIMITE));
                ultimoExcluido = null;
                aviso.hidden = true;
                renderizar();
            });
            aviso.appendChild(document.createTextNode(' '));
            aviso.appendChild(desfazer);
        }
        aviso.hidden = false;
    }

    function excluirItem(id) {
        const itens = ler();
        const indice = itens.findIndex(i => i.id === id);
        if (indice === -1) return;
        ultimoExcluido = { item: itens[indice], indice: indice };
        itens.splice(indice, 1);
        gravar(itens);
        renderizar();
        mostrarAviso('Nota excluída do histórico.', true);
        // O foco não se perde: vai para a próxima nota ou para a seção
        const proximo = document.querySelector('#historico-lista .history-item .btn');
        if (proximo) proximo.focus();
        else $('historico').focus();
    }

    // ── Reabrir uma nota no formulário ──────────────────
    function disparar(elemento, tipo) {
        elemento.dispatchEvent(new Event(tipo, { bubbles: true }));
    }

    function restaurar(item) {
        const campos = item.campos || {};

        // Começa de um formulário limpo (mesma rotina do "Novo cálculo")
        document.querySelectorAll('#formulario input, #formulario select').forEach(c => {
            if (c.tagName === 'SELECT') c.selectedIndex = 0;
            else if (c.dataset.mascara === 'moeda') { c.value = '0,00'; c.dataset.raw = '0'; }
            else c.value = '';
        });

        // Selects primeiro (produto e UFs definem alíquota, MT e PIS/COFINS)
        SELECTS.forEach(id => {
            const c = $(id);
            if (!c) return;
            c.value = campos[id] || '';
            disparar(c, 'change');
        });

        // Demais campos: o evento "input" reaplica a máscara e recalcula
        CAMPOS.filter(id => SELECTS.indexOf(id) === -1).forEach(id => {
            const c = $(id);
            if (!c) return;
            const v = campos[id] || '';
            if (c.dataset.mascara === 'moeda') c.value = v || '0,00';
            else c.value = v;
            disparar(c, c.type === 'date' ? 'change' : 'input');
        });

        $('anuncio').textContent = 'Nota de ' + dataHora(item.criadoEm) + ' aberta no formulário. Total à pagar: ' +
            $('res-total').textContent + '.';

        const destino = $('formulario');
        destino.scrollIntoView({ block: 'start', behavior: reduzirMovimento.matches ? 'auto' : 'smooth' });
        $('produto').focus({ preventScroll: true });
    }

    // ── Limpar tudo ─────────────────────────────────────
    function iniciar() {
        if (!$('historico-lista')) return;

        $('historico-busca').addEventListener('input', renderizar);

        const btnLimpar = $('btn-limpar-historico');
        const confirma = $('confirmar-historico');
        const fechar = () => {
            confirma.hidden = true;
            btnLimpar.setAttribute('aria-expanded', 'false');
        };
        btnLimpar.addEventListener('click', () => {
            confirma.hidden = !confirma.hidden;
            btnLimpar.setAttribute('aria-expanded', String(!confirma.hidden));
            if (!confirma.hidden) $('btn-cancelar-historico').focus();
        });
        $('btn-cancelar-historico').addEventListener('click', () => { fechar(); btnLimpar.focus(); });
        confirma.addEventListener('keydown', e => { if (e.key === 'Escape') { fechar(); btnLimpar.focus(); } });
        $('btn-confirmar-historico').addEventListener('click', () => {
            fechar();
            try { window.localStorage.removeItem(CHAVE); } catch (e) { disponivel = false; }
            ultimoExcluido = null;
            $('historico-busca').value = '';
            renderizar();
            mostrarAviso('Histórico apagado.');
            $('historico').focus();
        });

        // Outra aba da calculadora gerou uma nota: atualiza a lista
        window.addEventListener('storage', e => { if (e.key === CHAVE) renderizar(); });

        renderizar();
    }

    window.Historico = { registrar: registrar, renderizar: renderizar };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
