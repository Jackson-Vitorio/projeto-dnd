// =============================================
// Sistema de Fichas de Personagem - 5eTools
// Versão standalone (sem ES modules)
// =============================================
(function(global) {
	"use strict";

	// === Links para o compêndio (abre ficha do item/magia/talento em suas páginas) ===
	// Formato do hash igual ao 5etools: nome_fonte em minúsculas, URL-encodado, partes com "_" (HASH_LIST_SEP).
	function ptmEnc(str) { return encodeURIComponent(String(str).toLowerCase()).toLowerCase(); }
	function ptmPartsHash(parts) {
		return parts
			.map(function(p) { return ptmEnc(p == null ? "" : String(p).trim()); })
			.filter(function(p) { return p.length > 0; })
			.join("_");
	}
	function ptmNameSrcHref(page, ent) {
		var name = (ent && typeof ent === "object") ? ent.name : ent;
		var src = (ent && typeof ent === "object" && ent.source) ? ent.source : "";
		return page + "#" + ptmPartsHash([name, src]);
	}
	function ptmSpellHref(spell) { return ptmNameSrcHref("spells.html", spell); }
	function ptmItemHref(item) { return ptmNameSrcHref("items.html", item); }
	function ptmFeatHref(feat) { return ptmNameSrcHref("feats.html", feat); }
	function ptmSearchHint() {
		return '<span class="ptm-hint">Toque no nome de um item, arma, armadura ou magia adicionado para abrir a descrição completa.</span>';
	}

	// === Constantes ===
	var ABILITY_ABVS = ["str","dex","con","int","wis","cha"];
	var ABILITY_NAMES = {str:"Força",dex:"Destreza",con:"Constituição",int:"Inteligência",wis:"Sabedoria",cha:"Carisma"};
	var ABILITY_SHORT = {str:"FOR",dex:"DES",con:"CON",int:"INT",wis:"SAB",cha:"CAR"};
	var CLASS_HIT_DICE = {Barbarian:12,Fighter:10,Paladin:10,Ranger:10,Artificer:8,Bard:8,Cleric:8,Druid:8,Monk:8,Rogue:8,Warlock:8,Sorcerer:6,Wizard:6};
	var CLASS_SAVES = {Barbarian:["str","con"],Bard:["dex","cha"],Cleric:["wis","cha"],Druid:["int","wis"],Fighter:["str","con"],Monk:["str","dex"],Paladin:["wis","cha"],Ranger:["str","dex"],Rogue:["dex","int"],Sorcerer:["con","cha"],Warlock:["wis","cha"],Wizard:["int","wis"],Artificer:["con","int"]};
	var SUBCLASS_LEVELS = {Artificer:3,Barbarian:3,Bard:3,Cleric:3,Druid:3,Fighter:3,Monk:3,Paladin:3,Ranger:3,Rogue:3,Sorcerer:3,Warlock:3,Wizard:3};
	var CLASS_SKILLS = {
		Barbarian:{count:2,skills:["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"]},
		Bard:{count:3,skills:["Acrobatics","Animal Handling","Arcana","Athletics","Deception","History","Insight","Intimidation","Investigation","Medicine","Nature","Perception","Performance","Persuasion","Religion","Sleight of Hand","Stealth","Survival"]},
		Cleric:{count:2,skills:["History","Insight","Medicine","Persuasion","Religion"]},
		Druid:{count:2,skills:["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"]},
		Fighter:{count:2,skills:["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Perception","Survival"]},
		Monk:{count:2,skills:["Acrobatics","Athletics","History","Insight","Religion","Stealth"]},
		Paladin:{count:2,skills:["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"]},
		Ranger:{count:3,skills:["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"]},
		Rogue:{count:4,skills:["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Performance","Persuasion","Sleight of Hand","Stealth"]},
		Sorcerer:{count:2,skills:["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"]},
		Warlock:{count:2,skills:["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"]},
		Wizard:{count:2,skills:["Arcana","History","Insight","Investigation","Medicine","Religion"]},
		Artificer:{count:2,skills:["Arcana","History","Investigation","Medicine","Nature","Perception","Sleight of Hand"]}
	};
	var SKILL_EN_TO_KEY = {Acrobatics:"acrobacy","Animal Handling":"animalHandling",Arcana:"arcana",Athletics:"athletics",Performance:"performance",Deception:"deception",Stealth:"stealth",History:"history",Intimidation:"intimidation",Insight:"insight",Investigation:"investigation",Medicine:"medicine",Nature:"nature",Perception:"perception",Persuasion:"persuasion","Sleight of Hand":"sleightOfHand",Religion:"religion",Survival:"survival"};
	var SKILL_KEY_TO_PT = {acrobacy:"Acrobacia",animalHandling:"Adestrar Animais",arcana:"Arcanismo",athletics:"Atletismo",performance:"Atuação",deception:"Enganação",stealth:"Furtividade",history:"História",intimidation:"Intimidação",insight:"Intuição",investigation:"Investigação",medicine:"Medicina",nature:"Natureza",perception:"Percepção",persuasion:"Persuasão",sleightOfHand:"Prestidigitação",religion:"Religião",survival:"Sobrevivência"};
	var SKILLS = [
		{name:"Acrobacia",abil:"dex"},{name:"Adestrar Animais",abil:"wis"},{name:"Arcanismo",abil:"int"},
		{name:"Atletismo",abil:"str"},{name:"Atuação",abil:"cha"},{name:"Enganação",abil:"cha"},
		{name:"Furtividade",abil:"dex"},{name:"História",abil:"int"},{name:"Intimidação",abil:"cha"},
		{name:"Intuição",abil:"wis"},{name:"Investigação",abil:"int"},{name:"Medicina",abil:"wis"},
		{name:"Natureza",abil:"int"},{name:"Percepção",abil:"wis"},{name:"Persuasão",abil:"cha"},
		{name:"Prestidigitação",abil:"dex"},{name:"Religião",abil:"int"},{name:"Sobrevivência",abil:"wis"}
	];
	var POINT_BUY_COSTS = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
	var POINT_BUY_BUDGET = 27;
	var STANDARD_ARRAY = [15,14,13,12,10,8];

	function calcMod(score) { return Math.floor((score - 10) / 2); }
	function calcProfBonus(level) { return 2 + Math.floor((level - 1) / 4); }
	function rollAbilityScore() {
		var rolls = [0,1,2,3].map(function() { return 1 + Math.floor(Math.random() * 6); });
		rolls.sort(function(a,b) { return b - a; });
		return rolls[0] + rolls[1] + rolls[2];
	}
	function getRaceAbilities(race) {
		var result = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
		if (!race) return result;
		var src = race._race || race; // variantes recolhidas carregam a raça real em _race
		if (src.name === "Human" && src.source === "PHB") {
			// Humano PHB: +1 em todos os atributos
			ABILITY_ABVS.forEach(function(a) { result[a] = 1; });
			return result;
		}
		if (!src.ability) return result;
		src.ability.forEach(function(entry) {
			ABILITY_ABVS.forEach(function(abv) { if (entry[abv] || entry[abv] === 0) result[abv] += entry[abv]; });
		});
		return result;
	}
	// Raças modernas sem bônus fixo: o jogador escolhe +2/+1 ou +1/+1/+1 (MPMM/FTD/XPHB/AAG...)
	function isFlexibleRace(x) {
		var src = x && (x._race || x);
		if (!src || (src.ability && src.ability.length)) return false;
		if (src.name === "Human" && src.source === "PHB") return false; // +1 em todos (automático)
		return true;
	}
	function esc(str) {
		if (!str) return "";
		var A = String.fromCharCode(38);
		var LT = String.fromCharCode(60);
		var GT = String.fromCharCode(62);
		var Q = String.fromCharCode(34);
		var AP = String.fromCharCode(39);
		return String(str)
			.replace(/[&<>"']/g, function(m) {
				if (m === A) return A + "amp;";
				if (m === LT) return LT + "t;";
				if (m === GT) return GT + "t;";
				if (m === Q) return Q + "quot;";
				return AP + "#039;";
			});
	}
	function textFromEntries(entries) {
		if (!entries) return "";
		if (typeof entries === "string") return entries;
		if (Array.isArray(entries)) {
			return entries.map(function(e) {
				if (typeof e === "string") return e;
				if (e && typeof e === "object") return e.name || e.text || "";
				return "";
			}).join(" ");
		}
		if (typeof entries === "object") return entries.name || entries.text || "";
		return "";
	}

	// === Store ===
	var STORAGE_KEY = "5etools_characters";
	var CharactersStore = {
		getAll: function() {
			try { var raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
			catch (e) { return []; }
		},
		getById: function(id) { return this.getAll().find(function(c) { return c.id === id; }) || null; },
		save: function(character) {
			var all = this.getAll();
			// Sanitiza o id: só [a-zA-Z0-9_-] é aceito; um id malicioso vindo de
			// importação (.cah adulterado) é descartado, evitando injeção de
			// atributos/HTML via data-id.
			if (character.id != null) {
				var clean = String(character.id).replace(/[^a-zA-Z0-9_-]/g, "");
				if (clean !== String(character.id)) character.id = this._genId();
			}
			if (character.id) {
				var ix = all.findIndex(function(c) { return c.id === character.id; });
				if (ix >= 0) { character.updated = Date.now(); all[ix] = character; }
				else { character.id = this._genId(); character.updated = Date.now(); all.push(character); }
			} else {
				character.id = this._genId(); character.updated = Date.now(); all.push(character);
			}
			this._write(all);
			return character;
		},
		remove: function(id) { this._write(this.getAll().filter(function(c) { return c.id !== id; })); },
		_genId: function() { return "char_" + Date.now() + "_" + Math.random().toString(36).substr(2,9); },
		_write: function(all) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) {} }
	};

	// === UI ===
	var $root = null;
	var currentView = "list";
	var currentChar = null;
	var creationStep = 1;
	var creationData = null;
	var racesData = [];
	var subracesData = [];   // subraças canônicas: {name, source, raceName, raceSource, ability, entries, speed}
	var collapsedRaces = []; // variantes "Raça (X)" recolhidas sob a raça base (ex.: Dragonborn (Chromatic) -> Dragonborn)
	var backgroundsData = [];
	var classesData = [];
	var subclassesData = [];
	var classFeaturesData = [];    // features de classe: {name, className, classSource, level, entries[]}
	var subclassFeaturesData = []; // features de subclasse: idem + subclassShortName/subclassSource
	var selectedSubclass = null;
	var spellsData = [];
	var itemsData = [];
	var featsData = [];
	var currentTab = "overview";
	var sheetReorderActive = false;
	var sheetDrag = null;

				function createDefaultCharacter() {
		return {
			id:null, name:"", race:null, className:null, background:null,
			level:1, scores:{str:8,dex:8,con:8,int:8,wis:8,cha:8},
			rawScores:{str:0,dex:0,con:0,int:0,wis:0,cha:0},
			method:"standard", skills:{}, savingThrows:[],
			otherProficiencies:[], hp:{max:0,current:0,temp:0},
			ac:10, initiative:0, speed:30, speedModifiers:{walk:0,climb:0,fly:0,swim:0,burrow:0},
			alignment:"Neutro", playerName:"", experience:0,
			spells:[], spellSlots:{}, spellAttackBonus:0, spellDC:0,
			features:[], feats:[], specialAbilities:[], selectableFeatures:[],
			equipment:[], weapons:[{name:"Ataque Desarmado", dmg1:"1", dmgType:"Contundente", modifier:"str", equipped:true, isDefault:true}], armors:[], inventory:[],
			coins:{gold:0,silver:0,copper:0,platinum:0,electrum:0},
			conditions:[], inspiration:false, deathSaves:{failures:0,successes:0},
			notes:"", personality:"", ideals:"", bonds:"", flaws:"",
			advantages:[], disadvantages:[], companion:null,
			passivePerception:10, created:Date.now(), updated:Date.now(),
			languages:[], fightingStyle:null, choices:{}, takenChoices:[], // escolhas (nível + criação)
			classes: [] // <-- novo: lista de classes (suporta multiclasse desde a criação)
		};
	}

	function computeDerived(char) {
		var result = JSON.parse(JSON.stringify(char));
		var hd = CLASS_HIT_DICE[result.className] || 8;
		var conMod = calcMod((result.scores.con || 8) + (result.rawScores.con || 0));
		result.hp.max = hd + conMod;
		result.hp.current = result.hp.current || result.hp.max;
		result.ac = 10 + calcMod((result.scores.dex || 8) + (result.rawScores.dex || 0));
		result.initiative = calcMod((result.scores.dex || 8) + (result.rawScores.dex || 0));
		return result;
	}

	// === Views ===
	function renderList() {
		var chars = CharactersStore.getAll();
		var html = '<div class="characters__view">';
		html += '<div class="characters__list-header">';
		html += '<h2 class="characters__list-title">Suas Fichas</h2>';
		html += '<button class="characters__btn characters__btn--primary" id="btn-new">+ Nova Ficha</button>';
		html += '<label class="characters__btn characters__btn--secondary" style="cursor:pointer">📤 Importar .cah<input type="file" id="btn-import" accept=".cah,.json" style="display:none"></label>';
		html += '</div><div id="char-list">';

		if (!chars.length) {
			html += '<div class="characters__empty">';
			html += '<div class="characters__empty-icon"><span class="glyphicon glyphicon-user"></span></div>';
			html += '<div class="characters__empty-title">Nenhuma ficha criada</div>';
			html += '<div class="characters__empty-text">Crie seu primeiro personagem de D&D 5e!</div>';
			html += '<button class="characters__btn characters__btn--primary characters__btn-full" id="btn-new-empty">+ Criar Personagem</button>';
			html += '</div>';
		} else {
			html += '<div class="characters__grid">';
			chars.forEach(function(char) {
				html += '<div class="characters__card" data-id="' + esc(char.id) + '">';
				html += '<div class="characters__card-name">' + esc(char.name || "Sem nome") + '</div>';
				html += '<div class="characters__card-info">' + esc(char.className || "—") + ' • Nível ' + (char.level || 1) + '</div>';
				html += '<div class="characters__card-info">' + esc(char.race ? char.race.name : "—") + (char.raceSubrace ? " (" + esc(char.raceSubrace.label || char.raceSubrace.name) + ")" : "") + ' • ' + esc(char.background || "—") + '</div>';
				html += '<span class="characters__card-level">Nv. ' + (char.level || 1) + '</span>';
				html += '<div class="characters__card-actions">';
				html += '<button class="characters__btn characters__btn--primary" data-action="open">Abrir</button>';
				html += '<button class="characters__btn characters__btn--danger" data-action="delete">Excluir</button>';
				html += '</div></div>';
			});
			html += '</div>';
		}

		html += '</div></div>';
		$root.html(html);

		$root.find("#btn-new, #btn-new-empty").on("click", startCreation);
		$root.find(".characters__card").on("click", function(e) {
			var action = $(e.target).data("action");
			var id = $(this).data("id");
			if (action === "open") openCharacter(id);
			else if (action === "delete") deleteCharacter(id);
			else openCharacter(id);
		});
		
		// Importar ficha
		$root.find("#btn-import").on("change", function(e) {
			var file = e.target.files[0];
			if (!file) return;
			var reader = new FileReader();
			reader.onload = function(event) {
				try {
					var imported = JSON.parse(event.target.result);
					importCharacter(imported);
				} catch (err) {
					alert("Erro ao importar arquivo: " + err.message);
				}
			};
			reader.readAsText(file);
		});
	}

	function startCreation() {
		currentView = "create";
		creationStep = 1;
		creationData = createDefaultCharacter();
		renderCreation();
	}

	function renderCreation() {
		var steps = ["Básico","Raça","Classe","Antecedente","Idiomas & Itens","Atributos","Perícias","Finalizar"];
		var html = '<div class="characters__view"><div class="characters__steps">';
		steps.forEach(function(s, ix) {
			var n = ix + 1;
			var cls = n === creationStep ? "active" : (n < creationStep ? "completed" : "");
			html += '<div class="characters__step ' + cls + '"><span class="characters__step-number">' + n + '</span>' + s + '</div>';
		});
		html += '</div><div class="characters__form" id="char-form"></div></div>';
		$root.html(html);

		var $form = $root.find("#char-form");
		switch (creationStep) {
			case 1: stepBasics($form); break;
			case 2: stepRace($form); break;
			case 3: stepClass($form); break;
			case 4: stepBackground($form); break;
			case 5: stepLangGear($form); break;
			case 6: stepAbilities($form); break;
			case 7: stepSkills($form); break;
			case 8: stepFinish($form); break;
		}
	}

	function stepBasics($form) {
		var d = creationData;
		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Informações Básicas</h3>';
		html += '<div class="characters__form-row"><div class="characters__form-group"><label class="characters__form-label">Nome do Personagem *</label>';
		html += '<input type="text" class="characters__form-input" id="in-name" value="' + esc(d.name) + '" placeholder="Ex: Aric Sombraluna"></div>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Nome do Jogador</label>';
		html += '<input type="text" class="characters__form-input" id="in-player" value="' + esc(d.playerName) + '" placeholder="Seu nome"></div></div>';
		html += '<div class="characters__form-row"><div class="characters__form-group"><label class="characters__form-label">Alinhamento</label>';
		html += '<select class="characters__form-select" id="in-align">';
		["Leal e Bom","Neutro e Bom","Caótico e Bom","Leal e Neutro","Neutro","Caótico e Neutro","Leal e Mau","Neutro e Mau","Caótico e Mau"].forEach(function(a) {
			html += '<option value="' + a + '"' + (d.alignment === a ? " selected" : "") + '>' + a + '</option>';
		});
		html += '</select></div></div>';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);

		$form.find("#btn-next").on("click", function() {
			var name = $form.find("#in-name").val().trim();
			if (!name) { alert("Informe o nome!"); return; }
			d.name = name;
			d.playerName = $form.find("#in-player").val().trim();
			d.alignment = $form.find("#in-align").val();
			creationStep = 2;
			renderCreation();
		});
	}

	function stepRace($form) {
		var d = creationData;
		var races = racesData; // uma entrada por nome; as versões de fonte vão como sublista

		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha a Raça</h3>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Raça</label>';
		html += '<select class="characters__form-select" id="in-race"><option value="">Selecione...</option>';
		// Uma única opção por nome (sem repetidos com sigla). Variantes colapsadas
		// (ex.: "Dragonborn (Chromatic)", "Human (Ixalan)") NÃO geram linha própria.
		var seenRace = {};
		var collapsedNames = {};
		collapsedRaces.forEach(function(c) {
			var full = (c.race && c.race.name) ? c.race.name : (c.base + " (" + c.label + ")");
			collapsedNames[full.toLowerCase()] = true;
		});
		races.forEach(function(r) {
			var rk = (r.name || "").toLowerCase();
			if (collapsedNames[rk]) return; // "Dragonborn (Chromatic)" entra na sublista de Dragonborn
			if (seenRace[rk]) return;
			seenRace[rk] = true;
			html += '<option value="' + esc(r.name) + '">' + esc(r.name) + '</option>';
		});
		html += '</select></div>';
		// Sublista de versão de fonte: aparece só se há mais de uma (ex.: MPMM/DMG)
		html += '<div id="race-versions" class="characters__version-list" style="display:none"></div>';
		// Sublista de subraça: só quando raça+fonte tem >1 subraça (ex.: Elfo -> Drow/Alto/Silvestre)
		html += '<div id="race-subraces" class="characters__subvariant-list" style="display:none"></div>';
		// Bônus flexíveis (+2/+1 ou +1/+1/+1) para raças modernas (MPMM/FTD/XPHB...)
		html += '<div id="race-flex" class="characters__flex-box" style="display:none"></div>';
		html += '<div id="info-race" class="characters__summary-box"></div>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);

		var pickedSource = null;
		var pickedSubrace = null;

		// Variantes de fonte: raça base + variantes recolhidas (Dragonborn+FTD)
		var getRaceVariants = function(name) {
			var vrs = getVariants(races, name);
			getCollapsedSubraces(name).forEach(function(c) {
				if (!vrs.some(function(v) { return v.source === c.source; })) {
					vrs.push({name: name, source: c.source, _collapsed: true});
				}
			});
			return vrs;
		};

		var currentVariant = function() {
			var name = $form.find("#in-race").val();
			if (!name) return null;
			var variants = getRaceVariants(name);
			if (!variants.length) return null;
			var v = variants.length === 1 ? variants[0] : (variants.find(function(vv) { return vv.source === pickedSource; }) || variants[0]);
			// Variante recolhida: trazer dados reais (entradas, deslocamento, bônus)
			if (v && v._collapsed) {
				var c = getCollapsedSubraces(name).find(function(cc) { return cc.source === v.source; });
				if (c && c.race) return $.extend({}, c.race, {name: name, source: v.source, _collapsedLabel: c.label});
			}
			return v;
		};

		var currentSubrace = function() {
			var name = $form.find("#in-race").val();
			// Subraça só é aplicada se o jogador escolher uma explicitamente (padrão: Nenhuma)
			if (!name || !pickedSource || !pickedSubrace) return null;
			var subs = getSubracesFor(name, pickedSource);
			return subs.find(function(s) { return (s.label || s.name) === pickedSubrace; }) || null;
		};

		// Distribuição de bônus flexíveis (+2/+1 ou +1/+1/+1)
		var flexPicks = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
		var flexReset = function() { ABILITY_ABVS.forEach(function(a) { flexPicks[a] = 0; }); };
		var flexValidPattern = function(picks) {
			var nz = ABILITY_ABVS.map(function(a) { return picks[a] || 0; }).filter(function(v) { return v > 0; }).sort(function(a, b) { return b - a; });
			var sum = nz.reduce(function(s, v) { return s + v; }, 0);
			if (sum !== 3) return false;
			return nz.join("") === "21" || nz.join("") === "111";
		};
		var updateFlexHint = function() {
			var sum = ABILITY_ABVS.reduce(function(s, a) { return s + (flexPicks[a] || 0); }, 0);
			var left = 3 - sum;
			var msg;
			if (left === 0) msg = flexValidPattern(flexPicks) ? "Distribuição válida!" : "Escolha +2/+1 (dois atributos) ou +1/+1/+1 (três atributos).";
			else if (left > 0) msg = "Faltam " + left + " ponto(s) para distribuir.";
			else msg = "Passou de 3 pontos!";
			$form.find("#flex-hint").text(msg);
		};
		var renderFlexBox = function(race) {
			var $box = $form.find("#race-flex");
			if (!race || !isFlexibleRace(race)) { $box.empty().hide(); $box.removeData("flexKey"); return; }
			var flexKey = (race.name || "") + "|" + (race.source || "") + "|" + (race._collapsedLabel || "");
			// Já renderizado para esta raça? Sincroniza os valores sem recriar o DOM
			// (recriar a cada mudança perde o foco/scroll no toque e órfã referências)
			if ($box.data("flexKey") === flexKey && $box.find("select[data-flex]").length === ABILITY_ABVS.length) {
				$box.find("select[data-flex]").each(function() {
					var a = $(this).data("flex");
					$(this).val(String(flexPicks[a] || 0));
				});
				updateFlexHint();
				return;
			}
			$box.data("flexKey", flexKey);
			var h = '<span class="characters__subvariant-label">Bônus à escolha (+2/+1 ou +1/+1/+1):</span>';
			h += '<div class="characters__flex-grid">';
			ABILITY_ABVS.forEach(function(a) {
				h += '<label class="characters__flex-item">' + ABILITY_SHORT[a] + ' ';
				h += '<select data-flex="' + a + '" class="characters__form-select characters__form-select--sm">';
				[0, 1, 2].forEach(function(v) {
					h += '<option value="' + v + '"' + (flexPicks[a] === v ? " selected" : "") + '>' + (v ? "+" + v : "—") + '</option>';
				});
				h += '</select></label>';
			});
			h += '</div><div class="characters__flex-hint" id="flex-hint"></div>';
			$box.html(h).show();
			updateFlexHint();
		};

		var rerenderVersions = function() {
			var name = $form.find("#in-race").val();
			var variants = getRaceVariants(name);
			var $box = $form.find("#race-versions");
			if (variants.length <= 1) {
				$box.empty().hide();
				pickedSource = variants.length ? variants[0].source : null;
				return;
			}
			if (!variants.some(function(v) { return v.source === pickedSource; })) pickedSource = variants[0].source;
			var h = '';
			variants.forEach(function(v) {
				var checked = v.source === pickedSource;
				h += '<label class="characters__version' + (checked ? " is-checked" : "") + '"><input type="radio" name="race-source" value="' + esc(v.source) + '"' + (checked ? " checked" : "") + '> ' + esc(v.source) + '</label>';
			});
			$box.html('<span class="characters__version-label">Versão:</span>' + h).show();
		};

		var rerenderSubraces = function() {
			var name = $form.find("#in-race").val();
			var $box = $form.find("#race-subraces");
			if (!name || !pickedSource) { $box.empty().hide(); pickedSubrace = null; return; }
			var subs = getSubracesFor(name, pickedSource);
			if (subs.length < 1) {
				$box.empty().hide();
				pickedSubrace = null;
				return;
			}
			if (!subs.some(function(s) { return (s.label || s.name) === pickedSubrace; })) pickedSubrace = null;
			// "Nenhuma" como padrão: subraça é opcional (ex.: Humano PHB não tem subraça)
			var h = '<label class="characters__subvariant' + (!pickedSubrace ? " is-checked" : "") + '"><input type="radio" name="race-subrace" value=""' + (!pickedSubrace ? " checked" : "") + '> Nenhuma</label>';
			subs.forEach(function(s) {
				var lab = s.label || s.name;
				var checked = lab === pickedSubrace;
				h += '<label class="characters__subvariant' + (checked ? " is-checked" : "") + '"><input type="radio" name="race-subrace" value="' + esc(lab) + '"' + (checked ? " checked" : "") + '> ' + esc(lab) + '</label>';
			});
			$box.html('<span class="characters__subvariant-label">Subraça:</span>' + h).show();
		};

		var updateInfo = function() {
			var race = currentVariant();
			if (!race) { $form.find("#info-race").empty(); $form.find("#race-flex").empty().hide().removeData("flexKey"); return; }
			var sub = currentSubrace();
			renderFlexBox(race);
			var abils = getRaceAbilities(race);
			var subAbils = sub ? getRaceAbilities(sub) : {};
			if (isFlexibleRace(race)) ABILITY_ABVS.forEach(function(a) { abils[a] = (abils[a] || 0) + (flexPicks[a] || 0); });
			var eff = {};
			ABILITY_ABVS.forEach(function(a) { eff[a] = (abils[a] || 0) + (subAbils[a] || 0); });
			var abilStr = ABILITY_ABVS.filter(function(a) { return eff[a]; }).map(function(a) { return ABILITY_SHORT[a] + " +" + eff[a]; }).join(", ");
			if (isFlexibleRace(race) && !flexValidPattern(flexPicks)) abilStr = (abilStr ? abilStr + " " : "") + "(distribua os bônus à escolha acima)";
			var speed = resolveRaceSpeed({race: race, raceSubrace: sub});
			var sizeName = {S:"Pequeno",M:"Médio",L:"Grande"}[race.size ? race.size[0] : "M"] || "Médio";
			var entries = [];
			var collect = function(eArr) {
				(eArr || []).forEach(function(e) {
					var txt = textFromEntries(e.entries || [e]);
					entries.push(e.name ? "<b>" + esc(e.name) + ":</b> " + esc(txt) : esc(txt));
				});
			};
			collect(race.entries);
			if (sub && sub !== race) collect(sub.entries);
			var info = '<div class="characters__summary-title">' + esc(race.name) + '</div>';
			if (variantCount(races, race.name) > 1 && race.source) info += '<div><b>Fonte:</b> ' + esc(race.source) + '</div>';
			if (sub && (sub.label || sub.name)) info += '<div><b>Subraça:</b> ' + esc(sub.label || sub.name) + '</div>';
			info += '<div><b>Tamanho:</b> ' + sizeName + ' | <b>Deslocamento:</b> ' + speed + ' pés</div>';
			if (abilStr) info += '<div><b>Bônus:</b> ' + abilStr + '</div>';
			if (entries.length) info += '<div class="mt-2">' + entries.join("<br>") + '</div>';
			$form.find("#info-race").html(info);
		};

		$form.find("#in-race").on("change", function() {
			pickedSource = null;
			pickedSubrace = null;
			flexReset();
			rerenderVersions();
			rerenderSubraces();
			updateInfo();
		});
		$form.find("#race-versions").on("change", "input[type=radio]", function() {
			pickedSource = $(this).val();
			pickedSubrace = null;
			flexReset();
			$form.find("#race-versions").find("label.characters__version").removeClass("is-checked");
			$(this).closest("label").addClass("is-checked");
			rerenderSubraces();
			updateInfo();
		});
		$form.find("#race-subraces").on("change", "input[type=radio]", function() {
			// value "" = "Nenhuma" (sem subraça)
			pickedSubrace = $(this).val() || null;
			$form.find("#race-subraces").find("label.characters__subvariant").removeClass("is-checked");
			$(this).closest("label").addClass("is-checked");
			updateInfo();
		});
		// Bônus raciais à escolha (raças flexíveis)
		$form.on("change", "#race-flex select[data-flex]", function() {
			flexPicks[$(this).data("flex")] = parseInt($(this).val(), 10) || 0;
			updateFlexHint();
			updateInfo();
		});
		if (d.race && d.race.name) {
			$form.find("#in-race").val(d.race.name);
			pickedSource = d.raceSource || d.race.source || null;
			pickedSubrace = d.raceSubrace ? (d.raceSubrace.label || d.raceSubrace.name) : null;
			if (d.flexPicks) ABILITY_ABVS.forEach(function(a) { flexPicks[a] = d.flexPicks[a] || 0; });
			rerenderVersions();
			rerenderSubraces();
		}
		updateInfo();

		$form.find("#btn-prev").on("click", function() { creationStep = 1; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			var race = currentVariant();
			if (!race) { alert("Selecione uma raça!"); return; }
			var sub = currentSubrace();
			// Raças flexíveis: exigir padrão válido (+2/+1 ou +1/+1/+1) antes de avançar
			if (isFlexibleRace(race) && !flexValidPattern(flexPicks)) {
				alert("Distribua os bônus raciais à escolha: +2/+1 (dois atributos) ou +1/+1/+1 (três atributos).");
				return;
			}
			d.race = race;
			d.raceSource = race.source;
			d.raceSubrace = sub;
			d.raceSubraceName = sub ? (sub.label || sub.name) : null;
			// Recalcular (não acumular) os bônus raciais + de subraça + à escolha
			var abils = getRaceAbilities(race);
			var subAbils = sub ? getRaceAbilities(sub) : {};
			if (isFlexibleRace(race)) ABILITY_ABVS.forEach(function(a) { abils[a] = (abils[a] || 0) + (flexPicks[a] || 0); });
			ABILITY_ABVS.forEach(function(a) { d.rawScores[a] = (abils[a] || 0) + (subAbils[a] || 0); });
			if (isFlexibleRace(race)) d.flexPicks = $.extend({}, flexPicks); else delete d.flexPicks;
			creationStep = 3;
			renderCreation();
		});
}

	function stepClass($form) {
		var d = creationData;
		var classes = classesData; // já ordenado e com tags de fonte (versões repetidas)

		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha a Classe</h3>';
		html += '<div class="characters__form-row"><div class="characters__form-group"><label class="characters__form-label">Classe</label>';
		html += '<select class="characters__form-select" id="in-class"><option value="">Selecione...</option>';
		// Uma única opção por nome (sem repetidos com sigla)
		var seenClass = {};
		classes.forEach(function(c) {
			var ck = (c.name || "").toLowerCase();
			if (seenClass[ck]) return;
			seenClass[ck] = true;
			var sel = d.className && d.className === c.name ? " selected" : "";
			html += '<option value="' + esc(c.name) + '"' + sel + '>' + esc(c.name) + '</option>';
		});
		html += '</select></div>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Nível</label>';
		html += '<input type="number" class="characters__form-input" id="in-level" min="1" max="20" value="' + (d.level || 1) + '"></div></div>';
		// Sublista de versão de fonte (aparece só se há mais de uma, ex.: PHB/XPHB)
		html += '<div id="class-versions" class="characters__version-list" style="display:none"></div>';
		html += '<div id="info-class" class="characters__summary-box"></div>';
		
		// Seletor de subclasse (sempre criado, mas escondido)
		html += '<div class="characters__form-group mt-2" id="subclass-group" style="display:none"><label class="characters__form-label">Subclasse</label>';
		html += '<select class="characters__form-select" id="in-subclass"><option value="">Selecione...</option></select></div>';
		
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);

		var pickedClassSource = null;
		var curClassName = "";

		var currentClassVariant = function() {
			var name = $form.find("#in-class").val();
			if (!name) return null;
			var variants = getVariants(classesData, name);
			if (!variants.length) return null;
			if (variants.length === 1) return variants[0];
			var chosen = variants.find(function(v) { return v.source === pickedClassSource; });
			return chosen || variants[0];
		};

		var rerenderClassVersions = function() {
			var name = $form.find("#in-class").val();
			var variants = getVariants(classesData, name);
			var $box = $form.find("#class-versions");
			if (variants.length <= 1) {
				$box.empty().hide();
				pickedClassSource = variants.length ? variants[0].source : null;
				return;
			}
			if (!variants.some(function(v) { return v.source === pickedClassSource; })) pickedClassSource = variants[0].source;
			var h = '';
			variants.forEach(function(v) {
				var checked = v.source === pickedClassSource;
				h += '<label class="characters__version' + (checked ? " is-checked" : "") + '"><input type="radio" name="class-source" value="' + esc(v.source) + '"' + (checked ? " checked" : "") + '> ' + esc(v.source) + '</label>';
			});
			$box.html('<span class="characters__version-label">Versão:</span>' + h).show();
		};

		var updateInfo = function() {
			var cls = currentClassVariant();
			if (!cls) { $form.find("#info-class").empty(); return; }
			var hd = CLASS_HIT_DICE[cls.name] || 8;
			var saves = (CLASS_SAVES[cls.name] || []).map(function(s) { return ABILITY_NAMES[s]; }).join(", ");
			var sk = CLASS_SKILLS[cls.name];
			var info = '<div class="characters__summary-title">' + esc(cls.name) + '</div>';
			if (variantCount(classesData, cls.name) > 1 && cls.source) info += '<div><b>Fonte:</b> ' + esc(cls.source) + '</div>';
			info += '<div><b>Dado de Vida:</b> d' + hd + '</div>';
			info += '<div><b>Testes de Resistência:</b> ' + saves + '</div>';
			if (sk) info += '<div><b>Perícias:</b> Escolha ' + sk.count + ' de: ' + esc(sk.skills.join(", ")) + '</div>';
			$form.find("#info-class").html(info);
		};

		$form.find("#in-class").on("change", function() {
			var nm = $form.find("#in-class").val();
			// Não resetear a fonte escolhida em re-triggers (prefill/repopular subclasse)
			if (nm !== curClassName) pickedClassSource = null;
			curClassName = nm;
			rerenderClassVersions();
			updateInfo();
		});
		$form.find("#class-versions").on("change", "input[type=radio]", function() {
			pickedClassSource = $(this).val();
			$form.find("#class-versions").find("label.characters__version").removeClass("is-checked");
			$(this).closest("label").addClass("is-checked");
			updateInfo();
		});
		if (d.className) {
			$form.find("#in-class").val(d.className);
			curClassName = d.className;
			pickedClassSource = d.classSource || null;
			rerenderClassVersions();
		}
		updateInfo();

		$form.find("#btn-prev").on("click", function() { creationStep = 2; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			var clsVal = $form.find("#in-class").val();
			var cls = currentClassVariant();
			if (!cls) { alert("Selecione uma classe!"); return; }
			var clsName = cls.name;
					d._classValue = cls._value || cls.name;
			d.classSource = cls.source;
			d.level = parseInt($form.find("#in-level").val()) || 1;
			d.className = clsName;
			var hd = CLASS_HIT_DICE[clsName] || 8;
			var conMod = calcMod((d.scores.con || 8) + (d.rawScores.con || 0));
			d.hp.max = hd + conMod + (d.level - 1) * (Math.floor(hd / 2) + 1 + conMod);
			d.hp.current = d.hp.max;
			d.savingThrows = CLASS_SAVES[clsName] || [];
			d.classes = [{name: clsName, subclass: d.subclass || "", level: d.level}];

			// Verificar se precisa escolher subclasse
			var subclassLevel = SUBCLASS_LEVELS[clsName] || 3;
			if (d.level >= subclassLevel) {
				var subclassId = $form.find("#in-subclass").val();
				if (!subclassId || subclassId === "") {
					alert("Selecione uma subclasse para continuar!\nNível " + d.level + " requer subclasse.");
					return;
				}
				d.subclass = subclassId;
			}

			creationStep = 4;
			renderCreation();
		});

		// Atualizar seletor de subclasses quando classe mudar
		$form.find("#in-class").on("change", function() {
			var clsValRaw = $form.find("#in-class").val();
			var clsFound = findByValue(classesData, clsValRaw);
			var clsName = clsFound ? clsFound.name : clsValRaw;
			var $subclassGroup = $form.find("#subclass-group");
			var $subclassSelect = $form.find("#in-subclass");
			
			// Se o dropdown não existir, não faz nada
			if ($subclassSelect.length === 0) {
				return;
			}
			
			// Resetar valor
			$subclassSelect.val("");
			
			if (!clsName) {
				$subclassGroup.hide();
				return;
			}
			
			// Verificar se precisa de subclasse baseado no nível
			var currentLevel = parseInt($form.find("#in-level").val()) || 1;
			var subclassLevel = SUBCLASS_LEVELS[clsName] || 3;
			
			if (currentLevel < subclassLevel) {
				$subclassGroup.hide();
				return;
			}
			
			// Carregar subclasses da classe selecionada
			var classSubclasses = subclassesData.filter(function(sc) { 
				return sc._classNameEN === clsName;
			});
			
			// Manter TODAS as versões; duplicatas (mesmo nome, fontes diferentes)
			// recebem a sigla da fonte e valor único "Nome|FONTE"
			classSubclasses.sort(function(a, b) {
				return String(a.name).localeCompare(String(b.name)) || srcRank(a.source || "") - srcRank(b.source || "");
			});
			
			// Popular dropdown
			$subclassSelect.empty();
			$subclassSelect.append('<option value="">Selecione...</option>');
			classSubclasses.forEach(function(sc) {
				var isDup = classSubclasses.filter(function(o) {
					return (o.name || "").toLowerCase() === (sc.name || "").toLowerCase();
				}).length > 1;
				var subclassId = isDup ? (sc.name + "|" + (sc.source || "")) : sc.name;
				var label = isDup ? (sc.name + " [" + sc.source + "]") : sc.name;
				var sel = d.subclass === subclassId ? " selected" : "";
				$subclassSelect.append('<option value="' + esc(subclassId) + '"' + sel + '>' + esc(label) + '</option>');
			});
			
			// Mostrar grupo
			$subclassGroup.show();
		});
		
		// Atualizar subclasse quando nível mudar
		$form.find("#in-level").on("change", function() {
			var clsValRaw = $form.find("#in-class").val();
			var clsFound = findByValue(classesData, clsValRaw);
			var clsName = clsFound ? clsFound.name : clsValRaw;
			var $subclassGroup = $form.find("#subclass-group");
			var $subclassSelect = $form.find("#in-subclass");
			
			if (!clsName || $subclassSelect.length === 0) return;
			
			var currentLevel = parseInt($(this).val()) || 1;
			var subclassLevel = SUBCLASS_LEVELS[clsName] || 3;
			
			if (currentLevel >= subclassLevel) {
				// Trigger change para popular dropdown
				$form.find("#in-class").trigger("change");
			} else {
				$subclassGroup.hide();
			}
		});
	// Pré-cargar subclasses ao voltar atrás (popula o seletor com a classe guardada)
		if (d.className) {
			$form.find("#in-class").trigger("change");
		}
	}

	function stepBackground($form) {
		var d = creationData;
		var bgs = backgroundsData; // uma entrada por nome; versões de fonte em sublista

		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha o Antecedente</h3>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Antecedente</label>';
		html += '<select class="characters__form-select" id="in-bg"><option value="">Selecione...</option>';
		// Uma única opção por nome (sem repetidos com sigla)
		var seenBg = {};
		bgs.forEach(function(b) {
			var bk = (b.name || "").toLowerCase();
			if (seenBg[bk]) return;
			seenBg[bk] = true;
			var sel = d.background && d.background === b.name ? " selected" : "";
			html += '<option value="' + esc(b.name) + '"' + sel + '>' + esc(b.name) + '</option>';
		});
		html += '</select></div>';
		// Sublista de versão de fonte (só se há mais de uma)
		html += '<div id="bg-versions" class="characters__version-list" style="display:none"></div>';
		html += '<div id="info-bg" class="characters__summary-box"></div>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);

		var pickedBgSource = null;

		var currentBgVariant = function() {
			var name = $form.find("#in-bg").val();
			if (!name) return null;
			var variants = getVariants(backgroundsData, name);
			if (!variants.length) return null;
			if (variants.length === 1) return variants[0];
			var chosen = variants.find(function(v) { return v.source === pickedBgSource; });
			return chosen || variants[0];
		};

		var rerenderBgVersions = function() {
			var name = $form.find("#in-bg").val();
			var variants = getVariants(backgroundsData, name);
			var $box = $form.find("#bg-versions");
			if (variants.length <= 1) {
				$box.empty().hide();
				pickedBgSource = variants.length ? variants[0].source : null;
				return;
			}
			if (!variants.some(function(v) { return v.source === pickedBgSource; })) pickedBgSource = variants[0].source;
			var h = '';
			variants.forEach(function(v) {
				var checked = v.source === pickedBgSource;
				h += '<label class="characters__version' + (checked ? " is-checked" : "") + '"><input type="radio" name="bg-source" value="' + esc(v.source) + '"' + (checked ? " checked" : "") + '> ' + esc(v.source) + '</label>';
			});
			$box.html('<span class="characters__version-label">Versão:</span>' + h).show();
		};

		var updateInfo = function() {
			var bg = currentBgVariant();
			if (!bg) { $form.find("#info-bg").empty(); return; }
			var info = '<div class="characters__summary-title">' + esc(bg.name) + '</div>';
			if (variantCount(backgroundsData, bg.name) > 1 && bg.source) info += '<div><b>Fonte:</b> ' + esc(bg.source) + '</div>';
			var entries = bg.entries ? bg.entries.map(function(e) {
				var txt = textFromEntries(e.entries || [e]);
				return e.name ? "<b>" + esc(e.name) + ":</b> " + esc(txt) : esc(txt);
			}).join("<br>") : "";
			if (entries) info += '<div class="mt-2">' + entries + '</div>';
			$form.find("#info-bg").html(info);
		};

		$form.find("#in-bg").on("change", function() {
			pickedBgSource = null;
			rerenderBgVersions();
			updateInfo();
		});
		$form.find("#bg-versions").on("change", "input[type=radio]", function() {
			pickedBgSource = $(this).val();
			$form.find("#bg-versions").find("label.characters__version").removeClass("is-checked");
			$(this).closest("label").addClass("is-checked");
			updateInfo();
		});
		if (d.background) {
			$form.find("#in-bg").val(d.background);
			pickedBgSource = d.bgSource || null;
			rerenderBgVersions();
		}
		updateInfo();

		$form.find("#btn-prev").on("click", function() { creationStep = 3; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			var bg = currentBgVariant();
			if (!bg) { alert("Selecione um antecedente!"); return; }
			d._bgValue = bg._value || bg.name;
			d.bgSource = bg.source;
			d.background = bg.name;
			creationStep = 5;
			renderCreation();
		});
	}

	// === ETAPA 5: IDIOMAS, FERRAMENTAS & EQUIPAMENTO INICIAL ===
	var LANG_KEY_TO_PT = {
		common: "Comum", dwarvish: "Anão", elvish: "Élfico", giant: "Gigante",
		gnomish: "Gnômico", goblin: "Goblin", halfling: "Halfling", orc: "Orc",
		abyssal: "Abissal", celestial: "Celestial", infernal: "Infernal",
		primordial: "Primordial", sylvan: "Silvestre", undercommon: "Subterrâneo",
		draconic: "Dracônico", auran: "Primordial (Áurico)", aquan: "Primordial (Aquan)",
		ignan: "Primordial (Ignan)", terran: "Primordial (Terran)", deep: "Subterrâneo (Profundo)"
	};
	var LANG_STANDARD = ["Comum","Anão","Élfico","Gigante","Gnômico","Goblin","Halfling","Orc","Dracônico","Abissal","Celestial","Infernal","Primordial","Silvestre","Subterrâneo"];
	// Equipamento inicial por classe (PHB 2014); grupos com escolha + itens fixos
	var CLASS_STARTERS = {
		Barbarian: {auto: ["Pacote do Explorador", "4 azagaias"], groups: [
			{q: "Arma principal", opts: ["Machado grande (greataxe)", "Qualquer arma marcial corpo a corpo"]},
			{q: "Armas secundárias", opts: ["2 machadinhas (handaxe)", "Qualquer arma simples"]}
		]},
		Bard: {auto: ["Armadura de couro", "Alaúde (ou qualquer instrumento musical)"], groups: [
			{q: "Arma principal", opts: ["Rapieira", "Espada longa", "Qualquer arma simples"]},
			{q: "Pacote", opts: ["Pacote do Diplomata", "Pacote do Artista"]}
		]},
		Cleric: {auto: ["Escudo", "Símbolo sagrado"], groups: [
			{q: "Arma principal", opts: ["Maça", "Marreta de guerra (se proficiente)"]},
			{q: "Armadura", opts: ["Cota de escamas (scale mail)", "Armadura de couro", "Cota de malha (se proficiente)"]},
			{q: "Arma à distância", opts: ["Besta leve + 20 virotes", "Qualquer arma simples"]},
			{q: "Pacote", opts: ["Pacote do Sacerdote", "Pacote do Explorador"]}
		]},
		Druid: {auto: ["Armadura de couro", "Pacote do Explorador", "Foco druídico"], groups: [
			{q: "Escudo ou arma", opts: ["Escudo de madeira", "Qualquer arma simples"]},
			{q: "Arma corpo a corpo", opts: ["Cimitarra", "Qualquer arma simples corpo a corpo"]}
		]},
		Fighter: {auto: [], groups: [
			{q: "Armadura", opts: ["Cota de malha", "Armadura de couro + arco longo + 20 flechas"]},
			{q: "Armas marciais", opts: ["1 arma marcial + escudo", "2 armas marciais"]},
			{q: "Arma à distância", opts: ["Besta leve + 20 virotes", "2 machadinhas"]},
			{q: "Pacote", opts: ["Pacote de Masmorra", "Pacote do Explorador"]}
		]},
		Monk: {auto: ["10 dardos (darts)"], groups: [
			{q: "Arma", opts: ["Espada curta", "Qualquer arma simples"]},
			{q: "Pacote", opts: ["Pacote de Masmorra", "Pacote do Explorador"]}
		]},
		Paladin: {auto: ["Cota de malha", "Símbolo sagrado"], groups: [
			{q: "Armas marciais", opts: ["1 arma marcial + escudo", "2 armas marciais"]},
			{q: "Arma à distância", opts: ["5 azagaias", "Qualquer arma simples corpo a corpo"]},
			{q: "Pacote", opts: ["Pacote do Sacerdote", "Pacote do Explorador"]}
		]},
		Ranger: {auto: ["Arco longo + 20 flechas"], groups: [
			{q: "Armadura", opts: ["Cota de escamas (scale mail)", "Armadura de couro"]},
			{q: "Armas corpo a corpo", opts: ["2 espadas curtas", "2 armas simples corpo a corpo"]},
			{q: "Pacote", opts: ["Pacote de Masmorra", "Pacote do Explorador"]}
		]},
		Rogue: {auto: ["Armadura de couro", "2 adagas", "Ferramentas de ladrão"], groups: [
			{q: "Arma principal", opts: ["Rapieira", "Espada curta"]},
			{q: "Arma à distância", opts: ["Arco curto + 20 flechas", "Espada curta"]},
			{q: "Pacote", opts: ["Pacote do Ladrão (burglar)", "Pacote de Masmorra", "Pacote do Explorador"]}
		]},
		Sorcerer: {auto: ["2 adagas"], groups: [
			{q: "Arma à distância", opts: ["Besta leve + 20 virotes", "Qualquer arma simples"]},
			{q: "Componentes", opts: ["Bolsa de componentes", "Foco arcano"]},
			{q: "Pacote", opts: ["Pacote de Masmorra", "Pacote do Explorador"]}
		]},
		Warlock: {auto: ["Armadura de couro", "Qualquer arma simples", "2 adagas"], groups: [
			{q: "Arma à distância", opts: ["Besta leve + 20 virotes", "Qualquer arma simples"]},
			{q: "Componentes", opts: ["Bolsa de componentes", "Foco arcano"]},
			{q: "Pacote", opts: ["Pacote Acadêmico", "Pacote de Masmorra"]}
		]},
		Wizard: {auto: ["Livro de magias"], groups: [
			{q: "Arma", opts: ["Bordão", "Adaga"]},
			{q: "Componentes", opts: ["Bolsa de componentes", "Foco arcano"]},
			{q: "Pacote", opts: ["Pacote Acadêmico", "Pacote do Explorador"]}
		]},
		Artificer: {auto: ["Ferramentas de ladrão", "Pacote de Masmorra"], groups: [
			{q: "Armas", opts: ["2 armas simples", "Besta leve + 20 virotes"]},
			{q: "Armadura", opts: ["Armadura de couro batido (studded)", "Cota de escamas (scale mail)"]}
		]}
	};
	// Idiomas fixos + quantidade de escolhas de raça/antecedente
	function computeLangNeeds(d) {
		var fixed = [], choices = 0;
		function parse(list) {
			(list || []).forEach(function(p) {
				if (!p) return;
				Object.keys(p).forEach(function(k) {
					if (k === "anyStandard" || k === "any" || k === "other" || k === "choose" || k === "exotic") {
						choices += (typeof p[k] === "number" ? p[k] : 1);
					} else if (p[k]) {
						var pt = LANG_KEY_TO_PT[k];
						if (pt && fixed.indexOf(pt) < 0) fixed.push(pt);
					}
				});
			});
		}
		// Raça (base + subraça/variante quando aplicável)
		try {
			var robj = getRaceObj(d);
			parse(robj && robj.languageProficiencies);
			if ((!robj || !robj.languageProficiencies || !robj.languageProficiencies.length) && d.race) parse(d.race.languageProficiencies);
		} catch (e) { if (d.race) parse(d.race.languageProficiencies); }
		// Antecedente
		var bg = findByValue(backgroundsData, d._bgValue || d.background);
		parse(bg && bg.languageProficiencies);
		// Idiomas secretos de classe
		if (d.className === "Druid" && fixed.indexOf("Druídico") < 0) fixed.push("Druídico");
		if (d.className === "Rogue" && fixed.indexOf("Ladino (Gíria dos Ladrões)") < 0) fixed.push("Ladino (Gíria dos Ladrões)");
		return {fixed: fixed, choices: choices};
	}
	function stepLangGear($form) {
		var d = creationData;
		var langs = computeLangNeeds(d);
		var prevChoices = d._langChoices || [];
		var prevGear = d._starterGear || [];
		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Idiomas</h3>';
		html += '<div class="characters__summary-box">';
		html += '<div class="characters__summary-title">Idiomas concedidos</div>';
		html += '<div>' + esc(langs.fixed.length ? langs.fixed.join(", ") : "Nenhum idioma fixo.") + '</div>';
		html += '</div>';
		var totalChoices = langs.choices;
		var fixedSet = {};
		langs.fixed.forEach(function(l) { fixedSet[l] = true; });
		if (totalChoices > 0) {
			html += '<div class="characters__summary-box"><div class="characters__summary-title">' + totalChoices + ' idioma' + (totalChoices > 1 ? 's' : '') + ' à sua escolha</div>';
			for (var li = 0; li < totalChoices; li++) {
				html += '<div class="characters__form-group"><label class="characters__form-label">Escolha ' + (li + 1) + '</label>';
				html += '<select class="characters__form-select lang-pick" data-fixed="' + esc(langs.fixed.join(",")) + '"><option value="">Selecione...</option>';
				LANG_STANDARD.forEach(function(l) { html += '<option value="' + esc(l) + '"' + (fixedSet[l] ? ' disabled' : '') + '>' + esc(l) + '</option>'; });
				html += '</select></div>';
			}
			html += '</div>';
		}
		html += '</div>';
		// --- Equipamento inicial ---
		var st = CLASS_STARTERS[d.className];
		html += '<div class="characters__form-section"><h3 class="characters__form-section-title">Equipamento Inicial de ' + esc(d.className || "—") + '</h3>';
		if (st) {
			html += '<div class="characters__summary-box"><div class="characters__summary-title">Itens fixos</div>';
			html += '<div>' + esc(st.auto.length ? st.auto.join(", ") : "—") + '</div></div>';
			st.groups.forEach(function(g, gi) {
				html += '<div class="characters__form-group"><label class="characters__form-label">' + esc(g.q) + '</label>';
				html += '<select class="characters__form-select gear-pick" data-gi="' + gi + '"><option value="">Selecione...</option>';
				g.opts.forEach(function(o, oi) {
					var sel = prevGear[gi] === oi ? " selected" : "";
					html += '<option value="' + oi + '"' + sel + '>' + esc(o) + '</option>';
				});
				html += '</select></div>';
			});
		} else {
			html += '<div class="characters__summary-box"><div>Configure o equipamento manualmente na ficha.</div></div>';
		}
		html += '</div>';
		html += '<div class="characters__form-row">';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);
		// pré-selecionar idiomas anteriores
		$form.find(".lang-pick").each(function(ix) { if (prevChoices[ix]) $(this).val(prevChoices[ix]); });
		// impedir idiomas repetidos: desabilita fixos + já escolhidos entre os selects
		function refreshLangDisabled() {
			var chosen = {};
			langs.fixed.forEach(function(l) { chosen[l] = true; });
			$form.find(".lang-pick").each(function() { var v = this.value; if (v) chosen[v] = true; });
			$form.find(".lang-pick").each(function() {
				var own = this.value; // não desabilitar a própria seleção (jQuery .val() ignora option disabled)
				$(this).find("option").each(function() {
					var $o = $(this); var v = this.value;
					$o.prop("disabled", v && chosen[v] && v !== own);
				});
			});
		}
		refreshLangDisabled();
		$form.on("change", ".lang-pick", refreshLangDisabled);
		$form.find("#btn-prev").on("click", function() { creationStep = 4; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			// Idiomas
			var picks = [], dup = false;
			$form.find(".lang-pick").each(function() {
				var v = this.value; // leitura nativa: imune a options disabled
				if (!v || picks.indexOf(v) >= 0) dup = true;
				else picks.push(v);
			});
			if (totalChoices > 0) {
				if (dup || picks.length !== totalChoices) { alert("Escolha " + totalChoices + " idioma(s), sem repetir."); return; }
				d._langChoices = picks;
				d.languages = langs.fixed.concat(picks);
			} else {
				d._langChoices = [];
				d.languages = langs.fixed.slice();
			}
			// Equipamento
			d._starterGear = [];
			var missing = false;
			$form.find(".gear-pick").each(function() {
				var v = $(this).val();
				if (v === "") { missing = true; return; }
				var gi = parseInt($(this).data("gi"), 10);
				d._starterGear.push(st.groups[gi].opts[parseInt(v, 10)]);
			});
			if (missing) { alert("Escolha uma opção em cada grupo de equipamento!"); return; }
			creationStep = 6;
			renderCreation();
		});
	}

	function stepAbilities($form) {
		var d = creationData;
		var method = d.method || "standard";
		
		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Atributos</h3>';
		// Abas de método
		html += '<div class="characters__tabs">';
		html += '<button class="characters__tab ' + (method === "standard" ? "active" : "") + '" data-method="standard">Padrão</button>';
		html += '<button class="characters__tab ' + (method === "roll" ? "active" : "") + '" data-method="roll">Rolagem</button>';
		html += '<button class="characters__tab ' + (method === "buy" ? "active" : "") + '" data-method="buy">Comprar Pontos</button>';
		html += '</div>';
		html += '<div id="abilities-content" class="characters__abilities mt-2"></div>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);
		
		var $content = $form.find("#abilities-content");
		
		// Estado
		var scores = {str:8,dex:8,con:8,int:8,wis:8,cha:8};
		var points = 27;
		
		var renderStandard = function() {
			var values = STANDARD_ARRAY.slice();
			var tempScores = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
			var assigned = {};
			
			var html = '<div class="characters__summary-box"><div class="characters__summary-title">Array Padrão</div>';
			html += '<div>Clique nos valores para atribuir aos atributos.</div>';
			html += '<div id="standard-values" class="characters__rolled-dice mt-2"></div>';
			html += '<div class="characters__abilities-grid mt-2" id="abilities-grid"></div>';
			html += '</div>';
			$content.html(html);
			
			var $valuesBox = $content.find("#standard-values");
			var $grid = $content.find("#abilities-grid");
			
			// Mostrar valores disponíveis
			var availableValues = values.slice();
			availableValues.forEach(function(val) {
				$valuesBox.append('<div class="characters__dice" data-value="' + val + '">' + val + '</div>');
			});
			
			var renderGrid = function() {
				$grid.empty();
				ABILITY_ABVS.forEach(function(abv) {
					var racial = d.rawScores[abv] || 0;
					var baseScore = tempScores[abv] || 0;
					var total = baseScore + racial;
					var mod = baseScore > 0 ? calcMod(total) : 0;
					
					$grid.append(
						'<div class="characters__ability" style="cursor:' + (baseScore > 0 ? 'default' : 'pointer') + '">' +
						'<div class="characters__ability-name">' + ABILITY_NAMES[abv] + '</div>' +
						'<div class="characters__ability-score">' + (baseScore > 0 ? total : '?') + '</div>' +
						'<div class="characters__ability-mod">' + (baseScore > 0 ? (mod >= 0 ? "+" : "") + mod : '-') + '</div>' +
						(baseScore > 0 ? '<div class="characters__ability-mod" style="color:#28a745">Raça +' + racial + '</div>' : '<div class="characters__ability-mod" style="color:#ffc107">Clique para atribuir</div>') +
						'</div>'
					);
				});
			};
			
			// Atribuir valor (e sincronizar com `scores` imediatamente)
			$valuesBox.on("click", ".characters__dice", function(e) {
				var $dice = $(e.target);
				var val = parseInt($dice.data("value"));
				$dice.remove();
				
				// Atribuir ao primeiro atributo vazio
				for (var i = 0; i < ABILITY_ABVS.length; i++) {
					var abv = ABILITY_ABVS[i];
					if (tempScores[abv] === 0) {
						tempScores[abv] = val;
						scores[abv] = val;
						break;
					}
				}
				renderGrid();
			});
			
			renderGrid();
		};
		
		var renderRoll = function() {
			var rolls = [0,1,2,3,4,5].map(function() { return rollAbilityScore(); }).sort(function(a,b) { return b - a; });
			var tempScores = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
			
			var html = '<div class="characters__summary-box"><div class="characters__summary-title">Rolagem de Atributos</div>';
			html += '<div>Clique nos valores para atribuir aos atributos na ordem desejada.</div>';
			html += '<div id="rolled-dice" class="characters__rolled-dice mt-2"></div>';
			html += '<button class="characters__btn characters__btn--secondary" id="btn-reroll-abilities">Rolar Novamente</button>';
			html += '</div>';
			html += '<div class="characters__abilities-grid mt-2" id="abilities-grid"></div>';
			$content.html(html);
			
			var $diceBox = $content.find("#rolled-dice");
			var $grid = $content.find("#abilities-grid");
			
			// Mostrar dados rolados
			rolls.forEach(function(val) {
				$diceBox.append('<div class="characters__dice" data-value="' + val + '">' + val + '</div>');
			});
			
			var renderGrid = function() {
				$grid.empty();
				ABILITY_ABVS.forEach(function(abv) {
					var racial = d.rawScores[abv] || 0;
					var baseScore = tempScores[abv] || 0;
					var total = baseScore + racial;
					var mod = baseScore > 0 ? calcMod(total) : 0;
					
					$grid.append(
						'<div class="characters__ability" style="cursor:' + (baseScore > 0 ? 'default' : 'pointer') + '">' +
						'<div class="characters__ability-name">' + ABILITY_NAMES[abv] + '</div>' +
						'<div class="characters__ability-score">' + (baseScore > 0 ? total : '?') + '</div>' +
						'<div class="characters__ability-mod">' + (baseScore > 0 ? (mod >= 0 ? "+" : "") + mod : '-') + '</div>' +
						(baseScore > 0 ? '<div class="characters__ability-mod" style="color:#28a745">Raça +' + racial + '</div>' : '<div class="characters__ability-mod" style="color:#ffc107">Clique para atribuir</div>') +
						'</div>'
					);
				});
			};
			
			// Atribuir dado (e sincronizar com `scores` imediatamente)
			$diceBox.on("click", ".characters__dice", function(e) {
				var $dice = $(e.target);
				var val = parseInt($dice.data("value"));
				$dice.remove();
				
				// Atribuir ao primeiro atributo vazio
				for (var i = 0; i < ABILITY_ABVS.length; i++) {
					var abv = ABILITY_ABVS[i];
					if (tempScores[abv] === 0) {
						tempScores[abv] = val;
						scores[abv] = val;
						break;
					}
				}
				renderGrid();
			});
			
			renderGrid();
			
			// Re-rolar
			$content.find("#btn-reroll-abilities").on("click", function() {
				rolls = [0,1,2,3,4,5].map(function() { return rollAbilityScore(); }).sort(function(a,b) { return b - a; });
				tempScores = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
				ABILITY_ABVS.forEach(function(a) { scores[a] = 8; });
				$diceBox.empty();
				rolls.forEach(function(val) {
					$diceBox.append('<div class="characters__dice" data-value="' + val + '">' + val + '</div>');
				});
				renderGrid();
			});
		};
		
		var renderBuy = function() {
			points = 27;
			ABILITY_ABVS.forEach(function(a) { scores[a] = 8; });
			
			var html = '<div class="characters__summary-box"><div class="characters__summary-title">Compra de Pontos</div>';
			html += '<div>Pontos disponíveis: <b id="points-left">' + points + '</b> / 27</div>';
			html += '<div class="characters__abilities-grid mt-2" id="abilities-grid"></div>';
			html += '</div>';
			$content.html(html);
			
			var $grid = $content.find("#abilities-grid");
			
			var renderGrid = function() {
				$grid.empty();
				ABILITY_ABVS.forEach(function(abv) {
					var racial = d.rawScores[abv] || 0;
					var total = scores[abv] + racial;
					var mod = calcMod(total);
					
					html = '<div class="characters__ability">';
					html += '<div class="characters__ability-name">' + ABILITY_NAMES[abv] + '</div>';
					html += '<div class="characters__ability-score">' + total + '</div>';
					html += '<div class="characters__ability-mod">' + (mod >= 0 ? "+" : "") + mod + '</div>';
					if (racial) html += '<div class="characters__ability-mod" style="color:#28a745">Raça +' + racial + '</div>';
					html += '<div class="characters__ability-controls">';
					html += '<button class="characters__btn characters__btn--sm" data-action="down" data-ability="' + abv + '">-</button>';
					html += '<span>' + scores[abv] + '</span>';
					html += '<button class="characters__btn characters__btn--sm" data-action="up" data-ability="' + abv + '">+</button>';
					html += '</div>';
					html += '</div>';
					
					$grid.append(html);
				});
				$content.find("#points-left").text(points);
			};
			
			$grid.on("click", ".characters__btn[data-action='up']", function() {
				var abv = $(this).data("ability");
				var cost = POINT_BUY_COSTS[scores[abv] + 1] || 0;
				if (cost > 0 && points >= cost && scores[abv] < 15) {
					points -= cost;
					scores[abv]++;
					renderGrid();
				}
			});
			
			$grid.on("click", ".characters__btn[data-action='down']", function() {
				var abv = $(this).data("ability");
				var cost = POINT_BUY_COSTS[scores[abv]] || 0;
				if (cost > 0 && scores[abv] > 8) {
					points += cost;
					scores[abv]--;
					renderGrid();
				}
			});
			
			renderGrid();
		};
		
		// Renderizar método inicial
		if (method === "standard") renderStandard();
		else if (method === "roll") renderRoll();
		else if (method === "buy") renderBuy();
		
		// Troca de método
		$form.on("click", ".characters__tab", function() {
			var newMethod = $(this).data("method");
			d.method = newMethod;
			method = newMethod;
			
			$form.find(".characters__tab").removeClass("active");
			$(this).addClass("active");
			
			if (method === "standard") renderStandard();
			else if (method === "roll") renderRoll();
			else if (method === "buy") renderBuy();
		});

		$form.find("#btn-prev").on("click", function() { creationStep = 5; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			// Salvar valores
			ABILITY_ABVS.forEach(function(a) { d.scores[a] = scores[a] || 8; });
			
			var hd = CLASS_HIT_DICE[d.className] || 8;
			var conMod = calcMod((d.scores.con || 8) + (d.rawScores.con || 0));
			d.hp.max = hd + conMod;
			d.hp.current = d.hp.max;
			d.ac = 10 + calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
			d.initiative = calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
			d.speed = resolveRaceSpeed(d);
			creationStep = 7;
			renderCreation();
		});
	}

	function getBgSkillKeys() {
		if (!creationData.background) return [];
		var bg = findByValue(backgroundsData, creationData._bgValue || creationData.background);
		if (!bg || !bg.skillProficiencies) return [];
		var keys = [];
		bg.skillProficiencies.forEach(function(p) {
			Object.keys(p).forEach(function(k) {
				if (k !== "choose" && p[k]) {
					var key = SKILL_EN_TO_KEY[k];
					if (key) keys.push(key);
				}
			});
		});
		return keys;
	}

	function stepSkills($form) {
		var d = creationData;
		var classSkills = CLASS_SKILLS[d.className] || null;

		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Perícias e Proficiências</h3>';
		if (classSkills) {
			html += '<div class="characters__summary-box"><div class="characters__summary-title">Perícias de ' + esc(d.className) + '</div>';
			html += '<div>Escolha ' + classSkills.count + ' perícias:</div></div>';
		}
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Todas as Perícias</div>';
		html += '<div class="characters__skills-grid" id="skills-grid"></div></div>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Finalizar →</button></div>';
		$form.html(html);

		var $grid = $form.find("#skills-grid");
		var classSkillKeys = classSkills ? classSkills.skills.map(function(s) { return SKILL_EN_TO_KEY[s]; }).filter(Boolean) : [];

		Object.keys(SKILL_KEY_TO_PT).forEach(function(key) {
			var ptName = SKILL_KEY_TO_PT[key];
			var skill = SKILLS.find(function(s) { return s.name === ptName; });
			var abilName = skill ? ABILITY_SHORT[skill.abil] : "";
			var isClassSkill = classSkillKeys.indexOf(key) >= 0;
			var profLevel = d.skills[key] || 0;
			var checked = profLevel >= 1 ? " checked" : "";
			var expert = profLevel === 2 ? " checked" : "";
			var isDisabled = !isClassSkill && profLevel === 0 ? "" : (isClassSkill ? "" : " disabled");
			var classBadge = isClassSkill ? ' <span style="color:#006bc4;font-size:.7em">[Classe]</span>' : "";

			$grid.append(
				'<div class="characters__skill-item">' +
				'<label>' + ptName + ' (' + abilName + ')' + classBadge + '</label>' +
				'<label class="mb-0" style="font-size:.7em">Prof</label>' +
				'<input type="checkbox" data-key="' + key + '" class="prof-cb"' + checked + isDisabled + '>' +
				'<label class="mb-0" style="font-size:.7em">Exp</label>' +
				'<input type="checkbox" data-key="' + key + '" class="exp-cb"' + expert + ' disabled>' +
				'</div>'
			);
		});

		var getClassProfCount = function() {
			var bgKeys = getBgSkillKeys();
			return Object.keys(d.skills).filter(function(k) {
				return d.skills[k] === 1 && classSkillKeys.indexOf(k) >= 0 && bgKeys.indexOf(k) < 0;
			}).length;
		};

		$grid.on("change", ".prof-cb", function(e) {
			var $cb = $(e.target);
			var key = $cb.data("key");
			if ($cb.is(":checked")) {
				var bgKeys = getBgSkillKeys();
				if (bgKeys.indexOf(key) < 0 && classSkillKeys.indexOf(key) >= 0 && classSkills) {
					if (getClassProfCount() >= classSkills.count) {
						alert("Você já escolheu " + classSkills.count + " perícias de classe!");
						$cb.prop("checked", false);
						return;
					}
				}
				d.skills[key] = 1;
				$grid.find('.exp-cb[data-key="' + key + '"]').prop("disabled", false);
			} else {
				delete d.skills[key];
				$grid.find('.exp-cb[data-key="' + key + '"]').prop("disabled", true).prop("checked", false);
			}
		});

		$grid.on("change", ".exp-cb", function(e) {
			var $cb = $(e.target);
			var key = $cb.data("key");
			if ($cb.is(":checked")) d.skills[key] = 2;
			else if (d.skills[key] === 2) d.skills[key] = 1;
		});

		// Pré-marcar skills do background
		var bgKeys = getBgSkillKeys();
		bgKeys.forEach(function(k) {
			if (SKILL_KEY_TO_PT[k]) {
				d.skills[k] = 1;
				$grid.find('.prof-cb[data-key="' + k + '"]').prop("checked", true);
				$grid.find('.exp-cb[data-key="' + k + '"]').prop("disabled", false);
			}
		});

		$form.find("#btn-prev").on("click", function() { creationStep = 6; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			finalizeCharacter();
			CharactersStore.save(d);
			currentView = "list";
			renderList();
			if (global.JqueryUtil && global.JqueryUtil.doToast) {
				global.JqueryUtil.doToast({type: "success", content: "Ficha salva com sucesso!"});
			} else {
				alert("Ficha salva com sucesso!");
			}
		});
	}

	function stepFinish($form) {
		var d = creationData;
		var profBonus = calcProfBonus(d.level || 1);
		var der = computeDerived(d);

		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Revisão Final</h3>';
		html += '<div class="characters__summary-box"><div class="characters__summary-title">' + esc(der.name) + '</div><ul class="characters__summary-list">';
		html += '<li><b>Raça:</b> ' + esc(der.race ? der.race.name : "—") + '</li>';
		html += '<li><b>Classe:</b> ' + esc(der.className) + ' Nv. ' + der.level + '</li>';
		if (d.subclass) {
			var subc = findSubclassByKey(d.subclass);
			html += '<li><b>Subclasse:</b> ' + (subc ? esc(subc.name) : "—") + '</li>';
		}
		html += '<li><b>Antecedente:</b> ' + esc(der.background || "—") + '</li>';
		html += '<li><b>PV Máx:</b> ' + der.hp.max + ' | <b>CA:</b> ' + der.ac + ' | <b>Iniciativa:</b> ' + (der.initiative >= 0 ? "+" : "") + der.initiative + '</li>';
		html += '<li><b>Bônus de Proficiência:</b> +' + profBonus + '</li>';
		html += '<li><b>Deslocamento:</b> ' + der.speed + ' pés</li>';
		html += '</ul></div>';

		html += '<div class="characters__summary-box"><div class="characters__summary-title">Atributos</div><ul class="characters__summary-list">';
		ABILITY_ABVS.forEach(function(a) {
			var total = (der.scores[a] || 8) + (der.rawScores[a] || 0);
			var mod = calcMod(total);
			html += '<li><b>' + ABILITY_NAMES[a] + ':</b> ' + total + ' (' + (mod >= 0 ? "+" : "") + mod + ')</li>';
		});
		html += '</ul></div>';

		html += '<div class="characters__summary-box"><div class="characters__summary-title">Perícias</div><ul class="characters__summary-list">';
		Object.keys(der.skills || {}).forEach(function(k) {
			var skill = SKILLS.find(function(s) { return s.name === SKILL_KEY_TO_PT[k]; });
			var abil = skill ? skill.abil : "str";
			var v = der.skills[k];
			var total = calcMod((der.scores[abil] || 8) + (der.rawScores[abil] || 0)) + (v === 1 ? profBonus : v === 2 ? profBonus * 2 : 0);
			html += '<li>' + SKILL_KEY_TO_PT[k] + ': +' + total + (v === 2 ? " (expertise)" : "") + '</li>';
		});
		html += '</ul></div>';

		html += '<div class="characters__form-row">';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--success" id="btn-save">💾 Salvar Ficha</button>';
		html += '<button class="characters__btn characters__btn--info" id="btn-export">📥 Exportar .cah</button>';
		html += '<label class="characters__btn characters__btn--secondary" style="cursor:pointer">📤 Importar .cah<input type="file" id="btn-import" accept=".cah,.json" style="display:none"></label>';
		html += '</div>';
		$form.html(html);

		$form.find("#btn-prev").on("click", function() { creationStep = 7; renderCreation(); });

		$form.find("#btn-save").on("click", function() {
			finalizeCharacter();
			CharactersStore.save(d);
			currentView = "list";
			renderList();
			if (global.JqueryUtil && global.JqueryUtil.doToast) {
				global.JqueryUtil.doToast({type: "success", content: "Ficha salva com sucesso!"});
			} else {
				alert("Ficha salva com sucesso!");
			}
		});
		
		$form.find("#btn-export").on("click", function() {
			exportToCah(d);
		});
		
		$form.find("#btn-import").on("change", function(e) {
			var file = e.target.files[0];
			if (!file) return;
			var reader = new FileReader();
			reader.onload = function(event) {
				try {
					var imported = JSON.parse(event.target.result);
					importCharacter(imported);
				} catch (err) {
					alert("Erro ao importar arquivo: " + err.message);
				}
			};
			reader.readAsText(file);
		});
	}

	function finalizeCharacter() {
		var d = creationData;
		var hd = CLASS_HIT_DICE[d.className] || 8;
		var conMod = calcMod((d.scores.con || 8) + (d.rawScores.con || 0));
		var level = d.level || 1;
		// PV: máximo no 1º nível + média (metade do dado + 1 + CON) nos níveis seguintes
		d.hp.max = hd + conMod + (level - 1) * (Math.floor(hd / 2) + 1 + conMod);
		d.hp.current = d.hp.max;
		d.ac = 10 + calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
		d.initiative = calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
		d.speed = resolveRaceSpeed(d);
		// Popula o array classes[] para multiclasse desde a criação
		if (!d.classes || !d.classes.length) {
			d.classes = [{name: d.className || "", subclass: d.subclass || "", level: level}];
		}
		// Espaços de magia automáticos conforme classe/subclasse/nível
		d.spellSlots = calculateSpellSlots(d);
		d.spellAttackBonus = calculateSpellAttackBonus(d);
		d.spellDC = 8 + d.spellAttackBonus;
		d.passivePerception = calculatePassivePerception(d);
		// Equipamento inicial escolhido na etapa Idiomas & Itens (uma única vez)
		if (d._starterGear && !d._gearApplied) {
			d.inventory = d._starterGear.slice().concat(d.inventory || []);
			d._gearApplied = true;
		}
		d.updated = Date.now();
	}

	function exportToCah(charData) {
		var d = creationData;
		var cah = {
			about: "",
			advantages: [],
			alignmentName: charData.alignment || "Neutro",
			allRequiredClasses: { jobs: [] },
			armors: [],
			background: charData.background || null,
			baseAc: charData.ac || 10,
			baseHp: charData.hp.max || 0,
			bonds: charData.bonds || "",
			bonusSpellSlots: {eighth:0,fifth:0,first:0,fourth:0,ninth:0,second:0,seventh:0,sixth:0,third:0},
			burrowSpeedModifier: 0,
			charisma: {save:false,saveModifier:0,score:charData.scores.cha||10,scoreModifier:0},
			climbSpeedModifier: 0,
			companion: null,
			conditions: {},
			constitution: {save:false,saveModifier:0,score:charData.scores.con||10,scoreModifier:0},
			copper: 0,
			created: charData.created || Date.now(),
			dexterity: {save:false,saveModifier:0,score:charData.scores.dex||10,scoreModifier:0},
			disadvantages: [],
			effectApplications: [],
			electrum: 0,
			equipment: [],
			equippedColorSchemeId: "default",
			equippedDiceId: "plain_blue",
			exp: 0,
			extraAC: 0,
			failures: 0,
			feats: [],
			flaws: charData.flaws || "",
			flySpeedModifier: 0,
			gold: 0,
			hasInspiration: false,
			hp: charData.hp.current || charData.hp.max || 1,
			id: charData.id || "char_" + Date.now(),
			ideals: charData.ideals || "",
			imagePath: "",
			imageUrl: "",
			initiativeModifier: charData.initiative || 0,
			intelligence: {save:false,saveModifier:0,score:charData.scores.int||10,scoreModifier:0},
			jobs: [],
			jsonType: "character",
			name: charData.name || "Sem Nome",
			notes: charData.notes || [],
			passivePerceptionModifier: 0,
			personalityTraits: charData.personality || "",
			platinum: 0,
			player: charData.playerName || "",
			preferences: {dcAbility:"DEX",editAllSkills:false,sectionOrder:["STATUS","CONDITIONS","ABILITIES","SAVING_THROWS","SKILLS","SPECIAL_ABILITY","COMPANION","FEATS","SELECTABLE_FEATURES","ARMOR","EQUIPMENT","WEAPONS","SPELL_SLOTS","SPELLS"],showCompanion:true,showConditions:false,showFeats:true,showNotes:true,showSpells:true,sortSkillsByAbility:true},
			proficiencies: [],
			proficiencyModifier: calcProfBonus(charData.level || 1),
			race: charData.race ? {raceId:charData.race.name.toLowerCase(),subraceId:charData.race.subrace ? charData.race.subrace[0].toLowerCase() : null} : null,
			requiredBackground: null,
			requiredMonster: null,
			requiredRace: null,
			selectableFeatures: [],
			silver: 0,
			skills: charData.skills || {},
			specialAbilities: [],
			speedModifier: 0,
			spellAttackExtraBonus: 0,
			spellDCExtraBonus: 0,
			spellSlots: {eighth:0,fifth:0,first:0,fourth:0,ninth:0,second:0,seventh:0,sixth:0,third:0},
			spells: [],
			strength: {save:false,saveModifier:0,score:charData.scores.str||10,scoreModifier:0},
			successes: 0,
			swimSpeedModifier: 0,
			tempHp: 0,
			updated: Date.now(),
			weapons: [],
			wisdom: {save:false,saveModifier:0,score:charData.scores.wis||10,scoreModifier:0}
		};
		
		var dataStr = JSON.stringify(cah, null, 2);
		var blob = new Blob([dataStr], {type: "application/json"});
		var url = URL.createObjectURL(blob);
		var a = document.createElement("a");
		a.href = url;
		a.download = "character_" + (charData.name || "sheet") + ".cah";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		
		if (global.JqueryUtil && global.JqueryUtil.doToast) {
			global.JqueryUtil.doToast({type: "success", content: "Ficha exportada!"});
		} else {
			alert("Ficha exportada com sucesso!");
		}
	}

	function importCharacter(cahData) {
		if (!cahData || cahData.jsonType !== "character") {
			alert("Arquivo inválido!");
			return;
		}
		
		if (!confirm("Deseja importar esta ficha? Os dados atuais serão substituídos.")) return;
		
		var newChar = {
			id: cahData.id || null,
			name: cahData.name || "Sem Nome",
			race: cahData.race,
			className: cahData.jobs && cahData.jobs.length ? cahData.jobs[0].jobId : null,
			background: cahData.background,
			level: cahData.jobs && cahData.jobs.length ? cahData.jobs[0].level : 1,
			scores: {
				str: cahData.strength ? cahData.strength.score : 10,
				dex: cahData.dexterity ? cahData.dexterity.score : 10,
				con: cahData.constitution ? cahData.constitution.score : 10,
				int: cahData.intelligence ? cahData.intelligence.score : 10,
				wis: cahData.wisdom ? cahData.wisdom.score : 10,
				cha: cahData.charisma ? cahData.charisma.score : 10
			},
			rawScores: {str:0,dex:0,con:0,int:0,wis:0,cha:0},
			method: "standard",
			skills: cahData.skills || {},
			savingThrows: [],
			otherProficiencies: [],
			hp: {max:cahData.baseHp||10,current:cahData.hp||10,temp:0},
			ac: cahData.baseAc || 10,
			initiative: cahData.initiativeModifier || 0,
			speed: 30,
			alignment: cahData.alignmentName || "Neutro",
			playerName: cahData.player || "",
			experience: cahData.exp || 0,
			spells: [],
			features: [],
			equipment: [],
			inventory: [],
			notes: cahData.notes ? cahData.notes.map(function(n) { return n.text || ""; }).join("\n") : "",
			personality: cahData.personalityTraits || "",
			ideals: cahData.ideals || "",
			bonds: cahData.bonds || "",
			flaws: cahData.flaws || "",
			created: cahData.created || Date.now(),
			updated: Date.now()
		};
		
		CharactersStore.save(newChar);
		currentView = "list";
		currentChar = null;
		renderList();
		
		if (global.JqueryUtil && global.JqueryUtil.doToast) {
			global.JqueryUtil.doToast({type: "success", content: "Ficha importada com sucesso!"});
		} else {
			alert("Ficha importada com sucesso!");
		}
	}

	function openCharacter(id) {
		try {
			var char = CharactersStore.getById(id);
			if (!char) {
				alert("Ficha não encontrada!");
				return;
			}
			console.log("[Characters] Abrindo ficha:", char.name, char.id);
			currentView = "sheet";
			currentChar = char;
			renderSheet();
		} catch (err) {
			console.error("[Characters] Erro ao abrir ficha:", err);
			alert("Erro ao abrir ficha: " + err.message);
		}
	}

	function deleteCharacter(id) {
		if (!confirm("Excluir esta ficha?")) return;
		CharactersStore.remove(id);
		renderList();
	}

	// Sistema de módulos (compatibilidade com o antigo sistema de abas)
	window.renderSheetTab = function(tabName) {
		currentTab = tabName || currentTab;
		if ($root.find("#sheet-modules").length) renderModules();
	};
	
	
	
	
	function renderSpellsTab($content, char) {
		var html = '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Magias</h4>';
		
		// Informações de conjuração
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Conjuração</div>';
		html += '<div class="characters__sheet-items">';
		html += '<div class="characters__sheet-item"><b>CD de Magia:</b> ' + (char.spellDC || 8) + '</div>';
		html += '<div class="characters__sheet-item"><b>Bônus de Ataque:</b> +' + (char.spellAttackBonus || 0) + '</div>';
		html += '</div></div>';
		
		// Slots de magia por nível
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Slots de Magia</div>';
		html += '<div class="characters__slots-grid">';
		for (var i = 1; i <= 9; i++) {
			var slots = char.spellSlots && char.spellSlots[i] ? char.spellSlots[i] : 0;
			html += '<div class="characters__slot">';
			html += '<div class="characters__slot-level">Nv. ' + i + '</div>';
			html += '<div class="characters__slot-value">' + slots + '</div>';
			html += '</div>';
		}
		html += '</div></div>';
		
		// Lista de magias
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Magias Conhecidas/Preparadas</div>';
		html += '<div class="characters__spells-list mt-2" id="spells-list">';
		if (char.spells && char.spells.length) {
			char.spells.forEach(function(spell, index) {
				html += '<div class="characters__spell-item">';
				html += '<a class="characters__spell-name ptm-link" href="' + esc(ptmSpellHref(spell)) + '">' + esc(spell.name || spell) + '</a>';
				if (spell.level !== undefined) {
					html += '<span class="characters__spell-level">Nv. ' + spell.level + '</span>';
				}
				html += '<button class="characters__btn characters__btn--danger characters__btn--sm" data-remove-spell="' + index + '">×</button>';
				html += '</div>';
			});
		} else {
			html += '<div class="characters__spell-item">Nenhuma magia selecionada</div>';
		}
		html += '</div></div>';
		
		// Adicionar magia
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Adicionar Magia</div>';
		html += '<div class="characters__form-row">';
		html += '<input type="text" class="characters__form-input" id="spell-search" placeholder="Buscar magia...">';
		html += '<select class="characters__form-select" id="spell-level-filter">';
		html += '<option value="-1">Todos os níveis</option>';
		for (var i = 0; i <= 9; i++) {
			html += '<option value="' + i + '">Nível ' + i + '</option>';
		}
		html += '</select>';
		html += '</div>';
		html += '<div id="spell-search-results" class="characters__search-results mt-2"></div>';
		html += '<a class="ptm-link ptm-open-list" href="spells.html">Abrir lista completa de magias</a>';
		html += '</div>';
		
		$content.html(html);
		
		// Event listeners
		var $searchInput = $content.find("#spell-search");
		var $levelFilter = $content.find("#spell-level-filter");
		var $results = $content.find("#spell-search-results");
		
		var searchSpells = function() {
			var query = $searchInput.val().toLowerCase().trim();
			var levelFilter = parseInt($levelFilter.val());
			
			if (query.length < 2) {
				$results.empty();
				return;
			}
			
			var filtered = spellsData.filter(function(spell) {
				var nameMatch = spell.name.toLowerCase().indexOf(query) >= 0;
				var levelMatch = levelFilter === -1 || spell.level === levelFilter;
				return nameMatch && levelMatch;
			}).slice(0, 20); // Limitar a 20 resultados
			
			$results.empty();
			if (filtered.length === 0) {
				$results.html('<div class="characters__search-item">Nenhuma magia encontrada</div>');
				return;
			}
			
			filtered.forEach(function(spell) {
				var $item = $('<div class="characters__search-item">');
				$item.html('<b>' + esc(spell.name) + '</b> (Nv. ' + spell.level + ') - ' + esc(spell.school || ""));
				$item.on("click", function() {
					// Adicionar magia
					var newSpell = {name: spell.name, level: spell.level, school: spell.school};
					if (!char.spells) char.spells = [];
					char.spells.push(newSpell);
					renderSpellsTab($content, char);
				});
				$results.append($item);
			});
		};
		
		$searchInput.on("input", searchSpells);
		$levelFilter.on("change", searchSpells);
		
		// Remover magia
		$content.on("click", "[data-remove-spell]", function() {
			var index = parseInt($(this).data("remove-spell"));
			if (char.spells && char.spells[index]) {
				char.spells.splice(index, 1);
				renderSpellsTab($content, char);
			}
		});
	}
	
	function renderEquipmentTab($content, char) {
		var html = '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Equipamentos</h4>';
		
		// Armas
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Armas</div>';
		html += '<div class="characters__items-list" id="weapons-list">';
		if (char.weapons && char.weapons.length) {
			char.weapons.forEach(function(weapon, index) {
				html += '<div class="characters__item">';
				html += '<a class="ptm-link" href="' + esc(ptmItemHref(weapon)) + '">' + esc(weapon.name || weapon) + '</a>';
				html += '<button class="characters__btn characters__btn--danger characters__btn--sm" data-remove-weapon="' + index + '">×</button>';
				html += '</div>';
			});
		} else {
			html += '<div class="characters__item">Nenhuma arma equipada</div>';
		}
		html += '</div></div>';
		
		// Adicionar arma
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Adicionar Arma</div>';
		html += '<div class="characters__form-row">';
		html += '<input type="text" class="characters__form-input" id="weapon-search" placeholder="Buscar arma...">';
		html += '</div>';
		html += '<div id="weapon-search-results" class="characters__search-results mt-2"></div>';
		html += '<a class="ptm-link ptm-open-list" href="items.html">Abrir lista completa de itens</a>';
		html += '</div>';
		
		// Armaduras
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Armaduras</div>';
		html += '<div class="characters__items-list" id="armors-list">';
		if (char.armors && char.armors.length) {
			char.armors.forEach(function(armor, index) {
				html += '<div class="characters__item">';
				html += '<a class="ptm-link" href="' + esc(ptmItemHref(armor)) + '">' + esc(armor.name || armor) + '</a>';
				html += '<button class="characters__btn characters__btn--danger characters__btn--sm" data-remove-armor="' + index + '">×</button>';
				html += '</div>';
			});
		} else {
			html += '<div class="characters__item">Nenhuma armadura equipada</div>';
		}
		html += '</div></div>';
		
		// Adicionar armadura
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Adicionar Armadura</div>';
		html += '<div class="characters__form-row">';
		html += '<input type="text" class="characters__form-input" id="armor-search" placeholder="Buscar armadura...">';
		html += '</div>';
		html += '<div id="armor-search-results" class="characters__search-results mt-2"></div>';
		html += '<a class="ptm-link ptm-open-list" href="items.html">Abrir lista completa de itens</a>';
		html += '</div>';
		
		// Inventário
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Inventário</div>';
		html += '<textarea class="characters__sheet-textarea" id="in-inv" placeholder="Anote seus itens (um por linha)...">' + esc((char.inventory || []).join("\n")) + '</textarea>';
		html += ptmSearchHint();
		html += '</div></div>';
		
		$content.html(html);
		
		// Event listeners - Buscar armas
		var $weaponSearch = $content.find("#weapon-search");
		var $weaponResults = $content.find("#weapon-search-results");
		
		$weaponSearch.on("input", function() {
			var query = $(this).val().toLowerCase().trim();
			if (query.length < 2) {
				$weaponResults.empty();
				return;
			}
			
			var filtered = itemsData.filter(function(item) {
				var nameMatch = item.name.toLowerCase().indexOf(query) >= 0;
				var isWeapon = item.type === "W" || (item.weaponCategory && item.weaponCategory !== "none");
				return nameMatch && isWeapon;
			}).slice(0, 10);
			
			$weaponResults.empty();
			if (filtered.length === 0) {
				$weaponResults.html('<div class="characters__search-item">Nenhuma arma encontrada</div>');
				return;
			}
			
			filtered.forEach(function(weapon) {
				var $item = $('<div class="characters__search-item">');
				$item.html('<b>' + esc(optionLabel(weapon)) + '</b> (' + esc(weapon.weaponCategory || "Arma") + ')');
				$item.on("click", function() {
					if (!char.weapons) char.weapons = [];
					char.weapons.push({name: weapon.name, source: weapon.source || "", type: String(weapon.type || "").split("|")[0] === "R" ? "ranged" : "melee"});
					renderEquipmentTab($content, char);
				});
				$weaponResults.append($item);
			});
		});
		
		// Remover arma
		$content.on("click", "[data-remove-weapon]", function() {
			var index = parseInt($(this).data("remove-weapon"));
			if (char.weapons && char.weapons[index]) {
				char.weapons.splice(index, 1);
				renderEquipmentTab($content, char);
			}
		});
		
		// Event listeners - Buscar armaduras
		var $armorSearch = $content.find("#armor-search");
		var $armorResults = $content.find("#armor-search-results");
		
		$armorSearch.on("input", function() {
			var query = $(this).val().toLowerCase().trim();
			if (query.length < 2) {
				$armorResults.empty();
				return;
			}
			
			var filtered = itemsData.filter(function(item) {
				var nameMatch = item.name.toLowerCase().indexOf(query) >= 0;
				var baseType = String(item.type || "").split("|")[0];
				var isArmor = baseType === "LA" || baseType === "MA" || baseType === "HA" || baseType === "S";
				return nameMatch && isArmor;
			}).slice(0, 10);
			
			$armorResults.empty();
			if (filtered.length === 0) {
				$armorResults.html('<div class="characters__search-item">Nenhuma armadura encontrada</div>');
				return;
			}
			
			filtered.forEach(function(armor) {
				var $item = $('<div class="characters__search-item">');
				var baseType = String(armor.type || "").split("|")[0];
				var typeLabel = {LA: "Armadura leve", MA: "Armadura média", HA: "Armadura pesada", S: "Escudo"}[baseType] || "Armadura";
				$item.html('<b>' + esc(optionLabel(armor)) + '</b> (' + esc(typeLabel) + ')');
				$item.on("click", function() {
					if (!char.armors) char.armors = [];
					char.armors.push({name: armor.name, source: armor.source || "", type: baseType, ac: armor.ac});
					renderEquipmentTab($content, char);
				});
				$armorResults.append($item);
			});
		});
		
		// Remover armadura
		$content.on("click", "[data-remove-armor]", function() {
			var index = parseInt($(this).data("remove-armor"));
			if (char.armors && char.armors[index]) {
				char.armors.splice(index, 1);
				renderEquipmentTab($content, char);
			}
		});
	}
	
	function renderFeaturesTab($content, char) {
		var html = '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Características</h4>';
		
		// Talentos (Feats)
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Talentos</div>';
		html += '<div class="characters__features-list" id="feats-list">';
		if (char.feats && char.feats.length) {
			char.feats.forEach(function(feat, index) {
				html += '<div class="characters__feature-item">';
				html += '<div>';
				html += '<div class="characters__feature-name"><a class="ptm-link" href="' + esc(ptmFeatHref(feat)) + '">' + esc(feat.name || feat) + '</a></div>';
				if (feat.source) html += '<div class="characters__feature-source">' + esc(feat.source) + '</div>';
				html += '</div>';
				html += '<button class="characters__btn characters__btn--danger characters__btn--sm" data-remove-feat="' + index + '">×</button>';
				html += '</div>';
			});
		} else {
			html += '<div class="characters__feature-item">Nenhum talento</div>';
		}
		html += '</div></div>';
		
		// Adicionar feat
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Adicionar Talento</div>';
		html += '<div class="characters__form-row">';
		html += '<input type="text" class="characters__form-input" id="feat-search" placeholder="Buscar talento...">';
		html += '</div>';
		html += '<div id="feat-search-results" class="characters__search-results mt-2"></div>';
		html += '<a class="ptm-link ptm-open-list" href="feats.html">Abrir lista completa de talentos</a>';
		html += '</div>';
		
		// Habilidades Especiais
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Habilidades Especiais</div>';
		html += '<div class="characters__features-list">';
		if (char.specialAbilities && char.specialAbilities.length) {
			char.specialAbilities.forEach(function(ability) {
				html += '<div class="characters__feature-item">';
				html += '<div class="characters__feature-name">' + esc(ability.name || ability) + '</div>';
				if (ability.description) html += '<div class="characters__feature-desc">' + esc(ability.description) + '</div>';
				html += '</div>';
			});
		} else {
			html += '<div class="characters__feature-item">Nenhuma habilidade especial</div>';
		}
		html += '</div></div>';
		
		// Características Selecionáveis
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Características Selecionáveis</div>';
		html += '<div class="characters__features-list">';
		if (char.selectableFeatures && char.selectableFeatures.length) {
			char.selectableFeatures.forEach(function(feature) {
				html += '<div class="characters__feature-item">';
				html += '<div class="characters__feature-name">' + esc(feature.name || feature) + '</div>';
				if (feature.type) html += '<div class="characters__feature-type">' + esc(feature.type) + '</div>';
				html += '</div>';
			});
		} else {
			html += '<div class="characters__feature-item">Nenhuma característica selecionável</div>';
		}
		html += '</div></div>';
		
		$content.html(html);
		
		// Event listeners - Buscar feats
		var $featSearch = $content.find("#feat-search");
		var $featResults = $content.find("#feat-search-results");
		
		$featSearch.on("input", function() {
			var query = $(this).val().toLowerCase().trim();
			if (query.length < 2) {
				$featResults.empty();
				return;
			}
			
			var filtered = featsData.filter(function(feat) {
				return feat.name.toLowerCase().indexOf(query) >= 0;
			}).slice(0, 10);
			
			$featResults.empty();
			if (filtered.length === 0) {
				$featResults.html('<div class="characters__search-item">Nenhum talento encontrado</div>');
				return;
			}
			
			filtered.forEach(function(feat) {
				var $item = $('<div class="characters__search-item">');
				$item.html('<b>' + esc(feat.name) + '</b>');
				if (feat.source) $item.append(' (' + esc(feat.source) + ')');
				$item.on("click", function() {
					if (!char.feats) char.feats = [];
					char.feats.push({name: feat.name, source: feat.source});
					renderFeaturesTab($content, char);
				});
				$featResults.append($item);
			});
		});
		
		// Remover feat
		$content.on("click", "[data-remove-feat]", function() {
			var index = parseInt($(this).data("remove-feat"));
			if (char.feats && char.feats[index]) {
				char.feats.splice(index, 1);
				renderFeaturesTab($content, char);
			}
		});
	}


