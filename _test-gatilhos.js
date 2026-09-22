"use strict";
const fs = require('fs');
const src = fs.readFileSync('/home/jack/Documentos/GitHub/projeto-dnd/5etools-src-translation-main/js/characters-app.js','utf8');

function table(name){ for (const kw of ['const '+name, 'var '+name, 'let '+name]) { const i = src.indexOf(kw); if (i !== -1) { const j = src.indexOf('];',i); const k = src.indexOf('};',i); const e = Math.min(j===-1?1e9:j, k===-1?1e9:k); return src.slice(i, e+2); } } return ''; }
for (const t of ['ASI_LEVELS','ASI_EXTRA','EXPERTISE_LEVELS','STYLE_LEVELS','PACT_LEVELS','METAMAGIC_LEVELS','SECRETS_LEVELS']) {
  const code = table(t);
  const m = code.match(/^(?:const|var|let)\s+(\w+)\s*=/);
  if (m) global[m[1]] = eval('(' + code.slice(code.indexOf('=')+1).replace(/;\s*$/, '') + ')');
}

function glc(clsName, level){
  const out=[];
  const asi = ASI_EXTRA[clsName]||[];
  if(ASI_LEVELS.includes(level)||asi.includes(level)) out.push({type:'asi'});
  (EXPERTISE_LEVELS[clsName]||[]).filter(x=>x===level).forEach(()=>out.push({type:'expertise2'}));
  (STYLE_LEVELS[clsName]||[]).filter(x=>x===level).forEach(()=>out.push({type:'style'}));
  (PACT_LEVELS[clsName]||[]).filter(x=>x===level).forEach(()=>out.push({type:'pact'}));
  if((METAMAGIC_LEVELS[clsName]||[]).includes(level)){
    const n=(METAMAGIC_LEVELS[clsName]||[]).filter(x=>x<=level).length;
    out.push({type:'metamagic',n});
  }
  (SECRETS_LEVELS[clsName]||[]).filter(x=>x===level).forEach(()=>out.push({type:'secretspells2'}));
  return out;
}

const cases=[
 ['Bard',3,'expertise2'],['Bard',4,'asi'],['Bard',10,'expertise2,secretspells2'],
 ['Fighter',1,'style'],['Fighter',4,'asi'],['Fighter',6,'asi'],
 ['Warlock',3,'pact'],['Sorcerer',3,'metamagic'],['Rogue',1,'expertise2'],
 ['Rogue',6,'expertise2'],['Rogue',10,'asi'],['Ranger',2,'style'],
 ['Paladin',2,'style'],['Monk',4,'asi'],['Wizard',5,''],['Wizard',10,''],
];
let ok=0, fail=[];
cases.forEach(([c,l,w])=>{
  const res=glc(c,l).map(x=>x.type).sort().join(',');
  const want=w===''? '':w.split(',').sort().join(',');
  if(res===want){ok++;}else{fail.push(c+' '+l+': got='+res+' want='+want);}
});
console.log('GATILHOS:', ok+'/'+cases.length, ok===cases.length?'PASS':'FAIL');
if(fail.length) console.log('  '+fail.join('\n  '));

console.log('HP_POPUP:', src.includes('openHpDiceRollPopup')?'PRESENTE':'FALTANDO');
console.log('SHORT_REST:', src.includes('doShortRest')?'PRESENTE':'FALTANDO');
console.log('LANG_NON_REPEAT:', src.includes('refreshLangDisabled')||src.includes('selectedLanguages')?'LOGICA_NOREPEAT':'VERIFICAR');
console.log('IDIOMA_STEP:', src.includes('stepLangGear')?'PASS':'CHECK');

// ==== Armaduras: teste funcional de computeArmorAC / normalizeArmors ====
function extractFn(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}
const fnNames = ['computeArmorAC', 'normalizeArmors', 'equipOnly'];
const fnSources = fnNames.map(extractFn);
const missingFns = fnNames.filter((n, i) => !fnSources[i]);
if (missingFns.length) {
  console.log('ARMOR_FNS:', 'FALTANDO -> ' + missingFns.join(','), 'FAIL');
  process.exit(1);
}
const armorApi = eval('(function(){' + fnSources.join('\n') + '\nreturn {computeArmorAC, normalizeArmors, equipOnly};})()');

