"use strict";
// Testes da feature "Características & Usos": parser de usos, regras de classe,
// agrupamento por subclasse, contadores, render e restauração por descanso.
const fs = require('fs');
const src = fs.readFileSync('/home/jack/Documentos/GitHub/projeto-dnd/5etools-src-translation-main/js/characters-app.js', 'utf8');
const START = '// === CARACTERÍSTICAS & USOS (início) ===';
const END = '// === CARACTERÍSTICAS & USOS (fim) ===';
const i0 = src.indexOf(START), i1 = src.indexOf(END);
if (i0 < 0 || i1 < 0 || i1 <= i0) {
  console.log('USES: FAIL (marcadores do bloco não encontrados)');
  process.exit(1);
}
const block = src.slice(i0, i1);

// Remove marcações 5etools ({@damage 1d6}) para texto puro.
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

function makeSandbox(cfg) {
  cfg = cfg || {};
  const stubs = {
    calcMod: (s) => Math.floor((s - 10) / 2),
    calcProfBonus: (l) => 2 + Math.floor(((l || 1) - 1) / 4),
    classesData: cfg.classesData || [],
    featsData: cfg.featsData || [],
    subObjFromKey: cfg.subObjFromKey || (() => null),
    classFeaturesFor: cfg.classFeaturesFor || (() => []),
    entriesToPlain: (e) => plainOf(e),
    charClasses: (c) => (c.classes || []).slice(),
    esc: (s) => String(s == null ? "" : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    racesData: cfg.racesData || [],
    subracesData: cfg.subracesData || [],
    $: { extend: Object.assign },
    CharactersStore: { save() {} },
    sheetToast: () => {},
    window: { prompt: () => null },
  };
  const factory = eval('(function (stubs) {' +
    'var calcMod = stubs.calcMod, calcProfBonus = stubs.calcProfBonus, classesData = stubs.classesData, featsData = stubs.featsData,' +
    ' subObjFromKey = stubs.subObjFromKey, classFeaturesFor = stubs.classFeaturesFor, entriesToPlain = stubs.entriesToPlain,' +
    ' racesData = stubs.racesData, subracesData = stubs.subracesData, $ = stubs.$,' +
    ' charClasses = stubs.charClasses, esc = stubs.esc, CharactersStore = stubs.CharactersStore, sheetToast = stubs.sheetToast, window = stubs.window;' +
    block + '\nreturn {parseUsesFromText:parseUsesFromText, warlockPactSlots:warlockPactSlots,' +
    ' metamagicCost:metamagicCost, abilityUseKey:abilityUseKey, USE_RULES_BY_CLASS:USE_RULES_BY_CLASS, usesGroupsFor:usesGroupsFor,' +
    ' usesCtx:usesCtx, restoreAbilityUses:restoreAbilityUses, renderModuleUses:renderModuleUses, hasUsesModuleContent:hasUsesModuleContent,' +
    ' usesItemHtml:usesItemHtml, normalizeAbilityUses:normalizeAbilityUses};})');
  return factory(stubs);
}

const checks = [];
const check = (name, cond, extra) => checks.push([name, !!cond, extra]);

// ---------- Parser de usos ----------
{
  const s = makeSandbox();
  const p = s.parseUsesFromText;
  check('parser: "1/descanso longo"', (() => { const r = p("1/descanso longo"); return r && r.max === 1 && r.restore === "long"; })());
  check('parser: "5 por dia"', (() => { const r = p("5 por dia"); return r && r.max === 5 && r.restore === "long"; })());
  check('parser: "2 vezes por descanso curto"', (() => { const r = p("2 vezes por descanso curto"); return r && r.max === 2 && r.restore === "short"; })());
  check('parser: "3/viagem" (sem recarga por descanso)', (() => { const r = p("3/viagem"); return r && r.max === 3 && r.restore === null; })());
  check('parser: "indefinidamente" -> infinito', (() => { const r = p("Você pode usar isso indefinidamente"); return r && r.max === Infinity; })());
  check('parser: "recarrega após um descanso longo" (máx. dinâmico)', (() => { const r = p("recarrega após um descanso longo"); return r && r.max === null && r.restore === "long"; })());
  check('parser: texto sem usos -> null', p("Role um d20 e some o bônus.") === null);
  check('parser: vazio -> null', p("") === null);
}

// ---------- Tabelas auxiliares ----------
{
  const s = makeSandbox();
  const w = s.warlockPactSlots;
  check('bruxo nv.1: 1 espaço de 1º', w(1).count === 1 && w(1).level === 1);
  check('bruxo nv.3: 2 espaços de 2º', w(3).count === 2 && w(3).level === 2);
  check('bruxo nv.11: 3 espaços de 5º', w(11).count === 3 && w(11).level === 5);
  check('bruxo nv.20: 4 espaços de 5º', w(20).count === 4 && w(20).level === 5);
  const c = s.metamagicCost;
  check('metamagia: Intensificada = 3', c("Intensificada") === 3);
  check('metamagia: Acelerada = 2', c("Acelerada") === 2);
  check('metamagia: Sutil = 1', c("Sutil") === 1);
}
// ---------- Regras de classe ----------
function sandboxWith(features, cfgExtra) {
  const cfg = Object.assign({
    classesData: [{ name: 'Barbarian', source: 'PHB' }, { name: 'Bard', source: 'PHB' }, { name: 'Warlock', source: 'PHB' }, { name: 'Sorcerer', source: 'PHB' }, { name: 'Rogue', source: 'PHB' }],
    classFeaturesFor: (clsName) => (features[clsName] || []),
  }, cfgExtra || {});
  return makeSandbox(cfg);
}
const rageFeat = { kind: 'class', name: 'Fúria', level: 1, feat: { name: 'Fúria', className: 'Barbarian', entries: ['Você pode entrar em fúria.'] } };
const inspFeat = (lvl) => ({ kind: 'class', name: 'Inspiração Bárdica', level: lvl, feat: { name: 'Inspiração Bárdica', className: 'Bard', entries: ['Use um número de vezes igual ao seu modificador de Carisma.'] } });
function charOf(classes, extra) {
  return Object.assign({
    level: 1,
    scores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 16 },
    rawScores: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    classes: classes, feats: [], specialAbilities: [], choices: {}, abilityUses: {}
  }, extra || {});
}