// === FICHA POR MÓDULOS REORGANIZÁVEIS ===
	var SHEET_MODULE_DEFAULT_ORDER = ["notes", "abilities", "combat", "skills", "attacks", "spells", "features", "equipment"];
	var SHEET_MODULE_DEFS = null;

	function buildSheetHeader(char) {
		var sub = findSubclassName(char);
		var raceTxt = char.race ? char.race.name : "—";
		if (char.race && char.race.name) {
			var subName = char.raceSubrace ? (char.raceSubrace.label || char.raceSubrace.name) : null;
			if (subName) raceTxt += " (" + subName + ")";
			else {
				var raceSrc = char.raceSource || char.race.source || null;
				if (raceSrc && variantCount(racesData, char.race.name) > 1) raceTxt += " (" + raceSrc + ")";
			}
		}
		var clsTxt = char.className || "—";
		if (char.className && char.classSource && variantCount(classesData, char.className) > 1) clsTxt += " (" + char.classSource + ")";
		var html = '<div class="characters__sheet-header">';
		html += '<div class="characters__sheet-avatar">' + esc((char.name || "?").charAt(0).toUpperCase()) + '</div>';
		html += '<div class="characters__sheet-header-main">';
		html += '<h2 class="characters__sheet-name">' + esc(char.name) + '</h2>';
		html += '<div class="characters__sheet-detail">' + esc(raceTxt) + (sub ? " • " + esc(sub) : "") + ' • ' + esc(clsTxt) + ' • Nv. ' + (char.level || 1) + ' • ' + esc(char.background || "—") + '</div>';
		html += '<div class="characters__sheet-detail">' + esc(char.alignment || "Neutro") + ' • Jogador: ' + esc(char.playerName || "—") + '</div>';
		html += '<div class="characters__sheet-actions">';
		html += '<button class="characters__btn characters__btn--secondary characters__btn--sm" id="btn-export-sheet">Exportar .cah</button>';
		html += '<button class="characters__btn characters__btn--secondary characters__btn--sm" id="btn-print" title="Histórico de Rolagens">Histórico</button>';
		html += '<button class="characters__btn characters__btn--secondary characters__btn--sm" id="btn-reorder">Reorganizar</button>';
		html += '<button class="characters__btn characters__btn--danger characters__btn--sm" id="btn-delete">Excluir</button>';
		html += '</div>';
		html += '</div></div>';
		return html;
	}
	// Atualiza o cabeçalho da ficha no DOM (usado após upar de nível, etc.)
	function renderSheetHeader(char) {
		var $hdr = $root.find(".characters__sheet-header");
		if ($hdr.length) $hdr.replaceWith(buildSheetHeader(char));
	}

	function findSubclassName(char) {
		var key = (char && char.classes && char.classes.length && char.classes[0].subclass) || (char && char.subclass);
		if (!key) return "";
		var sc = findSubclassByKey(key);
		return sc ? sc.name : String(key);
	}
	// Fonte da classe (para casar as características com a fonte correta)
	function classSourceFor(char, clsEntry) {
		if (!clsEntry) return char.classSource || null;
		if (char.classes && char.classes[0] === clsEntry && char.classSource) return char.classSource;
		var all = classesData.filter(function(x) { return x.name === clsEntry.name; });
		return all.length ? all[0].source : null;
	}

	function sheetToast(type, content) {
		var types = {success: "characters__toast--success", info: "characters__toast--info", danger: "characters__toast--danger"};
		var $old = $(document).find(".characters__toast");
		if ($old.length) $old.remove();
		var $t = $('<div class="characters__toast ' + (types[type] || types.info) + '">' + esc(content) + '</div>');
		$(document.body).append($t);
		setTimeout(function() { $t.remove(); }, 2000);
	}

	// Resultado de rolagem: popup persistente (só some ao tocar) + histórico da ficha
	function pushRollHistory(char, msg, type) {
		if (!char.rollHistory) char.rollHistory = [];
		char.rollHistory.unshift({t: Date.now(), msg: msg, type: type || "info"});
		if (char.rollHistory.length > 100) char.rollHistory.length = 100;
		CharactersStore.save(char);
	}
	function showRollResult(type, content) {
		$(".characters__toast").remove();
		pushRollHistory(currentChar, content, type);
		var types = {success: "characters__toast--success", info: "characters__toast--info", danger: "characters__toast--danger"};
		var $t = $('<div class="characters__toast ' + (types[type] || types.info) + '" title="Toque para fechar">' + esc(content) + '</div>');
		$t.on("click", function() { $t.remove(); });
		$(document.body).append($t);
	}
	function rollD20WithBonus(bonus, label) {
		var r = 1 + Math.floor(Math.random() * 20);
		var total = r + (bonus || 0);
		var msg = (label || "Rolagem") + ": " + r + (bonus ? " + " + bonus : "") + " = " + total;
		var type = "info";
		if (r === 20) { msg += " — NATURAL 20!"; type = "success"; }
		if (r === 1) { msg += " — natural 1..."; type = "danger"; }
		showRollResult(type, msg);
	}
	function openRollHistoryPopup(char) {
		$("#rollhist-overlay").remove();
		var list = (char && char.rollHistory) || [];
		var h = '<div class="characters__detail-overlay" id="rollhist-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">Histórico de Rolagens</div>';
		h += '<div class="characters__detail-body" style="max-height:360px;overflow:auto">';
		if (!list.length) h += '<div style="color:#667085;font-size:.9em">Nenhuma rolagem ainda.</div>';
		list.forEach(function(r, ix) {
			var d = new Date(r.t);
			var hh = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
			var col = r.type === "success" ? "#2e9e5b" : (r.type === "danger" ? "#d9534f" : "#7ab7ff");
			h += '<div class="characters__detail-part" style="border-left:3px solid ' + col + ';margin-bottom:6px"><span style="color:#667085">' + hh + '</span><span>' + esc(r.msg) + '</span></div>';
		});
		h += '</div><div class="characters__detail-actions">';
		h += '<button class="characters__btn characters__btn--danger" id="rh-clear">Limpar</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="rh-close">Fechar</button>';
		h += '</div></div></div>';
		$(document.body).append(h);
		var $ov = $("#rollhist-overlay");
		$ov.on("click", function(e) { if (e.target === this) $ov.remove(); });
		$ov.find("#rh-close").on("click", function() { $ov.remove(); });
		$ov.find("#rh-clear").on("click", function() { char.rollHistory = []; CharactersStore.save(char); $ov.remove(); openRollHistoryPopup(char); });
	}

	// Garante ataque desarmado padrão em fichas antigas (sem duplicar)
	function ensureDefaultUnarmed(char) {
		if (!char || !Array.isArray(char.weapons)) return;
		var has = char.weapons.some(function(w) { return w && (w.isDefault || /desarmado/i.test(w.name || "")); });
		if (!has) char.weapons.unshift({name:"Ataque Desarmado", dmg1:"1", dmgType:"Contundente", modifier:"str", equipped:true, isDefault:true});
	}
	function getSheetOrder(char) {
		ensureDefaultUnarmed(char);
		var ids = (char && Array.isArray(char.sheetOrder)) ? char.sheetOrder.slice() : [];
		ids = ids.filter(function(id) { return id && SHEET_MODULE_DEFS[id]; });
		if (!ids.length) ids = SHEET_MODULE_DEFAULT_ORDER.slice();
		else SHEET_MODULE_DEFAULT_ORDER.forEach(function(id) { if (ids.indexOf(id) === -1) ids.push(id); });
		// Filtra aba de magias: só aparece se for classe conjuradora
		if (!isAnyCaster(char)) ids = ids.filter(function(id){ return id !== "spells"; });
		// Seções ocultas continuam na lista: são exibidas colapsadas (toque no título alterna)
		return ids;
	}

	function saveSheetOrder(char, ids) {
		char.sheetOrder = ids.slice();
		CharactersStore.save(char);
	}
