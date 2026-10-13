# 📊 Calculadora de Notas de Débito - Documentação

## Visão Geral
Sistema para cálculo automático de indenizações por sinistros em carregamentos, considerando a proporção de perda e impostos recuperáveis (ICMS, PIS, COFINS). O resultado é recalculado a cada alteração, os campos são validados antes de gerar a nota e a nota de débito é gerada em PDF pela impressão do navegador.

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
O "Gross Up" recupera os impostos que foram pagos na NF original. **Não se aplica a operações com origem em MT** (ver Passo 3-MT).

```
Fator = (100 - ICMS - PIS - COFINS) / 100
Valor com Impostos = Base Mercadoria / Fator
```

**Constantes:**
- PIS: 1,65% e COFINS: 7,60% — **somente para milho, algodão e sorgo**. Para os demais produtos, PIS e COFINS são zero.
- ICMS: varia pelo par de UFs de origem e destino (tabela em `js/aliquita.js`)

**Exemplo com ICMS 18% (milho):**
- Fator = (100 - 18 - 1,65 - 7,60) / 100 = 0,7275
- Valor = R$ 1.000 / 0,7275 = R$ 1.374,57

---

### Passo 3-MT: Origem em Mato Grosso (sem Gross Up)
```
ICMS Mercadoria = Base Mercadoria × (ICMS / 100)
PIS = Base Mercadoria × (PIS / 100)
COFINS = Base Mercadoria × (COFINS / 100)
ICMS Frete = Base Frete × (ICMS / 100)
```

---

### Passo 4: Calcular Impostos a Recuperar
```
ICMS Mercadoria = Valor com Impostos × (ICMS / 100)
PIS = Valor com Impostos × (1,65 / 100)
COFINS = Valor com Impostos × (7,60 / 100)
```

**Exemplo (ICMS 18%):**
- ICMS: R$ 1.374,57 × 18% = R$ 247,42
- PIS: R$ 1.374,57 × 1,65% = R$ 22,68
- COFINS: R$ 1.374,57 × 7,60% = R$ 104,47

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

**Exemplo completo** (milho, MG → MG, 1.000 kg → 900 kg, NF R$ 10.000,00, frete R$ 1.000,00 — conferido na calculadora):
- Base Mercadoria: R$ 1.000,00
- Total Impostos: R$ 247,42 + R$ 22,68 + R$ 104,47 + R$ 21,95 = R$ 396,52
- **Total à Pagar: R$ 1.396,52**

> Correção em 13/10/2026: este exemplo mostrava R$ 1.374,52 e total R$ 1.396,50 (arredondamentos manuais). Os valores acima são os da calculadora.

---

## 🖥️ Como Usar

A tela tem o formulário à esquerda e o **Resultado** à direita (em telas menores, abaixo do formulário, com uma barra fixa mostrando o total).

1. **Dados do cálculo** (campos com `*` são obrigatórios)
   1. Produto e rota: produto, UF de origem, UF de destino. A alíquota de ICMS é preenchida automaticamente.
   2. Pesos: peso de saída e peso de destino (kg). Peso sinistrado e percentual de perda são automáticos.
   3. Valores: valor da NF de saída e, se houver, o frete (opcional).
2. **Dados da nota de débito** (não alteram o valor; aparecem no PDF)
   4. Transportador: filial ADM, razão social, CNPJ.
   5. Fornecedor ou remetente: nome ou razão social, CPF ou CNPJ.
   6. Documentos: número e data da NF de lote, do CT-e e da NF de venda.
3. **Resultado**: status do cálculo, total à pagar, composição e detalhamento.
4. **Gerar PDF da nota**: valida os campos; se estiver tudo certo, abre a nota em nova janela com a impressão do navegador ("Salvar como PDF" ou impressora).
5. **Novo cálculo**: apaga todos os campos após confirmação.
6. **Histórico** (link no topo): lista as notas geradas neste navegador, da mais recente para a mais antiga, com busca, "Abrir" (traz os dados de volta ao formulário) e "Excluir" (com "Desfazer").

