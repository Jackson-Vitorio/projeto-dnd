"use strict";
// Smoke test: executa renderModuleSpells() com um DOM falso e valida o HTML gerado.
const fs = require('fs');
const src = fs.readFileSync('/home/jack/Documentos/GitHub/projeto-dnd/5etools-src-translation-main/js/characters-app.js', 'utf8');

function extractFn(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i === -1) throw new Error('nao encontrado: ' + name);
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  throw new Error('sem fim: ' + name);
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let captured = '';
const $stub = () => {
  const api = {
    html: (h) => { if (h !== undefined) { captured = h; return api; } return captured; },
    find: () => api, on: () => api, off: () => api, append: () => api, empty: () => api,
    val: () => '', attr: () => '', is: () => false, each: () => api, length: 0, remove: () => api,
    data: () => undefined,
  };
  return api;
};

const factory = eval('(function (stubs) {' +
  'var esc = stubs.esc, $ = stubs.$, spellsData = [], currentChar = null,' +
  ' SHEET_MODULE_DEFS = null, ptmSpellHref = stubs.ptmSpellHref,' +
  ' spellAbilityName = stubs.spellAbilityName, calculateSpellDC = stubs.calculateSpellDC,' +
  ' calculateSpellAttackBonus = stubs.calculateSpellAttackBonus, ovSpan = stubs.ovSpan,' +
  ' ovGet = stubs.ovGet, showRollResult = stubs.showRollResult,' +
  ' CharactersStore = stubs.CharactersStore, global = {}, sheetToast = stubs.sheetToast;' +
  extractFn('renderModuleSpells') + '\nreturn renderModuleSpells;})');

const ctx = {
  esc, $: $stub, spellsData: [], currentChar: null, SHEET_MODULE_DEFS: null,
  ptmSpellHref: () => 'spells.html#x',
  spellAbilityName: () => 'Inteligência',
  calculateSpellDC: () => 14,
  calculateSpellAttackBonus: () => 6,
  ovSpan: (char, key, autoVal) => '<span class="characters__ov" data-detail="' + key + '">' + autoVal + '</span>',
  ovGet: (char, key, autoVal) => autoVal,
  showRollResult: () => {},
  CharactersStore: {save: () => {}},
  sheetToast: () => {},
};

const fn = factory(ctx);

const char = {
  spells: [
    {name: 'Luz', level: 0, school: 'V', source: 'PHB'},
    {name: 'Mísseis Mágicos', level: 1, school: 'V', source: 'PHB', prepared: true},
    {name: 'Bola de Fogo', level: 3, school: 'V', source: 'PHB'},
  ],
  spellSlots: {1: 4, 2: 3, 3: 2},
  spellSlotsUsed: {},
};
fn($stub(), char);

const checks = [
  ['cards de magia presentes', (captured.match(/characters__spell-card/g) || []).length === 3],
  ['stepper +/- nos 2 cards de nível (2 botões cada = 4)', (captured.match(/data-cast-step=/g) || []).length === 4],
  ['truque sem stepper', !captured.includes('data-cast-step="0"')],
  ['botao Usar magia em todos os cards', (captured.match(/data-use-spell=/g) || []).length === 3],
  ['tag Preparada verde na magia certa', (captured.match(/characters__spell-prepared/g) || []).length === 1 && captured.includes('Preparada')],
  ['is-prepared apenas 1x', (captured.match(/is-prepared/g) || []).length === 1],
  ['espacos disponiveis no label', captured.includes('4 espaços') || captured.includes('1 espaço') || captured.includes('2 espaços')],
  ['grid de espacos com total', captured.includes('characters__slots-grid') && captured.includes('4') && captured.includes('2')],
  ['botao repouso presente', captured.includes('id="btn-rest-slots"')],
  ['conjuração com CD e ataque', captured.includes('CD de Magia') && captured.includes('Bônus de Ataque Mágico')],
  ['busca de magia presente', captured.includes('id="spell-search"')],
  ['botoes remover presentes', (captured.match(/data-remove-spell=/g) || []).length === 3],
  ['hold para preparar (mousedown+touchstart)', captured.includes('mousedown.spellhold') === false], // binding é via JS, não HTML — checado abaixo
  ['tags balanceadas', (captured.match(/<div/g) || []).length === (captured.match(/<\/div>/g) || []).length],
];

// Fonte: os bindings de hold/cast precisam existir no código-fonte
checks.push(['binding hold no fonte', /mousedown\.spellhold touchstart\.spellhold/.test(src)]);
checks.push(['binding cast-step no fonte', /click\.spellmod", "\[data-cast-step\]/.test(src)]);
checks.push(['binding use-spell no fonte', /click\.spellmod", "\[data-use-spell\]/.test(src)]);

// Sem espaços: botão Usar magia desabilitado em magia de nível
const charNoSlots = {
  spells: [{name: 'Bola de Fogo', level: 3, school: 'V', source: 'PHB'}],
  spellSlots: {}, spellSlotsUsed: {},
};
captured = '';
fn($stub(), charNoSlots);
checks.push(['sem espacos -> Usar magia desabilitado', captured.includes('data-use-spell="0"') && captured.includes('disabled')]);
checks.push(['sem espacos -> stepper desabilitado', /data-cast-step="-1"[^>]*disabled/.test(captured)]);
checks.push(['sem espacos -> label "sem espaços"', captured.includes('sem espaços')]);

// Nível usado maior que o total é normalizado
const charClamp = {
  spells: [{name: 'Curar Ferimentos', level: 1, school: 'V', source: 'PHB'}],
  spellSlots: {1: 2}, spellSlotsUsed: {1: 5},
};
captured = '';
fn($stub(), charClamp);
checks.push(['clamp: usado > total normalizado', charClamp.spellSlotsUsed[1] === 2]);

// Estado vazio
const charEmpty = {spells: [], spellSlots: {}, spellSlotsUsed: {}};
captured = '';
fn($stub(), charEmpty);
checks.push(['estado vazio com dica', captured.includes('Nenhum truque')]);

let ok = 0; const fail = [];
checks.forEach(([n, v]) => { if (v) ok++; else fail.push(n); });
console.log('SPELLS_RENDER:', ok + '/' + checks.length, ok === checks.length ? 'PASS' : 'FAIL');
if (fail.length) console.log('  falhas: ' + fail.join(', '));
process.exit(ok === checks.length ? 0 : 1);