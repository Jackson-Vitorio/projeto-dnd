// Wizard de criação de personagem D&D 5e
import {
	ABILITY_ABVS, ABILITY_NAMES, ABILITY_SHORT, SKILLS, CLASS_HIT_DICE,
	CLASS_SAVES, CLASS_SKILLS, SKILL_EN_TO_KEY, SKILL_KEY_TO_PT,
	STANDARD_ARRAY, POINT_BUY_COSTS, POINT_BUY_BUDGET,
	calcMod, calcProfBonus, rollAbilityScore, getRaceAbilities, createDefaultCharacter
} from "./characters-consts.js";
import {CharactersStore} from "./characters-store.js";

export class CharactersUiCreate {
	constructor(opts) {
		this._$root = opts.$root;
		this._races = opts.races || [];
		this._backgrounds = opts.backgrounds || [];
		this._classes = opts.classes || [];
		this._pOnDone = opts.pOnDone;
		this._pOnCancel = opts.pOnCancel;
		this._step = 1;
		this._data = createDefaultCharacter();
	}

	pRender() {
		this._render();
	}

	_render() {
		const steps = ["Básico", "Raça", "Classe", "Antecedente", "Atributos", "Perícias", "Finalizar"];
		let html = '<div class="characters__view"><div class="characters__steps" id="char-steps">';
		steps.forEach((s, ix) => {
			const n = ix + 1;
			const cls = n === this._step ? "active" : (n < this._step ? "completed" : "");
			html += '<div class="characters__step ' + cls + '"><span class="characters__step-number">' + n + '</span>' + s + '</div>';
		});
		html += '</div><div class="characters__form" id="char-form"></div></div>';
		this._$root.empty().append(html);
		this._renderStep();
	}

	_renderStep() {
		const $form = this._$root.find("#char-form");
		switch (this._step) {
			case 1: this._stepBasics($form); break;
			case 2: this._stepRace($form); break;
			case 3: this._stepClass($form); break;
			case 4: this._stepBackground($form); break;
			case 5: this._stepAbilities($form); break;
			case 6: this._stepSkills($form); break;
			case 7: this._stepFinish($form); break;
		}
	}

	_stepBasics($form) {
		const d = this._data;
		$form.html(
			'<div class="characters__form-section"><h3 class="characters__form-section-title">Informações Básicas</h3>' +
			'<div class="characters__form-row"><div class="characters__form-group"><label class="characters__form-label">Nome do Personagem *</label>' +
			'<input type="text" class="characters__form-input" id="in-name" value="' + this._esc(d.name) + '" placeholder="Ex: Aric Sombraluna"></div>' +
			'<div class="characters__form-group"><label class="characters__form-label">Nome do Jogador</label>' +
			'<input type="text" class="characters__form-input" id="in-player" value="' + this._esc(d.playerName) + '" placeholder="Seu nome"></div></div>' +
			'<div class="characters__form-row"><div class="characters__form-group"><label class="characters__form-label">Nível</label>' +
			'<input type="number" class="characters__form-input" id="in-level" min="1" max="20" value="' + (d.level || 1) + '"></div>' +
			'<div class="characters__form-group"><label class="characters__form-label">Alinhamento</label>' +
			'<select class="characters__form-select" id="in-align">' +
			["Leal e Bom", "Neutro e Bom", "Caótico e Bom", "Leal e Neutro", "Neutro", "Caótico e Neutro", "Leal e Mau", "Neutro e Mau", "Caótico e Mau"]
				.map(a => '<option value="' + a + '"' + (d.alignment === a ? " selected" : "") + '>' + a + '</option>').join("") +
			'</select></div></div>' +
			'<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>'
		);

		$form.find("#btn-next").on("click", () => {
			const name = $form.find("#in-name").val().trim();
			if (!name) { alert("Informe o nome!"); return; }
			d.name = name;
			d.playerName = $form.find("#in-player").val().trim();
			d.level = parseInt($form.find("#in-level").val()) || 1;
			d.alignment = $form.find("#in-align").val();
			this._step = 2;
			this._render();
		});
	}