---

## 🕘 Histórico de Notas (`js/historico.js`)

- Cada nota gerada com sucesso em "Gerar PDF da nota" é registrada no `localStorage` do navegador, chave `calculadoraNotaDebito.historico.v1`. **Nada sai do computador**; o histórico não aparece em outro navegador ou computador e some se os dados de navegação forem limpos.
- Guarda os **valores digitados** (os 18 campos do formulário, inclusive CNPJ/CPF) e um resumo para a lista. **Não guarda resultados calculados**: ao abrir, os campos são preenchidos e o valor é recalculado por `script.js`, sempre com as regras e alíquotas vigentes no código.
- Limite de 100 notas (as mais antigas saem). A mesma nota gerada duas vezes seguidas não duplica, só atualiza a data.
- Se o formulário já tiver dados, "Abrir" pede confirmação antes de substituir. "Limpar histórico" também pede confirmação.
- Se o navegador bloquear o armazenamento (ex.: janela anônima), a seção avisa e a calculadora continua funcionando normalmente.
- A lista é montada só com texto (`textContent`): nomes com `<tags>` aparecem como texto.

---

## 📝 Campos de Entrada

| Campo | ID | Obrigatório | Observação |
|---|---|---|---|
| Produto | `produto` | Sim | Define se PIS e COFINS se aplicam |
| UF de origem | `uf-origem` | Sim | Origem MT = cálculo sem gross-up |
| UF de destino | `uf-destino` | Sim | |
| Alíquota de ICMS | `aliquota-icms` | Automático | Pelo par de UFs; exibida no padrão BR (ex.: 19,5) |
| Peso de saída (kg) | `peso-saida` | Sim | Maior que zero |
| Peso de destino (kg) | `peso-destino` | Sim | Pode ser 0 (perda total); não pode ser maior que o de saída |
| Peso sinistrado (kg) | `peso-sinistrado` | Automático | |
| Percentual de perda | `percentual-perda` | Automático | Ex.: 1,67% |
| Valor da NF de saída (R$) | `valor-nf-saida` | Sim | Máscara de caixa registradora: 5000000 → 50.000,00 |
| Valor do frete (R$) | `valor-frete` | Não | |
| Filial ADM | `filial` | Não | Só números |
| Razão social (transportador) | `razao-social` | Não | |
| CNPJ (transportador) | `cnpj` | Não | Numérico ou alfanumérico; dígitos verificadores conferidos |
| Nome ou razão social (fornecedor) | `fornecedor-nome` | Não | |
| CPF ou CNPJ (fornecedor) | `fornecedor-doc` | Não | CPF até 11 dígitos; com letras ou mais de 11 caracteres vira CNPJ |
| NF de lote / CT-e / NF de venda | `nf-lote`, `cte`, `nf-venda` | Não | Só números |
| Datas dos documentos | `data-nf-lote`, `data-cte`, `data-nf-venda` | Não | Formato conforme o idioma do navegador |

---

## 📊 Resultado

- **Status** (ícone + texto): *Aguardando dados*, *Incompleto* (lista o que falta), *Sem perda* (destino igual ou maior que a saída) e *Calculado*. Com o cálculo completo, a faixa superior do painel fica verde.
- **Composição do total** (formato de livro-razão):
  - Ressarcimento da mercadoria (`res-mercadoria`) — base sem impostos
  - Ressarcimento de impostos (`res-impostos`) — total de impostos recuperáveis
  - **Total à pagar** (`res-total`) — mercadoria + impostos, com traço duplo
- **Método**: com ou sem gross-up, alíquota de ICMS e se há PIS/COFINS.
- **Detalhamento**: perda apurada (pesos e percentual), bases proporcionais (mercadoria e frete) e impostos recuperáveis (ICMS sobre a mercadoria, ICMS sobre o frete, PIS, COFINS).

---

## ✅ Validações

