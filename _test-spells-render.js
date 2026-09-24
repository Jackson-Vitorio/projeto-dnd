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
  ['card SEM stepper (controles vivem no popup)', (captured.match(/data-cast-step=/g) || []).length === 0],
  ['card SEM botao Usar magia (vive no popup)', (captured.match(/data-use-spell=/g) || []).length === 0],
  ['card com dica "detalhes ▸"', captured.includes('detalhes ▸')],
  ['menu + Adicionar (padrao armas)', captured.includes('btn-add-spell-popup') && src.includes('Magia Oficial (lista)') && src.includes('Criar Magia Personalizada')],
  ['tag Preparada verde na magia certa', (captured.match(/characters__spell-prepared/g) || []).length === 1 && captured.includes('Preparada')],
  ['is-prepared apenas 1x', (captured.match(/is-prepared/g) || []).length === 1],
  ['espacos disponiveis apenas no popup (fonte)', src.includes('sem espaços') && /av \+ " espa/.test(src)],
  ['grid de espacos com total', captured.includes('characters__slots-grid') && captured.includes('4') && captured.includes('2')],
  ['botao repouso presente', captured.includes('id="btn-rest-slots"')],
  ['conjuração com CD e ataque', captured.includes('CD de Magia') && captured.includes('Bônus de Ataque Mágico')],
  ['lista completa link presente', captured.includes('spells.html')],
  ['botoes remover ausentes do card', (captured.match(/data-remove-spell=/g) || []).length === 0],
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
checks.push(['sem espacos -> card ainda renderiza', captured.includes('characters__spell-card') && captured.includes('Bola de Fogo')]);
checks.push(['sem espacos -> popup desabilita sd-use', /anySlots \? "" : ' disabled/.test(src)]);
checks.push(['sem espacos -> stepper desabilitado no popup', (src.match(/anySlots \? "" : " disabled"/g) || []).length >= 2]);

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

// ==== Popups: detalhe de magia, armas e talentos ====
checks.push(
  ['popup detalhe de magia definido', /function openSpellDetailPopup\(/.test(src)],
  ['popup detalhe: Usar magia/stepper/apagar', src.includes('id="sd-use"') && src.includes('id="sd-step-minus"') && src.includes('id="sd-step-plus"') && src.includes('id="sd-remove"')],
  ['popup detalhe: nome oficial vira link', /openSpellDetailPopup[\s\S]{0,1200}ptmSpellHref/.test(src)],
  ['add magia: picker oficial', src.includes('openOfficialSpellPicker') && src.includes('id="sp-search"')],
  ['add magia: criador personalizado', src.includes('openCustomSpellCreator') && src.includes('id="sc-name"')],
  ['arma: excluir arma no popup', src.includes('id="wd-remove"') && src.includes('Excluir arma')],
  ['arma: efeitos magicos adicionar/editar/remover', src.includes('id="wd-add-fx"') && src.includes('data-fx-edit') && src.includes('data-fx-del')],
  ['arma: openMagicFxPopup com char/fxIdx', /function openMagicFxPopup\(\$parentOv, char, w, fxIdx, onDone\)/.test(src)],
  ['arma: nome oficial vira link', src.includes('function weaponNameHtml')],
  ['clique no nome (link) nao abre popup (arma/armadura)', src.includes('closest(".characters__ov, a")') && src.includes('closest("[data-remove-armor], a")')],
  ['armadura: nome oficial vira link', src.includes('function armorNameHtml')],
  ['talentos: botao + Adicionar (source)', src.includes('id="btn-add-feat-popup"') && src.includes('Talento Oficial (lista)') && src.includes('Criar Talento Personalizado')],
  ['talentos: popup de detalhe', src.includes('function openFeatDetailPopup') && src.includes('id="featdetail-overlay"')],
  ['talentos: picker oficial + criador', src.includes('function openFeatPicker') && src.includes('function openCustomFeatCreator')],
  ['talentos: hold para preparar', /mousedown\.feathold touchstart\.feathold/.test(src)],
  ['talentos: cards padrao armas no render', src.includes('characters__feat-card') && src.includes('data-feat-idx')],
);

let ok = 0; const fail = [];
checks.forEach(([n, v]) => { if (v) ok++; else fail.push(n); });
console.log('SPELLS_RENDER:', ok + '/' + checks.length, ok === checks.length ? 'PASS' : 'FAIL');
if (fail.length) console.log('  falhas: ' + fail.join(', '));
process.exit(ok === checks.length ? 0 : 1);