function sheetOrderIds() {
		var ids = [];
		$root.find("#sheet-modules").children(".characters__module").each(function() { ids.push($(this).data("module")); });
		return ids;
	}

	// === Ocultar/mostrar seções: toque no título da seção ===
	function isModuleCollapsed(char, id) {
		return !!(char && Array.isArray(char.hiddenModules) && char.hiddenModules.indexOf(id) >= 0);
	}

	function bindModuleCollapse() {
		$root.find("#sheet-modules").find(".characters__module-head").each(function() {
			var $head = $(this);
			$head.off(".mcol");
			$head.on("click.mcol", function(evt) {
				// Clique no handle de arrastar não colapsa
				if ($(evt.target).closest(".characters__module-handle").length) return;
				var $module = $head.closest(".characters__module");
				toggleModuleCollapsed(currentChar, $module.data("module"));
			});
		});
	}

	function toggleModuleCollapsed(char, id) {
		if (!char || !SHEET_MODULE_DEFS[id]) return;
		if (!Array.isArray(char.hiddenModules)) char.hiddenModules = [];
		var ix = char.hiddenModules.indexOf(id);
		var collapsed = ix < 0;
		if (collapsed) char.hiddenModules.push(id);
		else char.hiddenModules.splice(ix, 1);
		char.updated = Date.now();
		CharactersStore.save(char);
		var $module = $root.find("#sheet-modules").find('.characters__module[data-module="' + id + '"]');
		$module.toggleClass("is-collapsed", collapsed);
		$module.find(".characters__module-body").stop(true, true).toggle(!collapsed);
		$module.find(".characters__module-caret").text(collapsed ? "▸" : "▾");
	}

	// === Salvamento automático ===
	function autoSaveSheet(char) {
		if (!char) return;
		char.updated = Date.now();
		CharactersStore.save(char);
	}

	function bindAutoSave(char) {
		$root.off(".autosave");
		var flush = function() {
			// Campos sem handler próprio (inventário, notas, inspiração)
			var $inv = $root.find("#in-inv");
			if ($inv.length) char.inventory = $inv.val().split("\n").filter(Boolean);
			var $notes = $root.find("#in-notes");
			if ($notes.length) char.notes = $notes.val();
			var $insp = $root.find(".inspiration-checkbox");
			if ($insp.length) char.inspiration = $insp.is(":checked");
			var $coins = $root.find(".coin-input");
			if ($coins.length) {
				var coins = {};
				$coins.each(function() { coins[$(this).data("coin")] = parseInt($(this).val(), 10) || 0; });
				char.coins = coins;
			}
			var $hpTemp = $root.find("#in-hp-temp");
			if ($hpTemp.length) { if (!char.hp) char.hp = {}; char.hp.temp = parseInt($hpTemp.val(), 10) || 0; }
			autoSaveSheet(char);
		};
		// Qualquer campo alterado na ficha
		$root.on("change.autosave", "#sheet-modules input, #sheet-modules select, #sheet-modules textarea", flush);
		// Digitação (notas/inventário) com debounce
		var tmr = null;
		$root.on("input.autosave", "#in-notes, #in-inv", function() {
			clearTimeout(tmr);
			tmr = setTimeout(flush, 700);
		});
		// Alterações feitas por clique (adicionar/remover arma, magia, talento, descanso...)
		$root.on("click.autosave", "#sheet-modules button, #sheet-modules .characters__search-item, .characters__cond-btn", function() {
			setTimeout(function() { autoSaveSheet(char); }, 0);
		});
	}

	// === Voltar pelo botão do celular (Android) ===
	function handleBackNavigation() {
		// 1) Fecha qualquer popup aberto
		if ($(".characters__detail-overlay, #actions-menu").length) {
			closeCharInfo();
			closeLevelUpDialog();
			closeLevelUpSummary();
			closeRestMenu();
			closeConditionsPanel();
			closeMulticlassDialog();
			closeSubclassDialog();
			closeActionsMenu();
			closeDetail();
			return true;
		}
		// 2) Ficha -> lista de fichas
		if (currentView === "sheet") { currentView = "list"; currentChar = null; renderList(); return true; }
		// 3) Criação -> passo anterior (ou lista)
		if (currentView === "create") {
			if (creationStep > 1) { creationStep--; renderCreation(); }
			else { currentView = "list"; renderList(); }
			return true;
		}
		return false; // deixa o app fechar
	}

	function initBackNavigation() {
		if (initBackNavigation._done) return;
		initBackNavigation._done = true;
		var Cap = global.Capacitor;
		var CapApp = Cap && Cap.Plugins ? Cap.Plugins.App : null;
		if (CapApp && CapApp.addListener) {
			CapApp.addListener("backButton", function() {
				if (!handleBackNavigation() && CapApp.exitApp) CapApp.exitApp();
			});
		}
		// Fallback Cordova-style
		document.addEventListener("backbutton", function(e) {
			if (handleBackNavigation() && e.preventDefault) e.preventDefault();
		}, false);
		// Fallback navegador (histórico)
		window.addEventListener("popstate", function() {
			if (handleBackNavigation()) history.pushState({chSheet: true}, "");
		});
	}

	function renderModules() {
		var char = currentChar;
		if (!char) return;
		var $container = $root.find("#sheet-modules");
		if (!$container.length) return;
		$container.empty();
		getSheetOrder(char).forEach(function(id) {
			var def = SHEET_MODULE_DEFS[id];
			var collapsed = isModuleCollapsed(char, id);
			var $module = $('<section class="characters__module' + (collapsed ? " is-collapsed" : "") + '" data-module="' + id + '"></section>');
			$module.append(
				'<header class="characters__module-head" role="button" tabindex="0" title="Toque para mostrar ou ocultar esta seção">' +
				'<span class="characters__module-handle" title="Arraste para reordenar" aria-label="Reordenar módulo">⋮⋮</span>' +
				'<h4 class="characters__module-title">' + def.title + '</h4>' +
				'<span class="characters__module-caret">' + (collapsed ? "▸" : "▾") + '</span>' +
				'</header>'
			);
			var $body = $('<div class="characters__module-body"></div>');
			if (collapsed) $body.hide();
			$module.append($body);
			$container.append($module);
			def.render($body, char);
		});
		$root.find("#sheet-modules").toggleClass("is-reorder", sheetReorderActive);
		bindModuleDrag();
		bindModuleCollapse();
	}

	function bindModuleDrag() {
		$root.find("#sheet-modules").find(".characters__module-handle").each(function() {
			var $h = $(this);
			$h.off(".mdrag");
			$h.on("mousedown.mdrag touchstart.mdrag", function(evt) {
				evt.preventDefault();
				beginModuleDrag($h.closest(".characters__module"));
			});
		});
	}

	function beginModuleDrag($module) {
		var startOrder = sheetOrderIds().join("|");
		sheetDrag = { active: true, $el: $module, moved: false, startOrder: startOrder };
		$module.addClass("is-dragging");
		$(document).on("mousemove.mdrag touchmove.mdrag", function(evt) {
			if (!sheetDrag) return;
			sheetDrag.moved = true;
			var pointer = evt.originalEvent.touches ? evt.originalEvent.touches[0] : evt;
			moveModuleDrag(pointer.clientY);
		});
		$(document).one("mouseup.mdrag touchend.mdrag", function() {
			$(document).off(".mdrag");
			endModuleDrag();
		});
	}

	function moveModuleDrag(clientY) {
		if (!sheetDrag || !sheetDrag.active) return;
		var $container = $root.find("#sheet-modules");
		var $el = sheetDrag.$el;
		var beforeEl = null;
		$container.children(".characters__module").not(".is-dragging").each(function() {
			var r = this.getBoundingClientRect();
			if (clientY < r.top + r.height / 2) { beforeEl = this; return false; }
		});
		if (beforeEl) $container[0].insertBefore($el[0], beforeEl);
		else $container.append($el);
	}

	function endModuleDrag() {
		if (!sheetDrag) return;
		sheetDrag.$el.removeClass("is-dragging");
		var newIds = sheetOrderIds();
		var changed = (newIds.join("|") !== sheetDrag.startOrder);
		if (changed && currentChar) {
			saveSheetOrder(currentChar, newIds);
			if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: "Ordem das seções atualizada!"});
			else sheetToast("success", "Ordem das seções atualizada!");
		}
		sheetDrag = null;
	}

	function resetSheetOrder() {
		if (!currentChar) return;
		saveSheetOrder(currentChar, SHEET_MODULE_DEFAULT_ORDER.slice());
		renderModules();
		if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: "Ordem padrão restaurada!"});
		else sheetToast("success", "Ordem padrão restaurada!");
	}

	function toggleSheetReorder() {
		sheetReorderActive = !sheetReorderActive;
		$root.find("#btn-reorder").toggleClass("active", sheetReorderActive);
		$root.find("#sheet-modules").toggleClass("is-reorder", sheetReorderActive);
		$root.find("#reorder-hint").toggle(sheetReorderActive);
	}
	var CONDITION_NAMES = {Blinded:"Cego",Charmed:"Encantado",Deafened:"Surdo",Exhaustion:"Exaustão",Frightened:"Assustado",Grappled:"Agarrada",Incapacitated:"Incapacitado",Invisible:"Invisível",Paralyzed:"Paralisado",Petrified:"Petrificado",Poisoned:"Envenenado",Prone:"Caída",Restrained:"Contida",Stunned:"Atordoado",Unconscious:"Inconsciente"};
	var CONDITION_KEYS = Object.keys(CONDITION_NAMES).sort();
	function openConditionsPanel(char){closeConditionsPanel();var cur=char.conditions||[];var h='<div class="characters__detail-overlay" id="conditions-overlay"><div class="characters__detail">';h+='<div class="characters__detail-title">Condições & Doenças</div>';h+='<div class="characters__conditions-grid">';CONDITION_KEYS.forEach(function(k){var a=cur.indexOf(k)>=0;h+='<button type="button" class="characters__cond-btn'+(a?' is-active':'')+'" data-cond="'+k+'">'+CONDITION_NAMES[k]+'</button>';});h+='</div>';h+='<div class="characters__detail-actions"><button class="characters__btn characters__btn--primary" id="conds-ok">OK</button></div>';h+='</div></div>';$(document.body).append(h);var $ov=$('#conditions-overlay');$ov.on('click',function(e){if(e.target===$ov[0])closeConditionsPanel();});$ov.find('.characters__cond-btn').on('click',function(){$(this).toggleClass('is-active');});$ov.find('#conds-ok').on('click',function(){var s=[];$ov.find('.characters__cond-btn.is-active').each(function(){s.push($(this).data('cond'));});char.conditions=s;closeConditionsPanel();renderModules();if(global.JqueryUtil&&global.JqueryUtil.doToast)global.JqueryUtil.doToast({type:'success',content:'Condições atualizadas!'});else sheetToast('success','Condições atualizadas!');});}
	function closeConditionsPanel(){$('#conditions-overlay').remove();}
	function bindInfoEditable($ov, char) {
		var hold = 0;
		$ov.off('.edit').on('mousedown.edit touchstart.edit', '.characters__info-editable', function(e) {
			e.preventDefault();
			var $s = $(e.currentTarget);
			if ($s.data('editing')) return;
			$s.data('pending', true);
			hold = window.setTimeout(function() { startEdit($s); }, 600);
		});
		$ov.on('mouseup.edit mouseleave.edit touchend.edit', '.characters__info-editable', function(e) {
			var $s = $(e.currentTarget);
			if ($s.data('pending')) { clearTimeout(hold); $s.removeData('pending'); }
		});
		function startEdit($s) {
			$s.removeData('pending');
			$s.data('editing', true);
			var key = $s.data('edit');
			var old = $s.text();
			var $in = $('<input type="text" class="characters__form-input characters__edit-input">').val(old);
			$s.html($in);
			$in.focus(); $in[0].select();
			var committed = false;
			function revert() { $s.removeData('editing'); $s.text(old); }
			function commit() {
				if (committed) return; committed = true;
				$s.removeData('editing');
				var val = $in.val().trim();
				if (key === 'languages') { char.languages = val ? val.split(/\s*,\s*/).filter(Boolean) : []; }
				else { try { char[key] = isNaN(val) ? val : parseFloat(val); } catch (e) {} }
				char.updated = Date.now();
				CharactersStore.save(char);
				$s.text(val);
				if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type:'success',content:'Informação atualizada!'});
				else sheetToast('success','Informação atualizada!');
			}
			$in.off('blur.edit');
			$in.on('keydown', function(ev) { if (ev.key === 'Enter') { $in.off('blur.edit'); commit(); } if (ev.key === 'Escape') { $in.off('blur.edit'); revert(); } });
			$in.on('blur.edit', commit);
		}
	}
		function openCharInfo(char){char=char||currentChar;closeCharInfo();var h='<div class="characters__detail-overlay" id="charinfo-overlay"><div class="characters__detail characters__detail--wide">';h+='<div class="characters__detail-title">Informações</div>';h+='<div class="characters__info-scroll">'+(char?buildInfoContent(char):'<div class="characters__detail-auto">Sem personagem selecionado.</div>')+'</div>';h+='<div class="characters__detail-actions"><button class="characters__btn characters__btn--primary" id="charinfo-ok">Fechar</button></div>';h+='</div></div>';$(document.body).append(h);var $ov=$('#charinfo-overlay');$ov.on('click',function(e){if(e.target===$ov[0])closeCharInfo();});bindInfoEditable($ov, char);$ov.find('#charinfo-ok').on('click',closeCharInfo);}
	function closeCharInfo(){$('#charinfo-overlay').remove();}
	function openRestMenu(char){closeRestMenu();var h='<div class="characters__detail-overlay" id="rest-overlay"><div class="characters__detail">';h+='<div class="characters__detail-title">Descanso & Recuperação</div>';h+='<div class="characters__rest-info"><b>Descanso Curto (1h):</b> gaste dados de vida para recuperar PV; recupera algumas habilidades.</div>';h+='<div class="characters__rest-info"><b>Descanso Longo (8h):</b> recupera todo PV, metade dos dados de vida, espaços de magia e habilidades.</div>';h+='<div class="characters__detail-actions">';h+='<button class="characters__btn characters__btn--secondary" id="rest-short">Descanso Curto</button>';h+='<button class="characters__btn characters__btn--primary" id="rest-long">Descanso Longo</button>';h+='</div></div></div>';$(document.body).append(h);var $ov=$('#rest-overlay');$ov.on('click',function(e){if(e.target===$ov[0])closeRestMenu();});$ov.find('#rest-short').on('click',function(){closeRestMenu();openShortRestPopup(char,function(total){char.deathSaves={failures:0,successes:0};renderModules();var msg=total>0?('Descanso curto! '+total+' PV recuperados.'):'Descanso curto concluido.';if(global.JqueryUtil&&global.JqueryUtil.doToast)global.JqueryUtil.doToast({type:'success',content:msg});else sheetToast('success',msg);});});$ov.find('#rest-long').on('click',function(){if(!char.hp)char.hp={};char.hp.current=char.hp.max||char.hp.current;char.hp.temp=0;char.deathSaves={failures:0,successes:0};if(char.conditions&&char.conditions.indexOf('Exhaustion')>=0)char.conditions=char.conditions.filter(function(c){return c!=='Exhaustion';});closeRestMenu();renderModules();if(global.JqueryUtil&&global.JqueryUtil.doToast)global.JqueryUtil.doToast({type:'success',content:'Descanso longo! PV total restaurado.'});else sheetToast('success','Descanso longo! PV total restaurado.');});}
