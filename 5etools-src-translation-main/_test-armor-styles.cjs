// _test-armor-styles.js — valida os estilos da armadura após as mudanças de CSS
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'css/characters.css');
const css = fs.readFileSync(cssPath, 'utf8');

// Extrai as regras de CSS para a armadura
function extractCssRules(css, selector) {
    const regex = new RegExp('\\.' + selector.replace(/\./g, '\\.') + '\\s*\\{[^}]*\\}', 'g');
    return css.match(regex) || [];
}

const armorCardRule = extractCssRules(css, 'characters__attack-item2.characters__armor-card');
const armorLinesRule = extractCssRules(css, 'characters__armor-lines');
const armorBtnRule = extractCssRules(css, 'characters__armor-card\\s*button\\[data-remove-armor\\]');
const attackItem2Rule = extractCssRules(css, 'characters__attack-item2');

console.log('=== Regras de CSS para armadura ===');
console.log('Container da armadura:');
console.log(armorCardRule.join('\n') || 'NÃO ENCONTRADO');
console.log('\nLinhas da armadura:');
console.log(armorLinesRule.join('\n') || 'NÃO ENCONTRADO');
console.log('\nBotão de remover:');
console.log(armorBtnRule.join('\n') || 'NÃO ENCONTRADO');
console.log('\nItem base:');
console.log(attackItem2Rule.join('\n') || 'NÃO ENCONTRADO');

// Validação das mudanças esperadas
console.log('\n=== Validação das mudanças ===');

const hasGap8 = armorCardRule.some(rule => rule.includes('gap:8px'));
const hasMinWidth80 = armorLinesRule.some(rule => rule.includes('min-width:80px'));
const hasPadding4px10px = armorBtnRule.some(rule => rule.includes('padding:4px 10px'));
const hasFontSize75em = armorBtnRule.some(rule => rule.includes('font-size:.75em'));
const hasMinHeight14em = armorBtnRule.some(rule => rule.includes('min-height:1.4em'));
const hasNoLineHeight1 = !armorBtnRule.some(rule => rule.includes('line-height:1'));
const hasPadding6px10px = attackItem2Rule.some(rule => rule.includes('padding:6px 10px'));
const hasGap6px = armorLinesRule.some(rule => rule.includes('gap:6px')) || css.includes('.characters__attack-l2{display:flex;align-items:baseline;gap:6px');

console.log('Container da armadura gap:8px:', hasGap8 ? 'OK' : 'FALHA');
console.log('Linhas da armadura min-width:80px:', hasMinWidth80 ? 'OK' : 'FALHA');
console.log('Botão padding:4px 10px:', hasPadding4px10px ? 'OK' : 'FALHA');
console.log('Botão font-size:.75em:', hasFontSize75em ? 'OK' : 'FALHA');
console.log('Botão min-height:1.4em:', hasMinHeight14em ? 'OK' : 'FALHA');
console.log('Botão sem line-height:1:', hasNoLineHeight1 ? 'OK' : 'FALHA');
console.log('Item base padding:6px 10px:', hasPadding6px10px ? 'OK' : 'FALHA');
console.log('Linha 2 gap:6px:', hasGap6px ? 'OK' : 'FALHA');

const allPassed = hasGap8 && hasMinWidth80 && hasPadding4px10px && hasFontSize75em && hasMinHeight14em && hasNoLineHeight1 && hasPadding6px10px && hasGap6px;
console.log('\n=== Resultado ===');
console.log(allPassed ? 'TODAS AS MUDANÇAS APLICADAS CORRETAMENTE' : 'ALGUMAS MUDANÇAS NÃO FORAM APLICADAS CORRETAMENTE');
process.exit(allPassed ? 0 : 1);
