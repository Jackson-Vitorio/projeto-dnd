"use strict";
// Gera /tmp/armor-harness.html com o MESMO markup produzido por renderModuleEquipment()
// para inspeção visual/medição do layout (não faz parte do app).
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
  ' refreshCombatModule = stubs.refreshCombatModule, CharactersStore = stubs.CharactersStore;' +
  extractFn('renderModuleEquipment') + '\nreturn renderModuleEquipment;})');
const fn = factory({
  esc, $: $stub, itemsData: [], ptmSearchHint: () => '<a class="ptm-link ptm-open-list" href="items.html">Ver lista de itens</a>',
  appendCoinsModule: () => {}, openArmorDetailPopup: () => {}, openArmorAddMenu: () => {},
  refreshCombatModule: () => {}, CharactersStore: {save: () => {}},
});

const char = {
  armors: [
    {name: 'Couro Batido', source: 'PHB', type: 'LA', ac: 12, equipped: true},
    {name: 'Cota de Malha', source: 'PHB', type: 'HA', ac: 16, equipped: false},
    {name: 'Escudo', type: 'S', ac: 2, equipped: true, attunement: true},
  ],
  inventory: ['Corda de cânhamo (15 m)', 'Tocha'],
};
fn($stub(), char);

// Bloco de moedas (mesmo markup de appendCoinsModule) para comparar com a grade de espaços de magia
const coinsBlock = `<div class="characters__subtitle">Moedas</div>
<div class="characters__form-row">
  <div class="characters__form-group characters__coin-group"><label>Platina (pp)</label><input type="number" class="characters__form-input coin-input" data-coin="platinum" value="0" min="0"></div>
  <div class="characters__form-group characters__coin-group"><label>Ouro (po)</label><input type="number" class="characters__form-input coin-input" data-coin="gold" value="12" min="0"></div>
  <div class="characters__form-group characters__coin-group"><label>Électrum (pe)</label><input type="number" class="characters__form-input coin-input" data-coin="electrum" value="0" min="0"></div>
  <div class="characters__form-group characters__coin-group"><label>Prata (pe)</label><input type="number" class="characters__form-input coin-input" data-coin="silver" value="3" min="0"></div>
  <div class="characters__form-group characters__coin-group"><label>Cobre (pc)</label><input type="number" class="characters__form-input coin-input" data-coin="copper" value="7" min="0"></div>
</div>`;

const slotsBlock = `<div class="characters__subtitle">Espaços de Magia</div>
<div class="characters__slots-grid">
  <div class="characters__slot"><span class="characters__slot-lv">1º</span><input type="number" class="characters__form-input" value="4"></div>
  <div class="characters__slot"><span class="characters__slot-lv">2º</span><input type="number" class="characters__form-input" value="3"></div>
  <div class="characters__slot"><span class="characters__slot-lv">3º</span><input type="number" class="characters__form-input" value="2"></div>
</div>`;

const cssFiles = ['css/bootstrap.css', 'css/main.css', 'css/app.css', 'css/characters.css'];
const inlineCss = cssFiles.map(f => '<style data-file="' + f + '">' +
  fs.readFileSync('/home/jack/Documentos/GitHub/projeto-dnd/5etools-src-translation-main/' + f, 'utf8') + '</style>').join('\n');

const diag = process.env.DIAG ? `<script>
(function(){
  function info(sel, label){
    var el = document.querySelector(sel);
    if (!el) return label + ': NAO ENCONTRADO';
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return label + ' w=' + Math.round(r.width) + ' h=' + Math.round(r.height)
      + ' display=' + cs.display + ' dir=' + cs.flexDirection
      + ' flex=' + cs.flexGrow + '/' + cs.flexShrink + '/' + cs.flexBasis
      + ' minW=' + cs.minWidth + ' width=' + cs.width
      + ' break=' + cs.wordBreak + ' wrap=' + cs.overflowWrap;
  }
  function rulesFor(sel){
    var el = document.querySelector(sel);
    if (!el) return [sel + ': NAO ENCONTRADO'];
    var out = [];
    for (var i = 0; i < document.styleSheets.length; i++) {
      var ss = document.styleSheets[i];
      var owner = ss.ownerNode ? (ss.ownerNode.getAttribute('data-file') || 'inline') : (ss.href || 'inline');
      owner = owner.split('/').pop();
      var rules;
      try { rules = ss.cssRules; } catch (e) { out.push(owner + ' :: ERRO ' + e.name); continue; }
      for (var j = 0; j < rules.length; j++) {
        var r = rules[j];
        if (!r.selectorText) continue;
        try { if (!el.matches(r.selectorText)) continue; } catch (e) { continue; }
        var css = r.style.cssText || '';
        if (!/(width|display|flex|min-width)/.test(css)) continue;
        out.push(owner + ' | ' + r.selectorText + ' {' + css + '}');
      }
    }
    return out;
  }
  var out = [info('.characters__attacks-list','ATTACKS_LIST'), info('.characters__attack-item2','CARD'),
    info('.characters__armor-lines','ARMOR_LINES'), info('.characters__attack-l1','L1'),
    info('.characters__attack-l1 .characters__attack-name','NAME'), info('.characters__attack-hit2','HIT2'),
    info('.characters__armor-card button[data-remove-armor]','BTN_REMOVE')];
  out = out.concat(['', '--- REGRAS BTN_REMOVE ---'], rulesFor('.characters__armor-card button[data-remove-armor]'));
  var pre = document.createElement('pre');
  pre.style.cssText = 'font:12px monospace;white-space:pre-wrap;padding:6px';
  pre.textContent = 'BODY w=' + Math.round(document.body.getBoundingClientRect().width) + '\\n\\n' + out.join('\\n');
  document.body.innerHTML = '';
  document.body.appendChild(pre);
})();
</script>` : '';

const page = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Harness de layout</title>
<link rel="stylesheet" href="css/bootstrap.css">
<link rel="stylesheet" href="css/main.css">
<link rel="stylesheet" href="css/app.css">
<link rel="stylesheet" href="css/characters.css">
<style>body{padding:8px}</style>
</head><body>
<div class="characters__sheet">
  <div class="characters__view characters__view--sheet">
    <div class="characters__sheet">
      <div id="sheet-modules" class="characters__modules">
        <section class="characters__module" data-module="equipment">
          <header class="characters__module-head"><span class="characters__module-handle">⋮⋮</span><h4 class="characters__module-title">Equipamentos</h4><span class="characters__module-caret">▾</span></header>
          <div class="characters__module-body">${captured}</div>
        </section>
      </div>
    </div>
  </div>
</div>
${diag}
</body></html>`;

fs.writeFileSync('/home/jack/Documentos/GitHub/projeto-dnd/5etools-src-translation-main/_layout-harness.html', page);
console.log('ok: _layout-harness.html (' + page.length + ' bytes)');