	_stepRace($form) {
		const d = this._data;
		const races = [...new Map(this._races.map(r => [r.name.toLowerCase(), r])).values()].sort((a, b) => a.name.localeCompare(b.name));
		let opts = '<option value="">Selecione...</option>';
		races.forEach(r => {
			const sel = d.race && d.race.name === r.name ? " selected" : "";
			opts += '<option value="' + this._esc(r.name) + '"' + sel + '>' + this._esc(r.name) + '</option>';
		});

		$form.html(
			'<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha a Raça</h3>' +
			'<div class="characters__form-group"><label class="characters__form-label">Raça</label>' +
			'<select class="characters__form-select" id="in-race">' + opts + '</select></div>' +
			'<div id="info-race" class="characters__summary-box"></div>' +
			'<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ' +
			'<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>'
		);

		const updateInfo = () => {
			const race = this._races.find(r => r.name === $form.find("#in-race").val());
			if (!race) { $form.find("#info-race").empty(); return; }
			const abils = getRaceAbilities(race);
			const abilStr = ABILITY_ABVS.filter(a => abils[a]).map(a => ABILITY_SHORT[a] + " +" + abils[a]).join(", ");
			const speed = race.speed ? ((race.speed.walk || 30) + " pés") : "30 pés";
			const sizeName = {S:"Pequeno",M:"Médio",L:"Grande"}[race.size ? race.size[0] : "M"] || "Médio";
			const entries = race.entries ? race.entries.map(e => {
				const txt = this._textFromEntries(e.entries || [e]);
				return e.name ? "<b>" + this._esc(e.name) + ":</b> " + this._esc(txt) : this._esc(txt);
			}).join("<br>") : "";
			let html = '<div class="characters__summary-title">' + this._esc(race.name) + '</div>';
			html += '<div><b>Tamanho:</b> ' + sizeName + ' | <b>Deslocamento:</b> ' + speed + '</div>';
			if (abilStr) html += '<div><b>Bônus:</b> ' + abilStr + '</div>';
			if (entries) html += '<div class="mt-2">' + entries + '</div>';
			$form.find("#info-race").html(html);
		};

		$form.find("#in-race").on("change", updateInfo);
		if (d.race) $form.find("#in-race").val(d.race.name);
		updateInfo();

		$form.find("#btn-prev").on("click", () => { this._step = 1; this._render(); });
		$form.find("#btn-next").on("click", () => {
			const race = this._races.find(r => r.name === $form.find("#in-race").val());
			if (!race) { alert("Selecione uma raça!"); return; }
			d.race = race;
			const abils = getRaceAbilities(race);
			ABILITY_ABVS.forEach(a => { d.rawScores[a] = (d.rawScores[a] || 0) + (abils[a] || 0); });
			this._step = 3;
			this._render();
		});
	}

	_stepClass($form) {
		const d = this._data;
		const classes = [...new Map(this._classes.map(c => [c.name.toLowerCase(), c])).values()].sort((a, b) => a.name.localeCompare(b.name));
		let opts = '<option value="">Selecione...</option>';
		classes.forEach(c => {
			const sel = d.className === c.name ? " selected" : "";
			opts += '<option value="' + this._esc(c.name) + '"' + sel + '>' + this._esc(c.name) + '</option>';
		});

		$form.html(
			'<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha a Classe</h3>' +
			'<div class="characters__form-group"><label class="characters__form-label">Classe</label>' +
			'<select class="characters__form-select" id="in-class">' + opts + '</select></div>' +
			'<div id="info-class" class="characters__summary-box"></div>' +
			'<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ' +
			'<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>'
		);

		const updateInfo = () => {
			const cls = this._classes.find(c => c.name === $form.find("#in-class").val());
			if (!cls) { $form.find("#info-class").empty(); return; }
			const hd = CLASS_HIT_DICE[cls.name] || 8;
			const saves = (CLASS_SAVES[cls.name] || []).map(s => ABILITY_NAMES[s]).join(", ");
			const sk = CLASS_SKILLS[cls.name];
			let html = '<div class="characters__summary-title">' + this._esc(cls.name) + '</div>';
			html += '<div><b>Dado de Vida:</b> d' + hd + '</div>';
			html += '<div><b>Testes de Resistência:</b> ' + saves + '</div>';
			if (sk) html += '<div><b>Perícias:</b> Escolha ' + sk.count + ' de: ' + this._esc(sk.skills.join(", ")) + '</div>';
			$form.find("#info-class").html(html);
		};

		$form.find("#in-class").on("change", updateInfo);
		if (d.className) $form.find("#in-class").val(d.className);
		updateInfo();

		$form.find("#btn-prev").on("click", () => { this._step = 2; this._render(); });
		$form.find("#btn-next").on("click", () => {
			const clsName = $form.find("#in-class").val();
			if (!clsName) { alert("Selecione uma classe!"); return; }
			d.className = clsName;
			d.classData = this._classes.find(c => c.name === clsName);
			const hd = CLASS_HIT_DICE[clsName] || 8;
			const conMod = calcMod(d.scores.con);
			d.hp.max = hd + conMod;
			d.hp.current = d.hp.max;
			d.savingThrows = CLASS_SAVES[clsName] || [];
			this._step = 4;
			this._render();
		});
	}