function closeRestMenu(){$('#rest-overlay').remove();}
	function openMulticlassDialog(char) {
		closeMulticlassDialog();
		var html = '<div class="characters__detail-overlay" id="multiclass-overlay"><div class="characters__detail">';
		html += '<div class="characters__detail-title">Adicionar Classe (Multiclasse)</div>';
		html += '<div class="characters__rest-info">Requisito: atributo principal ≥ 13 da nova classe.</div>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Nova Classe</label>';
		html += '<select class="characters__form-select" id="mc-class">';
		var classList = ["Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard","Artificer"];
		classList.forEach(function(cn){
			var req = MULTICLASS_REQ[cn];
			var abilScore = effAbility(char, req.abil);
			var ok = abilScore >= req.min;
			var abilName = ABILITY_NAMES[req.abil];
			html += '<option value="'+cn+'" '+(ok?'':'disabled style="color:#aaa"')+'>'+cn+' — exige '+abilName+' ≥ '+req.min+' ('+abilScore+')</option>';
		});
		html += '</select></div>';
		html += '<div class="characters__detail-actions">';
		html += '<button class="characters__btn characters__btn--primary" id="mc-confirm">Adicionar</button>';
		html += '<button class="characters__btn characters__btn--secondary" id="mc-cancel">Cancelar</button>';
		html += '</div></div></div>';
		$(document.body).append(html);
		var $ov = $('#multiclass-overlay');
		$ov.on('click', function(e){ if(e.target===$ov[0]) closeMulticlassDialog(); });
		$ov.find('#mc-cancel').on('click', closeMulticlassDialog);
		$ov.find('#mc-confirm').on('click', function(){
			var cn = $ov.find('#mc-class').val();
			var req = MULTICLASS_REQ[cn];
			if (effAbility(char, req.abil) < req.min) { sheetToast("info","Não cumpre o requisito de "+ABILITY_NAMES[req.abil]+"."); return; }
			if (!char.classes || !char.classes.length) {
				char.classes = [{name:char.className||"", subclass:char.subclass||"", level:char.level||1}];
			}
			// Nova classe começa no nível 1 — a subclasse só é escolhida quando
			// ESSA classe atingir o nível de desbloqueio (SUBCLASS_LEVELS, ex.: 3).
			char.classes.push({name:cn, subclass:"", level:1});
			// 1º nível da nova classe concede o dado de vida COMPLETO + CON
			// (regra de multiclasse). Sem isso a ficha ficava com PV a menos.
			var hdNew = CLASS_HIT_DICE[cn] || 8;
			var conM = calcMod((char.scores.con||8)+(char.rawScores.con||0));
			var hpGain = hdNew + conM;
			if (!char.hp) char.hp = {};
			char.hp.max = (char.hp.max || 0) + hpGain;
			char.hp.current = Math.min(char.hp.max, (char.hp.current != null ? char.hp.current : char.hp.max) + hpGain);
			char.level = totalLevel(char);
			char.spellSlots = calculateSpellSlots(char);
			char.spellAttackBonus = calculateSpellAttackBonus(char);
			char.spellDC = 8 + char.spellAttackBonus;
			char.updated = Date.now();
			CharactersStore.save(char);
			closeMulticlassDialog();
			renderModules();
			// Escolhas de nível 1 da nova classe (ex.: expertise do ladino,
			// estilo de luta do guerreiro) são pedidas na hora certa
			var pendMC = getLevelChoices(cn, 1);
			var gainedMC = (function() {
				var clsAllMC = classesData.filter(function(x) { return x.name === cn; });
				var srcMC = clsAllMC.length ? clsAllMC[0].source : null;
				return gainedFeaturesForLevel(cn, srcMC, "", 1);
			})();
			if (pendMC.length) {
				runChoiceQueue(char, pendMC, function() {
					if (gainedMC.length) showGainedFeaturesPopup("Multiclasse: " + cn + " — Habilidades Ganhas", gainedMC);
				});
			} else if (gainedMC.length) {
				showGainedFeaturesPopup("Multiclasse: " + cn + " — Habilidades Ganhas", gainedMC);
			}
			if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type:"success",content:"Multiclasse: +1 nível em "+cn+" (+"+hpGain+" PV máx)!"});
			else sheetToast("success","Multiclasse adicionada (+"+hpGain+" PV máx)!");
		});
	}
	function closeMulticlassDialog() { $('#multiclass-overlay').remove(); }

	function closeRestMenu(){$('#rest-overlay').remove();}

function renderModuleAbilities($body, char) {
		var html = '';
		if (char.conditions && char.conditions.length) {
			html += '<div class="characters__cond-badges">';
			char.conditions.forEach(function(c) {
				html += '<span class="characters__cond-badge" title="' + CONDITION_NAMES[c] + ' (' + c + ')">' + CONDITION_NAMES[c] + '</span>';
			});
			html += '</div>';
		}
		html += '<div class="characters__stats-toolbar">';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-levelup" title="Subir de nível">Nível</button>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-charinfo" title="Informações">Info</button>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-rest" title="Descanso & condições">Descanso</button>';
		html += '</div>';
		html += '<div class="characters__sheet-stats">';
		ABILITY_ABVS.forEach(function(a) {
			var total = effAbility(char, a);
			var mod = calcMod(total);
			html += '<div class="characters__stat characters__stat--roll">';
			html += '<div class="characters__stat-name">' + ABILITY_NAMES[a] + '</div>';
			html += '<div class="characters__stat-value">' + ovSpan(char, "ab:" + a, (char.scores[a] || 8) + (char.rawScores[a] || 0), "plain") + '</div>';
			html += '<div class="characters__stat-mod">' + (mod >= 0 ? "+" : "") + mod + '</div>';
			html += '<div class="characters__stat-roll" data-d20="' + mod + '" data-label="' + ABILITY_NAMES[a] + '" title="Rolar d20 + modificador">rolar</div>';
			html += '</div>';
		});
		html += '</div>';
		$body.html(html);
		$body.find(".characters__stat-roll").on("click", function(e) {
			e.stopPropagation();
			if (guardDetailClick()) return;
			rollD20WithBonus(parseInt($(this).data("d20"), 10), $(this).data("label"));
		});
		$body.find("#btn-levelup").on("click", function() { openLevelUpDialog(char); });
		$body.find("#btn-charinfo").on("click", function() { openCharInfo(currentChar); });
		$body.find("#btn-rest").on("click", function(e) {
			e.stopPropagation();
			openActionsMenu(char, $(this));
		});
	}
// === Subclasse: escolher/alterar em qualquer nível ===
	function subclassesForClass(clsName) {
		return subclassesData.filter(function(sc) { return (sc._classNameEN || sc.className) === clsName; })
			.sort(function(a, b) {
				return String(a.name).localeCompare(String(b.name)) ||
					srcRank(a.source || "") - srcRank(b.source || "");
			});
	}

	function closeSubclassDialog() { $('#subclass-overlay').remove(); }

	function openSubclassDialog(char, clsEntry, onDone) {
		closeSubclassDialog();
		var classes = charClasses(char);
		var target = clsEntry || classes[0];
		if (!target) { sheetToast("info", "Nenhuma classe para definir subclasse."); return; }
		var list = subclassesForClass(target.name);
		if (!list.length) { sheetToast("info", "Esta classe não possui subclasses cadastradas."); return; }
		var subLevel = SUBCLASS_LEVELS[target.name] || 3;
		var html = '<div class="characters__detail-overlay" id="subclass-overlay"><div class="characters__detail">';
		html += '<div class="characters__detail-title">Subclasse — ' + esc(target.name) + ' (Nv. ' + (target.level || 1) + ')</div>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Escolha a subclasse</label>';
		html += '<select class="characters__form-select" id="subclass-pick"><option value="">Selecione...</option>';
		list.forEach(function(sc) {
			var dup = list.filter(function(o) { return (o.name || "").toLowerCase() === (sc.name || "").toLowerCase(); }).length > 1;
			var val = dup ? (sc.name + "|" + sc.source) : sc.name;
			var label = dup ? (sc.name + " [" + sc.source + "]") : sc.name;
			var sel = (target.subclass === val || target.subclass === sc.name) ? " selected" : "";
			html += '<option value="' + esc(val) + '"' + sel + '>' + esc(label) + '</option>';
		});
		html += '</select></div>';
		html += '<div class="characters__rest-info">A subclasse desta classe é escolhida a partir do nível ' + subLevel +
			'. Escolher aqui também permite trocar a subclasse depois.</div>';
		html += '<div class="characters__detail-actions">';
		html += '<button class="characters__btn characters__btn--primary" id="subclass-ok">Confirmar</button>';
		html += '<button class="characters__btn characters__btn--secondary" id="subclass-cancel">Cancelar</button>';
		html += '</div></div></div>';
		$(document.body).append(html);
		var $ov = $('#subclass-overlay');
		$ov.on('click', function(e) { if (e.target === $ov[0]) closeSubclassDialog(); });
		$ov.find('#subclass-cancel').on('click', closeSubclassDialog);
		$ov.find('#subclass-ok').on('click', function() {
			var val = $ov.find('#subclass-pick').val();
			if (!val) { sheetToast("info", "Selecione uma subclasse."); return; }
			target.subclass = val;
			// campo legado (usado no cabeçalho/exportação) para a classe principal
			if (char.classes && char.classes[0] === target) char.subclass = val;
			char.updated = Date.now();
			CharactersStore.save(char);
			closeSubclassDialog();
			var sc = findSubclassByKey(val);
			var msg = "Subclasse definida: " + (sc ? sc.name : val);
			if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: msg});
			else sheetToast("success", msg);
			renderSheetHeader(char);
			renderModules();
			if (typeof onDone === "function") onDone(sc);
		});
	}

	function openLevelUpDialog(char) {
	closeLevelUpDialog();
	var total = totalLevel(char);
	if (total >= 20) { sheetToast("info","Nível máximo (20) atingido."); return; }
	var classes = charClasses(char);
	var html = '<div class="characters__detail-overlay" id="levelup-overlay"><div class="characters__detail">';
	html += '<div class="characters__detail-title">Subir de Nível</div>';
	html += '<div class="characters__detail-auto">Nível total: <b>' + total + '/20</b></div>';
	html += '<div class="characters__rest-info">Escolha em qual classe subir de nível:</div>';
	html += '<div class="characters__levelup-classes">';
	classes.forEach(function(c, ix) {
		var sc = subObjFromKey(c.subclass, c.name);
		var subLevel = SUBCLASS_LEVELS[c.name] || 3;
		var needsSub = ((c.level || 1) + 1) >= subLevel && !c.subclass;
		html += '<button class="characters__btn characters__btn--secondary" data-lu-class="' + ix + '">' +
			esc(c.name) + ' — Nv. ' + (c.level || 1) + ' → ' + ((c.level || 1) + 1) +
			'<span class="characters__feature-source">' + (sc ? esc(sc.name) : (needsSub ? "escolher subclasse no próximo nível" : "sem subclasse")) + '</span></button>';
	});
	html += '</div>';
	html += '<div class="characters__detail-actions">';
	html += '<button class="characters__btn characters__btn--primary" id="lu-multiclass">+ Multiclasse</button>';
	html += '<button class="characters__btn characters__btn--secondary" id="lu-cancel">Cancelar</button>';
	html += '</div></div></div>';
	$(document.body).append(html);
	var $ov = $('#levelup-overlay');
	$ov.on('click', function(e){ if(e.target===$ov[0]) closeLevelUpDialog(); });
	$ov.find('#lu-cancel').on('click', closeLevelUpDialog);
	$ov.find('[data-lu-class]').on('click', function() {
		var ix = parseInt($(this).data('lu-class'), 10) || 0;
		closeLevelUpDialog();
		doLevelUp(char, ix);
	});
	$ov.find('#lu-multiclass').on('click', function(){ closeLevelUpDialog(); openMulticlassDialog(char); });
}
function closeLevelUpDialog() { $('#levelup-overlay').remove(); }
function closeLevelUpSummary() { $('#levelup-summary-overlay').remove(); }
// Retorna o nome da classe principal (primeira do array classes[], ou className)
function getPrimaryClassName(char) {
	if (char.classes && char.classes.length) return char.classes[0].name;
	return char.className || "";
}
// === ESCOLHAS AO SUBIR DE NÍVEL (regras PHB 2014) ===
// ASI (talento ou +2), Expertise (bardo/ladino), Estilo de Luta (guerreiro/
// paladino/ranger), Dádiva do Pacto (bruxo), Metamagia (feiticeiro) e
// Segredos Mágicos (bardo). A subclasse continua regida por SUBCLASS_LEVELS.
var ASI_LEVELS = [4, 8, 12, 16, 19];
var ASI_EXTRA = {Fighter: [6, 14], Rogue: [10]};
var EXPERTISE_LEVELS = {Bard: [3, 10], Rogue: [1, 6]};
var STYLE_LEVELS = {Fighter: [1], Paladin: [2], Ranger: [2]};
var PACT_LEVELS = {Warlock: [3]};
var METAMAGIC_LEVELS = {Sorcerer: [3, 10, 17]};
var SECRETS_LEVELS = {Bard: [10, 14, 18]};
var FIGHTING_STYLES = [
	{name: "Archery", pt: "Arqueirismo — +2 para acertar ataques à distância"},
	{name: "Defense", pt: "Defesa — +1 CA enquanto estiver usando armadura"},
	{name: "Dueling", pt: "Duelismo — +2 de dano com arma de uma mão (sem outras armas)"},
	{name: "Great Weapon Fighting", pt: "Luta com Arma Grande — relança 1s no dano de arma pesada com duas mãos"},
	{name: "Protection", pt: "Proteção — reação: desvantagem no ataque contra um aliado próximo"},
	{name: "Two-Weapon Fighting", pt: "Luta com Duas Armas — adiciona o mod. de atributo ao dano da segunda arma"}
];
var PACT_BOONS = [
	{name: "Pact of the Blade", pt: "Pacto da Lâmina — invoca uma arma mágica do pacto"},
	{name: "Pact of the Chain", pt: "Pacto da Corrente — ganha um familiar"},
	{name: "Pact of the Tome", pt: "Pacto do Tomo — livro de pactos com 3 truques de qualquer classe"}
];
var METAMAGIC_OPTIONS = [
	{name: "Careful Spell", pt: "Feitiço Cuidadoso — aliados na área podem passar no teste de resistência"},
	{name: "Distant Spell", pt: "Feitiço Distante — dobra o alcance da magia"},
	{name: "Empowered Spell", pt: "Feitiço Potencializado — relança até N dados de dano baixos"},
	{name: "Extended Spell", pt: "Feitiço Estendido — dobra a duração"},
	{name: "Heightened Spell", pt: "Feitiço Elevado — alvo tem desvantagem no teste contra a magia"},
	{name: "Quickened Spell", pt: "Feitiço Acelerado — conjura em 1 ação bônus"},
	{name: "Subtle Spell", pt: "Feitiço Sutil — sem componentes verbais/somáticos"},
	{name: "Twinned Spell", pt: "Feitiço Gêmeo — mira um segundo alvo"}
];
function getLevelChoices(clsName, level) {
	var out = [];
	function add(type, title, subtitle) {
		out.push({key: clsName + ":" + type + ":" + level, type: type, clsName: clsName, level: level, title: title, subtitle: subtitle});
	}
	var lv = level;
	if (ASI_LEVELS.indexOf(lv) >= 0 || (ASI_EXTRA[clsName] || []).indexOf(lv) >= 0) {
		add("asi", "Incremento no Valor de Atributo", "Escolha um talento ou distribua +2 pontos de atributo (+2 em um atributo, ou +1 em dois).");
	}
	if ((EXPERTISE_LEVELS[clsName] || []).indexOf(lv) >= 0) {
		add("expertise2", "Especialização (Expertise)", "Escolha 2 perícias em que você é proficiente para dobrar o bônus de proficiência.");
	}
	if ((STYLE_LEVELS[clsName] || []).indexOf(lv) >= 0) {
		add("style", "Estilo de Luta", "Escolha um estilo de luta.");
	}
	if ((PACT_LEVELS[clsName] || []).indexOf(lv) >= 0) {
		add("pact", "Dádiva do Pacto", "Escolha o formato do seu pacto com o patrono.");
	}
	if ((METAMAGIC_LEVELS[clsName] || []).indexOf(lv) >= 0) {
		add("metamagic2", "Metamagia", "Escolha 2 opções de metamagia.");
	}
	if ((SECRETS_LEVELS[clsName] || []).indexOf(lv) >= 0) {
		add("secretspells2", "Segredos Mágicos", "Escolha 2 magias de qualquer classe para o seu repertório.");
	}
	return out;
}
function markChoiceTaken(char, key) {
	if (!char.takenChoices) char.takenChoices = [];
	if (char.takenChoices.indexOf(key) < 0) char.takenChoices.push(key);
}
// Executa a fila de escolhas uma a uma; chama onDone quando todas forem respondidas
function runChoiceQueue(char, queue, onDone) {
	if (!queue || !queue.length) { if (typeof onDone === "function") onDone(); return; }
	var ch = queue.shift();
	showLevelChoiceDialog(char, ch, function(result) {
		applyLevelChoice(char, ch, result);
		runChoiceQueue(char, queue, onDone);
	});
}
function applyLevelChoice(char, ch, res) {
	if (!char.takenChoices) char.takenChoices = [];
	if (char.takenChoices.indexOf(ch.key) < 0) char.takenChoices.push(ch.key);
	if (!char.choices) char.choices = {};
	var rt = res ? res.type : null;
	if (rt === "asi-points") {
		markChoiceTaken(char, ch.clsName + ":asi:" + ch.level);
		ABILITY_ABVS.forEach(function(a) {
			var n = (res && res.points && res.points[a]) || 0;
			if (n) char.scores[a] = (char.scores[a] || 8) + n;
		});
		char.choices.asi = char.choices.asi || [];
		char.choices.asi.push({level: ch.level, points: res.points});
	} else if (rt === "asi-feat") {
		markChoiceTaken(char, ch.clsName + ":asi:" + ch.level);
		if (!char.feats) char.feats = [];
		char.feats.push({name: res.name, source: res.source || "PHB"});
	} else if (rt === "expertise2") {
		(res.picks || []).forEach(function(k) { if (char.skills) char.skills[k] = 2; });
	} else if (rt === "style") {
		char.fightingStyle = res.name;
	} else if (rt === "pact") {
		char.choices.pact = res.name;
	} else if (rt === "metamagic2") {
		char.choices.metamagic = (char.choices.metamagic || []).concat(res.picks || []);
	} else if (rt === "secretspells2") {
		(res.spells || []).forEach(function(s) {
			if (!char.spells) char.spells = [];
			char.spells.push({name: s.name, level: s.level, school: s.school});
		});
	}
	if (!char.hp) char.hp = {};
	char.updated = Date.now();
	CharactersStore.save(char);
	renderSheetHeader(char);
	renderModules();
}
// Diálogo genérico de escolha de nível
function closeLevelChoiceDialog() { $('#choices-overlay').remove(); }
function showLevelChoiceDialog(char, ch, onDone) {
	closeLevelChoiceDialog();
	var html = '<div class="characters__detail-overlay" id="choices-overlay"><div class="characters__detail">';
	html += '<div class="characters__detail-title">' + esc(ch.title) + '</div>';
	html += '<div class="characters__rest-info">' + esc(ch.subtitle) + (ch.clsName ? ' <b>(' + esc(ch.clsName) + ' — Nv. ' + ch.level + ')</b>' : '') + '</div>';
	html += '<div id="choices-body"></div>';
	html += '<div class="characters__detail-actions">';
	html += '<button class="characters__btn characters__btn--primary" id="choices-ok">Confirmar</button>';
	html += '<button class="characters__btn characters__btn--secondary" id="choices-cancel">Cancelar</button>';
	html += '</div></div></div>';
	$(document.body).append(html);
	var $ov = $('#choices-overlay');
	$ov.on('click', function(e) { if (e.target === $ov[0]) closeLevelChoiceDialog(); });
	$ov.find('#choices-cancel').on('click', closeLevelChoiceDialog);
	var $body = $ov.find('#choices-body');
	function validateAndDone(res) { closeLevelChoiceDialog(); onDone(res); }
	// --- ASI: talento ou pontos ---
	if (ch.type === "asi") {
		var mode = "points";
		var body = '<div class="characters__tabs">';
		body += '<button class="characters__tab active" data-asi-mode="points">Pontos de Atributo</button>';
		body += '<button class="characters__tab" data-asi-mode="feat">Escolher Talento</button></div>';
		body += '<div id="asi-points"></div><div id="asi-feat" style="display:none"></div>';
		$body.html(body);
		function renderPoints() {
			var h = '<div class="characters__skills-grid">';
			ABILITY_ABVS.forEach(function(a) {
				h += '<div class="characters__skill-item"><label>' + ABILITY_NAMES[a] + '</label>' +
					'<input type="number" class="characters__form-input asi-step" data-abil="' + a + '" value="0" min="0" max="2" style="width:64px"></div>';
			});
			h += '</div><div class="characters__rest-info">Total distribuído: <b id="asi-total">0</b> / 2</div>';
			$ov.find('#asi-points').html(h);
			$ov.on('change input', '.asi-step', function() {
				var v = parseInt($(this).val(), 10) || 0;
				if (v < 0) v = 0; if (v > 2) v = 2; $(this).val(v);
				var t = 0; $ov.find('.asi-step').each(function() { t += (parseInt($(this).val(), 10) || 0); });
				$ov.find('#asi-total').text(t);
			});
		}
		function renderFeat() {
			var seen = {}, list = [];
			featsData.forEach(function(f) {
				if (!f || !f.name) return;
				var k = f.name.toLowerCase();
				if (!seen[k]) { seen[k] = {srcs: [f.source || "PHB"], first: f}; list.push(f); }
				else if (seen[k].srcs.indexOf(f.source) < 0) seen[k].srcs.push(f.source);
			});
			list.sort(function(a, b) { return a.name.localeCompare(b.name); });
			var h = '<select class="characters__form-select" id="asi-feat-pick"><option value="">Selecione um talento...</option>';
			list.forEach(function(f) {
				var dup = seen[f.name.toLowerCase()].srcs.length > 1;
				h += '<option value="' + esc(f.name + (dup ? "|" + f.source : "")) + '">' + esc(f.name + (dup ? " [" + f.source + "]" : "")) + '</option>';
			});
			h += '</select>';
			$ov.find('#asi-feat').html(h);
		}
		renderPoints();
		$ov.on('click', '[data-asi-mode]', function() {
			mode = $(this).data('asi-mode');
			$ov.find('[data-asi-mode]').removeClass('active');
			$(this).addClass('active');
			$ov.find('#asi-points').toggle(mode === 'points');
			$ov.find('#asi-feat').toggle(mode === 'feat');
			if (mode === 'feat' && !$ov.find('#asi-feat').children().length) renderFeat();
		});
		$ov.find('#choices-ok').on('click', function() {
			if (mode === 'points') {
				var points = {}, total = 0;
				$ov.find('.asi-step').each(function() {
					var n = parseInt($(this).val(), 10) || 0;
					if (n) points[$(this).data('abil')] = n;
					total += n;
				});
				if (total !== 2) { sheetToast("info", "Distribua exatamente 2 pontos (+2 em um atributo, ou +1 em dois)."); return; }
				validateAndDone({type: 'asi-points', points: points});
			} else {
				var val = $ov.find('#asi-feat-pick').val();
				if (!val) { sheetToast("info", "Selecione um talento."); return; }
				var nm = val, src = "PHB", ix = val.indexOf("|");
				if (ix >= 0) { nm = val.slice(0, ix); src = val.slice(ix + 1); }
				validateAndDone({type: 'asi-feat', name: nm, source: src});
			}
		});
		return;
	}
	// --- Expertise: 2 perícias proficientes ---
	if (ch.type === "expertise2") {
		var prof = [];
		Object.keys(SKILL_KEY_TO_PT).forEach(function(k) {
			if ((char.skills && char.skills[k]) === 1) prof.push(k);
		});
		if (!prof.length) {
			sheetToast("info", "Nenhuma perícia proficiente para especializar. Escolha registrada como pendente.");
			closeLevelChoiceDialog(); markChoiceTaken(char, ch.key); onDone(null); return;
		}
		var h = '<div class="characters__skills-grid">';
		prof.forEach(function(k) {
			h += '<div class="characters__skill-item"><label>' + esc(SKILL_KEY_TO_PT[k]) + '</label>' +
				'<input type="checkbox" class="expertise-cb" data-key="' + k + '"></div>';
		});
		h += '</div><div class="characters__rest-info">Escolhidas: <b id="exp-count">0</b> / 2</div>';
		$body.html(h);
		$ov.on('change', '.expertise-cb', function() {
			if ($ov.find('.expertise-cb:checked').length > 2) $(this).prop('checked', false);
			$ov.find('#exp-count').text($ov.find('.expertise-cb:checked').length);
		});
		$ov.find('#choices-ok').on('click', function() {
			var picks = [];
			$ov.find('.expertise-cb:checked').each(function() { picks.push($(this).data('key')); });
			if (picks.length !== 2) { sheetToast("info", "Escolha exatamente 2 perícias."); return; }
			validateAndDone({type: 'expertise2', picks: picks});
		});
		return;
	}
	doShowPickDialog($ov, $body, ch, validateAndDone);
}
// Parte 2 do diálogo: rádio (estilo de luta/dádiva do pacto) e selects duplos (metamagia/segredos)
function doShowPickDialog($ov, $body, ch, validateAndDone) {
	// --- Estilo de Luta / Dádiva do Pacto (rádio) ---
	if (ch.type === "style" || ch.type === "pact") {
		var opts = ch.type === "style" ? FIGHTING_STYLES : PACT_BOONS;
		var h = '<div class="characters__skills-grid">';
		opts.forEach(function(o, i) {
			h += '<div class="characters__skill-item"><label>' + esc(o.name) + '</label>' +
				'<input type="radio" name="choice-pick" value="' + i + '"' + (i === 0 ? " checked" : "") + '></div>' +
				'<div class="characters__feature-desc" style="grid-column:1/-1">' + esc(o.pt) + '</div>';
		});
		h += '</div>';
		$body.html(h);
		$ov.find('#choices-ok').on('click', function() {
			var i = parseInt($ov.find('input[name="choice-pick"]:checked').val(), 10) || 0;
			validateAndDone({type: ch.type, name: opts[i].name});
		});
		return;
	}
	// --- Metamagia / Segredos Mágicos: 2 selects ---
	if (ch.type === "metamagic2" || ch.type === "secretspells2") {
		var h2 = '<div class="characters__form-group"><label class="characters__form-label">Opção 1</label>' +
			'<select class="characters__form-select mm-pick" id="mm-1"><option value="">Selecione...</option></select></div>' +
			'<div class="characters__form-group"><label class="characters__form-label">Opção 2</label>' +
			'<select class="characters__form-select mm-pick" id="mm-2"><option value="">Selecione...</option></select></div>';
		$body.html(h2);
		function fillSelects() {
			var vals = {};
			$ov.find('.mm-pick').each(function() { if ($(this).val()) vals[$(this).val()] = true; });
			$ov.find('.mm-pick').each(function() {
				var $s = $(this), cur = $s.val();
				$s.empty().append('<option value="">Selecione...</option>');
				var list;
				if (ch.type === "metamagic2") {
					list = METAMAGIC_OPTIONS.map(function(o) { return {v: o.name, l: o.name + " — " + o.pt}; });
				} else {
					var seen = {};
					list = spellsData.filter(function(s) { return s && s.name && !seen[s.name.toLowerCase()] && (seen[s.name.toLowerCase()] = true); })
						.sort(function(a, b) { return a.name.localeCompare(b.name); })
						.map(function(s) {
							return {v: s.name + "|" + (s.level != null ? s.level : "") + "|" + (s.school || ""),
								l: s.name + (s.level != null ? (s.level === 0 ? " (truque)" : " (Nv. " + s.level + ")") : "")};
						});
				}
				list.forEach(function(o) { if (!vals[o.v] || o.v === cur) $s.append('<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'); });
				$s.val(cur);
			});
		}
		fillSelects();
		$ov.on('change', '.mm-pick', fillSelects);
		$ov.find('#choices-ok').on('click', function() {
			var picks = [];
			$ov.find('.mm-pick').each(function() { if ($(this).val()) picks.push($(this).val()); });
			if (picks.length !== 2) { sheetToast("info", "Escolha 2 opções."); return; }
			if (ch.type === "metamagic2") validateAndDone({type: 'metamagic2', picks: picks});
			else {
				var sp = picks.map(function(v) {
					var p = v.split("|");
					return {name: p[0], level: p[1] !== "" ? parseInt(p[1], 10) : 0, school: p[2] || ""};
				});
				validateAndDone({type: 'secretspells2', spells: sp});
			}
		});
		return;
	}
}
function doLevelUp(char, classIdx) {
	classIdx = (typeof classIdx === "number" && classIdx >= 0) ? classIdx : 0;
	function computePre(char, clsName) {
		var hd = CLASS_HIT_DICE[clsName] || 8;
		var conM = calcMod((char.scores.con||8)+(char.rawScores.con||0));
		var pre = {
			level: char.level || 1,
			hpMax: char.hp && char.hp.max ? char.hp.max : (hd + conM),
			hpCur: char.hp && char.hp.current != null ? char.hp.current : (char.hp && char.hp.max ? char.hp.max : (hd + conM)),
			hpTemp: char.hp && char.hp.temp || 0,
			spellSlots: (char.spellSlots && typeof char.spellSlots === 'object' && !Array.isArray(char.spellSlots)) ? JSON.parse(JSON.stringify(char.spellSlots)) : {},
			spellAB: char.spellAttackBonus,
			spellDC: char.spellDC,
			prof: calcProfBonus(char.level || 1),
			pp: calculatePassivePerception(char),
			ac: (char.ac != null) ? char.ac : (10 + calcMod((char.scores.dex||8)+(char.rawScores.dex||0))),
			init: (char.initiative != null) ? char.initiative : calcMod((char.scores.dex||8)+(char.rawScores.dex||0)),
			speed: char.speed || 30,
			ds: char.deathSaves ? JSON.parse(JSON.stringify(char.deathSaves)) : {failures:0,successes:0}
		};
		return pre;
	}
		function computePost(char) {
		var hd = CLASS_HIT_DICE[clsName] || 8;
		var conM = calcMod((char.scores.con||8)+(char.rawScores.con||0));
		var post = {
			level: char.level || 1,
			hpMax: char.hp && char.hp.max ? char.hp.max : (hd + conM),
			hpCur: char.hp && char.hp.current != null ? char.hp.current : (char.hp && char.hp.max ? char.hp.max : (hd + conM)),
			hpTemp: char.hp && char.hp.temp || 0,
			spellSlots: (char.spellSlots && typeof char.spellSlots === 'object' && !Array.isArray(char.spellSlots)) ? JSON.parse(JSON.stringify(char.spellSlots)) : {},
			spellAB: char.spellAttackBonus,
			spellDC: char.spellDC,
			prof: calcProfBonus(char.level || 1),
			pp: calculatePassivePerception(char),
			ac: (char.ac != null) ? char.ac : (10 + calcMod((char.scores.dex||8)+(char.rawScores.dex||0))),
			init: (char.initiative != null) ? char.initiative : calcMod((char.scores.dex||8)+(char.rawScores.dex||0)),
			speed: char.speed || 30,
			ds: char.deathSaves ? JSON.parse(JSON.stringify(char.deathSaves)) : {failures:0,successes:0}
		};
		return post;
	}
	function slotDiffStr(pre, post) {
		var levels = [9,8,7,6,5,4,3,2,1];
		var parts = [];
		levels.forEach(function(lv) {
			var a = Math.max(0, (pre.spellSlots[lv]||0));
			var b = Math.max(0, (post.spellSlots[lv]||0));
			var d = b - a;
			if (d !== 0) {
				var word = lv === 9 ? "9º-nível" : lv === 6 ? "6º-nível" : lv + "º-nível";
				parts.push((d>0?'+':'') + d + ' slot(s) ' + word);
			}
		});
		return parts.join('; ') || 'sem mudança nos slots de magia';
	}

		if (!char.classes || !char.classes.length) {
		char.classes = [{name: char.className || "", subclass: char.subclass || "", level: char.level || 1}];
	}
	if (classIdx >= char.classes.length) classIdx = 0;
	var clsEntry = char.classes[classIdx];
	var clsName = clsEntry.name || char.className || "";
	var clsSrc = classSourceFor(char, clsEntry);
	var pre = computePre(char, clsName);
	clsEntry.level = (clsEntry.level || 1) + 1;
	char.level = totalLevel(char);
	var hd = CLASS_HIT_DICE[clsName] || 8;
	var conM = calcMod((char.scores.con||8)+(char.rawScores.con||0));
	if (!char.hp) char.hp = {};
	function levelUpTail() {
		char.spellSlots = calculateSpellSlots(char);
	char.spellAttackBonus = calculateSpellAttackBonus(char);
	char.spellDC = 8 + char.spellAttackBonus;
	char.passivePerception = calculatePassivePerception(char);
	char.updated = Date.now();
	CharactersStore.save(char);
	var post = computePost(char);

	var changed = [];
	if (post.level !== pre.level) changed.push('Nível ' + pre.level + ' → ' + post.level);
	if (post.hpMax !== pre.hpMax) changed.push('PV Máx: ' + pre.hpMax + ' → ' + post.hpMax);
	if (post.hpCur !== pre.hpCur) changed.push('PV Atual: ' + pre.hpCur + ' → ' + post.hpCur);
	if (post.hpTemp !== pre.hpTemp) changed.push('PV Temp: ' + pre.hpTemp + ' → ' + post.hpTemp);
	if (JSON.stringify(post.spellSlots) !== JSON.stringify(pre.spellSlots)) changed.push('Slots de magia: ' + slotDiffStr(pre, post));
	if (post.spellAB !== pre.spellAB) changed.push('Bônus de Ataque: +' + pre.spellAB + ' → +' + post.spellAB);
	if (post.spellDC !== pre.spellDC) changed.push('CD de Magia: ' + pre.spellDC + ' → ' + post.spellDC);
	if (post.prof !== pre.prof) changed.push('Proficiência: +' + pre.prof + ' → +' + post.prof);
	if (post.pp !== pre.pp) changed.push('Percepção Passiva: ' + pre.pp + ' → ' + post.pp);
	if (post.ac !== pre.ac) changed.push('CA: ' + pre.ac + ' → ' + post.ac);
	if (post.init !== pre.init) changed.push('Iniciativa: ' + pre.init + ' → ' + post.init);
	if (post.speed !== pre.speed) changed.push('Deslocamento: ' + pre.speed + ' → ' + post.speed);
	if (JSON.stringify(post.ds) !== JSON.stringify(pre.ds)) {
		var dsParts = [];
		if (post.ds.successes !== pre.ds.successes) dsParts.push('Successos DS: ' + pre.ds.successes + ' → ' + post.ds.successes);
		if (post.ds.failures !== pre.ds.failures) dsParts.push('Falhas DS: ' + pre.ds.failures + ' → ' + post.ds.failures);
		changed.push(dsParts.join('; '));
	}
	if (changed.length === 0) changed.push('Sem mudanças');

	// Habilidades ganhas no novo nível da classe que subiu (classe + subclasse)
	var gained = gainedFeaturesForLevel(clsName, clsSrc, clsEntry.subclass, clsEntry.level);
	if (gained.length) changed.push('Novas habilidades: ' + gained.map(function(f) { return f.name; }).join(', '));

	renderSheetHeader(char);
	renderModules();
	var title = "Nível " + post.level + " — Alterações";
	var listHtml = changed.map(function(s){ return '<li>' + s + '</li>'; }).join('');
	var numHtml = '<div class="characters__summary-title">Alterações Numéricas</div><ul class="characters__summary-list">' + listHtml + '</ul>';

	// Sem subclasse e já no nível exigido pela classe: pedir a escolha agora
	var subLevel = SUBCLASS_LEVELS[clsName] || 3;
	var pendingChoices = getLevelChoices(clsName, clsEntry.level);
	var gainedFinal = gained;
	var finishLevelUp = function() {
		showGainedFeaturesPopup(title, gainedFinal, numHtml);
		if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type:"success",content:"Subiu para o nível " + post.level + "!"});
		else sheetToast("success","Subiu para o nível " + post.level + "!");
	};
	var runPending = function() {
		if (!pendingChoices.length) { finishLevelUp(); return; }
		runChoiceQueue(char, pendingChoices, finishLevelUp);
	};
	if (clsEntry.level >= subLevel && !clsEntry.subclass) {
		sheetToast("info", "Nível " + clsEntry.level + " de " + clsName + ": escolha a subclasse!");
		openSubclassDialog(char, clsEntry, function() {
			gainedFinal = gainedFeaturesForLevel(clsName, clsSrc, clsEntry.subclass, clsEntry.level);
			renderSheetHeader(char);
			renderModules();
			runPending();
		});
		return;
	}
	runPending();
	}
	// Dado de vida: ao subir de nível, perguntar média x rolagem (PV não sobrescrito)
	if (!ovHas(char, "hp.max")) {
		openHpDiceRollPopup(char, hd, conM, levelUpTail, true);
	} else {
		levelUpTail();
	}
}

