// =============================================
// Sistema de Fichas de Personagem - 5eTools (Globals)
// =============================================

(function(global) {
"use strict";

// === Constantes ===
const ABILITY_ABVS = ["str","dex","con","int","wis","cha"];
const ABILITY_NAMES = {str:"Força",dex:"Destreza",con:"Constituição",int:"Inteligência",wis:"Sabedoria",cha:"Carisma"};
const ABILITY_SHORT = {str:"FOR",dex:"DES",con:"CON",int:"INT",wis:"SAB",cha:"CAR"};
const CLASS_HIT_DICE = {Barbarian:12,Fighter:10,Paladin:10,Ranger:10,Artificer:8,Bard:8,Cleric:8,Druid:8,Monk:8,Rogue:8,Warlock:8,Sorcerer:6,Wizard:6};
const CLASS_SAVES = {Barbarian:["str","con"],Bard:["dex","cha"],Cleric:["wis","cha"],Druid:["int","wis"],Fighter:["str","con"],Monk:["str","dex"],Paladin:["wis","cha"],Ranger:["str","dex"],Rogue:["dex","int"],Sorcerer:["con","cha"],Warlock:["wis","cha"],Wizard:["int","wis"],Artificer:["con","int"]};
const CLASS_SKILLS = {Barbarian:{count:2,skills:["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"]},Bard:{count:3,skills:["Acrobatics","Animal Handling","Arcana","Athletics","Deception","History","Insight","Intimidation","Investigation","Medicine","Nature","Perception","Performance","Persuasion","Religion","Sleight of Hand","Stealth","Survival"]},Cleric:{count:2,skills:["History","Insight","Medicine","Persuasion","Religion"]},Druid:{count:2,skills:["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"]},Fighter:{count:2,skills:["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Perception","Survival"]},Monk:{count:2,skills:["Acrobatics","Athletics","History","Insight","Religion","Stealth"]},Paladin:{count:2,skills:["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"]},Ranger:{count:3,skills:["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"]},Rogue:{count:4,skills:["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Performance","Persuasion","Sleight of Hand","Stealth"]},Sorcerer:{count:2,skills:["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"]},Warlock:{count:2,skills:["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"]},Wizard:{count:2,skills:["Arcana","History","Insight","Investigation","Medicine","Religion"]},Artificer:{count:2,skills:["Arcana","History","Investigation","Medicine","Nature","Perception","Sleight of Hand"]}};
const SKILL_EN_TO_KEY = {Acrobatics:"acrobacy","Animal Handling":"animalHandling",Arcana:"arcana",Athletics:"athletics",Performance:"performance",Deception:"deception",Stealth:"stealth",History:"history",Intimidation:"intimidation",Insight:"insight",Investigation:"investigation",Medicine:"medicine",Nature:"nature",Perception:"perception",Persuasion:"persuasion","Sleight of Hand":"sleightOfHand",Religion:"religion",Survival:"survival"};
const SKILL_KEY_TO_PT = {acrobacy:"Acrobacia",animalHandling:"Adestrar Animais",arcana:"Arcanismo",athletics:"Atletismo",performance:"Atuação",deception:"Enganação",stealth:"Furtividade",history:"História",intimidation:"Intimidação",insight:"Intuição",investigation:"Investigação",medicine:"Medicina",nature:"Natureza",perception:"Percepção",persuasion:"Persuasão",sleightOfHand:"Prestidigitação",religion:"Religião",survival:"Sobrevivência"};
const SKILLS = [
{name:"Acrobacia",abil:"dex"},{name:"Adestrar Animais",abil:"wis"},{name:"Arcanismo",abil:"int"},
{name:"Atletismo",abil:"str"},{name:"Atuação",abil:"cha"},{name:"Enganação",abil:"cha"},
{name:"Furtividade",abil:"dex"},{name:"História",abil:"int"},{name:"Intimidação",abil:"cha"},
{name:"Intuição",abil:"wis"},{name:"Investigação",abil:"int"},{name:"Medicina",abil:"wis"},
{name:"Natureza",abil:"int"},{name:"Percepção",abil:"wis"},{name:"Persuasão",abil:"cha"},
{name:"Prestidigitação",abil:"dex"},{name:"Religião",abil:"int"},{name:"Sobrevivência",abil:"wis"}
];
const POINT_BUY_COSTS = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
const POINT_BUY_BUDGET = 27;
const STANDARD_ARRAY = [15,14,13,12,10,8];

function calcMod(score) { return Math.floor((score - 10) / 2); }
function calcProfBonus(level) { return Math.ceil(2 + (level - 1) / 4); }
function rollAbilityScore() {
const rolls = [0,1,2,3].map(() => 1 + Math.floor(Math.random() * 6));
rolls.sort((a,b) => b - a);
return rolls[0] + rolls[1] + rolls[2];
}
function getRaceAbilities(race) {
const result = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
if (!race || !race.ability) return result;
race.ability.forEach(entry => {
ABILITY_ABVS.forEach(abv => { if (entry[abv] || entry[abv] === 0) result[abv] += entry[abv]; });
});
return result;
}

// === Store ===
const STORAGE_KEY = "5etools_characters";
const CharactersStore = {
getAll() {
try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
catch (e) { return []; }
},
getById(id) { return this.getAll().find(c => c.id === id) || null; },
save(character) {
const all = this.getAll();
if (character.id) {
const ix = all.findIndex(c => c.id === character.id);
if (ix >= 0) { character.updated = Date.now(); all[ix] = character; }
else { character.id = this._genId(); character.updated = Date.now(); all.push(character); }
} else {
character.id = this._genId(); character.updated = Date.now(); all.push(character);
}
this._write(all);
return character;
},
remove(id) { this._write(this.getAll().filter(c => c.id !== id)); },
_genId() { return "char_" + Date.now() + "_" + Math.random().toString(36).substr(2,9); },
_write(all) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) {} }
};

// === Export globals ===
global.CharactersNS = {
ABILITY_ABVS, ABILITY_NAMES, ABILITY_SHORT, CLASS_HIT_DICE, CLASS_SAVES, CLASS_SKILLS,
SKILL_EN_TO_KEY, SKILL_KEY_TO_PT, SKILLS, POINT_BUY_COSTS, POINT_BUY_BUDGET, STANDARD_ARRAY,
calcMod, calcProfBonus, rollAbilityScore, getRaceAbilities, CharactersStore
};

})(window);