{
  const s = sandboxWith({ Barbarian: [rageFeat] });
  const groups = s.usesGroupsFor(charOf([{ name: 'Barbarian', subclass: '', level: 9 }]));
  const item = groups[0] && groups[0].items[0];
  check('bárbaro nv.9: fúria com 4 usos', item && item.name === 'Fúria' && item.max === 4);
  check('bárbaro: fúria recarrega em descanso longo', item && item.restore === 'long');
  check('grupo de classe tem a tag "classe"', groups[0] && groups[0].tag === 'classe' && groups[0].items.length === 1);

  const s20 = sandboxWith({ Barbarian: [rageFeat] });
  const it20 = s20.usesGroupsFor(charOf([{ name: 'Barbarian', level: 20 }]))[0].items[0];
  check('bárbaro nv.20: fúria ilimitada', it20.max === Infinity);
}
{
  // Bardo nv.5 -> recarrega em descanso curto; máx = mod. de CAR (16 -> +3)
  const s = sandboxWith({ Bard: [inspFeat(5)] });
  const it = s.usesGroupsFor(charOf([{ name: 'Bard', level: 5 }]))[0].items[0];
  check('bardo: máx = mod. de Carisma (3)', it.max === 3);
  check('bardo nv.5: recarrega em descanso curto', it.restore === 'short');
  const s1 = sandboxWith({ Bard: [inspFeat(1)] });
  const it1 = s1.usesGroupsFor(charOf([{ name: 'Bard', level: 1 }]))[0].items[0];
  check('bardo nv.1: recarrega em descanso longo', it1.restore === 'long');
}
{
  // Metamagia: pontos de feitiçaria = nível e opções com custo
  const fonte = { kind: 'class', name: 'Fonte de Magia', level: 2, feat: { name: 'Fonte de Magia', className: 'Sorcerer', entries: ['Você ganha pontos de feitiçaria.'] } };
  const s = sandboxWith({ Sorcerer: [fonte] });
  const ch = charOf([{ name: 'Sorcerer', level: 6 }], { choices: { metamagic: ['Acelerada', 'Sutil'] } });
  const it = s.usesGroupsFor(ch)[0].items[0];
  check('feiticeiro: pontos de feitiçaria = nível (6)', it.max === 6);
  check('metamagia: opções com custo', it.options && it.options.length === 2 && it.options[0].cost === 2 && it.options[1].cost === 1);
}
{
  // Dádiva do pacto: espaços de pacto do bruxo
  const pacto = { kind: 'class', name: 'Magia de Pacto', level: 1, feat: { name: 'Magia de Pacto', className: 'Warlock', entries: ['Você tem espaços de magia de pacto.'] } };
  const s = sandboxWith({ Warlock: [pacto] });
  const ch = charOf([{ name: 'Warlock', level: 11 }], { choices: { pact: 'Lâmina' } });
  const it = s.usesGroupsFor(ch)[0].items[0];
  check('bruxo nv.11: 3 espaços de pacto', it.max === 3);
  check('bruxo: espaços recarregam em descanso curto', it.restore === 'short');
  check('bruxo: dádiva do pacto aparece na nota', /Lâmina/.test(it.note));
}

