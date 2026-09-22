"use strict";
// Gera 5etools-src-translation-main/_uses-harness.html com o MESMO markup produzido
// por renderModuleUses() para inspeção visual/medição do layout (não faz parte do app).
const fs = require('fs');
const src = fs.readFileSync('/home/jack/Documentos/GitHub/projeto-dnd/5etools-src-translation-main/js/characters-app.js', 'utf8');
const START = '// === CARACTERÍSTICAS & USOS (início) ===';
const END = '// === CARACTERÍSTICAS & USOS (fim) ===';
const i0 = src.indexOf(START), i1 = src.indexOf(END);
if (i0 < 0 || i1 < 0) { console.error('marcadores nao encontrados'); process.exit(1); }
const block = src.slice(i0, i1);

const plainOf = (e) => {
  if (e == null) return "";
  if (typeof e === "string") return e.replace(/\{@\w+ ([^}]+)\}/g, "$1");
  if (Array.isArray(e)) return e.map(plainOf).filter(Boolean).join(" ");
  if (typeof e === "object") {
    if (e.entry) return plainOf(e.entry);
    if (e.text) return plainOf(e.text);
    if (e.entries) return plainOf(e.entries);
    if (e.name) return plainOf(e.name);
    return "";
  }
  return "";
};
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let captured = '';
const $stub = () => ({
  html: (h) => { if (h !== undefined) { captured = h; } return captured; },
  on: () => $stub(), off: () => $stub(), find: () => $stub(), append: () => $stub(), empty: () => $stub(),
});

function makeSandbox(cfg) {
  const stubs = {
    calcMod: (s) => Math.floor((s - 10) / 2),
    calcProfBonus: (l) => 2 + Math.floor(((l || 1) - 1) / 4),
    classesData: cfg.classesData || [],
    featsData: cfg.featsData || [],
    subObjFromKey: cfg.subObjFromKey || (() => null),
    classFeaturesFor: cfg.classFeaturesFor || (() => []),
    entriesToPlain: (e) => plainOf(e),
    charClasses: (c) => (c.classes || []).slice(),
    esc: esc,
    CharactersStore: { save() {} },
    sheetToast: () => {},
    window: { prompt: () => null },
    $: $stub,
  };
  const factory = eval('(function (stubs) {' +
    'var calcMod = stubs.calcMod, calcProfBonus = stubs.calcProfBonus, classesData = stubs.classesData, featsData = stubs.featsData,' +
    ' subObjFromKey = stubs.subObjFromKey, classFeaturesFor = stubs.classFeaturesFor, entriesToPlain = stubs.entriesToPlain,' +
    ' charClasses = stubs.charClasses, esc = stubs.esc, CharactersStore = stubs.CharactersStore, sheetToast = stubs.sheetToast,' +
    ' window = stubs.window, $ = stubs.$;' +
    block + '\nreturn {renderModuleUses:renderModuleUses, usesGroupsFor:usesGroupsFor};})');
  return factory(stubs);
}

const classesData = ['Barbarian', 'Bard', 'Paladin', 'Sorcerer', 'Warlock'].map((n) => ({ name: n, source: 'PHB' }));
function feat(name, entries, kind, lvl) {
  return { kind: kind || 'class', name: name, level: lvl || 1, feat: { name: name, className: '', entries: entries } };
}
const rage = feat('Fúria', ['Você pode entrar em fúria. Recupera em descanso longo.'], 'class', 1);
const insp = feat('Inspiração Bárdica', ['Você pode usar um número de vezes igual ao seu modificador de Carisma. Recupera em descanso longo.']);
const sorc = feat('Fonte de Magia', ['Você ganha pontos de feitiçaria iguais ao seu nível. Recupera em descanso longo.']);
const pact = feat('Magia de Pacto', ['Você tem espaços de magia de pacto. Recupera em descanso curto.']);
const subFeatBarb = feat('Fúria Incansável', ['Quando você cai a 0 PV em fúria, pode tentar se manter de pé.'], 'subclass', 6);
const canalizar = feat('Canalizar Divindade', ['Você recupera os usos em um descanso curto ou longo.'], 'subclass', 3);
const senso = feat('Senso Divino', ['Você pode usar um número de vezes igual a 1 + seu modificador de Carisma. Recupera em descanso longo.']);

