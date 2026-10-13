// =====================================================
// UI.JS — Experiência de uso da calculadora
// -----------------------------------------------------
// Camada de interface: NÃO calcula valores. Lê os campos e os
// resultados produzidos por script.js para:
//   • mostrar o status do cálculo e o que falta preencher;
//   • espelhar pesos e método no painel de resultado;
//   • validar os campos antes de gerar o PDF, com a mensagem
//     junto a cada campo;
//   • controlar o menu no celular, a barra de total e o
//     "Novo cálculo".
//
// Depende de funções globais de:
//   mascaras.js → getNumerico, validarDVCNPJ, validarDVCPF
//   script.js   → formatarPeso, ehOperacaoMT, produtoTemPisCofins,
//                 limparResultados, atualizarAvisoMT, atualizarAvisoPisCofins
//   visual.js   → gerarPDF
// =====================================================
(function () {
    'use strict';

    // Habilita estilos que dependem de JavaScript (ex.: menu recolhível)
    document.documentElement.classList.add('js');

    const $ = (id) => document.getElementById(id);
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const telaLarga = window.matchMedia('(min-width: 1100px)');

    // ── Leitura dos campos ──────────────────────────────
    const lerPeso = (id) => parseFloat(String($(id).value).replace(/\./g, '')) || 0;
    const preenchido = (id) => String($(id).value).trim() !== '';

    // Campos obrigatórios para o cálculo, na ordem do formulário
    const OBRIGATORIOS = [
        { id: 'produto',        nome: 'produto',              falta: () => !preenchido('produto'),             msg: 'Selecione o produto.' },
        { id: 'uf-origem',      nome: 'UF de origem',         falta: () => !preenchido('uf-origem'),           msg: 'Selecione a UF de origem.' },
        { id: 'uf-destino',     nome: 'UF de destino',        falta: () => !preenchido('uf-destino'),          msg: 'Selecione a UF de destino.' },
        { id: 'peso-saida',     nome: 'peso de saída',        falta: () => lerPeso('peso-saida') <= 0,         msg: 'Informe o peso de saída (maior que zero).' },
        { id: 'peso-destino',   nome: 'peso de destino',      falta: () => !preenchido('peso-destino'),        msg: 'Informe o peso de destino. Se nada chegou, digite 0.' },
        { id: 'valor-nf-saida', nome: 'valor da NF de saída', falta: () => getNumerico('valor-nf-saida') <= 0, msg: 'Informe o valor da NF de saída.' }
    ];

    // Campos que podem exibir mensagem de erro
    const CAMPOS_VALIDADOS = OBRIGATORIOS.map(c => c.id).concat(['cnpj', 'fornecedor-doc']);

    // "a, b e c"
    function listar(itens) {
        if (window.Intl && Intl.ListFormat) {
            return new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' }).format(itens);
        }
        if (itens.length < 2) return itens.join('');
        return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
    }

    // ── Estado do cálculo ───────────────────────────────
    function avaliar() {
        const faltando = OBRIGATORIOS.filter(c => c.falta());
        const saida = lerPeso('peso-saida');
        const destinoInformado = preenchido('peso-destino');
        const destino = lerPeso('peso-destino');
        const semPerda = saida > 0 && destinoInformado && destino >= saida;

        let status;
        if (faltando.length === OBRIGATORIOS.length) status = 'vazio';
        else if (semPerda) status = 'sem-perda';
        else if (faltando.length) status = 'incompleto';
        else status = 'ok';

        return { status, faltando, saida, destino, destinoInformado, semPerda };
    }

    // Texto e ícone do chip de status (o significado nunca depende só da cor)
    const STATUS = {
        'vazio':      { texto: 'Aguardando dados', classe: '',              icone: '<circle cx="12" cy="12" r="7"/>' },
        'incompleto': { texto: 'Incompleto',       classe: 'chip--warning', icone: '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4M12 17h.01"/>' },
        'sem-perda':  { texto: 'Sem perda',        classe: 'chip--danger',  icone: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>' },
        'ok':         { texto: 'Calculado',        classe: 'chip--success', icone: '<path d="M5 12.5l4.5 4.5L19 7.5"/>' }
    };

    function textoMetodo() {
        if (!preenchido('uf-origem') || !preenchido('uf-destino') || !preenchido('aliquota-icms')) {
            return 'Informe as UFs de origem e de destino para definir a alíquota de ICMS.';
        }
        const partes = [
            ehOperacaoMT() ? 'Sem gross-up (origem MT)' : 'Com gross-up',
            'ICMS de ' + $('aliquota-icms').value + '%'
        ];
        if (preenchido('produto')) {
            partes.push(produtoTemPisCofins($('produto').value) ? 'com PIS e COFINS' : 'sem PIS e COFINS');
        }
        return partes.join(', ') + '.';
    }

    function marcarSecao(idCampo, completa) {
        const secao = $(idCampo).closest('.form-section');
        if (secao) secao.classList.toggle('is-complete', !!completa);
    }

    // ── Atualização da interface (a cada alteração) ─────
    function atualizar() {
        const estado = avaliar();
        const painel = $('painel-resultado');
        painel.dataset.status = estado.status;

        // Chip de status
        const s = STATUS[estado.status];
        const chip = $('status-calculo');
        chip.className = 'chip' + (s.classe ? ' ' + s.classe : '');
        chip.querySelector('svg').innerHTML = s.icone;
        $('status-texto').textContent = s.texto;

        // Método de cálculo
        $('resumo-metodo').textContent = textoMetodo();

        // O que falta para concluir
        const caixa = $('pendencias');
        if (estado.status === 'incompleto') {
            $('pendencias-texto').textContent = 'Para concluir, informe: ' + listar(estado.faltando.map(c => c.nome)) + '.';
            caixa.hidden = false;
        } else if (estado.status === 'sem-perda') {
            $('pendencias-texto').textContent = estado.destino > estado.saida
                ? 'O peso de destino é maior que o de saída. Confira os pesos.'
                : 'Os pesos de saída e de destino são iguais: não há perda a indenizar.';
            caixa.hidden = false;
        } else {
            caixa.hidden = true;
        }

        // Perda apurada no resumo
        const temSaida = estado.saida > 0;
        $('resumo-peso-saida').textContent   = temSaida ? formatarPeso(estado.saida) + ' kg' : '—';
        $('resumo-peso-destino').textContent = estado.destinoInformado ? formatarPeso(estado.destino) + ' kg' : '—';
        $('resumo-peso-sinistrado').textContent = temSaida && preenchido('peso-sinistrado') ? $('peso-sinistrado').value + ' kg' : '—';
        $('resumo-perda').textContent = temSaida && preenchido('percentual-perda') ? $('percentual-perda').value : '—';

        // Seções concluídas (marcador numérico fica verde)
        marcarSecao('produto', preenchido('produto') && preenchido('uf-origem') && preenchido('uf-destino') && preenchido('aliquota-icms'));
        marcarSecao('peso-saida', temSaida && estado.destinoInformado && !estado.semPerda);
        marcarSecao('valor-nf-saida', getNumerico('valor-nf-saida') > 0);

        if (tentouGerar) revalidar();
        atualizarBarraTotal();
        agendarAnuncio();
    }

    // ── Anúncio para leitores de tela (sem interromper a digitação) ──
    let timerAnuncio = null;
    let ultimoAnunciado = '';
    function agendarAnuncio() {
        clearTimeout(timerAnuncio);
        timerAnuncio = setTimeout(function () {
            if (avaliar().status !== 'ok') return;
            const total = $('res-total').textContent;
            if (total === ultimoAnunciado) return;
            ultimoAnunciado = total;
            $('anuncio').textContent = 'Cálculo concluído. Total à pagar: ' + total + '.';
        }, 1200);
    }

    // ── Barra de total (telas menores que 1100 px) ──────
    let resultadoVisivel = false;
    function atualizarBarraTotal() {
        const temValor = !!(window.dadosCalculo && window.dadosCalculo.totalPagar > 0);
        const mostrar = !telaLarga.matches && temValor && !resultadoVisivel;
        $('barra-total-valor').textContent = $('res-total').textContent;
        $('barra-total').hidden = !mostrar;
        document.body.classList.toggle('has-total-bar', mostrar);
    }

    // ── Validação ───────────────────────────────────────
    let tentouGerar = false;

    function erroCNPJ(v) {
        if (v.length !== 14) return 'CNPJ incompleto: são 14 caracteres.';
        return validarDVCNPJ(v) ? '' : 'CNPJ inválido: confira os dígitos.';
    }

    // tipo: 'cnpj' (só CNPJ) ou 'cpfcnpj' (CPF ou CNPJ). Campo vazio é permitido.
    function erroDocumento(valor, tipo) {
        const v = String(valor).toUpperCase().replace(/[^0-9A-Z]/g, '');
        if (!v) return '';
        if (tipo === 'cnpj' || /[A-Z]/.test(v) || v.length > 11) return erroCNPJ(v);
        if (v.length !== 11) return 'CPF incompleto: são 11 dígitos.';
        return validarDVCPF(v) ? '' : 'CPF inválido: confira os dígitos.';
    }

    function coletarErros() {
        const erros = [];
        OBRIGATORIOS.forEach(c => { if (c.falta()) erros.push({ id: c.id, msg: c.msg }); });

        const estado = avaliar();
        if (estado.saida > 0 && estado.destinoInformado) {
            if (estado.destino > estado.saida) {
                erros.push({ id: 'peso-destino', msg: 'O peso de destino não pode ser maior que o de saída.' });
            } else if (estado.destino === estado.saida) {
                erros.push({ id: 'peso-destino', msg: 'Os pesos são iguais: não há perda a indenizar.' });
            }
        }

        const eCnpj = erroDocumento($('cnpj').value, 'cnpj');
        if (eCnpj) erros.push({ id: 'cnpj', msg: eCnpj });
        const eDoc = erroDocumento($('fornecedor-doc').value, 'cpfcnpj');
        if (eDoc) erros.push({ id: 'fornecedor-doc', msg: eDoc });

        // Ordem do formulário (o primeiro erro recebe o foco)
        return erros.sort((a, b) =>
            ($(a.id).compareDocumentPosition($(b.id)) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
    }

    function adicionarDescricao(el, id) {
        const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        if (ids.indexOf(id) === -1) {
            ids.unshift(id); // a mensagem de erro é lida antes da dica
            el.setAttribute('aria-describedby', ids.join(' '));
        }
    }

    function removerDescricao(el, id) {
        const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(x => x && x !== id);
        if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
        else el.removeAttribute('aria-describedby');
    }

    // Mostra (msg preenchida) ou remove (msg vazia) o erro de um campo
    function definirErro(id, msg) {
        const input = $(id);
        const field = input.closest('.field');
        let p = $('erro-' + id);

        if (!msg) {
            if (p) p.remove();
            if (field) field.classList.remove('has-error');
            input.removeAttribute('aria-invalid');
            removerDescricao(input, 'erro-' + id);
            return;
        }

        if (!p) {
            p = document.createElement('p');
            p.className = 'field-error';
            p.id = 'erro-' + id;
            field.appendChild(p);
        }
        p.textContent = msg;
        field.classList.add('has-error');
        input.setAttribute('aria-invalid', 'true');
        adicionarDescricao(input, p.id);
    }

    function aplicarErros(erros) {
        const porCampo = {};
        erros.forEach(e => { if (!porCampo[e.id]) porCampo[e.id] = e.msg; });
        CAMPOS_VALIDADOS.forEach(id => definirErro(id, porCampo[id] || ''));
        return Object.keys(porCampo).length;
    }

    function atualizarFeedback(qtd) {
        const fb = $('feedback-pdf');
        if (!qtd) {
            fb.hidden = true;
            fb.textContent = '';
            return;
        }
        fb.textContent = qtd === 1
            ? 'Corrija o campo destacado para gerar a nota.'
            : 'Corrija os ' + qtd + ' campos destacados para gerar a nota.';
        fb.hidden = false;
    }

    // Depois da primeira tentativa, os erros acompanham as correções.
    // Enquanto a pessoa digita um CPF/CNPJ, um erro novo só aparece ao sair do campo.
    function revalidar() {
        const ativo = document.activeElement;
        const erros = coletarErros().filter(e =>
            !(ativo && ativo.id === e.id && (e.id === 'cnpj' || e.id === 'fornecedor-doc') && !$('erro-' + e.id)));
        atualizarFeedback(aplicarErros(erros));
    }

    // CPF/CNPJ: confere ao sair do campo; durante a digitação só remove o erro
    function validarDocumentoAoSair(e) {
        const id = e.target && e.target.id;
        if (id === 'cnpj') definirErro(id, erroDocumento(e.target.value, 'cnpj'));
        if (id === 'fornecedor-doc') definirErro(id, erroDocumento(e.target.value, 'cpfcnpj'));
    }

    function limparErroDocumentoAoDigitar(e) {
        const id = e.target && e.target.id;
        if ((id === 'cnpj' || id === 'fornecedor-doc') && $('erro-' + id)) {
            const tipo = id === 'cnpj' ? 'cnpj' : 'cpfcnpj';
            if (!erroDocumento(e.target.value, tipo)) definirErro(id, '');
        }
    }

    // ── Gerar PDF ───────────────────────────────────────
    function aoGerarPDF() {
        tentouGerar = true;
        const erros = coletarErros();
        const qtd = aplicarErros(erros);
        atualizarFeedback(qtd);

        if (qtd) {
            const primeiro = $(erros[0].id);
            primeiro.scrollIntoView({ block: 'center', behavior: reduzirMovimento.matches ? 'auto' : 'smooth' });
            primeiro.focus({ preventScroll: true });
            return;
        }

        const abriu = gerarPDF();
        if (abriu === false) {
            const fb = $('feedback-pdf');
            fb.textContent = 'O navegador bloqueou a janela da nota. Permita pop-ups para esta página e clique de novo.';
            fb.hidden = false;
            return;
        }

        // Nota gerada: registra no histórico (js/historico.js)
        if (window.Historico) window.Historico.registrar();
    }

    // ── Novo cálculo ────────────────────────────────────
    function mostrarConfirmacao(abrir) {
        $('confirmar-limpeza').hidden = !abrir;
        $('btn-novo-calculo').setAttribute('aria-expanded', String(abrir));
        if (abrir) $('btn-cancelar-limpeza').focus();
    }

    function limparFormulario() {
        document.querySelectorAll('#formulario input, #formulario select').forEach(el => {
            if (el.tagName === 'SELECT') {
                el.selectedIndex = 0;
            } else if (el.dataset.mascara === 'moeda') {
                el.value = '0,00';
                el.dataset.raw = '0';
            } else {
                el.value = '';
            }
        });

        limparResultados();
        $('peso-sinistrado').value = '';
        $('percentual-perda').value = '';
        $('aviso-peso-negativo').style.display = 'none';
        atualizarAvisoMT();
        atualizarAvisoPisCofins();

        tentouGerar = false;
        aplicarErros([]);
        atualizarFeedback(0);
        ultimoAnunciado = '';
        atualizar();

        $('anuncio').textContent = 'Campos apagados. Comece pelo produto.';
        const produto = $('produto');
        produto.scrollIntoView({ block: 'center', behavior: reduzirMovimento.matches ? 'auto' : 'smooth' });
        produto.focus({ preventScroll: true });
    }

    // ── Menu no celular ─────────────────────────────────
    function definirMenu(abrir) {
        const toggle = $('navbar-toggle');
        const menu = $('navbar-menu');
        if (!toggle || !menu) return;
        toggle.setAttribute('aria-expanded', String(abrir));
        menu.classList.toggle('is-open', abrir);
        toggle.querySelector('.sr-only').textContent = abrir ? 'Fechar menu' : 'Menu';
    }

    function iniciarMenu() {
        const toggle = $('navbar-toggle');
        const menu = $('navbar-menu');
        if (!toggle || !menu) return;

        toggle.addEventListener('click', () => definirMenu(toggle.getAttribute('aria-expanded') !== 'true'));
        menu.addEventListener('click', e => { if (e.target.closest('a')) definirMenu(false); });
        document.addEventListener('click', e => {
            if (toggle.getAttribute('aria-expanded') === 'true' && !e.target.closest('.navbar')) definirMenu(false);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                definirMenu(false);
                toggle.focus();
            }
        });
    }

    // ── Inicialização ───────────────────────────────────
    function iniciar() {
        // Recalcula a interface depois dos scripts de cálculo (eventos sobem até o document)
        document.addEventListener('input', atualizar);
        document.addEventListener('change', atualizar);
        document.addEventListener('input', limparErroDocumentoAoDigitar);
        document.addEventListener('focusout', validarDocumentoAoSair);

        $('btn-gerar-pdf').addEventListener('click', aoGerarPDF);

        $('btn-novo-calculo').addEventListener('click', () => mostrarConfirmacao($('confirmar-limpeza').hidden));
        $('btn-cancelar-limpeza').addEventListener('click', () => {
            mostrarConfirmacao(false);
            $('btn-novo-calculo').focus();
        });
        $('btn-confirmar-limpeza').addEventListener('click', () => {
            mostrarConfirmacao(false);
            limparFormulario();
        });
        $('confirmar-limpeza').addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                mostrarConfirmacao(false);
                $('btn-novo-calculo').focus();
            }
        });

        iniciarMenu();

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entradas => {
                resultadoVisivel = entradas.some(e => e.isIntersecting);
                atualizarBarraTotal();
            }).observe($('painel-resultado'));
        }

        const aoMudarLargura = () => {
            if (telaLarga.matches) definirMenu(false);
            atualizarBarraTotal();
        };
        if (telaLarga.addEventListener) telaLarga.addEventListener('change', aoMudarLargura);

        atualizar();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