function openActionsMenu(char, $trigger) {
	closeActionsMenu();
		var html = '<div class="characters__actions-menu" id="actions-menu">';
		html += '<button class="characters__actions-item" id="act-short-rest">Descanso Curto</button>';
		html += '<button class="characters__actions-item" id="act-long-rest">Descanso Longo</button>';
		html += '<button class="characters__actions-item" id="act-conditions">Adicionar Condição</button>';
		html += '</div>';
		$(document.body).append(html);
		var $m = $('#actions-menu');
		var r = $trigger[0].getBoundingClientRect();
		$m.css({position:'fixed', left: Math.min(r.left, window.innerWidth - 220) + 'px', top: (r.bottom + 4) + 'px', 'z-index': 4000});
		function close(){ $m.remove(); $(document).off('.actionsmenu'); }
		$m.find('#act-short-rest').on('click', function(){ closeActionsMenu(); doShortRest(char); });
		$m.find('#act-long-rest').on('click', function(){ closeActionsMenu(); doLongRest(char); });
		$m.find('#act-conditions').on('click', function(){ closeActionsMenu(); openConditionsPanel(char); });
		setTimeout(function(){ $(document).on('click.actionsmenu', function(){ close(); }); }, 0);
	}
	function closeActionsMenu() { $('#actions-menu').remove(); $(document).off('.actionsmenu'); }
	function openHpDiceRollPopup(char, hd, conM, onDone, defaultAvg) {
		closeHpDicePopup();
		var avg = Math.floor(hd / 2) + 1 + conM;
		var h = '<div class="characters__detail-overlay" id="hpdice-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">Dado de Vida (d' + hd + ')</div>';
		h += '<div class="characters__rest-info">Bônus de CON: ' + (conM >= 0 ? '+' : '') + conM + '.</div>';
		h += '<div class="characters__rest-info">Média garantida: <b>' + avg + '</b> PV.</div>';
		h += '<div class="characters__detail-actions">';
		h += '<button class="characters__btn characters__btn--primary" id="hp-avg">Usar Média (' + avg + ')</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="hp-roll">Rolagem d' + hd + '</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="hp-cancel">Cancelar</button>';
		h += '</div></div></div>';
		$(document.body).append(h);
		function doHeal(amount) {
			if (!char.hp) char.hp = {};
			var prevMax = char.hp.max || (hd + conM);
			var cur = (char.hp.current != null) ? char.hp.current : prevMax;
			var wasMax = (char.hp.current == null) || cur >= prevMax;
			char.hp.max = prevMax + amount;
			char.hp.current = wasMax ? char.hp.max : Math.min(char.hp.max, cur + amount);
			char.updated = Date.now();
			CharactersStore.save(char);
		}
		function finish() { closeHpDicePopup(); onDone && onDone(); }
		var $ov = $('#hpdice-overlay');
		$ov.on('click', function(e) { if (e.target === $ov[0]) onCancel(); });
		$ov.find('#hp-avg').on('click', function() { doHeal(avg); finish(); });
		$ov.find('#hp-roll').on('click', function() { doHeal((Math.floor(Math.random() * hd) + 1) + conM); finish(); });
		function onCancel() { if (defaultAvg) { doHeal(avg); } finish(); }
		$ov.find('#hp-cancel').on('click', onCancel);
	}
	function closeHpDicePopup() { $('#hpdice-overlay').remove(); }
	// Descanso curto (PHB): gastar qualquer nº de Dados de Vida, rolando cada um
	// (dN + mod CON) e recuperando o total. Máximo de dados = nível - já gastos.
	function openShortRestPopup(char, onDone) {
		closeHpDicePopup();
		var hd = CLASS_HIT_DICE[char.className] || 8;
		var conM = calcMod((char.scores.con || 8) + (char.rawScores.con || 0));
		var level = 1;
		(char.classes || []).forEach(function(c) { level += c.level || 0; });
		if (!level && char.level) level = char.level;
		if (!char.hdUsed) char.hdUsed = 0;
		var rolls = [];
		var h = '<div class="characters__detail-overlay" id="hpdice-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">Descanso Curto — Dados de Vida (d' + hd + ')</div>';
		h += '<div class="characters__rest-info">Bônus de CON: ' + (conM >= 0 ? '+' : '') + conM + '</div>';
		h += '<div class="characters__rest-info" id="hd-left"></div>';
		h += '<div class="characters__rest-info" id="hd-rolls"></div>';
		h += '<div class="characters__detail-actions">';
		h += '<button class="characters__btn characters__btn--primary" id="hd-roll">Rolar d' + hd + '</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="hd-done">Concluir</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="hd-cancel">Cancelar</button>';
		h += '</div></div></div>';
		$(document.body).append(h);
		var $ov = $('#hpdice-overlay');
		function refresh() {
			var left = Math.max(0, level - char.hdUsed);
			$ov.find('#hd-left').html('Dados de vida disponíveis: <b>' + left + '</b>/' + level);
			$ov.find('#hd-rolls').html(rolls.length ? 'Rolagens: ' + rolls.join(' + ') + ' = <b>' + rolls.reduce(function(a,b){return a+b;},0) + ' PV</b>' : 'Nenhuma rolagem ainda.');
			$ov.find('#hd-roll').prop('disabled', left <= 0);
		}
		function finish(cancelled) {
			closeHpDicePopup();
			if (cancelled) return;
			var total = rolls.reduce(function(a,b){return a+b;},0);
			if (total > 0) {
				if (!char.hp) char.hp = {};
				var max = char.hp.max || (hd + conM);
				var cur = (char.hp.current != null) ? char.hp.current : max;
				char.hp.current = Math.min(max, cur + total);
				char.updated = Date.now();
				CharactersStore.save(char);
			}
			onDone && onDone(total);
		}
		$ov.on('click', function(e) { if (e.target === $ov[0]) finish(true); });
		$ov.find('#hd-roll').on('click', function() {
			if (char.hdUsed >= level) return;
			var r = Math.floor(Math.random() * hd) + 1;
			char.hdUsed++;
			rolls.push(r + conM);
			refresh();
		});
		$ov.find('#hd-done').on('click', function() { finish(false); });
		$ov.find('#hd-cancel').on('click', function() { finish(true); });
		refresh();
	}
	function doShortRest(char) {
		openShortRestPopup(char, function(total) {
			char.deathSaves = {failures:0,successes:0};
			renderModules();
			var msg = total > 0 ? ('Descanso curto! ' + total + ' PV recuperados.') : 'Descanso curto concluído.';
			if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type:'success',content:msg});
			else sheetToast('success',msg);
		});
	}

	function doLongRest(char) {
		if (!char.hp) char.hp = {};
		char.hp.current = char.hp.max || char.hp.current;
		char.hp.temp = 0;
		char.deathSaves = {failures:0,successes:0};
		// Recupera metade do máximo de Dados de Vida (mínimo 1)
		var level = 1;
		(char.classes || []).forEach(function(c) { level += c.level || 0; });
		if (!level && char.level) level = char.level;
		if (!char.hdUsed) char.hdUsed = 0;
		char.hdUsed = Math.max(0, level - Math.max(1, Math.floor(level / 2)));
		if (char.conditions && char.conditions.indexOf('Exhaustion') >= 0) char.conditions = char.conditions.filter(function(c){return c!=='Exhaustion';});
		renderModules();
		if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type:'success',content:'Descanso longo! PV total restaurado e dados de vida recuperados.'});
		else sheetToast('success','Descanso longo! PV total restaurado e dados de vida recuperados.');
	}

	// Calcula a CA a partir das armaduras registradas (melhor armadura + escudos)
	function computeArmorAC(char, dexMod) {
		var armors = char.armors || [];
		if (!armors.length) return null;
		var best = null;
		var hasShield = false;
		armors.forEach(function(a) {
			if (!a) return;
			var t = String(a.type || "").split("|")[0];
			if (t === "S") { hasShield = true; return; }
			var base = (a.ac != null) ? a.ac : 10;
			var v = (t === "LA") ? base + dexMod : (t === "MA" ? base + Math.min(2, dexMod) : base);
			if (best == null || v > best) best = v;
		});
		if (best == null && !hasShield) return null;
		var total = (best != null) ? best : 10 + dexMod;
		if (hasShield) total += 2;
		// Estilo de Luta: Defesa (+1 CA com armadura equipada)
		if (char.fightingStyle === "Defense") total += 1;
		return total;
	}

function renderModuleCombat($body, char) {
	var profBonus = calcProfBonus(char.level || 1);
		var con = (char.scores.con || 8) + (char.rawScores.con || 0);
		var dex = (char.scores.dex || 8) + (char.rawScores.dex || 0);
		var hd = CLASS_HIT_DICE[char.className] || 8;
		var hpMax = (char.hp && char.hp.max) ? char.hp.max : (hd + calcMod(con));
		var hpCur = (char.hp && char.hp.current != null) ? char.hp.current : hpMax;
		var hpTemp = (char.hp && char.hp.temp) ? char.hp.temp : 0;
		var hpDead = (hpCur <= 0);
		var armorAC = computeArmorAC(char, calcMod(dex));
		var ac = (armorAC != null) ? armorAC : ((char.ac != null) ? char.ac : (10 + calcMod(dex)));
		var init = (char.initiative != null) ? char.initiative : calcMod(dex);
		var speed = (char.speed != null) ? char.speed : 30;
		var passPer = calculatePassivePerception(char);

		var html = '<div class="characters__sheet-items">';
		html += '<div class="characters__sheet-item characters__sheet-item--big"><span class="characters__sheet-item-value">' + ovSpan(char, "ac", ac, "plain") + '</span> Classe de Armadura</div>';
		html += '<div class="characters__sheet-item characters__sheet-item--big characters__sheet-item--hp"><span class="characters__sheet-item-value"><span class="characters__ov" data-detail="hp.current">' + hpCur + '</span>/' + ovSpan(char, "hp.max", hpMax, "plain") + '</span> Pontos de Vida';
		html += '<span class="characters__hp-mini-wrap"><button type="button" class="characters__hp-mini characters__hp-mini--minus" id="btn-hp-minus" title="Perder 1 PV">−</button><button type="button" class="characters__hp-mini characters__hp-mini--plus" id="btn-hp-plus" title="Recuperar 1 PV">+</button></span></div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + ovSpan(char, "initiative", init, "mod") + '</span> Iniciativa</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + ovSpan(char, "speed", speed, "plain") + ' pés</span> Deslocamento</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + ovSpan(char, "prof", profBonus, "hit") + '</span> Proficiência</div>';
		if (char.fightingStyle) html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">Estilo</span> ' + esc(char.fightingStyle) + '</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + ovSpan(char, "pp", passPer, "plain") + '</span> Percepção Passiva</div>';
		html += '<div class="characters__sheet-item characters__sheet-item--level"><label class="characters__level-editor">Nível <input type="number" class="characters__form-input characters__hp-input" id="in-sheet-level" min="1" max="20" value="' + (char.level || 1) + '"></label></div>';
		html += '</div>';

		html += '<div class="characters__hp-editors">';
		html += '<label>PV Temporário <input type="number" class="characters__form-input characters__hp-input" id="in-hp-temp" value="' + hpTemp + '" min="0"></label>';
		html += '</div>';

		// Dados de Vida: contador com atualização ao vivo
		var level = 1;
		(charClasses(char) || []).forEach(function(c) { level += (c.level || 1) - 1; });
		if (char.level && !(char.classes && char.classes.length)) level = char.level;
		var hdLeft = Math.max(0, level - (char.hdUsed || 0));
		html += '<div class="characters__hp-editors" id="hd-counter-row">';
		html += '<label>Dados de Vida (d' + hd + '): <b id="hd-counter" style="color:' + (hdLeft > 0 ? "#2e9e5b" : "#d9534f") + '">' + hdLeft + '</b>/' + level + ' disponíveis</label>';
		html += '</div>';

		html += '<div class="characters__status-row">';
		html += '<label class="characters__status-check"><input type="checkbox" class="inspiration-checkbox" ' + (char.inspiration ? "checked" : "") + '> Inspiração</label>';
		if (hpDead) {
		html += '<div class="characters__status-deathsaves"><span class="characters__ds-label">Death Saves</span>';
		html += '<span class="characters__ds">Sucessos: ';
		for (var i = 1; i <= 3; i++) html += '<input type="checkbox" class="death-save-success" data-index="' + i + '" ' + (char.deathSaves && char.deathSaves.successes >= i ? "checked" : "") + '> ';
		html += '</span>';
		html += '<span class="characters__ds">Falhas: ';
		for (var j = 1; j <= 3; j++) html += '<input type="checkbox" class="death-save-failure" data-index="' + j + '" ' + (char.deathSaves && char.deathSaves.failures >= j ? "checked" : "") + '> ';
		html += '</span>';
		html += '</div>';
		}
		html += '</div>';

		// Dados de Vida: atualização ao vivo em toda a ficha (contador + popups abertos)
		function refreshHdEverywhere() {
			var lvl = 1;
			(charClasses(char) || []).forEach(function(c) { lvl += (c.level || 1) - 1; });
			if (char.level && !(char.classes && char.classes.length)) lvl = char.level;
			var left = Math.max(0, lvl - (char.hdUsed || 0));
			$("#hd-counter").text(left).css("color", left > 0 ? "#2e9e5b" : "#d9534f");
			var $lbl = $("#hd-left");
			if ($lbl.length) $lbl.html('Dados de vida disponíveis: <b>' + left + '</b>/' + lvl);
			var $rollBtn = $("#hd-roll");
			if ($rollBtn.length) $rollBtn.prop("disabled", left <= 0);
		}
		var _origSave = CharactersStore.save.bind(CharactersStore);
		CharactersStore.save = function(c) {
			var r = _origSave(c);
			if (c === char) refreshHdEverywhere();
			return r;
		};
		refreshHdEverywhere();

		$body.html(html);

		// PV: aplica o novo valor e re-renderiza (assim os testes contra morte
		// aparecem/somem conforme o PV chega a 0 ou volta acima de 0)
		var applyHp = function(newCur) {
			if (!char.hp) char.hp = {};
			var max = char.hp.max || 1;
			newCur = Math.max(0, Math.min(max, newCur));
			char.hp.current = newCur;
			if (newCur > 0) char.deathSaves = {failures: 0, successes: 0};
			char.updated = Date.now();
			CharactersStore.save(char);
			renderModuleCombat($body, char);
		};
		$body.find("#btn-hp-plus").on("click", function() {
			applyHp(((char.hp && char.hp.current != null) ? char.hp.current : 0) + 1);
		});
		$body.find("#btn-hp-minus").on("click", function() {
			applyHp(((char.hp && char.hp.current != null) ? char.hp.current : 0) - 1);
		});
		$body.find("#in-hp-temp").on("change", function() {
			if (!char.hp) char.hp = {};
			char.hp.temp = parseInt($(this).val(), 10) || 0;
			CharactersStore.save(char);
		});

		// Alterar o nível recalcula PV, espaços de magia, CD e bônus de ataque
		$body.find("#in-sheet-level").on("change", function() {
			var oldLevel = char.level || 1;
			var lv = parseInt($(this).val(), 10) || 1;
			lv = Math.min(20, Math.max(1, lv));
			$(this).val(lv);
			if (lv === oldLevel) return;
			char.level = lv;
			if (!char.hp) char.hp = {};
			var newMax = hpMaxAuto(char);
			if (!ovHas(char, "hp.max")) { char.hp.max = newMax; char.hp.current = newMax; }
			char.spellSlots = calculateSpellSlots(char);
			char.spellAttackBonus = calculateSpellAttackBonus(char);
			char.spellDC = 8 + char.spellAttackBonus;
			char.updated = Date.now();
			CharactersStore.save(char);
			renderModules();
			var msg = "Nível " + lv + " — PV, espaços de magia e CD recalculados!";
			if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: msg});
			else sheetToast("success", msg);
		});

		$body.find(".death-save-success").on("change", function() {
			var index = parseInt($(this).data("index"), 10);
			if (!char.deathSaves) char.deathSaves = {failures: 0, successes: 0};
			char.deathSaves.successes = $(this).is(":checked") ? index : 0;
			$body.find(".death-save-success").each(function(i) { $(this).prop("checked", i < char.deathSaves.successes); });
			// 3 sucessos: o personagem se estabiliza e volta com 1 PV
			if (char.deathSaves.successes >= 3) {
				if (!char.hp) char.hp = {};
				char.hp.current = 1;
				char.deathSaves = {failures: 0, successes: 0};
				char.updated = Date.now();
				CharactersStore.save(char);
				renderModuleCombat($body, char);
				var msgOk = "Estabilizado! Você recupera 1 PV.";
				if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: msgOk});
				else sheetToast("success", msgOk);
				return;
			}
			CharactersStore.save(char);
		});
		$body.find(".death-save-failure").on("change", function() {
			var index = parseInt($(this).data("index"), 10);
			if (!char.deathSaves) char.deathSaves = {failures: 0, successes: 0};
			char.deathSaves.failures = $(this).is(":checked") ? index : 0;
			$body.find(".death-save-failure").each(function(i) { $(this).prop("checked", i < char.deathSaves.failures); });
			CharactersStore.save(char);
			if (char.deathSaves.failures >= 3) {
				var msgBad = "Três falhas nos testes contra morte: o personagem morreu.";
				if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "danger", content: msgBad});
				else sheetToast("danger", msgBad);
			}
		});
	}