	_stepBackground($form) {
		const d = this._data;
		const bgs = [...new Map(this._backgrounds.map(b => [b.name.toLowerCase(), b])).values()].sort((a, b) => a.name.localeCompare(b.name));
		let opts = '<option value="">Selecione...</option>';
		bgs.forEach(b => {
			const sel = d.background === b.name ? " selected" : "";
			opts += '<option value="' + this._esc(b.name) + '"' + sel + '>' + this._esc(b.name) + '</option>';
		});

		$form.html(
			'<div class="characters__form-section"><h3 class="characters__form-section-title">Escolha o Antecedente</h3>' +
			'<div class="characters__form-group"><label class="characters__form-label">Antecedente</label>' +
			'<select class="characters__form-select" id="in-bg">' + opts + '</select></div>' +
			'<div id="info-bg" class="characters__summary-box"></div>' +
			'<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ' +
			'<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>'
		);

		const updateInfo = () => {
			const bg = this._backgrounds.find(b => b.name === $form.find("#in-bg").val());
			if (!bg) { $form.find("#info-bg").empty(); return; }
			let html = '<div class="characters__summary-title">' + this._esc(bg.name) + '</div>';
			const entries = bg.entries ? bg.entries.map(e => {
				const txt = this._textFromEntries(e.entries || [e]);
				return e.name ? "<b>" + this._esc(e.name) + ":</b> " + this._esc(txt) : this._esc(txt);
			}).join("<br>") : "";
			if (entries) html += '<div class="mt-2">' + entries + '</div>';
			$form.find("#info-bg").html(html);
		};

		$form.find("#in-bg").on("change", updateInfo);
		if (d.background) $form.find("#in-bg").val(d.background);
		updateInfo();

		$form.find("#btn-prev").on("click", () => { this._step = 3; this._render(); });
		$form.find("#btn-next").on("click", () => {
			const bgName = $form.find("#in-bg").val();
			if (!bgName) { alert("Selecione um antecedente!"); return; }
			d.background = bgName;
			this._step = 5;
			this._render();
		});
	}