// ---------- Agrupamento por subclasse (tag própria) ----------
{
  const s = sandboxWith({
    Barbarian: [
      rageFeat,
      { kind: 'subclass', name: 'Fúria Incansável', level: 6, feat: { name: 'Fúria Incansável', className: 'Barbarian', entries: ['Recupera 1 uso de Fúria em descanso curto.'] } },
    ],
  }, { subObjFromKey: () => ({ name: 'Caminho do Furioso', source: 'PHB' }) });
  const groups = s.usesGroupsFor(charOf([{ name: 'Barbarian', subclass: 'Caminho do Furioso', level: 6 }]));
  const subGroup = groups.filter((g) => g.tag === 'subclasse')[0];
  check('subclasse gera grupo próprio', !!subGroup && /Caminho do Furioso/.test(subGroup.title));
  check('item de subclasse tem tag "subclasse"', subGroup && subGroup.items[0].tag === 'subclasse');
  const clsGroup = groups.filter((g) => g.tag === 'classe')[0];
  check('classe e subclasse ficam em grupos separados', clsGroup.items.length === 1 && subGroup.items.length === 1);
}

// ---------- Regras não devem casar com características derivadas ----------
{
  const s = sandboxWith({
    Barbarian: [
      rageFeat,
      { kind: 'subclass', name: 'Fúria Incansável', level: 6, feat: { name: 'Fúria Incansável', className: 'Barbarian', entries: ['Quando você cai a 0 PV em fúria, pode tentar se manter de pé.'] } },
      { kind: 'subclass', name: 'Canalizar Divindade: Arma Sagrada', level: 3, feat: { name: 'Canalizar Divindade: Arma Sagrada', className: 'Paladin', entries: ['Como ação, imbuí uma arma.'] } },
    ],
  }, { subObjFromKey: () => ({ name: 'Juramento de Devoção', source: 'PHB' }) });
  const groups = s.usesGroupsFor(charOf([{ name: 'Barbarian', subclass: 'Juramento de Devoção', level: 6 }]));
  const names = groups.reduce((acc, g) => acc.concat(g.items.map((i) => i.name)), []);
  check('"Fúria Incansável" não vira contador de Fúria (sem usos)', names.indexOf('Fúria') === -1 || names.filter((n) => n === 'Fúria').length === 1);
  check('"Canalizar Divindade: Arma Sagrada" não gera contador duplicado', groups.filter((g) => g.tag === 'subclasse').length === 0);
}

