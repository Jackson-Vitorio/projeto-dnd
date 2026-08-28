// =============================================
// Sistema de Fichas de Personagem - 5eTools
// Versão standalone (sem ES modules)
// =============================================
(function(global) {
	"use strict";

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
	function calcProfBonus(level) { return Math.ceil(2 + (level - 1) / 4); }
	function rollAbilityScore() {
		var rolls = [0,1,2,3].map(function() { return 1 + Math.floor(Math.random() * 6); });
		rolls.sort(function(a,b) { return b - a; });
		return rolls[0] + rolls[1] + rolls[2];
	}
	function getRaceAbilities(race) {
		var result = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
		if (!race || !race.ability) return result;
		race.ability.forEach(function(entry) {
			ABILITY_ABVS.forEach(function(abv) { if (entry[abv] || entry[abv] === 0) result[abv] += entry[abv]; });
		});
		return result;
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
	var backgroundsData = [];
	var classesData = [];
	var subclassesData = [];
	var selectedSubclass = null;
	var spellsData = [];
	var itemsData = [];
	var featsData = [];
	var currentTab = "overview";

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
			equipment:[], weapons:[], armors:[], inventory:[],
			coins:{gold:0,silver:0,copper:0,platinum:0,electrum:0},
			conditions:[], inspiration:false, deathSaves:{failures:0,successes:0},
			notes:"", personality:"", ideals:"", bonds:"", flaws:"",
			advantages:[], disadvantages:[], companion:null,
			passivePerception:10, created:Date.now(), updated:Date.now()
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
				html += '<div class="characters__card-info">' + esc(char.race ? char.race.name : "—") + ' • ' + esc(char.background || "—") + '</div>';
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
		var steps = ["Básico","Raça","Classe","Antecedente","Atributos","Perícias","Finalizar"];
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
			case 5: stepAbilities($form); break;
			case 6: stepSkills($form); break;
			case 7: stepFinish($form); break;
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
		var seen = {};
		var races = racesData.filter(function(r) {
			var key = r.name.toLowerCase();
			if (seen[key]) return false;
			seen[key] = true;
			return true;
		}).sort(function(a,b) { return a.name.localeCompare(b.name); });

		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha a Raça</h3>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Raça</label>';
		html += '<select class="characters__form-select" id="in-race"><option value="">Selecione...</option>';
		races.forEach(function(r) {
			var sel = d.race && d.race.name === r.name ? " selected" : "";
			html += '<option value="' + esc(r.name) + '"' + sel + '>' + esc(r.name) + '</option>';
		});
		html += '</select></div><div id="info-race" class="characters__summary-box"></div>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);

		var updateInfo = function() {
			var race = racesData.find(function(r) { return r.name === $form.find("#in-race").val(); });
			if (!race) { $form.find("#info-race").empty(); return; }
			var abils = getRaceAbilities(race);
			var abilStr = ABILITY_ABVS.filter(function(a) { return abils[a]; }).map(function(a) { return ABILITY_SHORT[a] + " +" + abils[a]; }).join(", ");
			var speed = race.speed ? ((race.speed.walk || 30) + " pés") : "30 pés";
			var sizeName = {S:"Pequeno",M:"Médio",L:"Grande"}[race.size ? race.size[0] : "M"] || "Médio";
			var entries = race.entries ? race.entries.map(function(e) {
				var txt = textFromEntries(e.entries || [e]);
				return e.name ? "<b>" + esc(e.name) + ":</b> " + esc(txt) : esc(txt);
			}).join("<br>") : "";
			var info = '<div class="characters__summary-title">' + esc(race.name) + '</div>';
			info += '<div><b>Tamanho:</b> ' + sizeName + ' | <b>Deslocamento:</b> ' + speed + '</div>';
			if (abilStr) info += '<div><b>Bônus:</b> ' + abilStr + '</div>';
			if (entries) info += '<div class="mt-2">' + entries + '</div>';
			$form.find("#info-race").html(info);
		};

		$form.find("#in-race").on("change", updateInfo);
		if (d.race) $form.find("#in-race").val(d.race.name);
		updateInfo();

		$form.find("#btn-prev").on("click", function() { creationStep = 1; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			var race = racesData.find(function(r) { return r.name === $form.find("#in-race").val(); });
			if (!race) { alert("Selecione uma raça!"); return; }
			d.race = race;
			var abils = getRaceAbilities(race);
			ABILITY_ABVS.forEach(function(a) { d.rawScores[a] = (d.rawScores[a] || 0) + (abils[a] || 0); });
			creationStep = 3;
			renderCreation();
		});
	}

	function stepClass($form) {
		var d = creationData;
		var seen = {};
		var classes = classesData.filter(function(c) {
			var key = c.name.toLowerCase();
			if (seen[key]) return false;
			seen[key] = true;
			return true;
		}).sort(function(a,b) { return a.name.localeCompare(b.name); });

		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha a Classe</h3>';
		html += '<div class="characters__form-row"><div class="characters__form-group"><label class="characters__form-label">Classe</label>';
		html += '<select class="characters__form-select" id="in-class"><option value="">Selecione...</option>';
		classes.forEach(function(c) {
			var sel = d.className === c.name ? " selected" : "";
			html += '<option value="' + esc(c.name) + '"' + sel + '>' + esc(c.name) + '</option>';
		});
		html += '</select></div>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Nível</label>';
		html += '<input type="number" class="characters__form-input" id="in-level" min="1" max="20" value="' + (d.level || 1) + '"></div></div>';
		html += '<div id="info-class" class="characters__summary-box"></div>';
		
		// Seletor de subclasse (sempre criado, mas escondido)
		html += '<div class="characters__form-group mt-2" id="subclass-group" style="display:none"><label class="characters__form-label">Subclasse</label>';
		html += '<select class="characters__form-select" id="in-subclass"><option value="">Selecione...</option></select></div>';
		
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);

		var updateInfo = function() {
			var cls = classesData.find(function(c) { return c.name === $form.find("#in-class").val(); });
			if (!cls) { $form.find("#info-class").empty(); return; }
			var hd = CLASS_HIT_DICE[cls.name] || 8;
			var saves = (CLASS_SAVES[cls.name] || []).map(function(s) { return ABILITY_NAMES[s]; }).join(", ");
			var sk = CLASS_SKILLS[cls.name];
			var info = '<div class="characters__summary-title">' + esc(cls.name) + '</div>';
			info += '<div><b>Dado de Vida:</b> d' + hd + '</div>';
			info += '<div><b>Testes de Resistência:</b> ' + saves + '</div>';
			if (sk) info += '<div><b>Perícias:</b> Escolha ' + sk.count + ' de: ' + esc(sk.skills.join(", ")) + '</div>';
			$form.find("#info-class").html(info);
		};

		$form.find("#in-class").on("change", updateInfo);
		if (d.className) $form.find("#in-class").val(d.className);
		updateInfo();

		$form.find("#btn-prev").on("click", function() { creationStep = 2; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			var clsName = $form.find("#in-class").val();
			if (!clsName) { alert("Selecione uma classe!"); return; }
			d.level = parseInt($form.find("#in-level").val()) || 1;
			d.className = clsName;
			var hd = CLASS_HIT_DICE[clsName] || 8;
			var conMod = calcMod(d.scores.con);
			d.hp.max = hd + conMod;
			d.hp.current = d.hp.max;
			d.savingThrows = CLASS_SAVES[clsName] || [];
			
			// Verificar se precisa escolher subclasse
			var subclassLevel = SUBCLASS_LEVELS[clsName] || 3;
			if (d.level >= subclassLevel) {
				var subclassId = $form.find("#in-subclass").val();
				console.log("Subclass validation - Level:", d.level, "Required:", subclassLevel, "Selected ID:", subclassId, "Exists:", !!subclassId);
				if (!subclassId || subclassId === "") {
					alert("Selecione uma subclasse para continuar!\nNível " + d.level + " requer subclasse.");
					return;
				}
				d.subclass = subclassId;
				console.log("Subclass saved:", d.subclass);
			}
			
			creationStep = 4;
			renderCreation();
		});

		// Atualizar seletor de subclasses quando classe mudar
		$form.find("#in-class").on("change", function() {
			var clsName = $form.find("#in-class").val();
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
			
			// Remover duplicatas
			var seen = {};
			classSubclasses = classSubclasses.filter(function(sc) {
				var key = (sc.name || "").toLowerCase();
				if (seen[key]) return false;
				seen[key] = true;
				return true;
			});
			
			// Popular dropdown
			$subclassSelect.empty();
			$subclassSelect.append('<option value="">Selecione...</option>');
			classSubclasses.forEach(function(sc) {
				// Usar nome como ID se não houver ID próprio
				var subclassId = sc.id || sc.name;
				var sel = d.subclass === subclassId ? " selected" : "";
				$subclassSelect.append('<option value="' + esc(subclassId) + '"' + sel + '>' + esc(sc.name) + '</option>');
			});
			
			// Mostrar grupo
			$subclassGroup.show();
		});
		
		// Atualizar subclasse quando nível mudar
		$form.find("#in-level").on("change", function() {
			var clsName = $form.find("#in-class").val();
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
	}

	function stepBackground($form) {
		var d = creationData;
		var seen = {};
		var bgs = backgroundsData.filter(function(b) {
			var key = b.name.toLowerCase();
			if (seen[key]) return false;
			seen[key] = true;
			return true;
		}).sort(function(a,b) { return a.name.localeCompare(b.name); });

		var html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha o Antecedente</h3>';
		html += '<div class="characters__form-group"><label class="characters__form-label">Antecedente</label>';
		html += '<select class="characters__form-select" id="in-bg"><option value="">Selecione...</option>';
		bgs.forEach(function(b) {
			var sel = d.background === b.name ? " selected" : "";
			html += '<option value="' + esc(b.name) + '"' + sel + '>' + esc(b.name) + '</option>';
		});
		html += '</select></div><div id="info-bg" class="characters__summary-box"></div>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>';
		$form.html(html);

		var updateInfo = function() {
			var bg = backgroundsData.find(function(b) { return b.name === $form.find("#in-bg").val(); });
			if (!bg) { $form.find("#info-bg").empty(); return; }
			var info = '<div class="characters__summary-title">' + esc(bg.name) + '</div>';
			var entries = bg.entries ? bg.entries.map(function(e) {
				var txt = textFromEntries(e.entries || [e]);
				return e.name ? "<b>" + esc(e.name) + ":</b> " + esc(txt) : esc(txt);
			}).join("<br>") : "";
			if (entries) info += '<div class="mt-2">' + entries + '</div>';
			$form.find("#info-bg").html(info);
		};

		$form.find("#in-bg").on("change", updateInfo);
		if (d.background) $form.find("#in-bg").val(d.background);
		updateInfo();

		$form.find("#btn-prev").on("click", function() { creationStep = 3; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			var bgName = $form.find("#in-bg").val();
			if (!bgName) { alert("Selecione um antecedente!"); return; }
			d.background = bgName;
			creationStep = 5;
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
			
			// Atribuir valor
			$valuesBox.on("click", ".characters__dice", function(e) {
				var $dice = $(e.target);
				var val = parseInt($dice.data("value"));
				$dice.remove();
				
				// Atribuir ao primeiro atributo vazio
				for (var i = 0; i < ABILITY_ABVS.length; i++) {
					var abv = ABILITY_ABVS[i];
					if (tempScores[abv] === 0) {
						tempScores[abv] = val;
						break;
					}
				}
				renderGrid();
			});
			
			renderGrid();
			
			// Salvar quando sair
			ABILITY_ABVS.forEach(function(a) { scores[a] = tempScores[a] || 8; });
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
			
			// Atribuir dado
			$diceBox.on("click", ".characters__dice", function(e) {
				var $dice = $(e.target);
				var val = parseInt($dice.data("value"));
				$dice.remove();
				
				// Atribuir ao primeiro atributo vazio
				for (var i = 0; i < ABILITY_ABVS.length; i++) {
					var abv = ABILITY_ABVS[i];
					if (tempScores[abv] === 0) {
						tempScores[abv] = val;
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
				$diceBox.empty();
				rolls.forEach(function(val) {
					$diceBox.append('<div class="characters__dice" data-value="' + val + '">' + val + '</div>');
				});
				renderGrid();
			});
			
			// Salvar quando sair
			ABILITY_ABVS.forEach(function(a) { scores[a] = tempScores[a] || 8; });
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

		$form.find("#btn-prev").on("click", function() { creationStep = 3; renderCreation(); });
		$form.find("#btn-next").on("click", function() {
			// Salvar valores
			ABILITY_ABVS.forEach(function(a) { d.scores[a] = scores[a] || 8; });
			
			var hd = CLASS_HIT_DICE[d.className] || 8;
			var conMod = calcMod((d.scores.con || 8) + (d.rawScores.con || 0));
			d.hp.max = hd + conMod;
			d.hp.current = d.hp.max;
			d.ac = 10 + calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
			d.initiative = calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
			d.speed = d.race ? (d.race.speed && d.race.speed.walk ? d.race.speed.walk : 30) : 30;
			creationStep = 6;
			renderCreation();
		});
	}

	function getBgSkillKeys() {
		if (!creationData.background) return [];
		var bg = backgroundsData.find(function(b) { return b.name === creationData.background; });
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

		$form.find("#btn-prev").on("click", function() { creationStep = 5; renderCreation(); });
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
			var subc = subclassesData.find(function(s) { return s.id === d.subclass; });
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

		$form.find("#btn-prev").on("click", function() { creationStep = 6; renderCreation(); });
		
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
		d.hp.max = hd + conMod;
		d.hp.current = d.hp.max;
		d.ac = 10 + calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
		d.initiative = calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
		d.speed = d.race ? (d.race.speed && d.race.speed.walk ? d.race.speed.walk : 30) : 30;
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

	// Sistema de abas
	window.renderSheetTab = function(tabName) {
		var char = currentChar;
		var $content = $root.find("#sheet-content");
		if (!$content.length) return;
		
		currentTab = tabName;
		
		// Atualizar abas ativas
		$root.find(".characters__tab").removeClass("active");
		$root.find(".characters__tab[data-tab='" + tabName + "']").addClass("active");
		
		switch (tabName) {
			case "overview": renderOverviewTab($content, char); break;
			case "abilities": renderAbilitiesTab($content, char); break;
			case "skills": renderSkillsTab($content, char); break;
			case "spells": renderSpellsTab($content, char); break;
			case "equipment": renderEquipmentTab($content, char); break;
			case "features": renderFeaturesTab($content, char); break;
		}
	};
	
	function renderOverviewTab($content, char) {
		var html = '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Informações Pessoais</h4>';
		html += '<div class="characters__sheet-items">';
		html += '<div class="characters__sheet-item"><b>Raça:</b> ' + esc(char.race ? char.race.name : "—") + '</div>';
		html += '<div class="characters__sheet-item"><b>Classe:</b> ' + esc(char.className) + ' Nv. ' + (char.level || 1) + '</div>';
		html += '<div class="characters__sheet-item"><b>Antecedente:</b> ' + esc(char.background || "—") + '</div>';
		html += '<div class="characters__sheet-item"><b>Alinhamento:</b> ' + esc(char.alignment || "Neutro") + '</div>';
		html += '<div class="characters__sheet-item"><b>Jogador:</b> ' + esc(char.playerName || "—") + '</div>';
		html += '<div class="characters__sheet-item"><b>Experiência:</b> ' + (char.experience || 0) + ' XP</div>';
		html += '</div></div>';
		
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Combate</h4>';
		html += '<div class="characters__sheet-items">';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + (char.hp ? char.hp.max || 0 : 0) + '</span> PV Máximo</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + (char.hp ? char.hp.current || 0 : 0) + '</span> PV Atual</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + (char.ac || 10) + '</span> CA</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + (char.initiative >= 0 ? "+" : "") + (char.initiative || 0) + '</span> Iniciativa</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + (char.speed || 30) + '</span> Deslocamento</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + (char.passivePerception || 10) + '</span> Percepção Passiva</div>';
		html += '</div></div>';
		
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Moedas</h4>';
		html += '<div class="characters__form-row">';
		html += '<div class="characters__form-group"><label>Platina (pp)</label>';
		html += '<input type="number" class="characters__form-input coin-input" data-coin="platinum" value="' + (char.coins ? char.coins.platinum || 0 : 0) + '" min="0"></div>';
		html += '<div class="characters__form-group"><label>Ouro (po)</label>';
		html += '<input type="number" class="characters__form-input coin-input" data-coin="gold" value="' + (char.coins ? char.coins.gold || 0 : 0) + '" min="0"></div>';
		html += '</div>';
		html += '<div class="characters__form-row">';
		html += '<div class="characters__form-group"><label>Prata (pe)</label>';
		html += '<input type="number" class="characters__form-input coin-input" data-coin="silver" value="' + (char.coins ? char.coins.silver || 0 : 0) + '" min="0"></div>';
		html += '<div class="characters__form-group"><label>Cobre (pc)</label>';
		html += '<input type="number" class="characters__form-input coin-input" data-coin="copper" value="' + (char.coins ? char.coins.copper || 0 : 0) + '" min="0"></div>';
		html += '</div>';
		html += '<div class="characters__form-row">';
		html += '<div class="characters__form-group"><label>Électrum (pe)</label>';
		html += '<input type="number" class="characters__form-input coin-input" data-coin="electrum" value="' + (char.coins ? char.coins.electrum || 0 : 0) + '" min="0"></div>';
		html += '</div>';
		html += '</div>';
		
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Status</h4>';
		html += '<div class="characters__sheet-items">';
		html += '<div class="characters__sheet-item">';
		html += '<label><input type="checkbox" class="inspiration-checkbox" ' + (char.inspiration ? "checked" : "") + '> Inspiração</label>';
		html += '</div>';
		html += '<div class="characters__sheet-item"><b>Death Saves:</b></div>';
		html += '<div class="characters__sheet-item">Sucessos: ';
		for (var i = 1; i <= 3; i++) {
			html += '<input type="checkbox" class="death-save-success" data-index="' + i + '" ' + (char.deathSaves && char.deathSaves.successes >= i ? "checked" : "") + '> ';
		}
		html += '</div>';
		html += '<div class="characters__sheet-item">Falhas: ';
		for (var i = 1; i <= 3; i++) {
			html += '<input type="checkbox" class="death-save-failure" data-index="' + i + '" ' + (char.deathSaves && char.deathSaves.failures >= i ? "checked" : "") + '> ';
		}
		html += '</div>';
		html += '</div></div>';
		
		$content.html(html);
		
		// Event listeners para moedas
		$content.find(".coin-input").on("change", function() {
			var coinType = $(this).data("coin");
			var value = parseInt($(this).val()) || 0;
			if (!char.coins) char.coins = {};
			char.coins[coinType] = value;
		});
		
		// Event listener para inspiração
		$content.find(".inspiration-checkbox").on("change", function() {
			char.inspiration = $(this).is(":checked");
		});
		
		// Event listeners para death saves
		$content.find(".death-save-success").on("change", function() {
			var index = parseInt($(this).data("index"));
			if (!char.deathSaves) char.deathSaves = {failures: 0, successes: 0};
			char.deathSaves.successes = $(this).is(":checked") ? index : 0;
			// Atualizar checkboxes
			$content.find(".death-save-success").each(function(i) {
				$(this).prop("checked", i < char.deathSaves.successes);
			});
		});
		
		$content.find(".death-save-failure").on("change", function() {
			var index = parseInt($(this).data("index"));
			if (!char.deathSaves) char.deathSaves = {failures: 0, successes: 0};
			char.deathSaves.failures = $(this).is(":checked") ? index : 0;
			// Atualizar checkboxes
			$content.find(".death-save-failure").each(function(i) {
				$(this).prop("checked", i < char.deathSaves.failures);
			});
		});
	};
	
	function renderAbilitiesTab($content, char) {
		var html = '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Atributos</h4>';
		html += '<div class="characters__sheet-stats">';
		ABILITY_ABVS.forEach(function(a) {
			var total = (char.scores[a] || 8) + (char.rawScores[a] || 0);
			var mod = calcMod(total);
			html += '<div class="characters__stat">';
			html += '<div class="characters__stat-name">' + ABILITY_SHORT[a] + '</div>';
			html += '<div class="characters__stat-value">' + total + '</div>';
			html += '<div class="characters__stat-mod">' + (mod >= 0 ? "+" : "") + mod + '</div>';
			html += '</div>';
		});
		html += '</div></div>';
		$content.html(html);
	}
	
	function renderSkillsTab($content, char) {
		var profBonus = calcProfBonus(char.level || 1);
		var html = '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Perícias</h4>';
		html += '<div class="characters__sheet-items">';
		var skillKeys = Object.keys(char.skills || {});
		if (skillKeys.length) {
			skillKeys.forEach(function(k) {
				var skill = SKILLS.find(function(s) { return s.name === SKILL_KEY_TO_PT[k]; });
				var abil = skill ? skill.abil : "str";
				var v = char.skills[k];
				var total = calcMod((char.scores[abil] || 8) + (char.rawScores[abil] || 0)) + (v === 1 ? profBonus : v === 2 ? profBonus * 2 : 0);
				html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">+' + total + '</span> ' + (SKILL_KEY_TO_PT[k] || k) + (v === 2 ? " ★" : "") + '</div>';
			});
		} else {
			html += '<div class="characters__sheet-item">Nenhuma perícia selecionada</div>';
		}
		html += '</div></div>';
		
		// Outras proficiências
		if (char.otherProficiencies && char.otherProficiencies.length) {
			html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Outras Proficiências</h4>';
			html += '<div class="characters__sheet-items">';
			char.otherProficiencies.forEach(function(prof) {
				html += '<div class="characters__sheet-item">' + esc(prof) + '</div>';
			});
			html += '</div></div>';
		}
		
		$content.html(html);
	}
	
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
				html += '<span class="characters__spell-name">' + esc(spell.name || spell) + '</span>';
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
				html += '<span>' + esc(weapon.name || weapon) + '</span>';
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
		html += '</div>';
		
		// Armaduras
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Armaduras</div>';
		html += '<div class="characters__items-list" id="armors-list">';
		if (char.armors && char.armors.length) {
			char.armors.forEach(function(armor, index) {
				html += '<div class="characters__item">';
				html += '<span>' + esc(armor.name || armor) + '</span>';
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
		html += '</div>';
		
		// Inventário
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Inventário</div>';
		html += '<textarea class="characters__sheet-textarea" id="in-inv" placeholder="Anote seus itens (um por linha)...">' + esc((char.inventory || []).join("\n")) + '</textarea>';
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
				$item.html('<b>' + esc(weapon.name) + '</b> (' + esc(weapon.weaponCategory || "Arma") + ')');
				$item.on("click", function() {
					if (!char.weapons) char.weapons = [];
					char.weapons.push({name: weapon.name, type: weapon.weaponCategory});
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
				var isArmor = item.type === "LA" || item.type === "MA" || item.type === "HA" || item.type === "S";
				return nameMatch && isArmor;
			}).slice(0, 10);
			
			$armorResults.empty();
			if (filtered.length === 0) {
				$armorResults.html('<div class="characters__search-item">Nenhuma armadura encontrada</div>');
				return;
			}
			
			filtered.forEach(function(armor) {
				var $item = $('<div class="characters__search-item">');
				$item.html('<b>' + esc(armor.name) + '</b> (' + esc(armor.type || "Armadura") + ')');
				$item.on("click", function() {
					if (!char.armors) char.armors = [];
					char.armors.push({name: armor.name, type: armor.type, ac: armor.ac});
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
				html += '<div class="characters__feature-name">' + esc(feat.name || feat) + '</div>';
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

	function renderSheet() {
		try {
			var char = currentChar;
			if (!char) {
				console.error("[Characters] Nenhum personagem selecionado");
				return;
			}
			console.log("[Characters] Renderizando ficha:", char.name);
			
			var profBonus = calcProfBonus(char.level || 1);

			var html = '<div class="characters__view">';
			html += '<button class="characters__btn characters__btn--secondary characters__btn-back" id="btn-back">← Voltar</button>';
			html += '<div class="characters__sheet">';
		
		// Botão de exportar
		html += '<div class="characters__form-row">';
		html += '<button class="characters__btn characters__btn--info" id="btn-export-sheet">📥 Exportar .cah</button>';
		html += '</div>';

		// Abas de navegação
		html += '<div class="characters__tabs">';
		html += '<button class="characters__tab active" data-tab="overview">Visão Geral</button>';
		html += '<button class="characters__tab" data-tab="abilities">Atributos</button>';
		html += '<button class="characters__tab" data-tab="skills">Perícias</button>';
		html += '<button class="characters__tab" data-tab="spells">Magias</button>';
		html += '<button class="characters__tab" data-tab="equipment">Equipamentos</button>';
		html += '<button class="characters__tab" data-tab="features">Características</button>';
		html += '</div>';

		// Header
		html += '<div class="characters__sheet-header">';
		html += '<div class="characters__sheet-avatar">' + esc((char.name || "?").charAt(0).toUpperCase()) + '</div>';
		html += '<div>';
		html += '<h2 class="characters__sheet-name">' + esc(char.name) + '</h2>';
		html += '<div class="characters__sheet-detail">' + esc(char.race ? char.race.name : "—") + ' • ' + esc(char.className) + ' Nv. ' + (char.level || 1) + ' • ' + esc(char.background || "—") + '</div>';
		html += '<div class="characters__sheet-detail">' + esc(char.alignment || "Neutro") + ' • Jogador: ' + esc(char.playerName || "—") + '</div>';
		html += '</div></div>';

		// Conteúdo das abas
		html += '<div id="sheet-content"></div>';

		// Botões de ação
		html += '<div class="characters__form-row">';
		html += '<button class="characters__btn characters__btn--primary" id="btn-save">💾 Salvar</button>';
		html += '<button class="characters__btn characters__btn--danger" id="btn-delete">Excluir</button>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-print">🖨️ Imprimir</button>';
		html += '</div>';
		html += '</div>'; // Fechar .characters__sheet
		html += '</div>'; // Fechar .characters__view

		// INSERIR O HTML NO DOM
		$root.html(html);
		
		console.log("[Characters] HTML inserido no DOM");

		$root.find("#btn-back").on("click", function() {
			currentView = "list";
			currentChar = null;
			renderList();
		});

		$root.find("#btn-save").on("click", function() {
			var inv = $root.find("#in-inv");
			if (inv.length) char.inventory = inv.val().split("\n").filter(Boolean);
			
			// Salvar moedas
			var coins = {};
			$root.find(".coin-input").each(function() {
				var coinType = $(this).data("coin");
				coins[coinType] = parseInt($(this).val()) || 0;
			});
			char.coins = coins;
			
			// Salvar inspiração
			var inspiration = $root.find(".inspiration-checkbox");
			if (inspiration.length) char.inspiration = inspiration.is(":checked");
			
			// Salvar death saves
			var successes = $root.find(".death-save-success:checked").length;
			var failures = $root.find(".death-save-failure:checked").length;
			char.deathSaves = {successes: successes, failures: failures};
			
			// Calcular valores derivados
			char.spellSlots = calculateSpellSlots(char);
			char.spellAttackBonus = calculateSpellAttackBonus(char);
			char.spellDC = calculateSpellDC(char);
			char.passivePerception = calculatePassivePerception(char);
			
			char.updated = Date.now();
			CharactersStore.save(char);
			if (global.JqueryUtil && global.JqueryUtil.doToast) {
				global.JqueryUtil.doToast({type: "success", content: "Ficha salva!"});
			} else {
				alert("Ficha salva!");
			}
		});

		$root.find("#btn-delete").on("click", function() {
			if (!confirm("Excluir esta ficha?")) return;
			CharactersStore.remove(char.id);
			currentView = "list";
			currentChar = null;
			renderList();
		});

		$root.find("#btn-print").on("click", function() { window.print(); });
		
		$root.find("#btn-export-sheet").on("click", function() {
			exportToCah(char);
		});
		
		// Sistema de abas
		$root.find(".characters__tab").on("click", function() {
			var tab = $(this).data("tab");
			window.renderSheetTab(tab);
		});
		
		// Renderizar primeira aba
		window.renderSheetTab("overview");
		} catch (err) {
			console.error("[Characters] Erro ao renderizar ficha:", err);
			alert("Erro ao renderizar ficha: " + err.message);
		}
	}

	// === Export/Import ===
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
	function calculateSpellSlots(char) {
		var slots = {};
		var level = char.level || 1;
		var className = char.className;
		
		var slotTable = {
			"Wizard": [0,2,3,4,4,4,4,4,4,4,4],
			"Sorcerer": [0,2,3,4,4,4,4,4,4,4,4],
			"Cleric": [0,2,3,4,4,4,4,4,4,4,4],
			"Druid": [0,2,3,4,4,4,4,4,4,4,4],
			"Bard": [0,2,3,3,3,3,3,3,3,3,3],
			"Warlock": [0,1,2,2,2,2,2,2,2,2,2],
			"Paladin": [0,0,2,3,3,3,3,3,3,3,3],
			"Ranger": [0,0,2,3,3,3,3,3,3,3,3],
			"Artificer": [0,2,2,3,3,3,3,3,3,3,3],
			"Fighter": [0,0,0,0,0,0,0,0,0,0,0],
			"Rogue": [0,0,0,0,0,0,0,0,0,0,0],
			"Monk": [0,0,0,0,0,0,0,0,0,0,0],
			"Barbarian": [0,0,0,0,0,0,0,0,0,0,0]
		};
		
		var classSlots = slotTable[className] || slotTable["Fighter"] || [0,0,0,0,0,0,0,0,0,0,0];
		
		for (var i = 1; i <= 9; i++) {
			slots[i] = i < classSlots.length ? classSlots[i] : 0;
		}
		
		return slots;
	}
	
	function calculateSpellAttackBonus(char) {
		var profBonus = calcProfBonus(char.level || 1);
		var classAbilityMap = {
			"Wizard": "int", "Sorcerer": "cha", "Cleric": "wis", "Druid": "wis",
			"Bard": "cha", "Warlock": "cha", "Paladin": "cha", "Ranger": "wis", "Artificer": "int"
		};
		var spellcastingAbility = classAbilityMap[char.className] || "int";
		var abilityMod = calcMod((char.scores[spellcastingAbility] || 8) + (char.rawScores[spellcastingAbility] || 0));
		return profBonus + abilityMod;
	}
	
	function calculateSpellDC(char) {
		return 8 + calculateSpellAttackBonus(char);
	}
	
	function calculatePassivePerception(char) {
		var profBonus = calcProfBonus(char.level || 1);
		var perceptionSkill = char.skills && char.skills.perception ? char.skills.perception : 0;
		var wisMod = calcMod((char.scores.wis || 8) + (char.rawScores.wis || 0));
		return 10 + wisMod + (perceptionSkill === 1 ? profBonus : perceptionSkill === 2 ? profBonus * 2 : 0);
	}

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
		return fetch("data/items.json")
			.then(function(r) { return r.json(); })
			.then(function(json) {
				return (json.item || []).filter(function(i) { return i.name; });
			});
	}

	function loadFeats() {
		return fetch("data/feats.json")
			.then(function(r) { return r.json(); })
			.then(function(json) {
				return (json.feat || []).filter(function(f) { return f.name; });
			});
	}

	function loadRaces() {
		return fetch("data/races.json").then(function(r) { return r.json(); }).then(function(json) {
			var races = json.race || [];
			var seen = {};
			var unique = [];
			races.forEach(function(r) {
				var key = r.name.toLowerCase();
				if (!seen[key] && (r.source === "PHB" || r.source === "MPMM")) {
					seen[key] = true;
					unique.push(r);
				}
			});
			if (!unique.length) {
				races.forEach(function(r) {
					var key = r.name.toLowerCase();
					if (!seen[key]) { seen[key] = true; unique.push(r); }
				});
			}
			return unique;
		});
	}

	function loadBackgrounds() {
		return fetch("data/backgrounds.json").then(function(r) { return r.json(); }).then(function(json) {
			var bgs = json.background || [];
			var seen = {};
			var unique = [];
			bgs.forEach(function(b) {
				var key = b.name.toLowerCase();
				if (!seen[key] && b.source === "PHB") { seen[key] = true; unique.push(b); }
			});
			return unique.length ? unique : bgs;
		});
	}

	function loadClasses() {
		return fetch("data/class/index.json").then(function(r) { return r.json(); }).then(function(index) {
			var promises = Object.keys(index).map(function(key) {
				var classFile = index[key];
				if (!isSafeDataFile(classFile)) return Promise.resolve({class: [], subclass: []});
				return fetch("data/class/" + classFile).then(function(r) { return r.json(); }).then(function(json) {
					// Filtrar apenas classes de jogador (excluir sidekick, mystic, expert)
					return (json.class || []).filter(function(c) { 
						if (!c || !c.name || !c.source) return false;
						var name = c.name.toLowerCase();
						// Aceitar apenas sources oficiais e excluir classes não-jogador
						var validSource = ["PHB","TCE","XGE","ERLW","WGE","SCC","TWB"].indexOf(c.source) >= 0;
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
				var seen = {};
				var unique = [];
				classes.forEach(function(c) {
					var key = c.name.toLowerCase();
					if (!seen[key]) { seen[key] = true; unique.push(c); }
				});
				return unique.sort(function(a,b) { return a.name.localeCompare(b.name); });
			});
		});
	}

	function loadSubclasses() {
		return fetch("data/class/index.json").then(function(r) { return r.json(); }).then(function(index) {
			var promises = Object.keys(index).map(function(key) {
				var classFile = index[key];
				if (!isSafeDataFile(classFile)) return Promise.resolve({class: [], subclass: []});
				return fetch("data/class/" + classFile).then(function(r) { return r.json(); }).then(function(json) {
					// Aceitar subclasses de várias fontes
					return (json.subclass || []).filter(function(sc) { 
						if (!sc || !sc.name || !sc.source) return false;
						return ["PHB","TCE","XGE","ERLW","WGE","SCC","TWB"].indexOf(sc.source) >= 0;
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
				
				// Remover duplicatas globais
				var seen = {};
				var unique = [];
				subclasses.forEach(function(sc) {
					var key = ((sc._classNameEN || sc.className || "") + "_" + (sc.name || "").toLowerCase()).toLowerCase();
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