// Atributo de cada perícia (agrupamento por atributo na ficha)
	var SKILL_KEY_TO_ABIL = {};
	Object.keys(SKILL_KEY_TO_PT).forEach(function(k) {
		var sk = SKILLS.find(function(x) { return x.name === SKILL_KEY_TO_PT[k]; });
		SKILL_KEY_TO_ABIL[k] = sk ? sk.abil : "str";
	});
	function renderModuleSkills($body, char) {
		var profBonus = calcProfBonus(char.level || 1);
		var saves = char.savingThrows || [];
		var html = '<div class="characters__subtitle">Testes de Resistência</div>';
		html += '<div class="characters__sheet-items">';
		ABILITY_ABVS.forEach(function(a) {
			var prof = saves.indexOf(a) >= 0;
			var mod = saveTotalEff(char, a);
			html += '<div class="characters__sheet-item characters__sheet-item--roll" data-d20="' + mod + '" data-label="Resist. ' + ABILITY_NAMES[a] + '">';
			html += '' + ovSpan(char, "save:" + a, mod, "mod", "characters__sheet-item-value") + ' ' + (prof ? "★ " : "") + ABILITY_NAMES[a];
			html += '<span class="characters__roll-btn">›</span></div>';
		});
		html += '</div>';

		html += '<div class="characters__subtitle">Perícias</div>';
		html += '<div class="characters__skills-cols">';
		// TODAS as perícias ficam visíveis e roláveis (mesmo sem proficiência),
		// agrupadas pelo atributo do teste, com as perícias em duas colunas.
		ABILITY_ABVS.forEach(function(a) {
			var keys = Object.keys(SKILL_KEY_TO_PT).filter(function(k) { return SKILL_KEY_TO_ABIL[k] === a; });
			if (!keys.length) return;
			html += '<div class="characters__ability-group">' + ABILITY_NAMES[a] + '</div>';
			keys.forEach(function(k) {
				var v = (char.skills && char.skills[k]) || 0;
				var total = skillTotalEff(char, k);
				var stars = v === 2 ? " ★★" : v === 1 ? " ★" : "";
				html += '<div class="characters__sheet-item characters__sheet-item--roll" data-d20="' + total + '" data-label="' + (SKILL_KEY_TO_PT[k] || k) + '">';
				html += '' + ovSpan(char, "skill:" + k, total, "mod", "characters__sheet-item-value") + ' ' + (SKILL_KEY_TO_PT[k] || k) + stars;
				html += '<span class="characters__roll-btn">›</span></div>';
			});
		});
		html += '</div>';

		html += '<div class="characters__subtitle">Idiomas</div>';
		html += '<div class="characters__sheet-items"><div class="characters__sheet-item"><span class="characters__sheet-item-value">' + ((char.languages && char.languages.length) ? esc(char.languages.join(", ")) : "—") + '</span></div></div>';

		if (char.otherProficiencies && char.otherProficiencies.length) {
			html += '<div class="characters__subtitle">Outras Proficiências</div>';
			html += '<div class="characters__sheet-items">';
			char.otherProficiencies.forEach(function(prof) { html += '<div class="characters__sheet-item">' + esc(prof) + '</div>'; });
			html += '</div>';
		}

		$body.html(html);
		$body.find(".characters__sheet-item--roll").on("click", function() {
			if (guardDetailClick()) return;
			rollD20WithBonus(parseInt($(this).data("d20"), 10), $(this).data("label"));
		});
	}

	function renderModuleAttacks($body, char) {
		var PROP_PT = {V:"versátil", F:"acuidade", T:"pesada", "2H":"duas mãos", L:"leve", A:"munição", RLD:"recarga", S:"especial", H:"pesada"};
		var DMG_PT = {P:"perfurante", B:"contundente", S:"cortante", F:"fogo", C:"frio", L:"elétrico", N:"necrótico", T:"trovejante", Y:"psíquico", I:"ácido", O:"veneno"};
		function dmgTypePt(w, it) {
			var raw = (w && w.dmgType) || (it && it.dmgType) || "";
			if (DMG_PT[raw]) return DMG_PT[raw];
			return String(raw || "").toLowerCase();
		}
		function propList(w, it) {
			var out = [];
			var props = (w && w.property) || (it && it.property) || [];
			props.forEach(function(p) { var lbl = PROP_PT[p] || (p === "SIL" ? "prata" : (p === "LD" ? "carregada" : (p === "T" || p === "2H" ? "duas mãos" : null))); if (lbl && out.indexOf(lbl) < 0) out.push(lbl); });
			if (w && w.twoHand && out.indexOf("duas mãos") < 0) out.push("duas mãos");
			if (w && w.reload && out.indexOf("recarga") < 0) out.push("recarga");
			if (w && w.silver && out.indexOf("prata") < 0) out.push("prata");
			return out;
		}
		function weaponBonus(w, it) {
			var b = 0;
			var m = String((w && w.bonusWeapon) || (it && it.bonusWeapon) || "").match(/\d+/);
			if (m) b += parseInt(m[0], 10);
			if (w && typeof w.magic === "number") b += w.magic;
			return b;
		}
		var weapons = char.weapons || [];
		var html = '<div class="characters__attacks-head">';
		html += '<div class="characters__subtitle" style="margin:0">Armas</div>';
		html += '<button class="characters__btn characters__btn--sm characters__btn--primary" id="btn-add-weapon-popup">+ Adicionar</button>';
		html += '</div>';
		html += '<div class="characters__attacks-list">';
		if (weapons.length) {
			weapons.forEach(function(w, wIdx) {
				var ws = computeWeaponStats(char, w);
				var it = ws.it || null;
				var wKey = "atk:" + wIdx + ":";
				var bonus = weaponBonus(w, it);
				var hitTotal = ws.hit + bonus;
				var props = propList(w, it);
				var dmgBase = w.dmg1 || ws.dmgBase || "1d4";
				var dmgType = dmgTypePt(w, it);
				var tot = ws.abilMod + bonus;
				var dmgLine = dmgBase + " " + dmgType + (tot !== 0 ? (tot > 0 ? " +" + tot : " −" + Math.abs(tot)) : "");
				var srcTag = (w.source || (it && it.source)) ? ' <span class="characters__attack-src">[' + esc(w.source || it.source) + ']</span>' : '';
				html += '<div class="characters__attack-item2" data-weapon-idx="' + wIdx + '">';
				html += '<div class="characters__attack-l1"><span class="characters__attack-name">' + esc(w.name || w) + srcTag + '</span>';
				html += '<span class="characters__attack-hit2">' + ovSpan(char, wKey + "hit", hitTotal, "hit") + '</span></div>';
				html += '<div class="characters__attack-l2">';
				html += '<span class="characters__attack-props">' + esc(props.length ? props.join(", ") : "—") + '</span>';
				html += '<span class="characters__attack-dmg2">' + ovSpan(char, wKey + "dmg", dmgLine, "plain") + '</span>';
				html += '</div></div>';
			});
		} else {
			html += '<div class="characters__sheet-item">Nenhuma arma adicionada — use o botão + Adicionar.</div>';
		}
		html += '</div>';
		var customs = char.attacks || [];
		if (customs.length) {
			html += '<div class="characters__subtitle">Ações personalizadas</div>';
			html += '<div class="characters__attacks-list">';
			customs.forEach(function(atk, index) {
				html += '<div class="characters__attack-item">';
				html += '<div class="characters__attack-name">' + esc(atk.name || "Ação") + '</div>';
				html += '<div class="characters__attack-stats">';
				if (atk.hit) html += '<span class="characters__attack-hit"><span class="characters__ov" data-detail="catk:' + index + ':hit">' + esc(atk.hit) + '</span> acertar</span>';
				if (atk.dmg) html += '<span class="characters__attack-dmg">Dano <span class="characters__ov" data-detail="catk:' + index + ':dmg">' + esc(atk.dmg) + '</span></span>';
				html += '</div>';
				html += '<button class="characters__btn characters__btn--danger characters__btn--sm" data-remove-attack="' + index + '">×</button>';
				html += '</div>';
			});
			html += '</div>';
		}
		$body.html(html);
		// Popup "Adicionar arma": oficial ou personalizada
		$body.find("#btn-add-weapon-popup").on("click", function() {
			$("#addweapon-overlay").remove();
			var h2 = '<div class="characters__detail-overlay" id="addweapon-overlay"><div class="characters__detail">';
			h2 += '<div class="characters__detail-title">Adicionar Arma</div>';
			h2 += '<div class="characters__detail-actions" style="flex-direction:column;gap:8px">';
			h2 += '<button class="characters__btn characters__btn--primary" id="aw-official">Arma Oficial (lista)</button>';
			h2 += '<button class="characters__btn characters__btn--secondary" id="aw-custom">Criar Arma Personalizada</button>';
			h2 += '<button class="characters__btn characters__btn--secondary" id="aw-close">Fechar</button>';
			h2 += '</div></div></div>';
			$(document.body).append(h2);
			var $ov2 = $("#addweapon-overlay");
			$ov2.on("click", function(e) { if (e.target === this) $ov2.remove(); });
			$ov2.find("#aw-close").on("click", function() { $ov2.remove(); });
			$ov2.find("#aw-official").on("click", function() {
				$ov2.remove();
				openOfficialWeaponPicker(char, function() { renderModuleAttacks($body, char); });
			});
			$ov2.find("#aw-custom").on("click", function() {
				$ov2.remove();
				openCustomWeaponCreator(char, null, function() { renderModuleAttacks($body, char); });
			});
		});
		// Clique na arma: popup de detalhes com Atacar / Dano
		$body.find(".characters__attack-item2").on("click", function(e) {
			if ($(e.target).closest(".characters__ov").length) return;
			var wIdx = parseInt($(this).data("weapon-idx"), 10);
			var w = (char.weapons || [])[wIdx];
			if (w) openWeaponDetailPopup($body, char, w, wIdx);
		});
		$body.on("click", "[data-remove-attack]", function() {
			var index = parseInt($(this).data("remove-attack"), 10);
			if (char.attacks && char.attacks[index]) { char.attacks.splice(index, 1); renderModuleAttacks($body, char); }
		});
	}
	// ==== Popup de detalhes da arma (Atacar / Dano + modo + edição segurando) ====
	function closeWeaponDetailPopup() { $("#weapondetail-overlay").remove(); }
	function openWeaponDetailPopup($body, char, w, wIdx) {
		closeWeaponDetailPopup();
		var it = null;
		itemsData.forEach(function(i) { if (i && i.name === (w.name || w)) it = i; });
		var ws = computeWeaponStats(char, w);
		var bonus = 0;
		var mm = String(w.bonusWeapon || (it && it.bonusWeapon) || "").match(/\d+/);
		if (mm) bonus += parseInt(mm[0], 10);
		if (typeof w.magic === "number") bonus += w.magic;
		var RAR = {none:"Comum", uncommon:"Incomum", rare:"Raro", "very rare":"Muito Raro", legendary:"Lendário", artifact:"Artefato"};
		var rarityPt = w.rarityPt || (it && (RAR[it.rarity] || it.rarity)) || w.rarity || "Comum";
		var dmgBase = w.dmg1 || (it && it.dmg1) || "—";
		var dmgVers = w.dmg2 || (it && it.dmg2) || "";
		var dmgType = w.dmgType || (it && it.dmgType) || "";
		var rangeTxt = "—";
		var rr = it && it.range;
		if (rr) rangeTxt = (rr.distance ? (rr.distance + " pés") : String(rr));
		if (w.range) rangeTxt = w.range;
		var weight = (w.weight != null ? w.weight : (it && it.weight)) || "—";
		var value = (w.value != null ? w.value : (it && it.value)) || "—";
		var source = w.source || (it && it.source) || "—";
		var desc = (it && it.entries) ? it.entries.join("\n") : (w.desc || "Sem descrição.");
		var magicTxt = (it && (it.bonusWeapon || it.bonusSpellAttack)) ? ("Bônus de arma: " + (it.bonusWeapon || "") + (it.bonusSpellAttack ? " | Bônus de magia: " + it.bonusSpellAttack : "")) : "—";
		var flags = [];
		if (w.twoHand) flags.push("Duas mãos");
		if (w.reload) flags.push("Recarga");
		if (w.silver) flags.push("Prata");
		var attMode = "normal";
		var h = '<div style="z-index:9000 !important;" <div class="characters__detail-overlay" id="weapondetail-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">' + esc(w.name || w) + '</div>';
		h += '<div class="characters__detail-body">';
		h += '<div class="characters__detail-row"><b>Fonte:</b> ' + esc(source) + '</div>';
		h += '<div class="characters__detail-row"><b>Raridade:</b> ' + esc(rarityPt) + '</div>';
		h += '<div class="characters__detail-row"><b>Dano base:</b> ' + esc(dmgBase + (dmgVers ? " / " + dmgVers : "")) + ' ' + esc(dmgType) + '</div>';
		h += '<div class="characters__detail-row"><b>Alcance:</b> ' + esc(rangeTxt) + '</div>';
		h += '<div class="characters__detail-row"><b>Peso:</b> ' + esc(String(weight)) + '</div>';
		h += '<div class="characters__detail-row"><b>Valor:</b> ' + esc(String(value)) + '</div>';
		h += '<div class="characters__detail-row"><b>Bônus de acerto:</b> +' + (ws.hit + bonus) + ' (';
		h += '<span style="color:#7ab7ff">prof +' + ws.pb + '</span> + <span style="color:#7ab7ff">' + esc(ws.abilName) + ' ' + fmtSigned(ws.abilMod) + '</span>';
		if (char.fightingStyle === "Archery" && ws.isRanged) h += ' + <span style="color:#7ab7ff">Arqueirismo +2</span>';
		if (bonus) h += ' + <span style="color:#f0a30a">mágico +' + bonus + '</span>';
		h += ')</div>';
		h += '<div class="characters__detail-row" style="flex-direction:column;align-items:stretch"><b>Dados de dano extra:</b><div id="wd-extra-dmg"></div></div>';
		h += '<div class="characters__detail-row" style="flex-direction:column;align-items:stretch"><b>Efeitos mágicos:</b><div id="wd-magic-fx"></div></div>';
		if (w.attunement) h += '<div class="characters__detail-row"><b>Sintonização:</b> Requer sintonização</div>';
		if (flags.length) h += '<div class="characters__detail-row"><b>Características:</b> ' + esc(flags.join(", ")) + '</div>';
		h += '<div class="characters__detail-row" style="margin-top:8px"><b>Descrição:</b><div style="white-space:pre-wrap;margin-top:4px;font-size:.9em">' + esc(desc) + '</div></div>';
		h += '</div>';
		h += '<div class="characters__detail-actions" style="flex-direction:column;gap:6px">';
		h += '<select class="characters__form-select" id="wd-mode" style="width:100%">';
		h += '<option value="normal">Normal</option><option value="adv">Vantagem</option><option value="dis">Desvantagem</option>';
		h += '</select>';
		h += '<div style="display:flex;gap:8px;width:100%">';
		h += '<button class="characters__btn characters__btn--primary" id="wd-attack" style="flex:1">Atacar</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="wd-btn-dmg" style="flex:1">Dano</button>';
		h += '</div>';
		h += '<button class="characters__btn characters__btn--secondary" id="wd-edit">✎ Editar arma</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="wd-close">Fechar</button>';
		h += '</div></div></div>';
		$(document.body).append(h);
		var $ov = $("#weapondetail-overlay");
		$ov.on("click", function(e) { if (e.target === this) closeWeaponDetailPopup(); });
		$ov.find("#wd-close").on("click", closeWeaponDetailPopup);
		$ov.find("#wd-mode").on("change", function() { attMode = this.value; });
		function extraDmg() { if (!w.extraDmg) w.extraDmg = []; return w.extraDmg; }
		function extraFx() { if (!w.magicFx) w.magicFx = []; return w.magicFx; }
		function renderExtraDmg() {
			var $box = $ov.find("#wd-extra-dmg").empty();
			extraDmg().forEach(function(d) {
				var lbl = (d.count || 1) + "d" + d.face + (d.flat ? (d.flat > 0 ? "+" : "") + d.flat : "") + (d.dmgType ? " " + d.dmgType : "");
				$box.append('<div style="font-size:.9em;margin-top:4px">' + esc(lbl) + '</div>');
			});
			if (!extraDmg().length) $box.html('<div style="font-size:.85em;color:#667085">Nenhum</div>');
		}
		function renderExtraFx() {
			var $box = $ov.find("#wd-magic-fx").empty();
			extraFx().forEach(function(fx) {
				$box.append('<div style="font-size:.9em;margin-top:4px">' + esc(fx) + '</div>');
			});
			if (!extraFx().length) $box.html('<div style="font-size:.85em;color:#667085">Nenhum</div>');
		}
		renderExtraDmg();
		renderExtraFx();
		$ov.find("#wd-attack").on("click", function() {
			var b = ws.hit + bonus;
			if (attMode === "normal") { rollD20WithBonus(b, "Ataque — " + (w.name || w)); return; }
			var r1 = 1 + Math.floor(Math.random() * 20), r2 = 1 + Math.floor(Math.random() * 20);
			var keep = (attMode === "adv") ? Math.max(r1, r2) : Math.min(r1, r2);
			var total = keep + b;
			var msg = "Ataque — " + (w.name || w) + " [" + (attMode === "adv" ? "Vantagem" : "Desvantagem") + "]: " + r1 + " / " + r2 + " → " + keep + " + " + b + " = " + total;
			var type = "info";
			if (keep === 20) { msg += " — NATURAL 20!"; type = "success"; }
			if (keep === 1) { msg += " — natural 1..."; type = "danger"; }
			showRollResult(type, msg);
		});
		$ov.find("#wd-btn-dmg").on("click", function() {
			var tot = 0, parts = [];
			var expr = String(dmgBase === "—" ? "1d4" : dmgBase);
			var mD = expr.match(/(\d+)d(\d+)/);
			if (mD) {
				var n = parseInt(mD[1], 10), f = parseInt(mD[2], 10), acc = [];
				for (var i = 0; i < n; i++) { var r = 1 + Math.floor(Math.random() * f); acc.push(r); tot += r; }
				parts.push(mD[1] + "d" + mD[2] + " [" + acc.join("+") + "]");
			}
			var mFlat = expr.match(/([+-]\s*\d+)\s*$/);
			if (mFlat) { var fl = parseInt(mFlat[1].replace(/\s/g, ""), 10); tot += fl; parts.push((fl >= 0 ? "+" : "") + fl); }
			if (ws.abilMod) { tot += ws.abilMod; parts.push((ws.abilMod > 0 ? "+" : "") + ws.abilMod + " " + ws.abilName); }
			if (bonus) { tot += bonus; parts.push("+" + bonus + " mágico"); }
			extraDmg().forEach(function(d) {
				var acc = [], sub = 0;
				for (var i = 0; i < (d.count || 1); i++) { var r = 1 + Math.floor(Math.random() * d.face); acc.push(r); sub += r; }
				if (d.flat) sub += d.flat;
				tot += sub;
				parts.push((d.count || 1) + "d" + d.face + (d.flat ? (d.flat > 0 ? "+" : "") + d.flat : "") + (d.dmgType ? " " + d.dmgType : "") + " [" + sub + "]");
			});
			showRollResult("info", "Dano — " + (w.name || w) + ": " + tot + (parts.length ? " (" + parts.join(" ") + ")" : ""));
		});
		$ov.find("#wd-edit").on("click", function() {
			closeWeaponDetailPopup();
			openCustomWeaponCreator(char, w, function() { renderModuleAttacks($body, char); });
		});
	}
	// ==== Popup: adicionar dano extra (tipo de dano + dados + fixo) ====
	function openExtraDmgPopup($parentOv, w, onDone) {
		$("#extradmg-overlay").remove();
		var DMGS = ["Perfurante", "Cortante", "Contundente", "Fogo", "Frio", "Elétrico", "Necrótico", "Psíquico", "Veneno", "Trovejante", "Ácido", "Radiante", "Força"];
		var FACES = [4, 6, 8, 10, 12, 20];
		var h = '<div class="characters__detail-overlay" id="extradmg-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">Dano Extra</div>';
		h += '<div class="characters__detail-body">';
		h += '<div class="characters__form-group"><label class="characters__form-label">Tipo de dano</label>';
		h += '<select class="characters__form-select" id="ed-type">';
		DMGS.forEach(function(t) { h += '<option value="' + t + '">' + t + '</option>'; });
		h += '</select></div>';
		h += '<div class="characters__form-group"><label class="characters__form-label">Tipo de dado</label>';
		h += '<select class="characters__form-select" id="ed-face">';
		FACES.forEach(function(f) { h += '<option value="' + f + '">d' + f + '</option>'; });
		h += '</select></div>';
		h += '<div class="characters__form-row">';
		h += '<div class="characters__form-group"><label class="characters__form-label">Quantos dados</label>';
		h += '<input type="number" class="characters__form-input" id="ed-count" value="1" min="1" max="20"></div>';
		h += '<div class="characters__form-group"><label class="characters__form-label">Dano fixo</label>';
		h += '<input type="number" class="characters__form-input" id="ed-flat" value="0"></div>';
		h += '</div></div><div class="characters__detail-actions">';
		h += '<button class="characters__btn characters__btn--primary" id="ed-add">Adicionar</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="ed-cancel">Cancelar</button>';
		h += '</div></div></div>';
		$(document.body).append(h);
		var $ov = $("#extradmg-overlay");
		$ov.on("click", function(e) { if (e.target === this) $ov.remove(); });
		$ov.find("#ed-cancel").on("click", function() { $ov.remove(); });
		$ov.find("#ed-add").on("click", function() {
			if (!w.extraDmg) w.extraDmg = [];
			w.extraDmg.push({
				count: parseInt($ov.find("#ed-count").val(), 10) || 1,
				face: parseInt($ov.find("#ed-face").val(), 10) || 6,
				flat: parseInt($ov.find("#ed-flat").val(), 10) || 0,
				dmgType: $ov.find("#ed-type").val()
			});
			char.updated = Date.now();
			CharactersStore.save(char);
			$ov.remove();
			onDone && onDone();
		});
	}
	// ==== Popup: adicionar efeito mágico ====
	function openMagicFxPopup($parentOv, w, onDone) {
		$("#magicfx-overlay").remove();
		var h = '<div class="characters__detail-overlay" id="magicfx-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">Efeito Mágico</div>';
		h += '<div class="characters__detail-body">';
		h += '<div class="characters__form-group"><label class="characters__form-label">Descrição do efeito</label>';
		h += '<textarea class="characters__form-input" id="fx-desc" rows="3" placeholder="ex: Ao acertar, o alvo recebe 1d6 de fogo extra"></textarea></div>';
		h += '</div><div class="characters__detail-actions">';
		h += '<button class="characters__btn characters__btn--primary" id="fx-add">Adicionar</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="fx-cancel">Cancelar</button>';
		h += '</div></div></div>';
		$(document.body).append(h);
		var $ov = $("#magicfx-overlay");
		$ov.on("click", function(e) { if (e.target === this) $ov.remove(); });
		$ov.find("#fx-cancel").on("click", function() { $ov.remove(); });
		$ov.find("#fx-add").on("click", function() {
			var txt = $ov.find("#fx-desc").val().trim();
			if (!txt) { alert("Descreva o efeito!"); return; }
			if (!w.magicFx) w.magicFx = [];
			w.magicFx.push(txt);
			char.updated = Date.now();
			CharactersStore.save(char);
			$ov.remove();
			onDone && onDone();
		});
	}

	// ==== Popup: escolher arma oficial da lista ====
	function openOfficialWeaponPicker(char, onDone) {
		$("#wpicker-overlay").remove();
		var h = '<div class="characters__detail-overlay" id="wpicker-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">Arma Oficial</div>';
		h += '<div class="characters__detail-body">';
		h += '<input type="text" class="characters__form-input" id="wp-search" placeholder="Buscar arma...">';
		h += '<div id="wp-results" style="max-height:300px;overflow:auto;margin-top:8px"></div>';
		h += '</div><div class="characters__detail-actions"><button class="characters__btn characters__btn--secondary" id="wp-close">Fechar</button></div>';
		h += '</div></div>';
		$(document.body).append(h);
		var $ov = $("#wpicker-overlay");
		$ov.on("click", function(e) { if (e.target === this) $ov.remove(); });
		$ov.find("#wp-close").on("click", function() { $ov.remove(); });
		var $res = $ov.find("#wp-results");
		function list(query) {
			var q = (query || "").toLowerCase().trim();
			var isWeapon = function(i) {
				var t = String(i.type || "").split("|")[0];
				return t === "M" || t === "R" || i.type === "W" || i.weaponCategory;
			};
			var base;
			if (q.length >= 2) {
				base = itemsData.filter(function(i) { return isWeapon(i) && i.name.toLowerCase().indexOf(q) >= 0; });
			} else {
				base = itemsData.filter(function(i) { return isWeapon(i) && (i.dmg1 || i.baseItem); }).slice(0, 25);
			}
			$res.empty();
			if (!base.length) { $res.html('<div class="characters__search-item">Nenhuma arma encontrada</div>'); return; }
			base.slice(0, 40).forEach(function(w) {
				var $it = $('<div class="characters__search-item">');
				$it.html('<b>' + esc(w.name) + '</b> [' + esc(w.source || "—") + '] ' + esc(w.dmg1 ? (w.dmg1 + " " + (w.dmgType || "")) : ""));
				$it.on("click", function() {
					if (!char.weapons) char.weapons = [];
					char.weapons.push({
						name: w.name, source: w.source || "",
						type: (String(w.type || "").split("|")[0] === "R") ? "ranged" : "melee",
						dmg1: w.dmg1 || "", dmg2: w.dmg2 || "", dmgType: w.dmgType || "",
						property: w.property || [], weight: w.weight, rarity: w.rarity,
						bonusWeapon: w.bonusWeapon || "", value: w.value
					});
					char.updated = Date.now();
					CharactersStore.save(char);
					$ov.remove();
					if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: w.name + " adicionada."});
					onDone && onDone();
				});
				$res.append($it);
			});
		}
		$ov.find("#wp-search").on("input", function() { list($(this).val()); });
		list("");
	}
	// ==== Popup: criar/editar arma personalizada ====
	function openCustomWeaponCreator(char, existing, onDone) {
		$("#wcustom-overlay").remove();
		var w = existing || {};
		var DMG_OPTS = ["Perfurante", "Cortante", "Contundente", "Fogo", "Frio", "Elétrico", "Necrótico", "Psíquico", "Veneno", "Trovejante", "Ácido", "Radiante", "Força"];
		var h = '<div class="characters__detail-overlay" id="wcustom-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">' + (existing ? "Editar Arma" : "Nova Arma Personalizada") + '</div>';
		h += '<div class="characters__detail-body">';
		h += '<div class="characters__form-group"><label class="characters__form-label">Nome *</label>';
		h += '<input type="text" class="characters__form-input" id="wc-name" value="' + esc(w.name || "") + '" placeholder="ex: Espada Longa">';
		h += '</div>';
		h += '<div class="characters__form-row">';
		h += '<div class="characters__form-group"><label class="characters__form-label">Dano base (dados)</label>';
		h += '<div style="display:flex;gap:6px;align-items:center">';
		h += '<input type="number" class="characters__form-input" id="wc-dcount" value="' + (w._dcount || 1) + '" min="1" max="20" style="width:70px">';
		h += '<span>d</span>';
		h += '<select class="characters__form-select" id="wc-dface" style="width:auto">';
		[4, 6, 8, 10, 12, 20].forEach(function(f) { h += '<option value="' + f + '"' + ((w._dface || 8) === f ? " selected" : "") + '>d' + f + '</option>'; });
		h += '</select>';
		h += '<span>+</span>';
		h += '<input type="number" class="characters__form-input" id="wc-dflat" value="' + (w._dflat || 0) + '" style="width:70px">';
		h += '</div></div>';
		h += '<div class="characters__form-group"><label class="characters__form-label">Tipo de dano</label>';
		h += '<select class="characters__form-select" id="wc-dmgtype">';
		DMG_OPTS.forEach(function(t) { h += '<option value="' + t + '"' + ((w.dmgType || "") === t ? " selected" : "") + '>' + t + '</option>'; });
		h += '</select></div></div>';
		h += '<div class="characters__form-group"><label class="characters__form-label">Dados de dano extra</label>';
		h += '<div id="wc-extra-list"></div>';
		h += '<button class="characters__btn characters__btn--sm characters__btn--secondary" id="wc-add-extra" type="button" style="margin-top:4px">+ Adicionar dano extra</button>';
		h += '</div>';
		h += '<div class="characters__form-row">';
		h += '<div class="characters__form-group"><label class="characters__form-label">Alcance</label>';
		h += '<input type="text" class="characters__form-input" id="wc-range" value="' + esc(w.range || "") + '" placeholder="ex: 1,5 m"></div>';
		h += '</div>';
		h += '<div class="characters__form-group"><label class="characters__form-label">Características</label>';
		h += '<div id="wc-props" style="display:flex;flex-wrap:wrap;gap:8px;font-size:.88em">';
		var ALL_PROPS = [
			["A", "Alcance (Ammunition)"], ["F", "Acuidade (Finesse)"], ["H", "Pesada (Heavy)"],
			["L", "Leve (Light)"], ["LD", "Carregada (Loading)"], ["M", "Munição"],
			["R", "Alcance (Range)"], ["S", "Arremesso (Thrown)"], ["T", "Duas Mãos (Two-Handed)"],
			["V", "Versátil (Versatile)"], ["2H", "Duas Mãos"], ["RLD", "Recarga (Reload)"],
			["SIL", "Prata (Silvered)"], ["SP", "Especial (Special)"], ["MMM", "Metal Midas"],
			["FRS", "Estilhaçadora"], ["BRF", "Perfurante (Brutal)"], ["TSS", "Atordoante"],
			["HVP", "Alta Velocidade"], ["RNG", "Longa Distância"], ["EXT", "Extra Dano"],
			["CRB", "Explosiva"], ["FLG", "Flamejante"], ["FRZ", "Congelante"],
			["SHK", "Chocante"], ["CPS", "Sanguessuga"], ["DRT", "Verde-Veneno"]
		];
		ALL_PROPS.forEach(function(p) {
			var on = (w.property || []).indexOf(p[0]) >= 0;
			h += '<label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="wc-prop" value="' + p[0] + '"' + (on ? " checked" : "") + '> ' + p[1] + '</label>';
		});
		h += '</div></div>';
		h += '<div class="characters__form-group"><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="wc-attune"' + (w.attunement ? " checked" : "") + '> Requer sintonização</label></div>';
		h += '<div class="characters__form-group"><label class="characters__form-label">Descrição</label>';
		h += '<textarea class="characters__form-input" id="wc-desc" rows="3" placeholder="Detalhes da arma...">' + esc(w.desc || "") + '</textarea></div>';
		h += '</div><div class="characters__detail-actions">';
		h += '<button class="characters__btn characters__btn--primary" id="wc-save">Salvar</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="wc-close">Fechar</button>';
		h += '</div></div></div>';
		$(document.body).append(h);
		var $ov = $("#wcustom-overlay");
		$ov.on("click", function(e) { if (e.target === this) $ov.remove(); });
		$ov.find("#wc-close").on("click", function() { $ov.remove(); });
		// Lista de danos extras (igual ao formato do popup de dano extra)
		var extras = JSON.parse(JSON.stringify(w.extraDmg || []));
		function renderExtras() {
			var $box = $ov.find("#wc-extra-list").empty();
			extras.forEach(function(d, ix) {
				var lbl = (d.count || 1) + "d" + d.face + (d.flat ? (d.flat > 0 ? "+" : "") + d.flat : "") + (d.dmgType ? " " + d.dmgType : "");
				var $row = $('<div style="display:flex;align-items:center;gap:6px;margin-top:4px;font-size:.9em"><span style="flex:1">' + esc(lbl) + '</span><button class="characters__btn characters__btn--sm characters__btn--secondary" type="button" title="Remover">×</button></div>');
				$row.find("button").on("click", function() { extras.splice(ix, 1); renderExtras(); });
				$box.append($row);
			});
			if (!extras.length) $box.html('<div style="font-size:.85em;color:#667085">Nenhum</div>');
		}
		$ov.find("#wc-add-extra").on("click", function() {
			var dmgs = ["Perfurante", "Cortante", "Contundente", "Fogo", "Frio", "Elétrico", "Necrótico", "Psíquico", "Veneno", "Trovejante", "Ácido", "Radiante", "Força"];
			var faces = [4, 6, 8, 10, 12, 20];
			var h2 = '<div class="characters__detail-overlay" id="wc-extra-add"><div class="characters__detail">';
			h2 += '<div class="characters__detail-title">Dano Extra</div><div class="characters__detail-body">';
			h2 += '<div class="characters__form-group"><label class="characters__form-label">Tipo de dano</label><select class="characters__form-select" id="ed-type">';
			dmgs.forEach(function(t) { h2 += '<option value="' + t + '">' + t + '</option>'; });
			h2 += '</select></div>';
			h2 += '<div class="characters__form-group"><label class="characters__form-label">Tipo de dado</label><select class="characters__form-select" id="ed-face">';
			faces.forEach(function(f) { h2 += '<option value="' + f + '">d' + f + '</option>'; });
			h2 += '</select></div>';
			h2 += '<div class="characters__form-row">';
			h2 += '<div class="characters__form-group"><label class="characters__form-label">Quantos dados</label><input type="number" class="characters__form-input" id="ed-count" value="1" min="1" max="20"></div>';
			h2 += '<div class="characters__form-group"><label class="characters__form-label">Dano fixo</label><input type="number" class="characters__form-input" id="ed-flat" value="0"></div>';
			h2 += '</div></div><div class="characters__detail-actions">';
			h2 += '<button class="characters__btn characters__btn--primary" id="ed-add">Adicionar</button>';
			h2 += '<button class="characters__btn characters__btn--secondary" id="ed-cancel">Cancelar</button>';
			h2 += '</div></div></div>';
			$(document.body).append(h2);
			var $ov2 = $("#wc-extra-add");
			$ov2.on("click", function(e) { if (e.target === this) $ov2.remove(); });
			$ov2.find("#ed-cancel").on("click", function() { $ov2.remove(); });
			$ov2.find("#ed-add").on("click", function() {
				extras.push({
					count: parseInt($ov2.find("#ed-count").val(), 10) || 1,
					face: parseInt($ov2.find("#ed-face").val(), 10) || 6,
					flat: parseInt($ov2.find("#ed-flat").val(), 10) || 0,
					dmgType: $ov2.find("#ed-type").val()
				});
				$ov2.remove();
				renderExtras();
			});
		});
		renderExtras();
		$ov.find("#wc-save").on("click", function() {
			var name = $ov.find("#wc-name").val().trim();
			if (!name) { alert("Informe o nome da arma!"); return; }
			var dc = parseInt($ov.find("#wc-dcount").val(), 10) || 1;
			var df = parseInt($ov.find("#wc-dface").val(), 10) || 8;
			var dfl = parseInt($ov.find("#wc-dflat").val(), 10) || 0;
			var data = {
				name: name,
				dmg1: dc + "d" + df + (dfl ? (dfl > 0 ? "+" : "") + dfl : ""),
				_dcount: dc, _dface: df, _dflat: dfl,
				dmgType: $ov.find("#wc-dmgtype").val(),
				extraDmg: extras,
				range: $ov.find("#wc-range").val().trim(),
				property: $ov.find(".wc-prop:checked").map(function() { return $(this).val(); }).get(),
				attunement: $ov.find("#wc-attune").is(":checked"),
				desc: $ov.find("#wc-desc").val().trim(),
				source: existing ? (w.source || "Personalizado") : "Personalizado",
				custom: true
			};
			if (existing) {
				var ix = (char.weapons || []).indexOf(existing);
				if (ix >= 0) char.weapons[ix] = Object.assign({}, existing, data);
			} else {
				if (!char.weapons) char.weapons = [];
				char.weapons.push(Object.assign({type: "melee"}, data));
			}
			char.updated = Date.now();
			CharactersStore.save(char);
			$ov.remove();
			if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: "Arma salva: " + name});
			onDone && onDone();
		});
	}
function spellAbilityName(char) {
		var m = {"Wizard":"Inteligência","Sorcerer":"Carisma","Cleric":"Sabedoria","Druid":"Sabedoria","Bard":"Carisma","Warlock":"Carisma","Paladin":"Carisma","Ranger":"Sabedoria","Artificer":"Inteligência"};
		return m[char.className] || "Inteligência";
	}

	function renderModuleSpells($body, char) {
		var html = '<div class="characters__subtitle">Conjuração</div>';
		html += '<div class="characters__sheet-items">';
		html += '<div class="characters__sheet-item"><b>Atributo de conjuração:</b> ' + spellAbilityName(char) + '</div>';
		html += '<div class="characters__sheet-item"><b>CD de Magia:</b> ' + ovSpan(char, "spellDC", calculateSpellDC(char), "plain") + '</div>';
		html += '<div class="characters__sheet-item"><b>Bônus de Ataque Mágico:</b> ' + ovSpan(char, "spellAB", calculateSpellAttackBonus(char), "hit") + '</div>';
		html += '</div>';

		html += '<div class="characters__subtitle">Espaços de Magia</div>';
		html += '<div class="characters__slots-grid">';
		for (var i = 1; i <= 9; i++) {
			var slots = char.spellSlots && char.spellSlots[i] ? char.spellSlots[i] : 0;
			html += '<div class="characters__slot"><div class="characters__slot-value">' + ovSpan(char, "slot:" + i, slots, "plain") + '</div>' +
				'<div class="characters__slot-level">' + i + 'º nível</div></div>';
		}
		html += '</div>';

		var allSpells = char.spells || [];
		html += '<div class="characters__subtitle">Truques</div>';
		html += '<div class="characters__spells-list">';
		var cantrips = allSpells.filter(function(s) { return s.level === 0; });
		if (cantrips.length) {
			cantrips.forEach(function(spell) {
				html += '<div class="characters__spell-item"><a class="characters__spell-name ptm-link" href="' + esc(ptmSpellHref(spell)) + '">' + esc(spell.name || spell) + '</a></div>';
			});
		} else html += '<div class="characters__spell-item">Nenhum truque adicionado</div>';
		html += '</div>';

		for (var lv = 1; lv <= 9; lv++) {
			var list = allSpells.filter(function(s) { return s.level === lv; });
			if (!list.length) continue;
			html += '<div class="characters__subtitle">Nível ' + lv + ' (' + list.length + ')</div>';
			html += '<div class="characters__spells-list">';
			list.forEach(function(spell) {
				var realIndex = allSpells.indexOf(spell);
				html += '<div class="characters__spell-item">';
				html += '<a class="characters__spell-name ptm-link" href="' + esc(ptmSpellHref(spell)) + '">' + esc(spell.name || spell) + '</a>';
				html += '<button class="characters__btn characters__btn--danger characters__btn--sm" data-remove-spell="' + realIndex + '">×</button>';
				html += '</div>';
			});
			html += '</div>';
		}

		html += '<div class="characters__subtitle">Adicionar Magia</div>';
		html += '<div class="characters__form-row">';
		html += '<input type="text" class="characters__form-input" id="spell-search" placeholder="Buscar magia...">';
		html += '<select class="characters__form-select" id="spell-level-filter"><option value="-1">Todos os níveis</option>';
		for (var s2 = 0; s2 <= 9; s2++) html += '<option value="' + s2 + '">' + (s2 === 0 ? "Truques" : "Nível " + s2) + '</option>';
		html += '</select></div>';
		html += '<div id="spell-search-results" class="characters__search-results mt-2"></div>';
		html += '<a class="ptm-link ptm-open-list" href="spells.html">Abrir lista completa de magias</a>';

		$body.html(html);

		var $searchInput = $body.find("#spell-search");
		var $levelFilter = $body.find("#spell-level-filter");
		var $results = $body.find("#spell-search-results");
		var searchSpells = function() {
			var query = $searchInput.val().toLowerCase().trim();
			var levelFilter = parseInt($levelFilter.val(), 10);
			if (query.length < 2) { $results.empty(); return; }
			var filtered = spellsData.filter(function(spell) {
				return spell.name.toLowerCase().indexOf(query) >= 0 && (levelFilter === -1 || spell.level === levelFilter);
			}).slice(0, 20);
			$results.empty();
			if (!filtered.length) { $results.html('<div class="characters__search-item">Nenhuma magia encontrada</div>'); return; }
			filtered.forEach(function(spell) {
				var $item = $('<div class="characters__search-item">');
				$item.html('<b>' + esc(spell.name) + '</b> (' + (spell.level === 0 ? "Truque" : "Nv. " + spell.level) + ') - ' + esc(spell.school || ""));
				$item.on("click", function() {
					if (!char.spells) char.spells = [];
					char.spells.push({name: spell.name, level: spell.level, school: spell.school});
					renderModuleSpells($body, char);
				});
				$results.append($item);
			});
		};
		$searchInput.on("input", searchSpells);
		$levelFilter.on("change", searchSpells);
		$body.on("click", "[data-remove-spell]", function() {
			var index = parseInt($(this).data("remove-spell"), 10);
			if (char.spells && char.spells[index]) { char.spells.splice(index, 1); renderModuleSpells($body, char); }
		});
	}
function renderModuleFeatures($body, char) {
	var html = '<div class="characters__summary-box characters__info-card"><div class="characters__summary-title">Informações (Raça • Antecedente • Classe)</div><div class="characters__info-scroll">' + buildInfoContent(char) + '</div></div>';
	html += '<div class="characters__subtitle">Talentos (Feats)</div>';
		html += '<div class="characters__features-list">';
		if (char.feats && char.feats.length) {
			char.feats.forEach(function(feat, index) {
				html += '<div class="characters__feature-item">';
				html += '<div><div class="characters__feature-name"><a class="ptm-link" href="' + esc(ptmFeatHref(feat)) + '">' + esc(feat.name || feat) + '</a></div>';
				if (feat.source) html += '<div class="characters__feature-source">' + esc(feat.source) + '</div>';
				html += '</div><button class="characters__btn characters__btn--danger characters__btn--sm" data-remove-feat="' + index + '">×</button>';
				html += '</div>';
			});
		} else html += '<div class="characters__feature-item">Nenhum talento</div>';
		html += '</div>';

		html += '<div class="characters__subtitle">Adicionar Talento</div>';
		html += '<div class="characters__form-row"><input type="text" class="characters__form-input" id="feat-search" placeholder="Buscar talento..."></div>';
		html += '<div id="feat-search-results" class="characters__search-results mt-2"></div>';
		html += '<a class="ptm-link ptm-open-list" href="feats.html">Abrir lista completa de talentos</a>';

		html += '<div class="characters__subtitle">Habilidades Especiais</div>';
		html += '<div class="characters__features-list">';
		if (char.specialAbilities && char.specialAbilities.length) {
			char.specialAbilities.forEach(function(ability) {
				html += '<div class="characters__feature-item"><div><div class="characters__feature-name">' + esc(ability.name || ability) + '</div>';
				if (ability.description) html += '<div class="characters__feature-desc">' + esc(ability.description) + '</div>';
				html += '</div></div>';
			});
		} else html += '<div class="characters__feature-item">Nenhuma habilidade especial</div>';
		html += '</div>';

		html += '<div class="characters__subtitle">Características Selecionáveis</div>';
		html += '<div class="characters__features-list">';
		if (char.selectableFeatures && char.selectableFeatures.length) {
			char.selectableFeatures.forEach(function(feature) {
				html += '<div class="characters__feature-item"><div><div class="characters__feature-name">' + esc(feature.name || feature) + '</div>';
				if (feature.type) html += '<div class="characters__feature-type">' + esc(feature.type) + '</div>';
				html += '</div></div>';
			});
		} else html += '<div class="characters__feature-item">Nenhuma característica selecionável</div>';
		html += '</div>';

		$body.html(html);
		var $featSearch = $body.find("#feat-search");
		var $featResults = $body.find("#feat-search-results");
		$featSearch.on("input", function() {
			var query = $(this).val().toLowerCase().trim();
			if (query.length < 2) { $featResults.empty(); return; }
			var filtered = featsData.filter(function(feat) { return feat.name.toLowerCase().indexOf(query) >= 0; }).slice(0, 10);
			$featResults.empty();
			if (!filtered.length) { $featResults.html('<div class="characters__search-item">Nenhum talento encontrado</div>'); return; }
			filtered.forEach(function(feat) {
				var $item = $('<div class="characters__search-item">');
				$item.html('<b>' + esc(feat.name) + '</b>' + (feat.source ? ' (' + esc(feat.source) + ')' : ""));
				$item.on("click", function() {
					if (!char.feats) char.feats = [];
					char.feats.push({name: feat.name, source: feat.source});
					renderModuleFeatures($body, char);
				});
				$featResults.append($item);
			});
		});
		$body.on("click", "[data-remove-feat]", function() {
			var index = parseInt($(this).data("remove-feat"), 10);
			if (char.feats && char.feats[index]) { char.feats.splice(index, 1); renderModuleFeatures($body, char); }
		});
	}
function appendCoinsModule($body, char) {
		var html = '<div class="characters__subtitle">Moedas</div>';
		html += '<div class="characters__form-row">';
		var coinsDef = [["platinum","Platina (pp)"],["gold","Ouro (po)"],["electrum","Électrum (pe)"],["silver","Prata (pe)"],["copper","Cobre (pc)"]];
		coinsDef.forEach(function(c) {
			var val = char.coins ? (char.coins[c[0]] || 0) : 0;
			html += '<div class="characters__form-group characters__coin-group"><label>' + c[1] + '</label>';
			html += '<input type="number" class="characters__form-input coin-input" data-coin="' + c[0] + '" value="' + val + '" min="0"></div>';
		});
		html += '</div>';
		$body.append(html);
		$body.find(".coin-input").on("change", function() {
			var type = $(this).data("coin");
			if (!char.coins) char.coins = {};
			char.coins[type] = parseInt($(this).val(), 10) || 0;
		});
	}

	function refreshAttacksModule() {
		var $body = $root.find('[data-module="attacks"] .characters__module-body');
		if ($body.length && currentChar && SHEET_MODULE_DEFS) SHEET_MODULE_DEFS.attacks.render($body, currentChar);
	}

	function renderModuleEquipment($body, char) {
		// Armas agora são gerenciadas apenas no módulo "Ataques & Ações"
		var html = '<div class="characters__subtitle">Armaduras</div>';
		html += '<div class="characters__items-list" id="armors-list">';
		if (char.armors && char.armors.length) {
			char.armors.forEach(function(armor, index) {
				html += '<div class="characters__item"><a class="ptm-link" href="' + esc(ptmItemHref(armor)) + '">' + esc(armor.name || armor) + '</a>';
				html += '<button class="characters__btn characters__btn--danger characters__btn--sm" data-remove-armor="' + index + '">×</button></div>';
			});
		} else html += '<div class="characters__item">Nenhuma armadura equipada</div>';
		html += '</div>';

		html += '<div class="characters__subtitle">Adicionar Armadura</div>';
		html += '<div class="characters__form-row"><input type="text" class="characters__form-input" id="armor-search" placeholder="Buscar armadura..."></div>';
		html += '<div id="armor-search-results" class="characters__search-results mt-2"></div>';
		html += '<a class="ptm-link ptm-open-list" href="items.html">Abrir lista completa de itens</a>';

		html += '<div class="characters__subtitle">Inventário</div>';
		html += '<textarea class="characters__sheet-textarea" id="in-inv" placeholder="Anote seus itens (um por linha)...">' + esc((char.inventory || []).join("\n")) + '</textarea>';
		html += ptmSearchHint();

		$body.html(html);

		var $armorSearch = $body.find("#armor-search");
		var $armorResults = $body.find("#armor-search-results");
		$armorSearch.on("input", function() {
			var query = $(this).val().toLowerCase().trim();
			if (query.length < 2) { $armorResults.empty(); return; }
			var filtered = itemsData.filter(function(item) {
				var baseType = String(item.type || "").split("|")[0];
				return item.name.toLowerCase().indexOf(query) >= 0 && ["LA","MA","HA","S"].indexOf(baseType) >= 0;
			}).slice(0, 10);
			$armorResults.empty();
			if (!filtered.length) { $armorResults.html('<div class="characters__search-item">Nenhuma armadura encontrada</div>'); return; }
			filtered.forEach(function(armor) {
				var $item = $('<div class="characters__search-item">');
				var baseType = String(armor.type || "").split("|")[0];
				var typeLabel = {LA: "Armadura leve", MA: "Armadura média", HA: "Armadura pesada", S: "Escudo"}[baseType] || "Armadura";
				$item.html('<b>' + esc(optionLabel(armor)) + '</b> (' + esc(typeLabel) + ')');
				$item.on("click", function() {
					if (!char.armors) char.armors = [];
					char.armors.push({name: armor.name, source: armor.source || "", type: baseType, ac: armor.ac});
					renderModuleEquipment($body, char);
				});
				$armorResults.append($item);
			});
		});
		$body.on("click", "[data-remove-armor]", function() {
			var index = parseInt($(this).data("remove-armor"), 10);
			if (char.armors && char.armors[index]) { char.armors.splice(index, 1); renderModuleEquipment($body, char); }
		});

		appendCoinsModule($body, char);
	}
function renderModuleNotes($body, char) {
		var html = '<div class="characters__subtitle">Anotações (salvas automaticamente)</div>';
		html += '<textarea class="characters__sheet-textarea" id="in-notes" placeholder="História, anotações, ideias...">' + esc(char.notes || "") + '</textarea>';
		$body.html(html);
	}

	SHEET_MODULE_DEFS = {
		abilities: {title: "Atributos", render: renderModuleAbilities},
		combat: {title: "Combate", render: renderModuleCombat},
		skills: {title: "Perícias & Resistências", render: renderModuleSkills},
		attacks: {title: "Ataques & Ações", render: renderModuleAttacks},
		spells: {title: "Magias", render: renderModuleSpells},
		features: {title: "Características", render: renderModuleFeatures},
		equipment: {title: "Equipamentos", render: renderModuleEquipment},
		notes: {title: "Notas", render: renderModuleNotes}
	};
	// === Export/Import ===
