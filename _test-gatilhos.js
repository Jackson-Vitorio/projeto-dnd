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

process.exit(fail.length?1:0);