Ao clicar em **Gerar PDF da nota**, o sistema confere:
- ✓ Produto, UF de origem e UF de destino selecionados
- ✓ Peso de saída maior que zero
- ✓ Peso de destino informado (0 é aceito) e não maior que o de saída; pesos iguais = sem perda
- ✓ Valor da NF de saída maior que zero
- ✓ CNPJ e CPF, quando preenchidos: tamanho e dígitos verificadores (inclui o CNPJ alfanumérico, emitido pela Receita Federal desde 31/07/2026)

Cada erro aparece junto ao campo (ícone + texto + borda), o foco vai para o primeiro campo com erro e um resumo indica quantos campos faltam corrigir. As mensagens somem à medida que os campos são corrigidos.

Outras proteções:
- ✓ A nota nunca usa dados de um cálculo anterior: quando o resultado zera, os dados da nota também são limpos.
- ✓ Textos digitados são escapados antes de entrar na nota (um texto com `<tag>` aparece como texto).
- ✓ Se o navegador bloquear a janela da nota, aparece a orientação para permitir pop-ups.

---

## 🧪 Testes de Regressão (valores de referência)

Resultados conferidos em 13/10/2026 na versão anterior e na atual (idênticos). Use estes cenários para validar qualquer alteração em `js/script.js`, `js/aliquita.js` ou `js/mascaras.js`.

| # | Produto | Rota (ICMS) | Pesos (kg) | NF / Frete (R$) | Mercadoria | Impostos | Total |
|---|---|---|---|---|---|---|---|
| 1 | Milho | SP → MG (12) | 30.000 → 29.500 | 50.000,00 / 3.000,00 | 833,33 | 231,69 | **1.065,02** |
| 2 | Soja | MT → SP (12, sem gross-up) | 45.000 → 44.000 | 120.000,00 / 8.000,00 | 2.666,67 | 341,33 | **3.008,00** |
| 3 | Algodão | PR → PR (19,5) | 20.000 → 15.000 | 90.000,00 / 0,00 | 22.500,00 | 9.078,95 | **31.578,95** |
| 4 | Milho | MT → MT (17, sem gross-up) | 10.000 → 9.000 | 40.000,00 / 2.000,00 | 4.000,00 | 1.084,00 | **5.084,00** |
| 5 | Farelo de soja HIPRO | MG → BA (7) | 28.000 → 27.950 | 75.432,10 / 4.321,09 | 134,70 | 10,72 | **145,42** |
| 6 | Glicerina | IM → SP (4) | 1.000 → 0 | 10.000,00 / 500,00 | 10.000,00 | 437,50 | **10.437,50** |
| 7 | Trigo em grãos | IM → IM (0) | 5.000 → 4.000 | 20.000,00 / 1.000,00 | 4.000,00 | 0,00 | **4.000,00** |
| 8 | Algodão | BA → BA (20,5) | 12.345 → 12.000 | 98.765,43 / 1.234,56 | 2.760,15 | 1.177,79 | **3.937,94** |
| 9 | Óleo de soja degomado | MA → MA (23) | 33.000 → 32.001 | 150.000,00 / 6.000,00 | 4.540,91 | 1.410,63 | **5.951,54** |
| 10 | (sem produto) | SP → RJ (12) | 8.000 → 7.000 | 30.000,00 / 1.500,00 | 3.750,00 | 536,93 | **4.286,93** |
| 11 | Soja | GO → SP (12) | 1.000 → 1.200 | 1.000,00 / 100,00 | 0,00 | 0,00 | **0,00** (sem perda, PDF bloqueado) |
| 12 | Milho | SP → MG (12) | 1.000 → 1.000 | 50.000,00 / 1.000,00 | 0,00 | 0,00 | **0,00** (pesos iguais) |

> ⚠️ `paginas/teste_calculos.html` tem uma **cópia** da fórmula (não testa o `js/script.js` real) e exibe "Teste passou" sem comparar valores. Use a tabela acima como referência até essa página ser refeita.

---

## 🗂️ Estrutura do Projeto