const armorCases = [
  ['leve 11 + DES 3 => 14', {scores:{dex:3}, armors:[{name:'Couro', type:'LA', ac:11, equipped:true}]}, 14],
  ['leve 11 + DES -1 => 10', {scores:{dex:-1}, armors:[{name:'Couro', type:'LA', ac:11, equipped:true}]}, 10],
  ['media 14 + DES 5 (cap +2) => 16', {scores:{dex:5}, armors:[{name:'Peitoral', type:'MA', ac:14, equipped:true}]}, 16],
  ['pesada 18 + DES 5 (sem DES) => 18', {scores:{dex:5}, armors:[{name:'Placas', type:'HA', ac:18, equipped:true}]}, 18],
  ['escudo soma +2', {scores:{dex:2}, armors:[{name:'Couro', type:'LA', ac:11, equipped:true}, {name:'Escudo', type:'S', ac:2, equipped:true}]}, 15],
  ['desequipada e ignorada', {scores:{dex:3}, armors:[{name:'Couro', type:'LA', ac:11, equipped:false}]}, null],
  ['melhor armadura conta uma vez', {scores:{dex:3}, armors:[{name:'Couro', type:'LA', ac:11, equipped:true}, {name:'Peitoral', type:'MA', ac:14, equipped:true}]}, 16],
  ['Defesa (+1 CA)', {scores:{dex:3}, fightingStyle:'Defense', armors:[{name:'Couro', type:'LA', ac:11, equipped:true}]}, 15],
  ['sem armaduras => null', {scores:{dex:3}, armors:[]}, null],
];
let aOk = 0; const aFail = [];
armorCases.forEach(([label, char, want]) => {
  const got = armorApi.computeArmorAC(char, char.scores.dex);
  const pass = (got === null && want === null) || got === want;
  if (pass) aOk++; else aFail.push(label + ': got=' + got + ' want=' + want);
});
console.log('ARMOR_AC:', aOk + '/' + armorCases.length, aOk === armorCases.length ? 'PASS' : 'FAIL');
if (aFail.length) console.log('  ' + aFail.join('\n  '));

// normalizeArmors: apenas a 1ª armadura corporal equipada permanece equipada
const nc = {armors:[{name:'A', type:'LA', equipped:true}, {name:'B', type:'HA', equipped:true}, {name:'S', type:'S', equipped:true}]};
armorApi.normalizeArmors(nc);
const normOk = nc.armors[0].equipped === true && nc.armors[1].equipped === false && nc.armors[2].equipped === true;
console.log('ARMOR_NORMALIZE:', normOk ? 'PASS' : 'FAIL');

// equipOnly: a armadura alvo fica equipada e as outras corporais saem (escudo permanece)
const ec = {armors:[{name:'A', type:'LA', equipped:true}, {name:'B', type:'HA', equipped:false}, {name:'S', type:'S', equipped:true}]};
armorApi.equipOnly(ec, ec.armors[1]);
const eqOk = ec.armors[1].equipped === true && ec.armors[0].equipped === false && ec.armors[2].equipped === true;
console.log('ARMOR_EQUIP_ONLY:', eqOk ? 'PASS' : 'FAIL');
// equipar escudo não desequipa a armadura corporal
const ec2 = {armors:[{name:'A', type:'LA', equipped:true}, {name:'S', type:'S', equipped:false}]};
armorApi.equipOnly(ec2, ec2.armors[1]);
const eqOk2 = ec2.armors[0].equipped === true && ec2.armors[1].equipped === true;
console.log('ARMOR_SHIELD_KEEPS_BODY:', eqOk2 ? 'PASS' : 'FAIL');

// UI/regressão: 1 único conjunto de UI de armadura + nada de PV temporário/contador de DV
const equipFnSrc = extractFn('renderModuleEquipment') || '';
const uiChecks = [
  ['ARMOR_PICKER', src.includes('openOfficialArmorPicker')],
  ['ARMOR_CUSTOM', src.includes('openCustomArmorCreator')],
  ['ARMOR_DETAIL', src.includes('openArmorDetailPopup')],
  ['ARMOR_ADD_BTN', src.includes('btn-add-armor-popup')],
  ['ARMOR_NO_LEGACY_SEARCH', !equipFnSrc.includes('armor-search')],
  ['ARMOR_PERSISTS', /CharactersStore\.save\(char\)/.test(extractFn('saveArmors') || '')],
  ['NO_HP_TEMP_FIELD', !src.includes('in-hp-temp')],
  ['NO_HP_TEMP_ROW', !src.includes('characters__hp-editors')],
  ['NO_HD_COUNTER', !src.includes('hd-counter-row')],
];
let uOk = 0; const uFail = [];
uiChecks.forEach(([n, v]) => { if (v) uOk++; else uFail.push(n); });
console.log('ARMOR_UI:', uOk + '/' + uiChecks.length, uOk === uiChecks.length ? 'PASS' : 'FAIL');
if (uFail.length) console.log('  faltando/inesperado: ' + uFail.join(','));

const armorFailures = fail.length + aFail.length + uFail.length + missingFns.length
  + (normOk ? 0 : 1) + (eqOk ? 0 : 1) + (eqOk2 ? 0 : 1);
process.exit(armorFailures ? 1 : 0);