// ---------- Habilidades especiais e talentos ----------
{
  const s = sandboxWith({}, { featsData: [{ name: 'Sortudo', source: 'PHB', entries: ['Você tem 3 pontos de sorte. Recupera em descanso longo.'] }] });
  const ch = charOf([], {
    specialAbilities: [{ name: 'Chamado Divino', description: 'Pode usar 1/descanso longo.' }],
    feats: [{ name: 'Sortudo', source: 'PHB' }],
  });
  const groups = s.usesGroupsFor(ch);
  const sp = groups.filter((g) => g.tag === 'habilidade')[0];
  const ft = groups.filter((g) => g.tag === 'talento')[0];
  check('habilidade especial com uso detectada', !!sp && sp.items[0].max === 1 && sp.items[0].restore === 'long');
  check('talento com uso detectado (Sortudo: 3)', !!ft && ft.items[0].max === 3);
}
{
  // Ficha sem recursos: módulo não deve aparecer
  const s = sandboxWith({});
  check('ficha sem recursos -> módulo oculto', s.hasUsesModuleContent(charOf([{ name: 'Rogue', level: 3 }])) === false);
  const s2 = sandboxWith({ Barbarian: [rageFeat] });
  check('ficha com recurso -> módulo visível', s2.hasUsesModuleContent(charOf([{ name: 'Barbarian', level: 3 }])) === true);
}
// ---------- Render + contadores + restauração ----------
{
  const s = sandboxWith({ Barbarian: [rageFeat] });
  const ch = charOf([{ name: 'Barbarian', level: 6 }]);
  const $body = { _h: '', html(h) { if (h !== undefined) { this._h = h; return this; } return this._h; }, off() { return this; }, on() { return this; } };
  s.renderModuleUses($body, ch);
  const html = $body._h;
  check('render: contém o nome da característica', /Fúria/.test(html));
  check('render: contém contador 4 / 4', /4 \/ 4/.test(html));
  check('render: contém botões de gastar/recuperar', /data-use-minus/.test(html) && /data-use-plus/.test(html));
  check('render: contém a tag do grupo', /characters__feature-tag/.test(html));
  check('render: grupo da classe no HTML', /data-uses-group="cls\|Barbarian"/.test(html));

  // Gasto manual persiste no estado e aparece no contador
  const key = s.abilityUseKey('class', 'Barbarian', 'Fúria');
  ch.abilityUses[key] = { used: 3 };
  s.renderModuleUses($body, ch);
  check('render: mostra restante após gasto (1 / 4)', /1 \/ 4/.test($body._h) && /is-spent/.test($body._h));

  // Descanso curto NÃO recarrega Fúria (descanso longo)
  const nShort = s.restoreAbilityUses(ch, 'short');
  check('descanso curto não recarrega fúria', nShort === 0 && ch.abilityUses[key].used === 3);
  // Descanso longo recarrega
  const nLong = s.restoreAbilityUses(ch, 'long');
  check('descanso longo recarrega fúria', nLong === 1 && ch.abilityUses[key].used === 0);
}
{
  // Bardo: descanso curto recarrega (nv.5+)
  const s = sandboxWith({ Bard: [inspFeat(5)] });
  const ch = charOf([{ name: 'Bard', level: 5 }]);
  const key = s.abilityUseKey('class', 'Bard', 'Inspiração Bárdica');
  ch.abilityUses[key] = { used: 2 };
  const n = s.restoreAbilityUses(ch, 'short');
  check('descanso curto recarrega inspiração bárdica', n === 1 && ch.abilityUses[key].used === 0);
}
{
  // Máximo manual (maxOverride) respeitado pelo contador
  const s = sandboxWith({ Barbarian: [rageFeat] });
  const ch = charOf([{ name: 'Barbarian', level: 6 }]);
  const key = s.abilityUseKey('class', 'Barbarian', 'Fúria');
  ch.abilityUses[key] = { used: 0, maxOverride: 7 };
  const groups = s.usesGroupsFor(ch);
  const it = groups[0].items[0];
  check('maxOverride: html usa o máximo manual (7 / 7)', /7 \/ 7/.test(s.usesItemHtml(it, ch)));
}
{
  // normalizeAbilityUses limita o gasto ao máximo atual
  const s = sandboxWith({ Barbarian: [rageFeat] });
  const ch = charOf([{ name: 'Barbarian', level: 3 }]);
  const key = s.abilityUseKey('class', 'Barbarian', 'Fúria');
  ch.abilityUses[key] = { used: 99 };
  s.normalizeAbilityUses(ch);
  check('normalize limita gasto ao máximo (3)', ch.abilityUses[key].used === 3);
}
{
  // normalize não apaga nem mexe em chaves desconhecidas (dados não carregados)
  const s = sandboxWith({});
  const ch = charOf([{ name: 'Barbarian', level: 3 }]);
  ch.abilityUses['desconhecido|x|y'] = { used: 5 };
  s.normalizeAbilityUses(ch);
  check('normalize preserva chave desconhecida', ch.abilityUses['desconhecido|x|y'].used === 5);
}

