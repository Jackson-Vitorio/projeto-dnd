// Constantes do sistema de fichas
export const ABILITY_ABVS = ["str","dex","con","int","wis","cha"];

export const ABILITY_NAMES = {
	str:"Força", dex:"Destreza", con:"Constituição",
	int:"Inteligência", wis:"Sabedoria", cha:"Carisma"
};

export const ABILITY_SHORT = {
	str:"FOR", dex:"DES", con:"CON", int:"INT", wis:"SAB", cha:"CAR"
};

export const SKILLS = [
	{name:"Acrobacia", abil:"dex"},
	{name:"Adestrar Animais", abil:"wis"},
	{name:"Arcanismo", abil:"int"},
	{name:"Atletismo", abil:"str"},
	{name:"Atuação", abil:"cha"},
	{name:"Enganação", abil:"cha"},
	{name:"Furtividade", abil:"dex"},
	{name:"História", abil:"int"},
	{name:"Intimidação", abil:"cha"},
	{name:"Intuição", abil:"wis"},
	{name:"Investigação", abil:"int"},
	{name:"Medicina", abil:"wis"},
	{name:"Natureza", abil:"int"},
	{name:"Percepção", abil:"wis"},
	{name:"Persuasão", abil:"cha"},
	{name:"Prestidigitação", abil:"dex"},
	{name:"Religião", abil:"int"},
	{name:"Sobrevivência", abil:"wis"}
];

export const CLASS_HIT_DICE = {
	Barbarian:12, Fighter:10, Paladin:10, Ranger:10,
	Artificer:8, Bard:8, Cleric:8, Druid:8, Monk:8, Rogue:8, Warlock:8,
	Sorcerer:6, Wizard:6
};

export const CLASS_SAVES = {
	Barbarian:["str","con"], Bard:["dex","cha"], Cleric:["wis","cha"],
	Druid:["int","wis"], Fighter:["str","con"], Monk:["str","dex"],
	Paladin:["wis","cha"], Ranger:["str","dex"], Rogue:["dex","int"],
	Sorcerer:["con","cha"], Warlock:["wis","cha"], Wizard:["int","wis"],
	Artificer:["con","int"]
};

export const CLASS_SPELLCAST = {
	Bard:"cha", Cleric:"wis", Druid:"wis", Paladin:"cha",
	Ranger:"wis", Sorcerer:"cha", Warlock:"cha", Wizard:"int", Artificer:"int"
};

export const CLASS_SKILLS = {
	Barbarian:{count:2, skills:["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"]},
	Bard:{count:3, skills:["Acrobatics","Animal Handling","Arcana","Athletics","Deception","History","Insight","Intimidation","Investigation","Medicine","Nature","Perception","Performance","Persuasion","Religion","Sleight of Hand","Stealth","Survival"]},
	Cleric:{count:2, skills:["History","Insight","Medicine","Persuasion","Religion"]},
	Druid:{count:2, skills:["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"]},
	Fighter:{count:2, skills:["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Perception","Survival"]},
	Monk:{count:2, skills:["Acrobatics","Athletics","History","Insight","Religion","Stealth"]},
	Paladin:{count:2, skills:["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"]},
	Ranger:{count:3, skills:["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"]},
	Rogue:{count:4, skills:["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Performance","Persuasion","Sleight of Hand","Stealth"]},
	Sorcerer:{count:2, skills:["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"]},
	Warlock:{count:2, skills:["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"]},
	Wizard:{count:2, skills:["Arcana","History","Insight","Investigation","Medicine","Religion"]},
	Artificer:{count:2, skills:["Arcana","History","Investigation","Medicine","Nature","Perception","Sleight of Hand"]}
};

// Skill em inglês (dados 5etools) -> chave interna
export const SKILL_EN_TO_KEY = {
	"Acrobatics":"acrobacy", "Animal Handling":"animalHandling",
	"Arcana":"arcana", "Athletics":"athletics", "Performance":"performance",
	"Deception":"deception", "Stealth":"stealth", "History":"history",
	"Intimidation":"intimidation", "Insight":"insight", "Investigation":"investigation",
	"Medicine":"medicine", "Nature":"nature", "Perception":"perception",
	"Persuasion":"persuasion", "Sleight of Hand":"sleightOfHand",
	"Religion":"religion", "Survival":"survival"
};

export const SKILL_KEY_TO_PT = {
	"acrobacy":"Acrobacia", "animalHandling":"Adestrar Animais",
	"arcana":"Arcanismo", "athletics":"Atletismo", "performance":"Atuação",
	"deception":"Enganação", "stealth":"Furtividade", "history":"História",
	"intimidation":"Intimidação", "insight":"Intuição", "investigation":"Investigação",
	"medicine":"Medicina", "nature":"Natureza", "perception":"Percepção",
	"persuasion":"Persuasão", "sleightOfHand":"Prestidigitação",
	"religion":"Religião", "survival":"Sobrevivência"
};

export const SKILL_ABIL = {
	"acrobacy":"dex", "animalHandling":"wis", "arcana":"int",
	"athletics":"str", "performance":"cha", "deception":"cha",
	"stealth":"dex", "history":"int", "intimidation":"cha",
	"insight":"wis", "investigation":"int", "medicine":"wis",
	"nature":"int", "perception":"wis", "persuasion":"cha",
	"sleightOfHand":"dex", "religion":"int", "survival":"wis"
};

export const POINT_BUY_COSTS = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
export const POINT_BUY_BUDGET = 27;
export const STANDARD_ARRAY = [15,14,13,12,10,8];

export function calcMod(score) {
	return Math.floor((score - 10) / 2);
}

export function calcProfBonus(level) {
	return Math.ceil(2 + (level - 1) / 4);
}

export function rollAbilityScore() {
	const rolls = [0,1,2,3].map(() => 1 + Math.floor(Math.random() * 6));
	rolls.sort((a,b) => b - a);
	return rolls[0] + rolls[1] + rolls[2];
}

export function rollDice(count, sides) {
	let total = 0;
	for (let i = 0; i < count; i++) total += 1 + Math.floor(Math.random() * sides);
	return total;
}

export function createDefaultCharacter() {
	return {
		id:null, name:"", race:null, className:null, background:null,
		level:1, scores:{str:8,dex:8,con:8,int:8,wis:8,cha:8},
		rawScores:{str:0,dex:0,con:0,int:0,wis:0,cha:0},
		method:"standard", skills:{}, savingThrows:[],
		otherProficiencies:[], hp:{max:0,current:0,temp:0},
		ac:10, initiative:0, speed:30, alignment:"Neutro",
		playerName:"", experience:0, spells:[], features:[],
		equipment:[], inventory:[], notes:"", personality:"",
		ideals:"", bonds:"", flaws:"",
		created:Date.now(), updated:Date.now()
	};
}

export function getRaceAbilities(race) {
	const result = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
	if (!race || !race.ability) return result;
	race.ability.forEach(entry => {
		ABILITY_ABVS.forEach(abv => {
			if (entry[abv] || entry[abv] === 0) result[abv] += entry[abv];
		});
	});
	return result;
}