```
index.html                    Calculadora
paginas/guia_rapido.html      Guia de uso
paginas/teste_calculos.html   Página de testes (ver aviso acima)
css/style.css                 Design system: tokens e componentes compartilhados
css/index.css                 Layout da calculadora e painel de resultado
css/guia.css                  Layout do guia
js/mascaras.js                Máscaras, posição do cursor e validação de CPF/CNPJ
js/aliquita.js                Tabela de ICMS por par de UFs
js/script.js                  Regras de cálculo (fórmulas)
js/visual.js                  Nota de débito para impressão/PDF
js/ui.js                      Interface: status, resumo, validação, menu e novo cálculo
js/historico.js               Histórico de notas geradas (localStorage do navegador)
fonts/                        IBM Plex Sans (licença OFL, ver fonts/OFL.txt)
img/                          Logos ADM
docs/                         Registros históricos da versão 2.1 (fev/2026)
_versoes/                     Cópias de versões anteriores, para recuperação
```

Ordem de carregamento dos scripts (não alterar): `mascaras.js` → `aliquita.js` → `script.js` → `visual.js` → `ui.js` → `historico.js`.

Separação de responsabilidades: **fórmulas só em `script.js`**; `ui.js` apenas lê campos e resultados (não calcula valores).

---

## 🎨 Design System (`css/style.css`)

Todas as decisões visuais ficam em variáveis no bloco `:root`. Para mudar algo em todo o sistema, altere só o token.

**Cores de marca e neutras**

| Token | Hex | Uso |
|---|---|---|
| `--color-navy` | `#012169` | Azul ADM: navbar, títulos, valores, total |
| `--color-green` | `#8BC400` | Verde ADM: ação principal ("Gerar PDF") e sinal de "calculado" |
| `--color-green-strong` | `#7DB000` | Hover do botão verde (texto azul, contraste 5,7:1) |
| `--color-green-ink` | `#4A6800` | Verde para texto sobre branco (6,4:1) |
| `--color-blue` | `#426DA9` | Azul de apoio: anel de foco, links em hover |
| `--color-ink` | `#1E1E1E` | Texto principal |
| `--color-slate` | `#5B6470` | Texto secundário (6:1) |
| `--color-border` | `#8A94A3` | Borda dos campos (3:1, WCAG 1.4.11) |
| `--color-line` | `#DCE2EA` | Divisórias e bordas de painéis |
| `--color-cloud` | `#EDF1F6` | Campos calculados e etiquetas |
| `--color-mist` | `#F2F5F9` | Fundo da página |

Cores semânticas: `--color-info-*`, `--color-warning-*`, `--color-danger-*`, `--color-success-*` (texto, fundo e borda).

**Tipografia:** IBM Plex Sans (400, 500, 600, 700), hospedada em `fonts/` — funciona sem internet e não faz requisições externas. Escala: 12, 13, 15, 16, 18, 22, 28 e 34 px (`--text-xs` a `--text-3xl`). Números com algarismos de mesma largura (`tabular-nums`) e alinhados à direita.

**Espaçamento:** base de 4 px (`--space-1` = 4 px até `--space-16` = 64 px). **Raios:** 6 px (campos e botões), 10 px (alertas), 14 px (painéis), pílula (chips). **Elevação:** `--shadow-sm` e `--shadow-md`, com moderação.

**Componentes:** navbar, painel, seção numerada (`fieldset` + `legend`), campo com rótulo/dica/erro, campo com unidade (`R$`, `kg`, `%`), campo calculado, botões (principal, secundário, perigo), alertas, chip de status, lista de dados com linha pontilhada, perguntas frequentes (`details`), rodapé.

**Regras de uso**
- Verde só para a ação principal e para indicar cálculo concluído.
- Estados nunca dependem só de cor: sempre há texto e/ou ícone.
- Foco sempre visível; campos com 44 px de altura (toque) e fonte de 16 px (evita zoom no iPhone).
- Animações respeitam "reduzir movimento" do sistema operacional.

**Logos (`img/`):** `adm-logo.png` (original, favicon), `adm-logo-color.png` (colorida, fundo transparente — nota e testes), `adm-logo-negativo.png` (folha verde + "ADM" branco — navbar e rodapé).

---

