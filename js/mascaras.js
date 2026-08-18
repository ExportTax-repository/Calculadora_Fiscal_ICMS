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
    if (digits.length > 10) digits = digits.slice(-10);
    digits = digits.replace(/^0+/, "") || "0";
    input.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Helper global: lê valor numérico de qualquer campo mascarado
function getNumerico(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    if (el.dataset.raw !== undefined) return parseFloat(el.dataset.raw) || 0;
    return parseFloat(el.value) || 0;
}

// ── CNPJ: XX.XXX.XXX/XXXX-XX ────────────────────────
function mascaraCNPJ(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 0)  v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    if (v.length > 6)  v = v.replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2');
    if (v.length > 10) v = v.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, '$1/$2');
    if (v.length > 15) v = v.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, '$1-$2');
    input.value = v;
}

// ── CPF/CNPJ automático ──────────────────────────────
function mascaraCpfCnpj(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 14);
    if (v.length <= 11) {
        if (v.length > 3)  v = v.replace(/^(\d{3})(\d)/, '$1.$2');
        if (v.length > 7)  v = v.replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2');
        if (v.length > 10) v = v.replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2');
    } else {
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, '$1/$2');
        v = v.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, '$1-$2');
    }
    input.value = v;
}

// ── CPF: XXX.XXX.XXX-XX ─────────────────────────────
function mascaraCPF(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 3)  v = v.replace(/^(\d{3})(\d)/, '$1.$2');
    if (v.length > 7)  v = v.replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2');
    if (v.length > 10) v = v.replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2');
    input.value = v;
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
function validarCNPJ(cnpj) { return cnpj.replace(/\D/g, '').length === 14; }
function validarCPF(cpf)   { return cpf.replace(/\D/g, '').length === 11; }

// ── INICIALIZAÇÃO ────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    document.querySelectorAll('input[data-mascara="cnpj"]').forEach(el =>
        el.addEventListener('input', function () { mascaraCNPJ(this); }));

    document.querySelectorAll('input[data-mascara="cpf"]').forEach(el =>
        el.addEventListener('input', function () { mascaraCPF(this); }));

    document.querySelectorAll('input[data-mascara="cpfcnpj"]').forEach(el =>
        el.addEventListener('input', function () { mascaraCpfCnpj(this); }));

    document.querySelectorAll('input[data-mascara="numero"]').forEach(el =>
        el.addEventListener('input', function () { mascaraNumeros(this); }));

    // Peso (decimal dinâmico, sem milhar)
    document.querySelectorAll('input[data-mascara="peso"]').forEach(el => {
        el.value = '0.00';
        el.addEventListener('input', function () {
            mascaraPeso(this);
            if (typeof calcularSinistro   === 'function') calcularSinistro();
            else if (typeof calcularFinanceiro === 'function') calcularFinanceiro();
        });
    });

    // Moeda (formato brasileiro: 1.234,56)
    document.querySelectorAll('input[data-mascara="moeda"]').forEach(el => {
        el.value = '0,00';
        el.dataset.raw = '0';
        el.addEventListener('input', function () {
            mascaraMoedaBR(this);
            if (typeof calcularFinanceiro === 'function') calcularFinanceiro();
        });
    });

    document.querySelectorAll('input[data-mascara="percentual"]').forEach(el =>
        el.addEventListener('input', function () { mascaraPercentual(this); }));
});