function renderSheet() {
		try {
			var char = currentChar;
			if (!char) { console.error("[Characters] Nenhum personagem selecionado"); return; }
			console.log("[Characters] Renderizando ficha:", char.name);

			var html = '<div class="characters__view characters__view--sheet">';
			html += '<div class="characters__reorder-hint" id="reorder-hint" style="display:none">Toque e arraste o ícone ⋮⋮ no topo de cada seção para reordená-la. Toque no nome de uma seção para mostrá-la ou ocultá-la. ' +
				'<button class="characters__btn characters__btn--secondary characters__btn--sm" id="btn-reset-order">Ordem padrão</button></div>';
			html += '<div class="characters__sheet">';
			html += buildSheetHeader(char);
			html += '<div id="sheet-modules" class="characters__modules"></div>';
			html += '</div>'; // .characters__sheet
			html += '</div>'; // .characters__view

			$root.html(html);
			initDetailSystem();

			// Ações da ficha: no cabeçalho, ao lado do avatar.
			// Delegação em $root para sobreviver à recriação do cabeçalho.
			$root.off(".sheetact");
			$root.on("click.sheetact", "#btn-export-sheet", function() { exportToCah(char); });
			$root.on("click.sheetact", "#btn-print", function() { openRollHistoryPopup(char); });
			$root.on("click.sheetact", "#btn-reorder", toggleSheetReorder);
			$root.on("click.sheetact", "#btn-reset-order", resetSheetOrder);
			$root.on("click.sheetact", "#btn-delete", function() {
				if (!confirm("Excluir esta ficha?")) return;
				CharactersStore.remove(char.id);
				currentView = "list"; currentChar = null; renderList();
			});
			// Salvamento automático: qualquer alteração na ficha é gravada
			bindAutoSave(char);
			// Botão físico/gesto de voltar do celular
			initBackNavigation();
			renderModules();
		} catch (err) {
			console.error("[Characters] Erro ao renderizar ficha:", err);
			alert("Erro ao renderizar ficha: " + err.message);
		}
	}
	function exportToCah(charData) {
		var d = charData || creationData;
		var cah = {
			about: "",
			advantages: [],
			alignmentName: d.alignment || "Neutro",
			allRequiredClasses: { jobs: [] },
			armors: [],
			background: d.background || null,
			baseAc: d.ac || 10,
			baseHp: d.hp.max || 0,
			bonds: d.bonds || "",
			bonusSpellSlots: {eighth:0,fifth:0,first:0,fourth:0,ninth:0,second:0,seventh:0,sixth:0,third:0},
			burrowSpeedModifier: 0,
			charisma: {save:false,saveModifier:0,score:d.scores.cha||10,scoreModifier:0},
			climbSpeedModifier: 0,
			companion: null,
			conditions: {},
			constitution: {save:false,saveModifier:0,score:d.scores.con||10,scoreModifier:0},
			copper: 0,
			created: d.created || Date.now(),
			dexterity: {save:false,saveModifier:0,score:d.scores.dex||10,scoreModifier:0},
			disadvantages: [],
			effectApplications: [],
			electrum: 0,
			equipment: [],
			equippedColorSchemeId: "default",
			equippedDiceId: "plain_blue",
			exp: d.experience || 0,
			extraAC: 0,
			failures: 0,
			feats: [],
			flaws: d.flaws || "",
			flySpeedModifier: 0,
			gold: 0,
			hasInspiration: false,
			hp: d.hp.current || d.hp.max || 1,
			id: d.id || "char_" + Date.now(),
			ideals: d.ideals || "",
			imagePath: "",
			imageUrl: "",
			initiativeModifier: d.initiative || 0,
			intelligence: {save:false,saveModifier:0,score:d.scores.int||10,scoreModifier:0},
			jobs: d.className ? [{
				archetypeId: d.subclass || "",
				dice: CLASS_HIT_DICE[d.className] || 8,
				jobId: d.className.toLowerCase(),
				languageProficiencies: [],
				level: d.level || 1,
				toolProficiencies: []
			}] : [],
			jsonType: "character",
			name: d.name || "Sem Nome",
			notes: d.notes ? d.notes.split("\n").map(function(t) { return {text:t}; }) : [],
			passivePerceptionModifier: 0,
			personalityTraits: d.personality || "",
			platinum: 0,
			player: d.playerName || "",
			preferences: {dcAbility:"DEX",editAllSkills:false,sectionOrder:["STATUS","CONDITIONS","ABILITIES","SAVING_THROWS","SKILLS","SPECIAL_ABILITY","COMPANION","FEATS","SELECTABLE_FEATURES","ARMOR","EQUIPMENT","WEAPONS","SPELL_SLOTS","SPELLS"],showCompanion:true,showConditions:false,showFeats:true,showNotes:true,showSpells:true,sortSkillsByAbility:true},
			proficiencies: [],
			proficiencyModifier: calcProfBonus(d.level || 1),
			race: d.race ? {raceId:d.race.name.toLowerCase(),subraceId:d.race.subrace ? d.race.subrace[0].toLowerCase() : null} : null,
			requiredBackground: null,
			requiredMonster: null,
			requiredRace: null,
			selectableFeatures: [],
			silver: 0,
			skills: d.skills || {},
			specialAbilities: [],
			speedModifier: 0,
			spellAttackExtraBonus: 0,
			spellDCExtraBonus: 0,
			spellSlots: {eighth:0,fifth:0,first:0,fourth:0,ninth:0,second:0,seventh:0,sixth:0,third:0},
			spells: [],
			strength: {save:false,saveModifier:0,score:d.scores.str||10,scoreModifier:0},
			successes: 0,
			swimSpeedModifier: 0,
			tempHp: 0,
			updated: Date.now(),
			weapons: [],
			wisdom: {save:false,saveModifier:0,score:d.scores.wis||10,scoreModifier:0}
		};
		
		var dataStr = JSON.stringify(cah, null, 2);
		var blob = new Blob([dataStr], {type: "application/json"});
		var url = URL.createObjectURL(blob);
		var a = document.createElement("a");
		a.href = url;
		a.download = "character_" + (d.name || "sheet") + ".cah";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		
		if (global.JqueryUtil && global.JqueryUtil.doToast) {
			global.JqueryUtil.doToast({type: "success", content: "Ficha exportada!"});
		} else {
			alert("Ficha exportada com sucesso!");
		}
	}

	function importCharacter(cahData) {
		if (!cahData || cahData.jsonType !== "character") {
			alert("Arquivo inválido!");
			return;
		}
		
		if (!confirm("Deseja importar esta ficha? Os dados atuais serão substituídos.")) return;
		
		var newChar = {
			id: cahData.id || null,
			name: cahData.name || "Sem Nome",
			race: cahData.race,
			className: cahData.jobs && cahData.jobs.length ? cahData.jobs[0].jobId : null,
			background: cahData.background,
			level: cahData.jobs && cahData.jobs.length ? cahData.jobs[0].level : 1,
			scores: {
				str: cahData.strength ? cahData.strength.score : 10,
				dex: cahData.dexterity ? cahData.dexterity.score : 10,
				con: cahData.constitution ? cahData.constitution.score : 10,
				int: cahData.intelligence ? cahData.intelligence.score : 10,
				wis: cahData.wisdom ? cahData.wisdom.score : 10,
				cha: cahData.charisma ? cahData.charisma.score : 10
			},
			rawScores: {str:0,dex:0,con:0,int:0,wis:0,cha:0},
			method: "standard",
			skills: cahData.skills || {},
			savingThrows: [],
			otherProficiencies: [],
			hp: {max:cahData.baseHp||10,current:cahData.hp||10,temp:0},
			ac: cahData.baseAc || 10,
			initiative: cahData.initiativeModifier || 0,
			speed: 30,
			alignment: cahData.alignmentName || "Neutro",
			playerName: cahData.player || "",
			experience: cahData.exp || 0,
			spells: [],
			features: [],
			equipment: [],
			inventory: [],
			notes: cahData.notes ? cahData.notes.map(function(n) { return n.text || ""; }).join("\n") : "",
			personality: cahData.personalityTraits || "",
			ideals: cahData.ideals || "",
			bonds: cahData.bonds || "",
			flaws: cahData.flaws || "",
			created: cahData.created || Date.now(),
			updated: Date.now()
		};
		
		CharactersStore.save(newChar);
		currentView = "list";
		currentChar = null;
		renderList();
		
		if (global.JqueryUtil && global.JqueryUtil.doToast) {
			global.JqueryUtil.doToast({type: "success", content: "Ficha importada com sucesso!"});
		} else {
			alert("Ficha importada com sucesso!");
		}
	}

	// === Cálculos automáticos ===
	// Tabelas de espaços de magia por nível de personagem (1-20).
	// Cada array tem as posições 0..8 = espaços de magia de 1º a 9º nível.
	var SPELL_SLOT_TABLES = {
		// Conjuradores completos (Bardo, Clérigo, Druida, Feiticeiro, Mago)
		full: {
			1:[2,0,0,0,0,0,0,0,0], 2:[3,0,0,0,0,0,0,0,0], 3:[4,2,0,0,0,0,0,0,0],
			4:[4,3,0,0,0,0,0,0,0], 5:[4,3,2,0,0,0,0,0,0], 6:[4,3,3,0,0,0,0,0,0],
			7:[4,3,3,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0], 9:[4,3,3,3,1,0,0,0,0],
			10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0],
			13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0],
			16:[4,3,3,3,2,1,1,1,0], 17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1],
			19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1]
		},
		// Meios conjuradores (Paladino, Patrulheiro) — começam no 2º nível
		half: {
			1:[0,0,0,0,0,0,0,0,0], 2:[2,0,0,0,0,0,0,0,0], 3:[3,0,0,0,0,0,0,0,0],
			4:[3,0,0,0,0,0,0,0,0], 5:[4,2,0,0,0,0,0,0,0], 6:[4,2,0,0,0,0,0,0,0],
			7:[4,3,0,0,0,0,0,0,0], 8:[4,3,0,0,0,0,0,0,0], 9:[4,3,2,0,0,0,0,0,0],
			10:[4,3,2,0,0,0,0,0,0], 11:[4,3,3,0,0,0,0,0,0], 12:[4,3,3,0,0,0,0,0,0],
			13:[4,3,3,1,0,0,0,0,0], 14:[4,3,3,1,0,0,0,0,0], 15:[4,3,3,2,0,0,0,0,0],
			16:[4,3,3,2,0,0,0,0,0], 17:[4,3,3,3,1,0,0,0,0], 18:[4,3,3,3,1,0,0,0,0],
			19:[4,3,3,3,2,0,0,0,0], 20:[4,3,3,3,2,0,0,0,0]
		},
		// Artífice — meio conjurador arredondado para cima (já conjura no 1º nível)
		artificer: {
			1:[2,0,0,0,0,0,0,0,0], 2:[2,0,0,0,0,0,0,0,0], 3:[3,0,0,0,0,0,0,0,0],
			4:[3,0,0,0,0,0,0,0,0], 5:[4,2,0,0,0,0,0,0,0], 6:[4,2,0,0,0,0,0,0,0],
			7:[4,3,0,0,0,0,0,0,0], 8:[4,3,0,0,0,0,0,0,0], 9:[4,3,2,0,0,0,0,0,0],
			10:[4,3,2,0,0,0,0,0,0], 11:[4,3,3,0,0,0,0,0,0], 12:[4,3,3,0,0,0,0,0,0],
			13:[4,3,3,1,0,0,0,0,0], 14:[4,3,3,1,0,0,0,0,0], 15:[4,3,3,2,0,0,0,0,0],
			16:[4,3,3,2,0,0,0,0,0], 17:[4,3,3,3,1,0,0,0,0], 18:[4,3,3,3,1,0,0,0,0],
			19:[4,3,3,3,2,0,0,0,0], 20:[4,3,3,3,2,0,0,0,0]
		},
		// Um terço (Cavaleiro Arcano/Guerreiro, Trapaceiro Arcano/Ladino) — a partir do 3º nível
		third: {
			1:[0,0,0,0,0,0,0,0,0], 2:[0,0,0,0,0,0,0,0,0], 3:[2,0,0,0,0,0,0,0,0],
			4:[3,0,0,0,0,0,0,0,0], 5:[3,0,0,0,0,0,0,0,0], 6:[3,0,0,0,0,0,0,0,0],
			7:[4,2,0,0,0,0,0,0,0], 8:[4,2,0,0,0,0,0,0,0], 9:[4,2,0,0,0,0,0,0,0],
			10:[4,3,0,0,0,0,0,0,0], 11:[4,3,0,0,0,0,0,0,0], 12:[4,3,0,0,0,0,0,0,0],
			13:[4,3,2,0,0,0,0,0,0], 14:[4,3,2,0,0,0,0,0,0], 15:[4,3,2,0,0,0,0,0,0],
			16:[4,3,3,0,0,0,0,0,0], 17:[4,3,3,0,0,0,0,0,0], 18:[4,3,3,0,0,0,0,0,0],
			19:[4,3,3,1,0,0,0,0,0], 20:[4,3,3,1,0,0,0,0,0]
		}
	};

	function calculateSpellSlots(char) {
		var slots = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
		var classes = charClasses(char);
		// Warlock pact magic: calculado separadamente
		var warlockClass = classes.find(function(c){ return c.name === "Warlock"; });
		if (warlockClass) {
			var lvl = warlockClass.level || 1;
			var count = lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 2 ? 2 : 1;
			var pactLv = lvl >= 9 ? 5 : lvl >= 7 ? 4 : lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
			slots[pactLv] = count;
		}
		// Conjuração normal (multiclasse: usa casterLevel)
		var cl = casterLevel(char);
		if (cl < 1) return slots;
		// Verifica se há algum conjurador não-warlock
		var hasNonWarlock = classes.some(function(c){ var i=spellcasterInfo(c.name,c.subclass); return i.isCaster && i.kind!=="warlock"; });
		if (hasNonWarlock) {
			var table = SPELL_SLOT_TABLES["full"][cl] || [];
			for (var i = 0; i < table.length; i++) slots[i + 1] = (slots[i+1]||0) + table[i];
		}
		return slots;
	}
	
	function calculateSpellAttackBonus(char) {
		var profBonus = profBonusEff(char);
		var classAbilityMap = {
			"Wizard": "int", "Sorcerer": "cha", "Cleric": "wis", "Druid": "wis",
			"Bard": "cha", "Warlock": "cha", "Paladin": "cha", "Ranger": "wis", "Artificer": "int"
		};
		var spellcastingAbility = classAbilityMap[char.className] || "int";
		var abilityMod = calcMod(effAbility(char, spellcastingAbility));
		return profBonus + abilityMod;
	}
	
	function calculateSpellDC(char) {
		return 8 + calculateSpellAttackBonus(char);
	}
	
	function calculatePassivePerception(char) {
		return 10 + skillTotalEff(char, "perception");
	}

	// === Detalhes editáveis: segurar (ou clique direito) num valor para ver a
	// decomposição e/ definir manualmente. Valores alterados ficam dourados. ===
	var OVR_CLASS = "characters__val-ov";