	_stepAbilities($form) {
		const d = this._data;
		$form.html(
			'<div class="characters__form-section"><h3 class="characters__form-section-title">Atributos</h3>' +
			'<div class="characters__method-tabs" id="methods">' +
			'<button class="characters__method-tab active" data-m="standard">Padrão</button>' +
			'<button class="characters__method-tab" data-m="rolled">Rolagem</button>' +
			'<button class="characters__method-tab" data-m="pointbuy">Compra</button></div>' +
			'<div class="characters__abilities" id="abilities"></div>' +
			'<div id="info-abilities" class="characters__summary-box"></div>' +
			'<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ' +
			'<button class="characters__btn characters__btn--primary" id="btn-next">Próximo →</button></div>'
		);

		const renderAbilities = () => {
			const $abBox = $form.find("#abilities");
			$abBox.empty();
			ABILITY_ABVS.forEach(abv => {
				const racial = d.rawScores[abv] || 0;
				const total = (d.scores[abv] || 8) + racial;
				const mod = calcMod(total);
				$abBox.append(
					'<div class="characters__ability">' +
					'<div class="characters__ability-name">' + ABILITY_NAMES[abv] + '</div>' +
					'<div class="characters__ability-score">' + total + '</div>' +
					'<div class="characters__ability-mod">' + (mod >= 0 ? "+" : "") + mod + '</div>' +
					(racial ? '<div class="characters__ability-mod" style="color:#28a745">Raça +' + racial + '</div>' : "") +
					'</div>'
				);
			});
		};

		const applyMethod = (method) => {
			d.method = method;
			if (method === "standard") {
				const vals = [...STANDARD_ARRAY].sort((a, b) => a - b);
				ABILITY_ABVS.forEach((a, i) => { d.scores[a] = vals[i]; });
				$form.find("#info-abilities").html('<div class="characters__summary-title">Array Padrão</div><div>Valores: ' + STANDARD_ARRAY.join(", ") + '</div>');
				renderAbilities();
			} else if (method === "rolled") {
				const results = [0,1,2,3,4,5].map(() => rollAbilityScore()).sort((a, b) => b - a);
				ABILITY_ABVS.forEach((a, i) => { d.scores[a] = results[i]; });
				$form.find("#info-abilities").html(
					'<div class="characters__summary-title">Rolagem (4d6, descarte o menor)</div>' +
					'<div class="characters__rolled-dice">' + results.map(r => '<div class="characters__dice">' + r + '</div>').join("") + '</div>' +
					'<button class="characters__btn characters__btn--secondary" id="btn-reroll">Rolar Novamente</button>'
				);
				$form.find("#btn-reroll").on("click", () => applyMethod("rolled"));
				renderAbilities();
			} else if (method === "pointbuy") {
				$form.find("#info-abilities").html(
					'<div class="characters__summary-title">Compra de Pontos</div>' +
					'<div>Você tem <b>' + POINT_BUY_BUDGET + ' pontos</b>. Valores entre 8 e 15.</div>' +
					'<div class="characters__pointbuy-costs" id="pb-costs"></div>'
				);
				const $costs = $form.find("#pb-costs");
				ABILITY_ABVS.forEach(abv => {
					const val = d.scores[abv] || 8;
					const cost = POINT_BUY_COSTS[val] || 0;
					$costs.append(
						'<div class="characters__pointbuy-row"><label>' + ABILITY_SHORT[abv] + '</label>' +
						'<input type="number" class="characters__form-input" min="8" max="15" value="' + val + '" data-abv="' + abv + '" style="width:70px">' +
						'<span>Custo: ' + cost + '</span></div>'
					);
				});
				$costs.on("change", "input", (e) => {
					const $in = $(e.target);
					const abv = $in.data("abv");
					let val = parseInt($in.val()) || 8;
					val = Math.max(8, Math.min(15, val));
					d.scores[abv] = val;
					applyMethod("pointbuy");
				});
				renderAbilities();
			}
		};

		$form.find("#methods").on("click", ".characters__method-tab", (e) => {
			const $btn = $(e.target);
			$form.find(".characters__method-tab").removeClass("active");
			$btn.addClass("active");
			applyMethod($btn.data("m"));
		});

		applyMethod(d.method || "standard");

		$form.find("#btn-prev").on("click", () => { this._step = 4; this._render(); });
		$form.find("#btn-next").on("click", () => {
			const hd = CLASS_HIT_DICE[d.className] || 8;
			const conMod = calcMod((d.scores.con || 8) + (d.rawScores.con || 0));
			d.hp.max = hd + conMod;
			d.hp.current = d.hp.max;
			d.ac = 10 + calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
			d.initiative = calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
			d.speed = d.race ? (d.race.speed?.walk || 30) : 30;
			this._step = 6;
			this._render();
		});
	}