// ---------- Raça / sub-raça / Artífice ----------
const aelarRace = { name: 'Aelar', source: 'PHB', entries: [
  { name: 'Passo Feérico', entries: ['Você pode se teleportar 1/descanso longo.'] },
  { name: 'Visão no Escuro', entries: ['Você enxerga no escuro.'] },
] };
{
  const s = makeSandbox({ racesData: [aelarRace] });
  const ch = charOf([], { race: { name: 'Aelar' }, raceSource: 'PHB' });
  const groups = s.usesGroupsFor(ch);
  check('raça: grupo "Aelar — raça" criado', groups.length === 1 && groups[0].title === 'Aelar — raça' && groups[0].tag === 'raça');
  check('raça: só o traço com uso entra (1 item)', groups.length === 1 && groups[0].items.length === 1);
  check('raça: Passo Feérico 1/descanso longo', groups.length === 1 && groups[0].items[0].max === 1 && groups[0].items[0].restore === 'long');
  check('raça: item com tag "raça"', groups.length === 1 && groups[0].items[0].tag === 'raça');
  check('raça: chave estável inclui o nome da raça', groups.length === 1 && groups[0].items[0].key === 'race|aelar|passo feerico');
}
{
  // Reborn (VRGR): nenhum traço tem usos limitados -> módulo fica oculto
  const reborn = { name: 'Reborn', source: 'VRGR', entries: [
    { name: 'Deathless Nature', entries: ['Você tem vantagem em testes de resistência à morte.'] },
    { name: 'Knowledge from a Past Life', entries: ['Você pode rolar um d6 e somar ao teste de habilidade.'] },
  ] };
  const s = makeSandbox({ racesData: [reborn] });
  const ch = charOf([], { race: { name: 'Reborn' }, raceSource: 'VRGR' });
  check('Reborn: traços sem usos -> nenhum grupo', s.usesGroupsFor(ch).length === 0);
  check('Reborn: módulo oculto (hasUsesModuleContent falso)', s.hasUsesModuleContent(ch) === false);
}
{
  // Sub-raça salva separadamente (ex.: Aasimar/Fallen com uso em descanso longo)
  const fallen = { name: 'Fallen', source: 'VGM', raceName: 'Aasimar', raceSource: 'VGM', entries: [
    { name: 'Necrotic Shroud', entries: ['A partir do 3º nível, 1/descanso longo você libera energia divina.'] },
  ] };
  const s = makeSandbox({ subracesData: [fallen] });
  const ch = charOf([], { race: { name: 'Aasimar' }, raceSource: 'VGM', raceSubraceName: 'Fallen' });
  const groups = s.usesGroupsFor(ch);
  check('sub-raça: grupo "Fallen — sub-raça"', groups.length === 1 && groups[0].title === 'Fallen — sub-raça' && groups[0].tag === 'sub-raça');
  check('sub-raça: Necrotic Shroud detectado', groups.length === 1 && groups[0].items[0].max === 1 && groups[0].items[0].restore === 'long');
}
{
  // Variante recolhida "Base (Rótulo)": entries vêm da subraça correspondente
  const gold = { name: 'Dourado', source: 'MPMM', raceName: 'Aelar', raceSource: 'PHB', entries: [
    { name: 'Bênção Radiante', entries: ['2 vezes por descanso curto você pode brilhar.'] },
  ] };
  const s = makeSandbox({ subracesData: [gold] });
  const ch = charOf([], { race: { name: 'Aelar (Dourado)' } });
  const groups = s.usesGroupsFor(ch);
  check('variante recolhida: raça base + rótulo resolvidos', groups.length === 1 && groups[0].title === 'Aelar — raça');
  check('variante recolhida: 2 vezes por descanso curto', groups.length === 1 && groups[0].items[0].max === 2 && groups[0].items[0].restore === 'short');
}
{
  // Artificer (TCE): regras customizadas por nome (EN/PT)
  const s = makeSandbox({});
  const ch = charOf([], { classes: [{ name: 'Artificer', level: 7 }], scores: Object.assign(charOf([]).scores, { int: 14 }) });
  ch.classSource = 'TCE';
  const ctx = s.usesCtx(ch, 'Artificer', null, 7);
  check('artífice: Flash of Genius = mod. INT (2) e descanso longo', (() => {
    const sb = makeSandbox({});
    const rules = sb.USE_RULES_BY_CLASS.Artificer;
    const rule = rules.find(r => r.re.test('flash of genius'));
    return rule && rule.max(ctx) === 2 && rule.restore === 'long';
  })());
  check('artífice: Spell-Storing = 2× mod. INT, mín. 2', (() => {
    const sb = makeSandbox({});
    const rules = sb.USE_RULES_BY_CLASS.Artificer;
    const rule = rules.find(r => r.re.test('spell-storing item'));
    return rule && rule.max(ctx) === 4 && rule.max(s.usesCtx(charOf([], { scores: Object.assign(charOf([]).scores, { int: 8 }) }), 'Artificer', null, 11)) === 2;
  })());
  check('artífice: Jato Arcano = mod. INT, descanso longo', (() => {
    const sb = makeSandbox({});
    const rules = sb.USE_RULES_BY_CLASS.Artificer;
    const rule = rules.find(r => r.re.test('arcane jolt'));
    return rule && rule.max(ctx) === 2 && rule.restore === 'long';
  })());
  check('artífice: regra provisória "Sentinela Arcana" removida', (() => {
    const sb = makeSandbox({});
    return !sb.USE_RULES_BY_CLASS.Artificer.some(r => r.re.test('sentinela arcana'));
  })());
}

// ---------- Resultado ----------
let ok = 0;
const fail = [];
checks.forEach(([n, v, extra]) => { if (v) ok++; else fail.push(n + (extra ? ' (' + extra + ')' : '')); });
console.log('USES:', ok + '/' + checks.length, ok === checks.length ? 'PASS' : 'FAIL');
if (fail.length) console.log('  falhas: ' + fail.join(', '));
process.exit(ok === checks.length ? 0 : 1);