var SPELL_ABIL_MAP = {"Wizard":"int","Sorcerer":"cha","Cleric":"wis","Druid":"wis","Bard":"cha","Warlock":"cha","Paladin":"cha","Ranger":"wis","Artificer":"int"};
	// Atributo mínimo exigido para multiclasse (13 no atributo principal da classe)
	var MULTICLASS_REQ = {"Wizard":{abil:"int",min:13},"Sorcerer":{abil:"cha",min:13},"Cleric":{abil:"wis",min:13},"Druid":{abil:"wis",min:13},"Bard":{abil:"cha",min:13},"Warlock":{abil:"cha",min:13},"Paladin":{abil:"cha",min:13},"Ranger":{abil:"wis",min:13},"Artificer":{abil:"int",min:13},"Fighter":{abil:"str",min:13},"Barbarian":{abil:"str",min:13},"Monk":{abil:"dex",min:13},"Rogue":{abil:"dex",min:13}};
	// Retorna {kind, isCaster} para uma classe+subclasse
	function spellcasterInfo(className, subclass) {
		var sub = String(subclass||"").toLowerCase();
		if (className === "Warlock") return {kind:"warlock", isCaster:true, pact:true};
		if (["Bard","Cleric","Druid","Sorcerer","Wizard"].indexOf(className)>=0) return {kind:"full", isCaster:true};
		if (["Paladin","Ranger"].indexOf(className)>=0) return {kind:"half", isCaster:true};
		if (className === "Artificer") return {kind:"artificer", isCaster:true};
		if (className === "Fighter" && sub.indexOf("eldritch")>=0) return {kind:"third", isCaster:true};
		if (className === "Rogue" && sub.indexOf("arcane")>=0) return {kind:"third", isCaster:true};
		return {kind:null, isCaster:false};
	}
	// Lista de classes do personagem (compatível com formato antigo)
	function charClasses(char) {
		if (char.classes && char.classes.length) return char.classes.slice();
		var arr = [];
		if (char.className) arr.push({name:char.className, subclass:char.subclass||"", level:char.level||1});
		return arr;
	}
	function totalLevel(char) { return charClasses(char).reduce(function(a,c){return a+(c.level||1);},0); }
	// Nível efetivo para espaços de magia (multiclasse PHB p.164)
	function casterLevel(char) {
		var lv = 0;
		charClasses(char).forEach(function(c) {
			var info = spellcasterInfo(c.name, c.subclass);
			if (info.kind === "full" || info.kind === "warlock") lv += (c.level||1);
			else if (info.kind === "artificer") lv += Math.ceil((c.level||1)/2);
			else if (info.kind === "half") lv += Math.floor((c.level||1)/2);
			else if (info.kind === "third") lv += Math.floor((c.level||1)/3);
		});
		return Math.min(20, lv);
	}
	// Retorna true se o personagem tem alguma classe conjuradora
	function isAnyCaster(char) {
		return charClasses(char).some(function(c){ return spellcasterInfo(c.name, c.subclass).isCaster; });
	}

	var SPELL_ABIL_MAP = {"Wizard":"int", "Sorcerer":"cha", "Cleric":"wis", "Druid":"wis", "Bard":"cha", "Warlock":"cha", "Paladin":"cha", "Ranger":"wis", "Artificer":"int"};
	var detailClickGuard = false;
	function guardDetailClick() { if (!detailClickGuard) return false; detailClickGuard = false; return true; }
	function fmtSigned(n) { return (n >= 0 ? "+" : "") + n; }
	function ovHas(char, key) { return !!(char.overrides && char.overrides[key] != null); }
	function ovGet(char, key, autoVal) { return ovHas(char, key) ? char.overrides[key] : autoVal; }
	function ovSet(char, key, val) {
		if (!char.overrides) char.overrides = {};
		if (val == null || val === "") delete char.overrides[key];
		else char.overrides[key] = val;
		char.updated = Date.now();
		CharactersStore.save(char);
	}
	// Atributo efetivo (respeita alteração manual do placar)
	function effAbility(char, a) { return ovGet(char, "ab:" + a, (char.scores[a] || 8) + (char.rawScores[a] || 0)); }
	function profBonusEff(char) { return ovGet(char, "prof", calcProfBonus(char.level || 1)); }
	function skillKeyAbil(k) {
		var sk = SKILLS.find(function(s) { return s.name === SKILL_KEY_TO_PT[k]; });
		return sk ? sk.abil : "str";
	}
	function skillTotalEff(char, k) {
		var v = (char.skills && char.skills[k]) || 0;
		var pb = profBonusEff(char);
		return calcMod(effAbility(char, skillKeyAbil(k))) + (v === 1 ? pb : v === 2 ? pb * 2 : 0);
	}
	function saveTotalEff(char, a) {
		var prof = (char.savingThrows || []).indexOf(a) >= 0;
		return calcMod(effAbility(char, a)) + (prof ? profBonusEff(char) : 0);
	}
	function computeWeaponStats(char, w) {
		var it = itemsData.find(function(i) { return i.name === (w && w.name); });
		var baseType = it ? String(it.type || "").split("|")[0] : "";
		var props = (it && it.property) || [];
		var isRanged = (w && w.type && /ranged/i.test(String(w.type))) || props.indexOf("A") >= 0 || baseType === "R";
		var finesse = props.indexOf("F") >= 0;
		var strMod = calcMod(effAbility(char, "str"));
		var dexMod = calcMod(effAbility(char, "dex"));
		var abilMod = isRanged ? dexMod : (finesse ? Math.max(strMod, dexMod) : strMod);
		var pb = profBonusEff(char);
		var dmgBase = (it && it.dmg1) ? it.dmg1 : null;
		var hit = pb + abilMod;
		// Estilo de Luta: Arqueirismo (+2 para acertar à distância)
		if (char.fightingStyle === "Archery" && isRanged) hit += 2;
		return {
			it: it, isRanged: isRanged, finesse: finesse, abilMod: abilMod,
			abilName: isRanged ? "DES" : (finesse ? "FOR/DES" : "FOR"),
			pb: pb, hit: hit,
			dmgBase: dmgBase,
			dmgStr: dmgBase ? (dmgBase + (abilMod >= 0 ? "+" : "") + abilMod) : "—",
			dmgType: (it && it.dmgType) ? " " + it.dmgType : ""
		};
	}
	// Span de valor editável: classe dourada + âncora para o diálogo de detalhe
	function ovSpan(char, key, autoVal, fmt, baseCls) {
		var has = ovHas(char, key);
		var v = ovGet(char, key, autoVal);
		var txt;
		if (fmt === "mod") txt = fmtSigned(v);
		else if (fmt === "hit") txt = "+" + v;
		else txt = String(v);
		return '<span class="characters__ov ' + (baseCls || "") + (has ? " " + OVR_CLASS : "") + '" data-detail="' + key + '">' + txt + '</span>';
	}
	// PV máximo correto em multiclasse: soma o HP de CADA classe.
	// 1º nível da classe = dado de vida completo + CON; demais = média (⌊d/2⌋+1) + CON.
	function hpMaxAuto(char) {
		var conM = calcMod(effAbility(char, "con"));
		var list = charClasses(char);
		if (!list.length) {
			var hd0 = CLASS_HIT_DICE[char.className] || 8;
			var lv0 = char.level || 1;
			return hd0 + conM + (lv0 - 1) * (Math.floor(hd0 / 2) + 1 + conM);
		}
		var total = 0;
		list.forEach(function(c) {
			var hd = CLASS_HIT_DICE[c.name] || 8;
			var lv = c.level || 1;
			total += hd + conM + (lv - 1) * (Math.floor(hd / 2) + 1 + conM);
		});
		return total;
	}
	function acAuto(char) {
		var dexM = calcMod(effAbility(char, "dex"));
		var armor = computeArmorAC(char, dexM);
		if (armor != null) return armor;
		if (char.ac != null) return char.ac;
		return 10 + dexM;
	}
	function ppAuto(char) { return 10 + skillTotalEff(char, "perception"); }
	// Registro de decomposição por chave
	function detailDef(key) {
		var m = key.match(/^ab:([a-z]+)$/);
		if (m) { var a1 = m[1]; return {
			title: ABILITY_NAMES[a1], numeric: true,
			parts: function(char) {
				var arr = [{label: "Pontos distribuídos", txt: String(char.scores[a1] || 8)}];
				if (char.rawScores[a1]) arr.push({label: "Raça/ancestralidade", txt: "+" + char.rawScores[a1]});
				return arr;
			},
			auto: function(char) { return (char.scores[a1] || 8) + (char.rawScores[a1] || 0); }
		}; }
		m = key.match(/^save:([a-z]+)$/);
		if (m) { var a2 = m[1]; return {
			title: "Resistência: " + ABILITY_NAMES[a2], numeric: true,
			parts: function(char) {
				var arr = [{label: "Mod. " + ABILITY_NAMES[a2], txt: fmtSigned(calcMod(effAbility(char, a2)))}];
				if ((char.savingThrows || []).indexOf(a2) >= 0) arr.push({label: "Proficiência", txt: "+" + profBonusEff(char)});
				return arr;
			},
			auto: function(char) { return saveTotalEff(char, a2); }
		}; }
		m = key.match(/^skill:([a-z]+)$/);
		if (m) { var k1 = m[1]; return {
			title: "Perícia: " + (SKILL_KEY_TO_PT[k1] || k1), numeric: true,
			parts: function(char) {
				var v = (char.skills && char.skills[k1]) || 0;
				var pb = profBonusEff(char);
				var arr = [{label: "Mod. " + ABILITY_NAMES[skillKeyAbil(k1)], txt: fmtSigned(calcMod(effAbility(char, skillKeyAbil(k1))))}];
				if (v === 1) arr.push({label: "Proficiência", txt: "+" + pb});
				else if (v === 2) arr.push({label: "Especialização", txt: "+" + (pb * 2)});
				return arr;
			},
			auto: function(char) { return skillTotalEff(char, k1); }
		}; }
		if (key === "hp.max") return {
			title: "Pontos de Vida Máximos", numeric: true,
			parts: function(char) {
				var conM = calcMod(effAbility(char, "con"));
				var list = charClasses(char);
				var arr = [];
				var multi = list.length > 1 || (list.length === 1 && char.className && list[0].name !== char.className);
				if (multi) {
					list.forEach(function(c) {
						var hd = CLASS_HIT_DICE[c.name] || 8;
						var lv = c.level || 1;
						var per = Math.floor(hd / 2) + 1 + conM;
						arr.push({label: c.name + " — Nv. " + lv + " (d" + hd + " + CON)", txt: String(hd + conM) + (lv > 1 ? " + " + (lv - 1) + "×" + per : "")});
					});
				} else {
					var hd1 = CLASS_HIT_DICE[char.className] || 8;
					var lv1 = char.level || 1;
					arr.push({label: "Dado de vida 1º nível (d" + hd1 + " + CON)", txt: fmtSigned(hd1 + conM)});
					if (lv1 > 1) arr.push({label: "Níveis 2–" + lv1 + " (média por nível)", txt: "+" + ((lv1 - 1) * (Math.floor(hd1 / 2) + 1 + conM))});
				}
				return arr;
			},
			auto: function(char) { return hpMaxAuto(char); },
			get: function(char) { return (char.hp && char.hp.max != null) ? char.hp.max : hpMaxAuto(char); },
			set: function(char, v) {
				// Grava em char.hp.max (e limpa qualquer override antigo) para que
				// os futuros level-ups continuem somando PV corretamente.
				if (!char.hp) char.hp = {};
				if (char.overrides && char.overrides["hp.max"] != null) delete char.overrides["hp.max"];
				char.hp.max = (v != null) ? v : hpMaxAuto(char);
				if (char.hp.current != null && char.hp.current > char.hp.max) char.hp.current = char.hp.max;
				char.updated = Date.now();
				CharactersStore.save(char);
			}
		};
		if (key === "hp.current") return {
			title: "Pontos de Vida Atuais", numeric: true,
			hint: "Use os botões − e + ao lado do valor na ficha para ajustar de 1 em 1; digite aqui um valor exato.",
			parts: function(char) {
				var max2 = (char.hp && char.hp.max) || 0;
				return [{label: "PV máximos", txt: String(max2)}];
			},
			auto: function(char) { return (char.hp && char.hp.current != null) ? char.hp.current : ((char.hp && char.hp.max) || 0); },
			get: function(char) { return (char.hp && char.hp.current != null) ? char.hp.current : 0; },
			set: function(char, v) {
				if (!char.hp) char.hp = {};
				var max = char.hp.max || 0;
				char.hp.current = Math.max(0, Math.min(max, (v != null) ? v : (char.hp.current || 0)));
				if (char.hp.current > 0) char.deathSaves = {failures: 0, successes: 0};
				char.updated = Date.now();
				CharactersStore.save(char);
			}
		};
		if (key === "ac") return {
			title: "Classe de Armadura (CA)", numeric: true,
			parts: function(char) {
				var dexM = calcMod(effAbility(char, "dex"));
				var armor = computeArmorAC(char, dexM);
				if (armor != null) return [{label: "Armadura/escudo equipados", txt: String(armor)}];
				return [{label: "Base", txt: "10"}, {label: "Mod. DES", txt: fmtSigned(dexM)}];
			},
			auto: function(char) { return acAuto(char); }
		};
		if (key === "initiative") return {
			title: "Iniciativa", numeric: true,
			parts: function(char) { return [{label: "Mod. DES", txt: fmtSigned(calcMod(effAbility(char, "dex")))}]; },
			auto: function(char) { return calcMod(effAbility(char, "dex")); }
		};
		if (key === "speed") return {
			title: "Deslocamento", numeric: true,
			parts: function(char) { return [{label: "Base (raça/equipamento)", txt: String(char.speed || 30)}]; },
			auto: function(char) { return char.speed || 30; }
		};
		if (key === "prof") return {
			title: "Bônus de Proficiência", numeric: true,
			parts: function(char) { return [{label: "Nível " + (char.level || 1), txt: "+" + calcProfBonus(char.level || 1)}]; },
			auto: function(char) { return calcProfBonus(char.level || 1); }
		};
		if (key === "pp") return {
			title: "Percepção Passiva", numeric: true,
			parts: function(char) { return [{label: "Base", txt: "10"}, {label: "Percepção (total)", txt: fmtSigned(skillTotalEff(char, "perception"))}]; },
			auto: function(char) { return ppAuto(char); }
		};
		if (key === "spellDC") return {
			title: "CD de Magia", numeric: true,
			parts: function(char) {
				return [{label: "Base", txt: "8"}, {label: "Proficiência", txt: "+" + profBonusEff(char)}, {label: "Mod. " + spellAbilityName(char), txt: fmtSigned(calcMod(effAbility(char, SPELL_ABIL_MAP[char.className] || "int")))}];
			},
			auto: function(char) { return calculateSpellDC(char); }
		};
		if (key === "spellAB") return {
			title: "Bônus de Ataque Mágico", numeric: true,
			parts: function(char) {
				return [{label: "Proficiência", txt: "+" + profBonusEff(char)}, {label: "Mod. " + spellAbilityName(char), txt: fmtSigned(calcMod(effAbility(char, SPELL_ABIL_MAP[char.className] || "int")))}];
			},
			auto: function(char) { return calculateSpellAttackBonus(char); }
		};
		m = key.match(/^slot:([1-9])$/);
		if (m) { var n1 = parseInt(m[1], 10); return {
			title: "Espaços de Magia — Nível " + n1, numeric: true,
			hint: "Edite para marcar quantos espaços ainda restam.",
			parts: function(char) { return [{label: "Tabela de conjuração", txt: String((char.spellSlots && char.spellSlots[n1]) || 0)}]; },
			auto: function(char) { return (char.spellSlots && char.spellSlots[n1]) || 0; }
		}; }
		m = key.match(/^atk:(\d+):(hit|dmg)$/);
		if (m) { var wi = parseInt(m[1], 10), wField = m[2]; return {
			title: (wField === "hit") ? "Ataque — bônus para acertar" : "Ataque — dano",
			numeric: (wField === "hit"),
			parts: function(char) {
				var w = (char.weapons || [])[wi];
				if (!w) return [{label: "Arma removida", txt: "—"}];
				var ws = computeWeaponStats(char, w);
				var arr = [{label: "Arma", txt: w.name || "—"}];
				if (wField === "hit") {
					arr.push({label: "Proficiência", txt: "+" + ws.pb});
					arr.push({label: "Mod. " + ws.abilName, txt: fmtSigned(ws.abilMod)});
				} else {
					arr.push({label: "Dado", txt: ws.dmgBase || "—"});
					arr.push({label: "Mod. " + ws.abilName, txt: fmtSigned(ws.abilMod)});
				}
				return arr;
			},
			auto: function(char) {
				var w = (char.weapons || [])[wi];
				if (!w) return (wField === "hit") ? 0 : "—";
				var ws = computeWeaponStats(char, w);
				return (wField === "hit") ? ws.hit : ws.dmgStr;
			}
		}; }
		m = key.match(/^catk:(\d+):(hit|dmg)$/);
		if (m) { var ci = parseInt(m[1], 10), cField = m[2]; return {
			title: (cField === "hit") ? "Ação personalizada — acertar" : "Ação personalizada — dano",
			numeric: false, direct: true,
			auto: function() { return null; },
			has: function(char) { var atk = (char.attacks || [])[ci]; return !!(atk && atk[cField]); },
			get: function(char) { var atk = (char.attacks || [])[ci]; return atk ? (atk[cField] || "") : ""; },
			set: function(char, v) { var atk = (char.attacks || [])[ci]; if (atk) { atk[cField] = v == null ? "" : String(v); char.updated = Date.now(); CharactersStore.save(char); } },
			parts: function(char) {
				var atk = (char.attacks || [])[ci];
				return [{label: "Ação", txt: (atk && atk.name) || "—"}, {label: "Valor definido", txt: (atk && atk[cField]) || "—", manual: true}];
			}
		}; }
		return null;
	}
	// Diálogo de detalhe: decomposição + edição manual
	function closeDetail() { $(document).find(".characters__detail-overlay").remove(); }
	function openDetail(key) {
		var char = currentChar;
		if (!char) return;
		var def = detailDef(key);
		if (!def) return;
		detailClickGuard = true;
		var auto = def.auto ? def.auto(char) : null;
		var has = def.has ? def.has(char) : ovHas(char, key);
		var cur = def.get ? def.get(char) : ovGet(char, key, auto);
		var parts = def.parts ? def.parts(char).slice() : [];
		if (has && auto != null && def.numeric) parts.push({label: "Alterado manualmente", txt: fmtSigned(cur - auto), manual: true});
		else if (has && auto != null && !def.numeric) parts.push({label: "Alterado manualmente", txt: String(cur), manual: true});
		var html = '<div class="characters__detail-overlay"><div class="characters__detail">';
		html += '<div class="characters__detail-title">' + esc(def.title) + '</div>';
		parts.forEach(function(p) {
			html += '<div class="characters__detail-part' + (p.manual ? " characters__detail-part--manual" : "") + '"><span>' + esc(p.label) + '</span><span>' + esc(p.txt) + '</span></div>';
		});
		if (def.numeric) html += '<div class="characters__detail-auto">Calculado automaticamente: <b>' + auto + '</b></div>';
		if (!def.numeric && auto != null) html += '<div class="characters__detail-auto">Padrão: <b>' + esc(String(auto)) + '</b></div>';
		if (has && def.numeric) html += '<div class="characters__detail-manual">Definido manualmente: <b>' + cur + '</b></div>';
		if (def.hint) html += '<div class="characters__detail-auto">' + esc(def.hint) + '</div>';
		html += '<input type="' + (def.numeric ? "number" : "text") + '" class="characters__form-input characters__detail-input" id="detail-input" value="' + esc(String(cur != null ? cur : "")) + '">';
		html += '<div class="characters__detail-actions">';
		html += '<button class="characters__btn characters__btn--primary" id="detail-apply">Aplicar</button>';
		if (has) html += '<button class="characters__btn characters__btn--secondary" id="detail-reset">' + (def.direct ? "Limpar" : "Restaurar automático") + '</button>';
		html += '<button class="characters__btn characters__btn--secondary" id="detail-close">Fechar</button>';
		html += '</div></div></div>';
		$(document.body).append(html);
		var $ov = $(document).find(".characters__detail-overlay");
		$ov.on("click", function(e) { if (e.target === $ov[0]) closeDetail(); });
		$ov.find("#detail-close").on("click", closeDetail);
		$ov.find("#detail-apply").on("click", function() {
			var raw = $ov.find("#detail-input").val().trim();
			var val = (raw === "") ? null : (def.numeric ? parseInt(raw, 10) : raw);
			if (def.numeric && val != null && isNaN(val)) return;
			if (def.set) def.set(char, val);
			else ovSet(char, key, val);
			closeDetail();
			renderModules();
			var msg = (raw === "") ? "Valor restaurado ao automático!" : "Valor definido manualmente!";
			if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: msg});
			else sheetToast("success", msg);
		});
		$ov.find("#detail-reset").on("click", function() {
			if (def.set) def.set(char, null);
			else ovSet(char, key, null);
			closeDetail();
			renderModules();
			if (global.JqueryUtil && global.JqueryUtil.doToast) global.JqueryUtil.doToast({type: "success", content: "Valor restaurado ao automático!"});
			else sheetToast("success", "Valor restaurado ao automático!");
		});
		$ov.find("#detail-input").focus();
	}
	// Segurar ~450ms (toque ou mouse) abre o detalhe; clique direito também
	var detailTimer = null, detailStart = null;
	function cancelDetailPress() {
		if (detailTimer) { clearTimeout(detailTimer); detailTimer = null; }
		$root.find(".detail-pressing").removeClass("detail-pressing");
	}
	function initDetailSystem() {
		$root.off(".tdetail");
		$root.on("contextmenu.tdetail", "[data-detail]", function(e) {
			e.preventDefault();
			openDetail($(this).data("detail"));
		});
		$root.on("mousedown.tdetail touchstart.tdetail", "[data-detail]", function(e) {
			if (e.type === "mousedown" && e.which !== 1) return;
			if (e.type === "touchstart" && e.originalEvent.touches.length > 1) return;
			var el = this;
			var key = $(el).data("detail");
			var t = (e.type === "touchstart") ? e.originalEvent.touches[0] : e;
			detailStart = {x: t.clientX, y: t.clientY};
			$(el).addClass("detail-pressing");
			cancelDetailPressTimer();
			detailTimer = setTimeout(function() {
				detailTimer = null;
				openDetail(key);
			}, 450);
		});
		$(document).off(".tdetail2")
			.on("mousemove.tdetail2 touchmove.tdetail2", function(e) {
				if (!detailTimer) return;
				var p = (e.type === "touchmove") ? e.originalEvent.touches[0] : e;
				if (p && detailStart && (Math.abs(p.clientX - detailStart.x) > 10 || Math.abs(p.clientY - detailStart.y) > 10)) cancelDetailPress();
			})
			.on("mouseup.tdetail2 touchend.tdetail2 pointercancel.tdetail2 scroll.tdetail2", cancelDetailPress);
	}
	function cancelDetailPressTimer() { if (detailTimer) { clearTimeout(detailTimer); detailTimer = null; } }
	// === Data loading ===
	// Guard anti path-traversal: só aceita nomes de arquivo simples
	// (<arquivo>.json, sem separadores de diretório). Protege contra um
	// index.json adulterado redirecionando o fetch para fora do diretório.
	function isSafeDataFile(name) {
		return typeof name === "string" && /^[\w-]+\.json$/.test(name);
	}
	function loadSpells() {
		return fetch("data/spells/index.json")
			.then(function(r) { return r.json(); })
			.then(function(index) {
				var promises = Object.keys(index).map(function(key) {
					var fname = index[key];
				if (!isSafeDataFile(fname)) return Promise.resolve({spell: []});
				return fetch("data/spells/" + fname).then(function(r) { return r.json(); });
				});
				return Promise.all(promises).then(function(results) {
					var spells = [];
					results.forEach(function(json) {
						if (json.spell) spells = spells.concat(json.spell);
					});
					return spells.filter(function(s) { return s.name; });
				});
			});
	}

	function loadItems() {
		return Promise.all([
			fetch("data/items.json").then(function(r) { return r.json(); }),
			// Itens básicos (armas, armaduras e equipamento adventício)
			fetch("data/items-base.json").then(function(r) { return r.json(); }).catch(function() { return {}; })
		]).then(function(results) {
			var items = (results[0].item || []).filter(function(i) { return i && i.name; });
			var base = (results[1].baseitem || []).filter(function(i) { return i && i.name; });
			var all = items.concat(base);
			// Versões repetidas (mesmo nome, fontes diferentes) ficam na lista
			// e recebem a sigla da fonte nos resultados (ex.: Longsword [PHB] / [XPHB])
			all.sort(function(a, b) { return a.name.localeCompare(b.name) || srcRank(a.source || "") - srcRank(b.source || ""); });
			return tagWithSource(all);
		});
	}

	function loadFeats() {
		return fetch("data/feats.json")
			.then(function(r) { return r.json(); })
			.then(function(json) {
				return (json.feat || []).filter(function(f) { return f.name; });
			});
	}

	// === Versionamento por fonte ===
	// Quando existe mais de uma versão do mesmo nome (ex.: Artificer [TCE] e
	// Artificer [ERLW]/Eberron), TODAS são mantidas e o select exibe a sigla.
	function srcRank(src) {
		var order = ["PHB","MPMM","XPHB","VGM","MTF","AAG","ERLW","MOT","GGR","FTD","TCE","XGE","SCC","VRGR","WBtW","DSotDQ"];
		var ix = order.indexOf(src);
		return ix >= 0 ? ix : order.length;
	}
	function tagWithSource(list) {
		var counts = {};
		list.forEach(function(it) { var k = (it.name || "").toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
		list.forEach(function(it) {
			var k = (it.name || "").toLowerCase();
			it._dup = counts[k] > 1;
			it._value = it._dup ? (it.name + "|" + it.source) : it.name;
		});
		return list;
	}
	function optionLabel(it) { return it._dup ? (it.name + " [" + it.source + "]") : it.name; }
	function findByValue(list, val) {
		if (!val) return null;
		var s = String(val);
		var ix = s.indexOf("|");
		if (ix >= 0) {
			var nm = s.slice(0, ix), src = s.slice(ix + 1);
			return list.find(function(it) { return it.name === nm && it.source === src; }) || null;
		}
		return list.find(function(it) { return it.name === s; }) || null;
	}
	// Versões (fontes) de um mesmo nome dentro da lista, ordenadas por
	// prioridade canônica. Se o nome tem várias fontes (ex.: Aarakocra MPMM/DMG),
	// a UI mostra a sublista para escolher; se há só uma, ela é usada diretamente.
	function getVariants(list, name) {
		var n = String(name || "").toLowerCase();
		var out = list.filter(function(it) { return (it.name || "").toLowerCase() === n; });
		out.sort(function(a, b) { return srcRank(a.source || "") - srcRank(b.source || ""); });
		return out;
	}
	function variantCount(list, name) { return getVariants(list, name).length; }
	// Variantes recolhidas de uma raça base: "X (Y)" com reprintedAs->X (ex.: Dragonborn (Chromatic))
	function getCollapsedSubraces(baseName) {
		var n = String(baseName || "").toLowerCase();
		var out = [];
		collapsedRaces.forEach(function(c) {
			if (c.base.toLowerCase() === n) out.push(c);
		});
		return out;
	}
	// Subraças concretas para (raça, fonte) — subraças reais + recolhidas.
	// Filtra opções variantes ("Variant", "Mark of") que não são subraças jogáveis.
	function getSubracesFor(baseName, source) {
		var out = [];
		var list = subracesData.filter(function(s) { return s.raceName === baseName && s.raceSource === source; });
		// Alias de códigos: FTM (Mordenkainen's) == MTF
		if (!list.length && source === "MTF") list = subracesData.filter(function(s) { return s.raceName === baseName && s.raceSource === "FTM"; });
		var seen = {};
		list.forEach(function(s) {
			// Marcadores sem nome ("base sem subraça") não são escolhas válidas
			if (!s.name) return;
			var k = (s.name || "").toLowerCase();
			if (seen[k]) return;
			seen[k] = true;
			if (/^(Variant|Mark of)/i.test(s.name)) return;
			out.push(s);
		});
		// Variantes recolhidas (mesma raça e fonte) — ex.: Dragonborn com FTD
		getCollapsedSubraces(baseName).forEach(function(c) {
			if (c.source === source) {
				out.push({name: c.base + " (" + c.label + ")", label: c.label, source: c.source, raceName: c.base, raceSource: c.source, _collapsed: true, _race: c.race});
			}
		});
		out.sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
		return out;
	}
	// Deslocamento efetivo: subraça (se definido) > raça > 30
	function resolveRaceSpeed(char) {
		var race = char && char.race;
		var sub = char && char.raceSubrace;
		var val = null;
		if (sub && sub.speed) val = typeof sub.speed === "object" ? (sub.speed.walk || null) : sub.speed;
		if (val == null && race && race.speed) val = typeof race.speed === "object" ? (race.speed.walk || null) : race.speed;
		return val || 30;
	}
	function findSubclassByKey(val) {
		if (!val) return null;
		var s = String(val);
		return subclassesData.find(function(sc) {
			return sc.id === s || sc.name === s || ((sc.name || "") + "|" + (sc.source || "")) === s;
		}) || null;
	}

	// === INFO DA FICHA: conversão de entries/tags 5etools + idiomas/ferramentas ===
	var LANG_EN_PT = {common:"Comum", dwarvish:"Anão", elvish:"Élfico", giant:"Gigante", gnomish:"Gnômico", goblin:"Goblin", orc:"Orc", draconic:"Dracônico", abyssal:"Abissal", infernal:"Infernal", celestial:"Celestial", undercommon:"Subterrâneo", aarakocra:"Aarakocra", auran:"Auran", sylvan:"Silvestre", primordial:"Primordial", deepspeech:"Profundo", halfling:"Halfling", gnoll:"Gnoll", monkey:"Símia", sloth:"Preguiça"};
	function langKeyToText(k) {
		if (k == null) return null;
		var s = String(k);
		if (s === "anyStandard" || s === "any") return null;
		return LANG_EN_PT[s.toLowerCase()] || (s.charAt(0).toUpperCase() + s.slice(1));
	}
	function languageProfToText(list) {
		if (!list || !list.length) return "";
		var fixed = [], anyStandard = 0, any = 0;
		list.forEach(function(p) {
			if (typeof p === "string") { var st = langKeyToText(p); if (st) fixed.push(st); return; }
			if (!p || typeof p !== "object") return;
			Object.keys(p).forEach(function(k) {
				if (k === "anyStandard") anyStandard += parseInt(p[k], 10) || 1;
				else if (k === "any") any += parseInt(p[k], 10) || 1;
				else if (k === "choose") {
					var ch = p[k] || {};
					var names = (ch.from || []).map(langKeyToText).filter(Boolean).join(", ");
					fixed.push((ch.count || 1) + " à escolha de: " + names);
				} else { var t = langKeyToText(k); if (t) fixed.push(t); }
			});
		});
		var parts = fixed.slice();
		if (anyStandard) parts.push(anyStandard + (anyStandard > 1 ? " idiomas padrão" : " idioma padrão") + " à escolha");
		if (any) parts.push(any + (any > 1 ? " idiomas" : " idioma") + " à escolha");
		return parts.join("; ");
	}
	var TOOL_EN_PT = {"thieves' tools":"Ferramentas de Ladrão","tinker's tools":"Ferramentas de Funileiro","disguise kit":"Kit de Disfarces","forgery kit":"Kit de Falsificação","herbalism kit":"Kit de Herbalismo","navigator's tools":"Ferramentas de Navegador","poisoner's kit":"Kit de Envenenador","cartographer's tools":"Ferramentas de Cartógrafo","alchemist's supplies":"Suprimentos de Alquimista","brewer's supplies":"Suprimentos de Cervejeiro","calligrapher's supplies":"Suprimentos de Calígrafo","carpenter's tools":"Ferramentas de Carpinteiro","cobbler's tools":"Ferramentas de Sapateiro","cook's utensils":"Utensílios de Cozinha","glassblower's tools":"Ferramentas de Vidraceiro","jeweler's tools":"Ferramentas de Joalheiro","leatherworker's tools":"Ferramentas de Coureiro","mason's tools":"Ferramentas de Pedreiro","painter's supplies":"Suprimentos de Pintor","potter's tools":"Ferramentas de Oleiro","smith's tools":"Ferramentas de Ferreiro","weaver's tools":"Ferramentas de Tecelão","woodcarver's tools":"Ferramentas de Entalhador","anyartisantool":"Ferramentas de Artesão (à escolha)","anymusicalinstrument":"Instrumento musical (à escolha)","anygamingset":"Conjunto de jogos (à escolha)","anyvehicle":"Veículo (à escolha)","vehicles (land)":"Veículos (terrestres)","vehicles (water)":"Veículos (aquáticos)"};
	function toolKeyToText(k) {
		var s = String(k || "");
		var low = s.toLowerCase();
		return TOOL_EN_PT[low] || (s.charAt(0).toUpperCase() + s.slice(1));
	}
	function toolProfToText(list) {
		if (!list || !list.length) return "";
		var fixed = [], any = {};
		list.forEach(function(p) {
			if (!p || typeof p !== "object") return;
			Object.keys(p).forEach(function(k) {
				if (/^any/i.test(k)) any[k] = (any[k] || 0) + (parseInt(p[k], 10) || 1);
				else fixed.push(toolKeyToText(k));
			});
		});
		Object.keys(any).forEach(function(k) {
			var n = any[k];
			fixed.push((n > 1 ? n + "× " : "") + toolKeyToText(k));
		});
		return fixed.join("; ");
	}

	// {@tipo texto|opções} → HTML legível (dados já traduzidos no projeto)
	function tagToHtml(s) {
		var out = String(s == null ? "" : s);
		out = out.replace(/\{\{[^}]*\}\}/g, "");
		out = out.replace(/\{@([a-zA-Z]+)\s+([^}]*)\}/g, function(all, type, rest) {
			var parts = rest.split("|");
			var t0 = parts[0] || "";
			switch (type) {
				case "i": case "italic": case "note": case "noteIndent": return "<i>" + esc(t0) + "</i>";
				case "b": case "bold": return "<b>" + esc(t0) + "</b>";
				case "dc": return "<b>CD " + esc(t0) + "</b>";
				case "dice": case "damage": case "d20": return "<b>" + esc(t0) + "</b>";
				default: return esc(t0);
			}
		});
		return out;
	}
	function stripTags(s) {
		var out = String(s == null ? "" : s);
		out = out.replace(/\{\{[^}]*\}\}/g, "");
		out = out.replace(/\{@([a-zA-Z]+)\s+([^}]*)\}/g, function(all, type, rest) {
			var parts = rest.split("|");
			if (type === "dc") return "CD " + (parts[0] || "");
			return parts[0] || "";
		});
		return out.trim();
	}
	// Renderiza o array de entries (strings e objetos: entries/list/item/table/quote/refs)
	function entriesToHtml(entries, depth) {
		depth = depth || 0;
		if (entries == null || depth > 7) return "";
		if (typeof entries === "string") return tagToHtml(entries);
		if (Array.isArray(entries)) {
			return entries.map(function(e) { return entriesToHtml(e, depth + 1); }).filter(Boolean).join("<br>");
		}
		if (typeof entries !== "object") return "";
		var o = entries;
		if (o.type === "entries" || o.type === "entry") {
			var head = o.name ? "<b>" + esc(tagToHtml(o.name)) + ":</b> " : "";
			return (head + entriesToHtml(o.entries, depth + 1)).trim();
		}
		if (o.type === "list") {
			var items = (o.items || []).map(function(it) {
				if (typeof it === "string") return "<li>" + tagToHtml(it) + "</li>";
				if (it && typeof it === "object" && (it.type === "item" || it.entry || it.name)) {
					var nm = it.name ? "<b>" + esc(tagToHtml(it.name)) + "</b> " : "";
					var bd = it.entry ? tagToHtml(it.entry) : entriesToHtml(it.entries, depth + 1);
					return "<li>" + nm + bd + "</li>";
				}
				var inner = entriesToHtml(it, depth + 1);
				return inner ? "<li>" + inner + "</li>" : "";
			}).filter(Boolean).join("");
			return items ? '<ul style="margin:4px 0 4px 18px;padding:0">' + items + "</ul>" : "";
		}
		if (o.type === "item") {
			var nm2 = o.name ? "<b>" + esc(tagToHtml(o.name)) + "</b> " : "";
			return nm2 + (o.entry ? tagToHtml(o.entry) : entriesToHtml(o.entries, depth + 1));
		}
		if (o.type === "table") {
			var lines = [];
			if (o.caption) lines.push("<b>" + esc(stripTags(o.caption)) + "</b>");
			(o.rows || []).forEach(function(row) {
				if (Array.isArray(row)) {
					var cells = row.map(function(c) { return typeof c === "string" ? stripTags(c) : entriesToPlain(c, depth + 1); });
					lines.push(esc(cells.filter(Boolean).join(" — ")));
				} else if (row && typeof row === "object") {
					var txt = entriesToPlain(row, depth + 1);
					if (txt) lines.push(esc(txt));
				}
			});
			return lines.filter(Boolean).join("<br>");
		}
		if (o.type === "quote") {
			return entriesToHtml(o.entries, depth + 1) + (o.by ? " <i>— " + esc(stripTags(o.by)) + "</i>" : "");
		}
		if (o.type === "refClassFeature" || o.type === "refSubclassFeature") {
			var refKey = o.type === "refClassFeature" ? o.classFeature : o.subclassFeature;
			var ref = o.type === "refClassFeature" ? findClassFeatureByKey(refKey) : findSubclassFeatureByKey(refKey);
			if (ref) return "<b>" + esc(ref.name) + ":</b> " + entriesToHtml(ref.entries, depth + 1);
			return esc(stripTags(refKey || ""));
		}
		var nm3 = o.name ? "<b>" + esc(tagToHtml(o.name)) + "</b> " : "";
		var body3 = o.entry ? tagToHtml(o.entry) : (o.text ? tagToHtml(o.text) : entriesToHtml(o.entries, depth + 1));
		if (!nm3 && !body3) return "";
		return nm3 + body3;
	}
	// Texto puro (sem tags) para resumos
	function entriesToPlain(entries, depth) {
		if (entries == null || depth > 6) return "";
		if (typeof entries === "string") return stripTags(entries);
		if (Array.isArray(entries)) {
			return entries.map(function(e) { return entriesToPlain(e, depth + 1); }).filter(Boolean).join(" ");
		}
		if (typeof entries === "object") {
			if (entries.entry) return stripTags(entries.entry);
			if (entries.text) return stripTags(entries.text);
			if (entries.entries) return entriesToPlain(entries.entries, depth + 1);
			if (entries.name) return stripTags(entries.name);
			return "";
		}
		return "";
	}
	function summarizeEntries(entries, max) {
		var arr = Array.isArray(entries) ? entries.slice() : (entries != null ? [entries] : []);
		if (arr.length > 1 && typeof arr[0] === "string" && /^\s*\d+\s*(st|nd|rd|th)-level/i.test(stripTags(arr[0]))) arr = arr.slice(1);
		var t = entriesToPlain(arr, 0).replace(/\s+/g, " ").trim();
		max = max || 220;
		if (t.length > max) t = t.slice(0, max - 1).trim() + "…";
		return t;
	}

	// Localiza features pelas chaves de referência ("Nome|Classe|Fonte|Nv")
	function findClassFeatureByKey(key) {
		if (!key) return null;
		var p = String(key).split("|");
		if (p.length < 3) return null;
		var lvl = p.length > 3 ? parseInt(p[3], 10) : NaN;
		function mt(f, withSrc) { return f.name === p[0] && f.className === p[1] && (!withSrc || f.classSource === p[2]) && (isNaN(lvl) || f.level === lvl); }
		return classFeaturesData.find(function(f) { return mt(f, true); }) || classFeaturesData.find(function(f) { return mt(f, false); }) || null;
	}
	function findSubclassFeatureByKey(key) {
		if (!key) return null;
		var p = String(key).split("|");
		if (p.length < 5) return null;
		var lvl = p.length > 5 ? parseInt(p[5], 10) : NaN;
		function mt(f) { return f.name === p[0] && f.className === p[1] && f.subclassShortName === p[3] && (isNaN(lvl) || f.level === lvl); }
		return subclassFeaturesData.find(function(f) { return mt(f) && f.subclassSource === p[4]; })
			|| subclassFeaturesData.find(function(f) { return mt(f); }) || null;
	}
	// Objeto subclasse a partir da chave salva no personagem ("Nome" ou "Nome|FONTE")
	function subObjFromKey(key, clsName) {
		if (!key) return null;
		var sc = findSubclassByKey(key);
		if (sc) return sc;
		var p = String(key).split("|");
		return subclassesData.find(function(s) { return s.name === p[0] && (!clsName || (s._classNameEN || s.className) === clsName); }) || null;
	}
	// Features (classe + subclasse) disponíveis até maxLevel, ordenadas por nível
	function classFeaturesFor(clsName, clsSource, maxLevel, subObj) {
		var out = [];
		var hasSrc = classFeaturesData.some(function(f) { return f.className === clsName && f.classSource === clsSource; });
		classFeaturesData.forEach(function(f) {
			if (f.className !== clsName) return;
			if (hasSrc && clsSource && f.classSource !== clsSource) return;
			if ((f.level || 1) <= (maxLevel || 20)) out.push({kind: "class", name: f.name, level: f.level || 1, feat: f});
		});
		if (subObj && subObj.name) {
			var hasSubSrc = subclassFeaturesData.some(function(f) { return f.subclassShortName === subObj.name && f.subclassSource === subObj.source; });
			subclassFeaturesData.forEach(function(f) {
				if (f.subclassShortName !== subObj.name || f.className !== clsName) return;
				if (hasSubSrc && subObj.source && f.subclassSource !== subObj.source) return;
				if ((f.level || 1) <= (maxLevel || 20)) out.push({kind: "subclass", name: f.name, level: f.level || 1, feat: f});
			});
		}
		out.sort(function(a, b) { return a.level - b.level || String(a.name).localeCompare(String(b.name)); });
		return out;
	}
	// Somente as features ganhas exatamente em `level` (usado no popup de level-up)
	function gainedFeaturesForLevel(clsName, clsSource, subclassKey, level) {
		var subObj = subObjFromKey(subclassKey, clsName);
		return classFeaturesFor(clsName, clsSource, level, subObj).filter(function(f) { return f.level === level; });
	}
	// Resolve a raça salva no personagem (inclui variantes recolhidas "Base (Rótulo)")
	function getRaceObj(char) {
		if (!char.race || !char.race.name) return null;
		var name = char.race.name;
		var src = char.raceSource || char.race.source || null;
		var direct = racesData.filter(function(r) { return r.name === name; });
		if (src) {
			var m = direct.filter(function(r) { return r.source === src; });
			if (m.length) return m[0];
		}
		if (direct.length) return direct[0];
		var cs = getCollapsedSubraces(name);
		if (src) {
			var c2 = cs.filter(function(c) { return c.source === src; });
			if (c2.length) return $.extend({}, c2[0].race, {name: name, source: c2[0].source, _collapsedLabel: c2[0].label});
		}
		if (cs.length) return $.extend({}, cs[0].race, {name: name, source: cs[0].source, _collapsedLabel: cs[0].label});
		return null;
	}
	function getSubraceObj(char) {
		if (char.raceSubrace && typeof char.raceSubrace === "object") return char.raceSubrace;
		if (!char.raceSubraceName) return null;
		var baseName = char.race ? char.race.name : "";
		var src = char.raceSource || (char.race && char.race.source) || null;
		var subs = (baseName && src) ? getSubracesFor(baseName, src) : [];
		return subs.find(function(s) { return (s.label || s.name) === char.raceSubraceName || s.name === char.raceSubraceName; }) || null;
	}
	function getBgObj(char) {
		if (!char.background) return null;
		var variants = getVariants(backgroundsData, char.background);
		var src = char.bgSource || null;
		var v = src ? variants.filter(function(x) { return x.source === src; }) : [];
		if (!v.length) v = variants;
		return v.length ? v[0] : null;
	}
	// Proficiências iniciais de uma classe (armaduras/armas/ferramentas/perícias)
	function classStartingProfText(cls) {
		if (!cls || !cls.startingProficiencies) return [];
		var sp = cls.startingProficiencies;
		var lines = [];
		var stripList = function(v) {
			return (v || []).map(function(x) {
				if (typeof x === "string") return stripTags(x);
				if (x && x.proficiency) return stripTags(x.proficiency) + (x.optional ? " (opcional)" : "");
				return "";
			}).filter(Boolean);
		};
		var armor = stripList(sp.armor);
		if (armor.length) lines.push("<b>Armaduras:</b> " + esc(armor.join(", ")));
		var weapons = stripList(sp.weapons);
		if (weapons.length) lines.push("<b>Armas:</b> " + esc(weapons.join(", ")));
		var tools = stripList(sp.tools);
		if (tools.length) lines.push("<b>Ferramentas:</b> " + esc(tools.join(", ")));
		var tp = toolProfToText(sp.toolProficiencies);
		if (tp) lines.push("<b>Ferramentas:</b> " + esc(tp));
		var skLines = [];
		(sp.skills || []).forEach(function(s) {
			if (s && s.choose) {
				var names = (s.choose.from || []).map(function(k) { return SKILL_KEY_TO_PT[k] || langKeyToText(k) || k; }).join(", ");
				skLines.push("Escolha " + (s.choose.count || 1) + " de: " + names);
			}
		});
		if (skLines.length) lines.push("<b>Perícias (classe):</b> " + esc(skLines.join("; ")));
		return lines;
	}

	// Item colapsável de característica (nome + descrição)
	function featureEntryHtml(e, openDefault) {
		if (e == null || typeof e === "string") {
			var t = typeof e === "string" ? tagToHtml(e) : "";
			return t ? '<div class="characters__feature-desc">' + t + '</div>' : "";
		}
		var name = e.name ? esc(tagToHtml(e.name)) : "";
		var body = entriesToHtml(e.entries || e.entry || e.text, 1);
		if (!name && !body) return "";
		if (!body) return '<div class="characters__feature-name">' + name + '</div>';
		return '<details class="characters__feature-details"' + (openDefault ? " open" : "") + '><summary>' +
			(name || esc(stripTags(e.text || "")) || "Detalhes") +
			'</summary><div class="characters__feature-body">' + body + '</div></details>';
	}
	// Conteúdo completo de "Informações": raça, antecedente, classes (por nível), proficiências, talentos
	function buildInfoContent(char) {
		var h = "";
		// --- Raça & Subraça ---
		var race = getRaceObj(char);
		var subObj = getSubraceObj(char);
		if (race || subObj) {
			h += '<div class="characters__summary-box characters__info-card">';
			var raceTitle = race ? esc(race.name) : "";
			if (race && char.race && char.race._collapsedLabel) raceTitle += " (" + esc(char.race._collapsedLabel) + ")";
			else if (char.raceSubraceName) raceTitle += " (" + esc(char.raceSubraceName) + ")";
			h += '<div class="characters__summary-title">Raça' + (raceTitle ? ": " + raceTitle : "") + '</div>';
			var traits = [];
			if (race && race.entries) traits = traits.concat(race.entries);
			if (subObj) {
				var se = subObj.entries || (subObj._race ? subObj._race.entries : null);
				if (se) traits = traits.concat(se);
			}
			traits.forEach(function(e) { h += featureEntryHtml(e); });
			var langs = [];
			[race, subObj].forEach(function(r) {
				if (r && r.languageProficiencies) {
					var t = languageProfToText(r.languageProficiencies);
					if (t) langs.push(t);
				}
			});
			if (langs.length) h += '<div class="characters__prof-line"><b>Idiomas (raça):</b> ' + esc(langs.join("; ")) + '</div>';
			h += '</div>';
		}
		// --- Antecedente ---
		var bg = getBgObj(char);
		if (bg) {
			h += '<div class="characters__summary-box characters__info-card">';
			h += '<div class="characters__summary-title">Antecedente: ' + esc(bg.name) + '</div>';
			(bg.entries || []).forEach(function(e) { h += featureEntryHtml(e); });
			var bgSk = [];
			(bg.skillProficiencies || []).forEach(function(p) {
				if (p && typeof p === "object") Object.keys(p).forEach(function(k) { bgSk.push(SKILL_KEY_TO_PT[k] || langKeyToText(k) || k); });
			});
			if (bgSk.length) h += '<div class="characters__prof-line"><b>Perícias:</b> ' + esc(bgSk.join(", ")) + '</div>';
			var bgLang = languageProfToText(bg.languageProficiencies);
			if (bgLang) h += '<div class="characters__prof-line"><b>Idiomas:</b> ' + esc(bgLang) + '</div>';
			h += '</div>';
		}
		// --- Classes & Subclasses: características por nível ---
		var classes = charClasses(char);
		if (classes.length) {
			h += '<div class="characters__summary-box characters__info-card">';
			h += '<div class="characters__summary-title">Habilidades de Classe</div>';
			classes.forEach(function(c, ix) {
				var clsSrc = (ix === 0 && char.classSource) ? char.classSource : null;
				var clsAll = classesData.filter(function(x) { return x.name === c.name; });
				var cls = clsSrc ? (clsAll.filter(function(x) { return x.source === clsSrc; })[0] || clsAll[0]) : clsAll[0];
				var subObj2 = subObjFromKey(c.subclass, c.name);
				var feats = classFeaturesFor(c.name, cls ? cls.source : clsSrc, c.level || 1, subObj2);
				h += '<div class="characters__feat-lvl">' + esc(c.name) + ' — Nível ' + (c.level || 1) + (subObj2 ? ' • Subclasse: ' + esc(subObj2.name) : '') + '</div>';
				var byLevel = {};
				feats.forEach(function(f) { (byLevel[f.level] = byLevel[f.level] || []).push(f); });
				Object.keys(byLevel).map(Number).sort(function(a, b) { return a - b; }).forEach(function(lv) {
					h += '<div class="characters__feat-lvl" style="font-size:.78em">Nível ' + lv + '</div>';
					byLevel[lv].forEach(function(f) {
						h += featureEntryHtml({name: f.name + (f.kind === "subclass" ? " (subclasse)" : ""), entries: f.feat.entries});
					});
				});
				if (!feats.length) h += '<div class="characters__feature-desc">Sem características registradas.</div>';
			});
			h += '</div>';
		}

		// --- Proficiências, Perícias e Idiomas ---
		var profLines = [];
		classes.forEach(function(c, ix) {
			var clsSrc2 = (ix === 0 && char.classSource) ? char.classSource : null;
			var clsAll2 = classesData.filter(function(x) { return x.name === c.name; });
			var cls2 = clsSrc2 ? (clsAll2.filter(function(x) { return x.source === clsSrc2; })[0] || clsAll2[0]) : clsAll2[0];
			var lines = classStartingProfText(cls2);
			if (lines.length) {
				profLines.push('<div class="characters__prof-line"><b>' + esc(c.name) + '</b></div>' +
					lines.map(function(l) { return '<div class="characters__prof-line" style="margin-left:10px">' + l + '</div>'; }).join(""));
			}
		});
		var skParts = [];
		Object.keys(char.skills || {}).forEach(function(k) {
			var v = char.skills[k];
			if (v >= 1) skParts.push((SKILL_KEY_TO_PT[k] || k) + (v === 2 ? " (expertise)" : ""));
		});
		if (skParts.length) profLines.push('<div class="characters__prof-line"><b>Perícias escolhidas:</b> ' + esc(skParts.join(", ")) + '</div>');
		if (char.languages && char.languages.length) profLines.push('<div class="characters__prof-line"><b>Idiomas:</b> <span class="characters__info-editable" data-edit="languages">' + esc(char.languages.join(", ")) + '</span></div>');
		if (profLines.length) {
			h += '<div class="characters__summary-box characters__info-card">';
			h += '<div class="characters__summary-title">Proficiências & Idiomas</div>' + profLines.join("");
			h += '</div>';
		}
		// --- Talentos manuais ---
		if (char.feats && char.feats.length) {
			h += '<div class="characters__summary-box characters__info-card">';
			h += '<div class="characters__summary-title">Talentos</div>';
			char.feats.forEach(function(f) {
				h += '<div class="characters__feature-item"><div class="characters__feature-name">' + esc(f.name || f) + '</div>' +
					(f.source ? '<div class="characters__feature-source">' + esc(f.source) + '</div>' : "") + '</div>';
			});
			h += '</div>';
		}
		// --- Escolhas de nível (estilo de luta, pacto, metamagia, ASI) ---
		var choiceBits = [];
		if (char.fightingStyle) choiceBits.push('<div class="characters__feature-item"><div class="characters__feature-name">Estilo de Luta: ' + esc(char.fightingStyle) + '</div></div>');
		if (char.choices && char.choices.pact) choiceBits.push('<div class="characters__feature-item"><div class="characters__feature-name">Dádiva do Pacto: ' + esc(char.choices.pact) + '</div></div>');
		if (char.choices && char.choices.metamagic && char.choices.metamagic.length) {
			choiceBits.push('<div class="characters__feature-item"><div class="characters__feature-name">Metamagia:</div><div class="characters__feature-desc">' + esc(char.choices.metamagic.join(", ")) + '</div></div>');
		}
		if (char.choices && char.choices.asi && char.choices.asi.length) {
			char.choices.asi.forEach(function(a) {
				var pts = Object.keys(a.points || {}).map(function(k) { return (ABILITY_NAMES[k] || k) + " +" + a.points[k]; }).join(", ");
				choiceBits.push('<div class="characters__feature-item"><div class="characters__feature-name">Incremento de Atributo (Nv. ' + a.level + ')</div><div class="characters__feature-desc">' + esc(pts || "—") + '</div></div>');
			});
		}
		if (choiceBits.length) {
			h += '<div class="characters__summary-box characters__info-card">';
			h += '<div class="characters__summary-title">Escolhas de Nível</div>' + choiceBits.join("");
			h += '</div>';
		}
		return h || '<div class="characters__detail-auto">Sem informações registradas.</div>';
	}
	// Popup com as habilidades ganhas (level-up / multiclasse)
	function showGainedFeaturesPopup(title, gained, extraHtml) {
		closeLevelUpSummary();
		var listHtml = "";
		if (gained && gained.length) {
			listHtml += '<div class="characters__summary-title">Novas Habilidades</div>';
			gained.forEach(function(f) {
				listHtml += '<div class="characters__feature-item">';
				listHtml += '<div class="characters__feature-name">' + esc(f.name) +
					(f.kind === "subclass" ? ' <span class="characters__feature-tag">subclasse</span>' : "") +
					' <span class="characters__feature-source">Nv. ' + f.level + '</span></div>';
				var sum = summarizeEntries(f.feat.entries, 240);
				if (sum) listHtml += '<div class="characters__feature-desc">' + esc(sum) + '</div>';
				listHtml += '</div>';
			});
		}
		var popupHtml = '<div class="characters__detail-overlay" id="levelup-summary-overlay">' +
			'<div class="characters__detail characters__detail--wide">' +
			'<div class="characters__detail-title">' + esc(title) + '</div>' +
			'<div class="characters__info-scroll">' +
			(listHtml || '<div class="characters__detail-auto">Sem novas habilidades neste nível.</div>') +
			(extraHtml || "") +
			'</div>' +
			'<div class="characters__detail-actions"><button class="characters__btn characters__btn--primary" id="lu-summary-close">Fechar</button></div>' +
			'</div></div>';
		$(document.body).append(popupHtml);
		var $ov = $('#levelup-summary-overlay');
		$ov.on('click', function(e) { if (e.target === $ov[0]) closeLevelUpSummary(); });
		$ov.find('#lu-summary-close').on('click', closeLevelUpSummary);
	}

	function loadRaces() {
		return fetch("data/races.json").then(function(r) { return r.json(); }).then(function(json) {
			// Todas as raças de todas as fontes; versões com mesmo nome ficam
			// repetidas no select com a sigla da fonte (ex.: "Elf [PHB]").
			var races = (json.race || []).filter(function(r) { return r && r.name && r.source; });
			races.sort(function(a, b) { return a.name.localeCompare(b.name) || (srcRank(a.source) - srcRank(b.source)) || String(a.source).localeCompare(String(b.source)); });
			// Subraças canônicas (chave de topo), ligadas por raceName|raceSource
			subracesData = (json.subrace || []).filter(function(s) { return s && s.name && s.raceName; });
			// Variantes "Raça (X)" recolhidas sob a raça base — regra geral:
			// qualquer "Base (Rótulo)" cuja base exista vira opção da base
			// (ex.: Dragonborn (Chromatic) [FTD], Human (Ixalan) [PSX],
			// Gnome (Deep) [DMG], Goblin (Dankwood) [AWM]).
			collapsedRaces = [];
			races.forEach(function(r) {
				var m = /^(.+?)\s\((.+)\)$/.exec(r.name);
				if (!m) return;
				// Excluir pseudo-variantes que não são raças jogáveis
				if (/^(Variant|Mark of)/i.test(m[2])) return;
				var base = m[1].trim();
				var baseExists = races.some(function(o) { return o.name.toLowerCase() === base.toLowerCase(); });
				if (!baseExists) return;
				collapsedRaces.push({base: base, label: m[2].trim(), source: r.source, race: r});
			});
			return tagWithSource(races);
		});
	}

	function loadBackgrounds() {
		return fetch("data/backgrounds.json").then(function(r) { return r.json(); }).then(function(json) {
			var bgs = (json.background || []).filter(function(b) { return b && b.name && b.source; });
			bgs.sort(function(a, b) { return a.name.localeCompare(b.name) || (srcRank(a.source) - srcRank(b.source)) || String(a.source).localeCompare(String(b.source)); });
			return tagWithSource(bgs);
		});
	}

	function loadClasses() {
		return fetch("data/class/index.json").then(function(r) { return r.json(); }).then(function(index) {
			var promises = Object.keys(index).map(function(key) {
				var classFile = index[key];
				if (!isSafeDataFile(classFile)) return Promise.resolve({class: [], subclass: []});
				return fetch("data/class/" + classFile).then(function(r) { return r.json(); }).then(function(json) {
					// Coletar features de classe deste arquivo (para a aba Info e popup de level-up)
					(json.classFeature || []).forEach(function(f) {
						if (f && f.name && f.className) classFeaturesData.push(f);
					});
					// Filtrar apenas classes de jogador (excluir sidekick, mystic, expert)
					return (json.class || []).filter(function(c) { 
						if (!c || !c.name || !c.source) return false;
						var name = c.name.toLowerCase();
						// Aceitar apenas sources oficiais e excluir classes não-jogador
						var validSource = ["PHB","TCE","XGE","ERLW","WGE","SCC","TWB","XPHB","MTF","MOT","GGR","FTD","AAG","VRGR","AI","TDCSR","BMT","WBtW","DSotDQ","SatO","HWCS"].indexOf(c.source) >= 0;
						var notSidekick = name.indexOf("sidekick") < 0;
						var notMystic = name.indexOf("mystic") < 0;
						var notExpert = name.indexOf("expert") < 0;
						return validSource && notSidekick && notMystic && notExpert;
					});
				}).catch(function() { return []; });
			});
			return Promise.all(promises).then(function(results) {
				var classes = [];
				results.forEach(function(arr) { classes = classes.concat(arr); });
				// Mantém versões distintas (ex.: Artificer [TCE] e Artificer [ERLW])
				classes.sort(function(a, b) { return a.name.localeCompare(b.name) || (srcRank(a.source) - srcRank(b.source)) || String(a.source).localeCompare(String(b.source)); });
				return tagWithSource(classes);
			});
		});
	}

	function loadSubclasses() {
		return fetch("data/class/index.json").then(function(r) { return r.json(); }).then(function(index) {
			var promises = Object.keys(index).map(function(key) {
				var classFile = index[key];
				if (!isSafeDataFile(classFile)) return Promise.resolve({class: [], subclass: []});
				return fetch("data/class/" + classFile).then(function(r) { return r.json(); }).then(function(json) {
					// Coletar features de subclasse deste arquivo
					(json.subclassFeature || []).forEach(function(f) {
						if (f && f.name && f.className) subclassFeaturesData.push(f);
					});
					// Aceitar subclasses de várias fontes
					return (json.subclass || []).filter(function(sc) { 
						if (!sc || !sc.name || !sc.source) return false;
						return ["PHB","TCE","XGE","ERLW","WGE","SCC","TWB","XPHB","MTF","MOT","GGR","FTD","AAG","VRGR","AI","TDCSR","BMT","WBtW","DSotDQ","SatO","HWCS"].indexOf(sc.source) >= 0;
					}).map(function(sc) {
						// Normalizar className para inglês
						var classNameMap = {
							"Artífice": "Artificer",
							"Bárbaro": "Barbarian",
							"Bardo": "Bard",
							"Clérigo": "Cleric",
							"Druida": "Druid",
							"Guerreiro": "Fighter",
							"Monge": "Monk",
							"Paladino": "Paladin",
							"Patrulheiro": "Ranger",
							"Ladino": "Rogue",
							"Feiticeiro": "Sorcerer",
							"Bruxo": "Warlock",
							"Mago": "Wizard"
						};
						sc._classNameEN = classNameMap[sc.className] || sc.className;
						return sc;
					});
				}).catch(function() { return []; });
			});
			return Promise.all(promises).then(function(results) {
				var subclasses = [];
				results.forEach(function(arr) { subclasses = subclasses.concat(arr); });
				
				// Duplicatas: mesmo nome na MESMA classe em fontes diferentes
				// é mantido (recebe tag com a fonte no dropdown); resto é único.
				var seen = {};
				var unique = [];
				subclasses.forEach(function(sc) {
					var key = ((sc._classNameEN || sc.className || "") + "_" + (sc.name || "").toLowerCase() + "_" + (sc.source || "")).toLowerCase();
					if (!seen[key]) { seen[key] = true; unique.push(sc); }
				});
				
				return unique;
			});
		});
	}

	// === Init ===
	function init() {
		try {
			$root = $("#characters-main");
			if (!$root.length) {
				console.error("[Characters] Elemento #characters-main não encontrado!");
				return;
			}

			console.log("[Characters] Iniciando...");
			console.log("[Characters] jQuery version:", $.fn.jquery);
			
			Promise.all([loadRaces(), loadBackgrounds(), loadClasses(), loadSubclasses(), loadSpells(), loadItems(), loadFeats()])
				.then(function(results) {
					console.log("[Characters] Dados carregados com sucesso");
					racesData = results[0];
					backgroundsData = results[1];
					classesData = results[2];
					subclassesData = results[3];
					spellsData = results[4];
					itemsData = results[5];
					featsData = results[6];
					console.log("[Characters] Estatísticas:", {
						races: racesData.length,
						backgrounds: backgroundsData.length,
						classes: classesData.length,
						subclasses: subclassesData.length,
						spells: spellsData.length,
						items: itemsData.length,
						feats: featsData.length
					});
					console.log("[Characters] Classes:", classesData.map(function(c) { return c.name; }));
					console.log("[Characters] Subclasses:", subclassesData.map(function(s) { return s.name + " (" + s.className + " -> " + s._classNameEN + ")"; }));
					$root.find(".initial-message").remove();
					renderList();
				})
				.catch(function(err) {
					console.error("[Characters] Erro ao carregar dados:", err);
					$root.html('<div class="ve-flex-vh-center w-100 h-100"><div>Erro ao carregar dados: ' + esc(err.message || String(err)) + '</div></div>');
				});
		} catch (err) {
			console.error("[Characters] Erro na inicialização:", err);
			alert("Erro ao iniciar sistema de fichas: " + err.message);
		}
	}

	// Iniciar quando DOM estiver pronto
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}

})(window);