## 📱 Design Responsivo

| Largura | Layout |
|---|---|
| ≥ 1100 px | Duas colunas; o resultado acompanha a rolagem (total e botão do PDF sempre à vista) |
| 760–1099 px | Uma coluna; painel de resultado dividido em duas colunas internas |
| < 760 px | Uma coluna; barra fixa com o total enquanto o resultado não está na tela |
| ≤ 720 px | Menu recolhível no topo |
| ≤ 480 px | Campos em uma coluna |

Conferido em 360, 390, 640 (zoom de 200%), 768, 1024, 1280 e 1920 px, sem rolagem horizontal, inclusive com totais na casa dos bilhões e razões sociais longas. Impressão da página oculta navegação e botões; a nota de débito tem layout A4 próprio (`js/visual.js`).

---

## ♿ Acessibilidade

- Verificação automática com axe-core 4.10 (WCAG 2.2 AA + boas práticas): **0 violações** na calculadora (vazia, com erros e calculada), no menu do celular e no guia. Versão anterior: 3 regras violadas em 62 elementos (34 com contraste insuficiente).
- Rótulos associados a todos os campos; grupos com `fieldset`/`legend`; `aria-required`, `aria-invalid` e `aria-describedby` nas validações.
- Atalho "Pular para a calculadora"; campos automáticos fora da sequência de Tab.
- Resultado anunciado a leitores de tela quando o cálculo é concluído (`aria-live`, sem interromper a digitação).

---

## ⚠️ Pendências Conhecidas

- `paginas/teste_calculos.html` não testa o código real (ver Testes de Regressão).
- As alíquotas da tabela e as regras de PIS/COFINS e MT **não foram revisadas quanto à vigência legal**; a documentação descreve a implementação, não confirma conformidade.
- Firefox abrindo os arquivos direto do disco (`file://`): por política do navegador, o guia (pasta `paginas/`) pode usar a fonte do sistema em vez da IBM Plex Sans. Não afeta o funcionamento.
- Os arquivos em `docs/` descrevem a versão 2.1 (fevereiro/2026) e citam botões que não existem mais ("Visualizar", "Imprimir"); são mantidos como histórico.

---

## 🐛 Suporte

Para relatórios de bugs ou sugestões, entre em contato com o desenvolvedor.

---

## 📝 Histórico de Alterações

### 13/10/2026 — Identidade visual ADM
- Paleta trocada de navy + dourado para Azul ADM `#012169` + Verde ADM `#8BC400` (referência: apresentação "Evolução Processo Sustentabilidade GBS").
- Logos ADM aplicadas na navbar, rodapé, cabeçalho da nota de débito (PDF) e página de testes.
- Nota de débito passa a imprimir as cores de fundo (`print-color-adjust: exact`).
- **Nenhuma regra de cálculo foi alterada.** Regressão: 4 cenários (SP→MG milho, MT→SP soja sem gross-up, PR→PR algodão, destino > saída) com resultados idênticos aos da versão anterior.
- Versão anterior preservada em `_versoes/v_antes_identidade_visual_2026-10-13/`.

### 13/10/2026 — Segurança da nota de débito
- `js/visual.js`: textos digitados (razão social, nomes, documentos etc.) passam a ser escapados (`_esc`) antes de entrar no HTML da nota. Antes, um texto com `<tag>` era interpretado como código.
- Teste: razão social `Silva & Filhos <b>Transp</b> "Ltda"` e um nome com `<img onerror=...>` aparecem como texto literal; nenhum código executado. Regressão de cálculo sem diferenças.
- Pasta duplicada `Calculadora_Fiscal_ICMS-main/` (cópia antiga dentro do projeto) movida para `_versoes/copia_duplicada_original/`.