const cases = [
  { label: 'Bárbaro 9 — Fúria (classe) + derivada de subclasse sem usos', features: { Barbarian: [rage, subFeatBarb] },
    char: { classes: [{ name: 'Barbarian', subclass: 'Caminho do Furioso', level: 9 }], scores: { str: 18, dex: 14, con: 16, int: 8, wis: 12, cha: 10 }, rawScores: {}, feats: [], specialAbilities: [], choices: {}, abilityUses: {} } },
  { label: 'Paladino 7 — Canalizar Divindade (tag subclasse) + Senso Divino', features: { Paladin: [senso, canalizar] },
    char: { classes: [{ name: 'Paladin', subclass: 'Juramento de Devoção', level: 7 }], scores: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 16 }, rawScores: {}, feats: [], specialAbilities: [], choices: {}, abilityUses: {} } },
  { label: 'Bardo 5 — inspiração (descanso curto)', features: { Bard: [insp] },
    char: { classes: [{ name: 'Bard', level: 5 }], scores: { str: 8, dex: 14, con: 12, int: 10, wis: 12, cha: 16 }, rawScores: {}, feats: [{ name: 'Sortudo', source: 'PHB' }], specialAbilities: [{ name: 'Chamado Divino', description: 'Pode usar 1/descanso longo.' }], choices: {}, abilityUses: {} } },
  { label: 'Feiticeiro 6 — pontos de feitiçaria + metamagia', features: { Sorcerer: [sorc] },
    char: { classes: [{ name: 'Sorcerer', level: 6 }], scores: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 18 }, rawScores: {}, feats: [], specialAbilities: [], choices: { metamagic: ['Acelerada', 'Sutil', 'Intensificada'] }, abilityUses: {} } },
  { label: 'Bruxo 11 — espaços de pacto (descanso curto)', features: { Warlock: [pact] },
    char: { classes: [{ name: 'Warlock', level: 11 }], scores: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 18 }, rawScores: {}, feats: [], specialAbilities: [], choices: { pact: 'Lâmina' }, abilityUses: {} } },
];
const sections = [];
cases.forEach((c) => {
  const s = makeSandbox({ classesData: classesData, classFeaturesFor: (n) => (c.features[n] || []) });
  const ch = c.char;
  // gasta um uso no primeiro item para ver o estado "is-spent"
  const groups = s.usesGroupsFor(ch);
  if (groups[0] && groups[0].items[0]) ch.abilityUses[groups[0].items[0].key] = { used: 1 };
  captured = '';
  s.renderModuleUses($stub(), ch);
  sections.push('<section class="characters__module" data-module="uses">' +
    '<header class="characters__module-head"><span class="characters__module-handle">⋮⋮</span>' +
    '<h4 class="characters__module-title">Características &amp; Usos</h4><span class="characters__module-caret">▾</span></header>' +
    '<div class="characters__module-body">' +
    '<div class="characters__uses-hint" style="font-weight:700;color:#111">' + esc(c.label) + '</div>' + captured +
    '</div></section>');
});

const diag = `<script>
(function(){
  var out = ['BODY w=' + Math.round(document.body.getBoundingClientRect().width)];
  var counts = document.querySelectorAll('.characters__use-count');
  out.push('contadores=' + counts.length);
  var maxRight = 0;
  document.querySelectorAll('.characters__use-item, .characters__uses-group').forEach(function(el){
    var r = el.getBoundingClientRect();
    if (r.width > maxRight) maxRight = r.width;
  });
  out.push('largura maxima de item/grupo=' + Math.round(maxRight));
  out.push('scrollWidth documento=' + document.documentElement.scrollWidth);
  var c0 = counts[0];
  if (c0) {
    var r = c0.getBoundingClientRect(), cs = getComputedStyle(c0);
    out.push('contador[0] w=' + Math.round(r.width) + ' h=' + Math.round(r.height) + ' font=' + cs.fontSize);
  }
  var spent = document.querySelector('.characters__use-item.is-spent');
  out.push('item gasto presente=' + (spent ? 'sim' : 'nao') + (spent ? ' bg=' + getComputedStyle(spent).backgroundColor : ''));
  out.push('opcoes de metamagia=' + document.querySelectorAll('.characters__use-opt').length);
  out.push('altura total=' + document.documentElement.scrollHeight + 'px');
  var pre = document.createElement('pre');
  pre.id = 'diag';
  pre.style.cssText = 'font:12px monospace;white-space:pre-wrap;padding:6px';
  pre.textContent = out.join('\\n');
  document.body.appendChild(pre);
})();
</script>`;

const page = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Harness Características &amp; Usos</title>
<link rel="stylesheet" href="css/bootstrap.css">
<link rel="stylesheet" href="css/main.css">
<link rel="stylesheet" href="css/app.css">
<link rel="stylesheet" href="css/characters.css">
<style>body{padding:8px}</style>
</head><body>
<div class="characters__sheet"><div class="characters__view characters__view--sheet"><div class="characters__sheet">
<div id="sheet-modules" class="characters__modules">${sections.join('\n')}</div>
</div></div></div>
${diag}
</body></html>`;

fs.writeFileSync('/home/jack/Documentos/GitHub/projeto-dnd/5etools-src-translation-main/_uses-harness.html', page);
console.log('ok: _uses-harness.html (' + page.length + ' bytes), secoes=' + sections.length);

