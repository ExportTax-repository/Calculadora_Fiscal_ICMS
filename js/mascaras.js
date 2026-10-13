// =====================================================
// MÁSCARAS E VALIDAÇÕES DE INPUT
// =====================================================

// ── MOEDA BR: dinâmica com pontos e vírgula ──────────
// Digita 1 → 0,01 | 1000 → 10,00 | 100000 → 1.000,00
// O valor numérico real fica em input.dataset.raw (ex: "1234.56")
function mascaraMoedaBR(input) {
    let digits = input.value.replace(/\D/g, '');
    if (digits.length > 13) digits = digits.slice(-13);
    while (digits.length < 3) digits = '0' + digits;

    const decPart = digits.slice(-2);
    let intPart   = digits.slice(0, digits.length - 2).replace(/^0+/, '') || '0';

    // Adiciona pontos de milhar
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    input.value = intPart + ',' + decPart;

    // Salva valor numérico puro para os cálculos
    input.dataset.raw = parseFloat(intPart.replace(/\./g, '') + '.' + decPart) || 0;
}

// ── PESO kg: apenas pontos de milhar, sem decimais ───
// Ex: 1000 → 1.000 | 100000 → 100.000
function mascaraPeso(input) {
    let digits = input.value.replace(/\D/g, "");
    // Campo apagado continua vazio (não vira "0"): "vazio" = não informado
    if (digits === "") { input.value = ""; return; }
    if (digits.length > 10) digits = digits.slice(-10);
    digits = digits.replace(/^0+/, "") || "0";
    input.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ── CURSOR ───────────────────────────────────────────
// Reaplica a máscara mantendo o cursor depois do mesmo número de
// caracteres significativos (dígitos/letras). Sem isso, corrigir um
// dígito no meio do campo jogava o cursor para o fim.
function aplicarMantendoCursor(input, aplicarMascara, ehSignificativo) {
    const focado = document.activeElement === input;
    const pos = focado ? input.selectionStart : null;
    let antes = 0;
    if (pos !== null) {
        for (let i = 0; i < pos; i++) if (ehSignificativo(input.value[i])) antes++;
    }

    aplicarMascara(input);
    if (pos === null) return;

    const v = input.value;
    let nova = 0;
    let contados = 0;
    while (nova < v.length && contados < antes) {
        if (ehSignificativo(v[nova])) contados++;
        nova++;
    }
    try { input.setSelectionRange(nova, nova); } catch (e) { /* campo sem suporte a seleção */ }
}

const ehDigito = c => /[0-9]/.test(c);
const ehAlfanumerico = c => /[0-9A-Za-z]/.test(c);

// Moeda funciona como caixa registradora: os dígitos entram sempre pela
// direita. Ao clicar no campo, o cursor vai para o fim (com o valor alinhado
// à direita, o clique costumava deixar o cursor no início e multiplicar o valor).
function cursorNoFim(input) {
    if (document.activeElement !== input) return;
    if (input.selectionStart !== input.selectionEnd) return; // respeita seleção feita pela pessoa
    const fim = input.value.length;
    try { input.setSelectionRange(fim, fim); } catch (e) { /* campo sem suporte a seleção */ }
}

// Helper global: lê valor numérico de qualquer campo mascarado
function getNumerico(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    if (el.dataset.raw !== undefined) return parseFloat(el.dataset.raw) || 0;
    return parseFloat(el.value) || 0;
}

// ── CNPJ: XX.XXX.XXX/XXXX-XX ────────────────────────
// Aceita o CNPJ numérico e o alfanumérico (Receita Federal, a partir de
// 31/07/2026): as 12 primeiras posições podem ter letras maiúsculas (A–Z)
// e números; os 2 dígitos verificadores são sempre numéricos.
// A máscara é a mesma nos dois formatos.

// Mantém só caracteres válidos: 12 alfanuméricos + 2 dígitos
function normalizarCNPJ(valor) {
    const v = String(valor).toUpperCase().replace(/[^0-9A-Z]/g, '');
    const base = v.slice(0, 12);
    const dv   = v.slice(12).replace(/\D/g, '').slice(0, 2);
    return base + dv;
}

// Aplica a pontuação conforme a posição (12.ABC.345/01DE-35)
function formatarCNPJ(v) {
    let saida = '';
    for (let i = 0; i < v.length; i++) {
        if (i === 2 || i === 5) saida += '.';
        else if (i === 8)       saida += '/';
        else if (i === 12)      saida += '-';
        saida += v[i];
    }
    return saida;
}

// Pontuação do CPF (000.000.000-00), até 11 dígitos
function formatarCPF(digitos) {
    let saida = '';
    for (let i = 0; i < digitos.length; i++) {
        if (i === 3 || i === 6) saida += '.';
        else if (i === 9)       saida += '-';
        saida += digitos[i];
    }
    return saida;
}

function mascaraCNPJ(input) {
    input.value = formatarCNPJ(normalizarCNPJ(input.value));
}

// ── CPF/CNPJ automático ──────────────────────────────
// Até 11 dígitos: CPF. Mais de 11 caracteres ou qualquer letra: CNPJ.
function mascaraCpfCnpj(input) {
    const bruto = String(input.value).toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (/[A-Z]/.test(bruto) || bruto.length > 11) {
        input.value = formatarCNPJ(normalizarCNPJ(bruto));
    } else {
        input.value = formatarCPF(bruto);
    }
}

// ── CPF: XXX.XXX.XXX-XX ─────────────────────────────
function mascaraCPF(input) {
    input.value = formatarCPF(input.value.replace(/\D/g, '').slice(0, 11));
}

// ── APENAS NÚMEROS ───────────────────────────────────
function mascaraNumeros(input) {
    input.value = input.value.replace(/\D/g, '');
}

// ── PERCENTUAL ───────────────────────────────────────
function mascaraPercentual(input) {
    let v = input.value.replace(/[^0-9.]/g, '');
    const partes = v.split('.');
    if (partes.length > 2) v = partes[0] + '.' + partes.slice(1).join('');
    if (partes.length === 2) v = partes[0] + '.' + partes[1].slice(0, 2);
    if (parseFloat(v) > 100) v = '100';
    input.value = v;
}

// ── VALIDAÇÕES ───────────────────────────────────────
// Formato completo (quantidade de caracteres)
function validarCNPJ(cnpj) { return normalizarCNPJ(cnpj).length === 14; }
function validarCPF(cpf)   { return String(cpf).replace(/\D/g, '').length === 11; }

// Dígitos verificadores do CNPJ, numérico ou alfanumérico.
// Regra da Receita Federal: cada caractere vale (código ASCII − 48),
// pesos de 2 a 9 da direita para a esquerda e módulo 11
// (resto 0 ou 1 → dígito 0).
function validarDVCNPJ(cnpj) {
    const v = String(cnpj).toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!/^[0-9A-Z]{12}\d{2}$/.test(v)) return false;
    if (/^(\d)\1{13}$/.test(v)) return false; // 00000000000000, 11111111111111...

    const calcularDV = function (base) {
        let soma = 0;
        let peso = 2;
        for (let i = base.length - 1; i >= 0; i--) {
            soma += (base.charCodeAt(i) - 48) * peso;
            peso = (peso === 9) ? 2 : peso + 1;
        }
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const dv1 = calcularDV(v.slice(0, 12));
    const dv2 = calcularDV(v.slice(0, 12) + dv1);
    return v.slice(12) === String(dv1) + String(dv2);
}

// Dígitos verificadores do CPF
function validarDVCPF(cpf) {
    const v = String(cpf).replace(/\D/g, '');
    if (!/^\d{11}$/.test(v)) return false;
    if (/^(\d)\1{10}$/.test(v)) return false; // 000.000.000-00, 111.111.111-11...

    const calcularDV = function (tamanho) {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += Number(v[i]) * (tamanho + 1 - i);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    return calcularDV(9) === Number(v[9]) && calcularDV(10) === Number(v[10]);
}

// ── INICIALIZAÇÃO ────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    document.querySelectorAll('input[data-mascara="cnpj"]').forEach(el =>
        el.addEventListener('input', function () { aplicarMantendoCursor(this, mascaraCNPJ, ehAlfanumerico); }));

    document.querySelectorAll('input[data-mascara="cpf"]').forEach(el =>
        el.addEventListener('input', function () { aplicarMantendoCursor(this, mascaraCPF, ehDigito); }));

    document.querySelectorAll('input[data-mascara="cpfcnpj"]').forEach(el =>
        el.addEventListener('input', function () { aplicarMantendoCursor(this, mascaraCpfCnpj, ehAlfanumerico); }));

    document.querySelectorAll('input[data-mascara="numero"]').forEach(el =>
        el.addEventListener('input', function () { aplicarMantendoCursor(this, mascaraNumeros, ehDigito); }));

    // Peso em kg (inteiro, com ponto de milhar). Começa vazio: o placeholder
    // "0" indica o formato e o campo vazio significa "ainda não informado".
    document.querySelectorAll('input[data-mascara="peso"]').forEach(el => {
        el.value = '';
        el.addEventListener('input', function () {
            aplicarMantendoCursor(this, mascaraPeso, ehDigito);
            if (typeof calcularSinistro   === 'function') calcularSinistro();
            else if (typeof calcularFinanceiro === 'function') calcularFinanceiro();
        });
    });

    // Moeda (formato brasileiro: 1.234,56)
    document.querySelectorAll('input[data-mascara="moeda"]').forEach(el => {
        el.value = '0,00';
        el.dataset.raw = '0';
        el.addEventListener('click', function () { cursorNoFim(this); });
        el.addEventListener('input', function () {
            mascaraMoedaBR(this);
            if (typeof calcularFinanceiro === 'function') calcularFinanceiro();
        });
    });

    document.querySelectorAll('input[data-mascara="percentual"]').forEach(el =>
        el.addEventListener('input', function () { mascaraPercentual(this); }));
});