### 13/10/2026 — Redesenho da interface e da experiência de uso
**Interface**
- Layout em duas colunas com resultado fixo na lateral; no celular, barra com o total e menu recolhível.
- Formulário reorganizado em "Dados do cálculo" (1 a 3) e "Dados da nota de débito" (4 a 6), com obrigatórios marcados, unidades dentro dos campos e campos automáticos diferenciados.
- Painel de resultado com status, método, composição do total em formato de livro-razão e detalhamento completo (inclui os pesos).
- Validação ao gerar o PDF com mensagens junto aos campos; botão "Novo cálculo" com confirmação; perguntas frequentes em acordeão.
- Design system reescrito (`css/style.css`); CSS sem uso removido (cerca de 280 linhas da antiga visualização da nota na tela, além de regras duplicadas da navbar); fonte IBM Plex Sans local no lugar do Google Fonts.

**Correções**
- A nota podia sair com o **total de um cálculo anterior**: com destino > saída, a tela mostrava R$ 0,00, mas o PDF usava o último total calculado (ex.: R$ 1.065,02). Agora `limparResultados()` limpa os dados da nota.
- Campo de moeda: com o valor alinhado à direita, clicar no campo deixava o cursor no início e multiplicava o valor por 100 ou mais. O cursor agora vai para o fim ao clicar.
- Máscaras mantêm a posição do cursor ao corrigir um dígito no meio do número (antes o cursor pulava para o fim).
- CNPJ alfanumérico (Receita Federal, desde 31/07/2026) aceito nos campos de CNPJ e CPF/CNPJ; CPF e CNPJ conferidos pelos dígitos verificadores.
- Peso começava como "0.00" (parecia decimal); agora começa vazio. Campo apagado continua vazio em vez de virar "0".
- Percentual exibido como 1,67% (antes 1.67%) e alíquota como 19,5 (antes 19.5); `script.js` lê a alíquota com vírgula ou ponto.
- Aviso de PIS/COFINS aparece ao escolher o produto (antes só depois de digitar os pesos, e também sem produto selecionado).
- Ao desmarcar uma UF, a alíquota anterior é apagada (antes ficava a do par antigo).
- Nota: documentos sem número e data aparecem como "Não informado" (antes "- — -").
- Guia: o exemplo mostrava total de R$ 13.412,07, que não corresponde à fórmula implementada; o valor correto, conferido na calculadora, é R$ 13.833,51. README: exemplo corrigido de R$ 1.396,50 para R$ 1.396,52.
- Perguntas frequentes citavam botões inexistentes ("Visualizar Nota", "Imprimir").

**Regras fiscais:** nenhuma fórmula, alíquota ou regra de MT foi alterada. Regressão com 16 cenários: valores idênticos à versão anterior (diferenças apenas no formato do percentual e da alíquota).

**Arquivos:** `index.html`, `paginas/guia_rapido.html`, `css/style.css`, `css/index.css`, `css/guia.css`, `js/mascaras.js`, `js/aliquita.js`, `js/script.js`, `js/visual.js`, `js/ui.js` (novo), `fonts/` (novo), `README.md`.

Versão anterior preservada em `_versoes/v_antes_redesign_ux_2026-10-13/`.

### 13/10/2026 — Histórico de notas geradas
- O link "Resultado" do topo (redundante com o painel fixo) foi trocado por **Histórico**, com contador de notas.
- Nova seção "Histórico de notas geradas": lista, busca (sem acento), Abrir, Excluir com Desfazer e Limpar histórico com confirmação. Nova pergunta frequente sobre o histórico.
- Armazenamento local (`localStorage`), sem envio de dados. Guarda só os campos digitados; o valor é recalculado ao abrir.
- Arquivos: `js/historico.js` (novo), `js/ui.js` (registra a nota após abrir o PDF), `index.html`, `css/index.css`, `css/style.css` (`.btn-ghost`, `.link-button`, `.nav-count`), `README.md`.
- Testes: 21 verificações do histórico (registro, não duplicar, persistência após recarregar, busca, abrir e recalcular inclusive MT, confirmação, excluir/desfazer, limpar, nome com HTML, celular, armazenamento bloqueado), axe sem violações; regressão de cálculo e demais testes da interface sem alteração.
- Versão anterior preservada em `_versoes/v_antes_historico_2026-10-13/`.

---

**Última atualização:** 13 de Outubro de 2026