	_stepSkills($form) {
		const d = this._data;
		const classSkills = CLASS_SKILLS[d.className] || null;

		let html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Perícias e Proficiências</h3>';
		if (classSkills) {
			html += '<div class="characters__summary-box"><div class="characters__summary-title">Perícias de ' + this._esc(d.className) + '</div>' +
				'<div>Escolha ' + classSkills.count + ' perícias:</div></div>';
		}
		html += '<div class="characters__summary-box"><div class="characters__summary-title">Todas as Perícias</div>' +
			'<div class="characters__skills-grid" id="skills-grid"></div></div>' +
			'<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ' +
			'<button class="characters__btn characters__btn--primary" id="btn-next">Finalizar →</button></div>';
		$form.html(html);

		const $grid = $form.find("#skills-grid");
		const classSkillKeys = classSkills ? classSkills.skills.map(s => SKILL_EN_TO_KEY[s]).filter(Boolean) : [];

		Object.keys(SKILL_KEY_TO_PT).forEach(key => {
			const ptName = SKILL_KEY_TO_PT[key];
			const skill = SKILLS.find(s => s.name === ptName);
			const abilName = skill ? ABILITY_SHORT[skill.abil] : "";
			const isClassSkill = classSkillKeys.includes(key);
			const profLevel = d.skills[key] || 0;
			const checked = profLevel >= 1 ? " checked" : "";
			const expert = profLevel === 2 ? " checked" : "";
			const isDisabled = !isClassSkill && profLevel === 0 ? "" : (isClassSkill ? "" : " disabled");
			const classBadge = isClassSkill ? ' <span style="color:#006bc4;font-size:.7em">[Classe]</span>' : "";

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

		// Contador de skills de classe selecionadas
		const getClassProfCount = () => {
			const bgKeys = this._getBgSkillKeys();
			return Object.entries(d.skills).filter(([k, v]) => v === 1 && classSkillKeys.includes(k) && !bgKeys.includes(k)).length;
		};

		$grid.on("change", ".prof-cb", (e) => {
			const $cb = $(e.target);
			const key = $cb.data("key");
			if ($cb.is(":checked")) {
				const bgKeys = this._getBgSkillKeys();
				if (!bgKeys.includes(key) && classSkillKeys.includes(key) && classSkills) {
					if (getClassProfCount() >= classSkills.count) {
						alert("Você já escolheu " + classSkills.count + " perícias de classe!");
						$cb.prop("checked", false);
						return;
					}
				}
				d.skills[key] = 1;
				$grid.find('.exp-cb[data-key="' + key + '"]').prop("disabled", false);
			} else {
				d.skills[key] = 0;
				delete d.skills[key];
				$grid.find('.exp-cb[data-key="' + key + '"]').prop("disabled", true).prop("checked", false);
			}
		});

		$grid.on("change", ".exp-cb", (e) => {
			const $cb = $(e.target);
			const key = $cb.data("key");
			if ($cb.is(":checked")) d.skills[key] = 2;
			else if (d.skills[key] === 2) d.skills[key] = 1;
		});

		// Pré-marcar skills do background
		const bgKeys = this._getBgSkillKeys();
		bgKeys.forEach(k => {
			if (SKILL_KEY_TO_PT[k]) {
				d.skills[k] = 1;
				$grid.find('.prof-cb[data-key="' + k + '"]').prop("checked", true);
				$grid.find('.exp-cb[data-key="' + k + '"]').prop("disabled", false);
			}
		});

		$form.find("#btn-prev").on("click", () => { this._step = 5; this._render(); });
		$form.find("#btn-next").on("click", () => {
			this._finalize();
			CharactersStore.save(d);
			if (this._pOnDone) this._pOnDone();
			JqueryUtil.doToast({type: "success", content: "Ficha salva com sucesso!"});
		});
	}

	_getBgSkillKeys() {
		const d = this._data;
		if (!d.background) return [];
		const bg = this._backgrounds.find(b => b.name === d.background);
		if (!bg || !bg.skillProficiencies) return [];
		const keys = [];
		bg.skillProficiencies.forEach(p => {
			Object.entries(p).forEach(([k, v]) => {
				if (k !== "choose" && v) {
					const key = SKILL_EN_TO_KEY[k];
					if (key) keys.push(key);
				}
			});
		});
		return keys;
	}

	_stepFinish($form) {
		const d = this._data;
		const profBonus = calcProfBonus(d.level || 1);
		const der = this._computeDerived(d);

		let html = '<div class="characters__form-section"><h3 class="characters__form-section-title">Revisão Final</h3>';
		html += '<div class="characters__summary-box"><div class="characters__summary-title">' + this._esc(der.name) + '</div><ul class="characters__summary-list">';
		html += '<li><b>Raça:</b> ' + this._esc(der.race ? der.race.name : "—") + '</li>';
		html += '<li><b>Classe:</b> ' + this._esc(der.className) + ' Nv. ' + der.level + '</li>';
		html += '<li><b>Antecedente:</b> ' + this._esc(der.background || "—") + '</li>';
		html += '<li><b>PV Máx:</b> ' + der.hp.max + ' | <b>CA:</b> ' + der.ac + ' | <b>Iniciativa:</b> ' + (der.initiative >= 0 ? "+" : "") + der.initiative + '</li>';
		html += '<li><b>Bônus de Proficiência:</b> +' + profBonus + '</li>';
		html += '<li><b>Deslocamento:</b> ' + der.speed + ' pés</li>';
		html += '</ul></div>';

		html += '<div class="characters__summary-box"><div class="characters__summary-title">Atributos</div><ul class="characters__summary-list">';
		ABILITY_ABVS.forEach(a => {
			const total = (der.scores[a] || 8) + (der.rawScores[a] || 0);
			const mod = calcMod(total);
			html += '<li><b>' + ABILITY_NAMES[a] + ':</b> ' + total + ' (' + (mod >= 0 ? "+" : "") + mod + ')</li>';
		});
		html += '</ul></div>';

		html += '<div class="characters__summary-box"><div class="characters__summary-title">Perícias</div><ul class="characters__summary-list">';
		Object.entries(der.skills || {}).forEach(([k, v]) => {
			const skill = SKILLS.find(s => s.name === SKILL_KEY_TO_PT[k]);
			const abil = skill ? skill.abil : "str";
			const total = calcMod((der.scores[abil] || 8) + (der.rawScores[abil] || 0)) + (v === 1 ? profBonus : v === 2 ? profBonus * 2 : 0);
			html += '<li>' + SKILL_KEY_TO_PT[k] + ': +' + total + (v === 2 ? " (expertise)" : "") + '</li>';
		});
		html += '</ul></div>';

		html += '<button class="characters__btn characters__btn--secondary" id="btn-prev">← Voltar</button> ';
		html += '<button class="characters__btn characters__btn--success" id="btn-save">💾 Salvar Ficha</button></div>';

		$form.html(html);

		$form.find("#btn-prev").on("click", () => { this._step = 6; this._render(); });
		$form.find("#btn-save").on("click", () => {
			this._finalize();
			CharactersStore.save(d);
			if (this._pOnDone) this._pOnDone();
			JqueryUtil.doToast({type: "success", content: "Ficha salva com sucesso!"});
		});
	}

	_finalize() {
		const d = this._data;
		const hd = CLASS_HIT_DICE[d.className] || 8;
		const conMod = calcMod((d.scores.con || 8) + (d.rawScores.con || 0));
		d.hp.max = hd + conMod;
		d.hp.current = d.hp.max;
		d.ac = 10 + calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
		d.initiative = calcMod((d.scores.dex || 8) + (d.rawScores.dex || 0));
		d.speed = d.race ? (d.race.speed?.walk || 30) : 30;
		d.updated = Date.now();
	}

	_computeDerived(char) {
		const result = JSON.parse(JSON.stringify(char));
		const hd = CLASS_HIT_DICE[result.className] || 8;
		const conMod = calcMod((result.scores.con || 8) + (result.rawScores.con || 0));
		result.hp.max = hd + conMod;
		result.hp.current = result.hp.current || result.hp.max;
		result.ac = 10 + calcMod((result.scores.dex || 8) + (result.rawScores.dex || 0));
		result.initiative = calcMod((result.scores.dex || 8) + (result.rawScores.dex || 0));
		return result;
	}

	_esc(str) {
		if (!str) return "";
		const A = String.fromCharCode(38);
		const LT = String.fromCharCode(60);
		const GT = String.fromCharCode(62);
		const Q = String.fromCharCode(34);
		const AP = String.fromCharCode(39);
		const map = {};
		map[A] = A + "amp;";
		map[LT] = LT + "t;";
		map[GT] = GT + "t;";
		map[Q] = Q + "quot;";
		map[AP] = AP + "#039;";
		return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
	}

	_textFromEntries(entries) {
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
}
