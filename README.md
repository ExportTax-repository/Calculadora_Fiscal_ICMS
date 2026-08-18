# 📊 Calculadora de Notas de Débito - Documentação

## Visão Geral
Sistema para cálculo automático de indenizações por sinistros em carregamentos, considerando a proporção de perda e impostos recuperáveis (ICMS, PIS, COFINS).

---

## 🧮 Como Funciona o Cálculo

### Passo 1: Calcular a Perda
```
Peso Sinistrado = Peso Saída - Peso Destino
% Perda = (Peso Sinistrado / Peso Saída) × 100
```
**Exemplo:** Saída 1.000 kg - Destino 900 kg = 100 kg sinistrado (10% de perda)

---

### Passo 2: Calcular Base Proporcional
```
Base Mercadoria = Valor NF Saída × (Peso Sinistrado / Peso Saída)
Base Frete = Valor Frete × (Peso Sinistrado / Peso Saída)
```
**Exemplo:** R$ 10.000 × 10% = R$ 1.000 (mercadoria) + R$ 100 (frete)

---

### Passo 3: Aplicar Gross Up na Mercadoria
O "Gross Up" recupera os impostos que foram pagos na NF original.

```
Fator = (100 - ICMS - PIS - COFINS) / 100
Valor com Impostos = Base Mercadoria / Fator
```

**Constantes:**
- PIS: 1,65%
- COFINS: 7,60%
- ICMS: Varia por estado (tabela em aliquita.js)

**Exemplo com ICMS 18%:**
- Fator = (100 - 18 - 1,65 - 7,60) / 100 = 0,7275
- Valor = R$ 1.000 / 0,7275 = R$ 1.374,52

---

### Passo 4: Calcular Impostos a Recuperar
```
ICMS Mercadoria = Valor com Impostos × (ICMS / 100)
PIS = Valor com Impostos × (1,65 / 100)
COFINS = Valor com Impostos × (7,60 / 100)
```

**Exemplo (ICMS 18%):**
- ICMS: R$ 1.374,52 × 18% = R$ 247,41
- PIS: R$ 1.374,52 × 1,65% = R$ 22,68
- COFINS: R$ 1.374,52 × 7,60% = R$ 104,46

---

### Passo 5: Aplicar Gross Up no Frete
Frete tem apenas ICMS, sem PIS e COFINS.

```
Fator Frete = (100 - ICMS) / 100
Valor com ICMS = Base Frete / Fator Frete
ICMS Frete = Valor com ICMS × (ICMS / 100)
```

**Exemplo (R$ 100 frete, ICMS 18%):**
- Fator = (100 - 18) / 100 = 0,82
- Valor = R$ 100 / 0,82 = R$ 121,95
- ICMS: R$ 121,95 × 18% = R$ 21,95

---

### Passo 6: Calcular Total a Pagar
```
Total Impostos = ICMS Merc + PIS + COFINS + ICMS Frete
Total a Pagar = Base Mercadoria + Total Impostos
```

**Exemplo completo:**
- Base Mercadoria: R$ 1.000,00
- Total Impostos: R$ 247,41 + R$ 22,68 + R$ 104,46 + R$ 21,95 = R$ 396,50
- **Total à Pagar: R$ 1.396,50**

---

## 📝 Campos de Entrada

### Informações do Transportador
- **Filial ADM:** Identificação da matriz
- **Razão Social:** Nome completo da empresa transportadora
- **CNPJ:** Documento da empresa

### Informações do Produto
- **Produto:** Seleção de produtos (ALGODÃO, SOJA, etc.)
- **NF Form. Lote:** Número da nota fiscal de lote
- **Data NF Lote:** Data da nota fiscal

### Informações do Transporte
- **CT-e:** Número do conhecimento de transporte
- **Data CT-e:** Data do documento
- **NF Venda:** Número da nota fiscal de saída
- **Data NF Venda:** Data da saída

### Valores e Pesos
- **Valor NF Saída (R$):** Valor total da nota fiscal
- **Peso NF Saída:** Peso inicial do carregamento
- **Peso Descarga Destino:** Peso recebido no destino
- **Peso Sinistrado:** Calculado automaticamente (diferença)
- **% Perda:** Calculado automaticamente

### Informações Fiscais
- **Valor do Frete (R$):** Valor da prestação de serviço
- **UF Origem:** Estado de partida
- **UF Destino:** Estado de chegada
- **Alíquota ICMS (%):** Automaticamente preenchida pela origem/destino

### Fornecedor (Remetente)
- **Nome/Razão Social:** Do vendedor original
- **CPF/CNPJ:** Documento do fornecedor

---

## 📊 Resultado Final

O sistema exibe os seguintes valores:

1. **Detalhamento dos Cálculos:**
   - Base Mercadoria (perda proporcional)
   - Base Frete (perda proporcional)
   - ICMS Mercadoria
   - ICMS Frete
   - PIS
   - COFINS

2. **Resumo:**
   - **Ressarcimento Mercadoria:** Base sem impostos
   - **Ressarcimento Impostos:** Total de impostos recuperáveis
   - **💰 Total à Pagar:** Valor final (Mercadoria + Impostos)

---

## ✅ Validações

O sistema valida:
- ✓ Peso de saída > 0
- ✓ Peso de destino ≥ 0
- ✓ Peso sinistrado não pode ser negativo
- ✓ Valores monetários devem ser positivos
- ✓ Alíquota ICMS deve ser preenchida

---

## 🧪 Exemplos de Teste

### Teste 1: Perda Pequena (1%)
- Entrada: 10.000 kg → 9.900 kg | R$ 100.000
- Perda: 100 kg (1%)
- Resultado: ~R$ 1.260 (com impostos 18%)

### Teste 2: Perda Moderada (25%)
- Entrada: 1.000 kg → 750 kg | R$ 50.000
- Perda: 250 kg (25%)
- Resultado: ~R$ 15.625 (com impostos 20%)

### Teste 3: Perda Alta (50%)
- Entrada: 1.000 kg → 500 kg | R$ 80.000
- Perda: 500 kg (50%)
- Resultado: ~R$ 55.000 (com impostos 15%)

---

## 🔧 Ferramentas Técnicas

- **HTML5:** Estrutura semântica
- **CSS3:** Design responsivo com variáveis CSS
- **JavaScript:** Cálculos em tempo real com validações
- **Tabelas de Alíquota:** Banco de dados ICMS para todos os estados brasileiros

---

## 📱 Design Responsivo

✅ Desktop (900px+)
✅ Tablet (768px - 899px)
✅ Mobile (< 768px)
✅ Impressão otimizada

---

## 🐛 Suporte

Para relatórios de bugs ou sugestões, entre em contato com o desenvolvedor.

---

**Última atualização:** 27 de Fevereiro de 2026
