"use strict";
// Smoke test: executa renderModuleEquipment() com um DOM falso e valida o HTML gerado.
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
  };
  return api;
};

const factory = eval('(function (stubs) {' +
  'var esc = stubs.esc, $ = stubs.$, itemsData = stubs.itemsData, currentChar = null,' +
  ' SHEET_MODULE_DEFS = null, ptmSearchHint = stubs.ptmSearchHint, appendCoinsModule = stubs.appendCoinsModule,' +
  ' openArmorDetailPopup = stubs.openArmorDetailPopup, openArmorAddMenu = stubs.openArmorAddMenu,' +
  ' refreshCombatModule = stubs.refreshCombatModule, CharactersStore = stubs.CharactersStore,' +
  ' ptmItemHref = stubs.ptmItemHref;' +
  extractFn('armorNameHtml') +
  extractFn('renderModuleEquipment') + '\nreturn renderModuleEquipment;})');
const ctx = {
  esc, $: $stub, itemsData: [], currentChar: null, SHEET_MODULE_DEFS: null,
  ptmSearchHint: () => '<a class="ptm-link">itens</a>',
  ptmItemHref: () => 'items.html#x',
  appendCoinsModule: () => {},
  openArmorDetailPopup: () => {}, openArmorAddMenu: () => {},
  refreshCombatModule: () => {}, CharactersStore: {save: () => {}},
};

const char = {
  armors: [
    {name: 'Couro Batido', source: 'PHB', type: 'LA', ac: 12, equipped: true},
    {name: 'Cota de Malha', source: 'PHB', type: 'HA', ac: 16, equipped: false},
    {name: 'Escudo', type: 'S', ac: 2, equipped: true, attunement: true},
  ],
  inventory: ['Corda', 'Tocha'],
};
const fn = factory(ctx);
fn($stub(), char);

const checks = [
  ['lista de armaduras presente', captured.includes('characters__attacks-list')],
  ['botao adicionar presente', captured.includes('id="btn-add-armor-popup"')],
  ['3 cards gerados', (captured.match(/data-armor-idx=/g) || []).length === 3],
  ['badge Equipada apenas nas equipadas', (captured.match(/Equipada/g) || []).length === 2],
  ['tipos traduzidos', captured.includes('Armadura leve') && captured.includes('Armadura pesada') && captured.includes('Escudo')],
  ['status mochila presente', captured.includes('na mochila')],
  ['sintonizacao listada', captured.includes('sintonização')],
  ['botoes remover presentes', (captured.match(/data-remove-armor=/g) || []).length === 3],
  ['inventario preservado', captured.includes('id="in-inv"') && captured.includes('Corda')],
  ['sem busca legada de armadura', !captured.includes('id="armor-search"')],
  ['tags balanceadas', (captured.match(/<div/g) || []).length === (captured.match(/<\/div>/g) || []).length],
];

const char2 = {armors: [], inventory: []};
captured = '';
fn($stub(), char2);
checks.push(['estado vazio com dica', captured.includes('Nenhuma armadura')]);

let ok = 0; const fail = [];
checks.forEach(([n, v]) => { if (v) ok++; else fail.push(n); });
console.log('ARMOR_RENDER:', ok + '/' + checks.length, ok === checks.length ? 'PASS' : 'FAIL');
if (fail.length) console.log('  falhas: ' + fail.join(', '));
process.exit(ok === checks.length ? 0 : 1);
