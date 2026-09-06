// Visualização da ficha do personagem
import {
	ABILITY_ABVS, ABILITY_NAMES, ABILITY_SHORT, SKILLS,
	CLASS_HIT_DICE, SKILL_KEY_TO_PT,
	calcMod, calcProfBonus
} from "./characters-consts.js";
import {CharactersStore} from "./characters-store.js";

export class CharactersUiSheet {
	constructor(opts) {
		this._$root = opts.$root;
		this._character = opts.character;
		this._pOnBack = opts.pOnBack;
	}

	/**
	 * Constrói o URL de um item/magia/talento para abrir na página correspondente.
	 * Formato esperado no inventário: "source|name" (ex: "PHB|Espada Longa").
	 * Sem source, abre a página de referência para busca manual.
	 * @param {"item"|"spell"|"feature"} type
	 * @param {string} name
	 * @returns {string} URL
	 */
	static _buildEntityUrl(type, name) {
		const pageMap = {
			item: "items.html",
			spell: "spells.html",
			feature: "optionalfeatures.html",
		};
		const page = pageMap[type] || "items.html";
		const parts = String(name || "").split("|");
		if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
			const [source, entName] = parts.map(p => p.trim());
			return `${page}#${encodeURIComponent(source)}|${encodeURIComponent(entName)}`;
		}
		const hash = encodeURIComponent(String(name || "").trim());
		return hash ? `${page}#${hash}` : page;
	}

	pRender() {
		const char = this._character;
		const profBonus = calcProfBonus(char.level || 1);
		const der = this._computeDerived(char);

		const esc = this._esc.bind(this);

		let html = '<div class="characters__view">';
		html += '<button class="characters__btn characters__btn--secondary characters__btn-back" id="btn-back">← Voltar</button>';
		html += '<div class="characters__sheet">';

		// Header
		html += '<div class="characters__sheet-header">';
		html += '<div class="characters__sheet-avatar">' + esc((char.name || "?").charAt(0).toUpperCase()) + '</div>';
		html += '<div>';
		html += '<h2 class="characters__sheet-name">' + esc(char.name) + '</h2>';
		html += '<div class="characters__sheet-detail">' + esc(char.race ? char.race.name : "—") + ' • ' + esc(char.className) + ' Nv. ' + (char.level || 1) + ' • ' + esc(char.background || "—") + '</div>';
		html += '<div class="characters__sheet-detail">' + esc(char.alignment || "Neutro") + ' • Jogador: ' + esc(char.playerName || "—") + '</div>';
		html += '</div></div>';

		// Atributos
		html += '<div class="characters__sheet-stats">';
		ABILITY_ABVS.forEach(a => {
			const total = (der.scores[a] || 8) + (der.rawScores[a] || 0);
			const mod = calcMod(total);
			html += '<div class="characters__stat">';
			html += '<div class="characters__stat-name">' + ABILITY_SHORT[a] + '</div>';
			html += '<div class="characters__stat-value">' + total + '</div>';
			html += '<div class="characters__stat-mod">' + (mod >= 0 ? "+" : "") + mod + '</div>';
			html += '</div>';
		});
		html += '</div>';

		// Combate
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Combate</h4>';
		html += '<div class="characters__sheet-items">';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + der.hp.max + '</span> PV Máximo</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + der.hp.current + '</span> PV Atual</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + der.ac + '</span> CA</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + (der.initiative >= 0 ? "+" : "") + der.initiative + '</span> Iniciativa</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">' + der.speed + '</span> Deslocamento</div>';
		html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">+' + profBonus + '</span> Bônus Prof.</div>';
		html += '</div></div>';

		// Perícias
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Perícias</h4>';
		html += '<div class="characters__sheet-items">';
		const skillKeys = Object.keys(der.skills || {});
		if (skillKeys.length) {
			skillKeys.forEach(k => {
				const skill = SKILLS.find(s => s.name === SKILL_KEY_TO_PT[k]);
				const abil = skill ? skill.abil : "str";
				const v = der.skills[k];
				const total = calcMod((der.scores[abil] || 8) + (der.rawScores[abil] || 0)) + (v === 1 ? profBonus : v === 2 ? profBonus * 2 : 0);
				html += '<div class="characters__sheet-item"><span class="characters__sheet-item-value">+' + total + '</span> ' + (SKILL_KEY_TO_PT[k] || k) + (v === 2 ? " ★" : "") + '</div>';
			});
		} else {
			html += '<div class="characters__sheet-item">Nenhuma perícia</div>';
		}
		html += '</div></div>';

		// Magias Conhecidas (renderizadas como links clicáveis)
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Magias Conhecidas</h4>';
		html += '<div class="characters__sheet-items">';
		if (der.spells && der.spells.length) {
			der.spells.forEach(sp => {
				if (!sp) return;
				const url = CharactersUiSheet._buildEntityUrl("spell", sp);
				html += '<div class="characters__sheet-item"><a href="' + url + '" class="characters__sheet-link" target="_blank">' + esc(sp) + '</a></div>';
			});
		} else {
			html += '<div class="characters__sheet-item">Nenhuma magia</div>';
		}
		html += '</div>';
		html += '<div class="characters__sheet-actions-bar mt-2">';
		html += '<a href="spells.html" class="characters__btn characters__btn--secondary characters__btn--sm characters__btn--outline" id="btn-add-spell">➕ Adicionar Magia</a>';
		html += '</div></div>';

		// Inventário (renderizado como links clicáveis)
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Inventário</h4>';
		html += '<div class="characters__sheet-items">';
		if (der.inventory && der.inventory.length) {
			der.inventory.forEach(it => {
				if (!it) return;
				const url = CharactersUiSheet._buildEntityUrl("item", it);
				html += '<div class="characters__sheet-item"><a href="' + url + '" class="characters__sheet-link" target="_blank">' + esc(it) + '</a></div>';
			});
		} else {
			html += '<div class="characters__sheet-item">Vazio</div>';
		}
		html += '</div>';
		// Texto de apoio para salvar (mantém compatibilidade)
		html += '<textarea class="characters__sheet-textarea mt-2" id="in-inv" placeholder="Anote seus itens (um por linha)...">' + esc((der.inventory || []).join("\n")) + '</textarea>';
		html += '<div class="characters__sheet-actions-bar mt-2">';
		html += '<a href="items.html" class="characters__btn characters__btn--secondary characters__btn--sm characters__btn--outline" id="btn-add-item">➕ Adicionar Item</a>';
		html += '</div></div>';

		// Magias (campo de lista para editar)
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Magias (lista)</h4>';
		html += '<textarea class="characters__sheet-textarea" id="in-spells" placeholder="Anote suas magias (uma por linha)...">' + esc((der.spells || []).join("\n")) + '</textarea>';
		html += '</div>';

		// Notas
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Notas</h4>';
		html += '<textarea class="characters__sheet-textarea" id="in-notes" placeholder="História, anotações...">' + esc(der.notes || "") + '</textarea>';
		html += '</div>';

		// Botões
		html += '<div class="characters__form-row">';
		html += '<button class="characters__btn characters__btn--primary" id="btn-save">💾 Salvar</button>';
		html += '<button class="characters__btn characters__btn--danger" id="btn-delete">Excluir</button>';
		html += '<button class="characters__btn characters__btn--secondary" id="btn-print">🖨️ Imprimir</button>';
		html += '</div>';

		html += '</div></div>';

		this._$root.empty().append(html);

		const $root = this._$root;

		$root.find("#btn-back").on("click", () => {
			if (this._pOnBack) this._pOnBack();
		});

		$root.find("#btn-save").on("click", () => {
			char.inventory = $root.find("#in-inv").val().split("\n").filter(Boolean);
			char.spells = $root.find("#in-spells").val().split("\n").filter(Boolean);
			char.notes = $root.find("#in-notes").val();
			char.updated = Date.now();
			CharactersStore.save(char);
			JqueryUtil.doToast({type: "success", content: "Ficha salva!"});
		});

		$root.find("#btn-delete").on("click", () => {
			if (!confirm("Excluir esta ficha?")) return;
			CharactersStore.remove(char.id);
			if (this._pOnBack) this._pOnBack();
		});

		$root.find("#btn-print").on("click", () => window.print());

		// Navegação para adicionar itens/magias (abre a tela correspondente)
		$root.find("#btn-add-item").on("click", (e) => {
			e.preventDefault();
			window.location.href = "items.html";
		});
		$root.find("#btn-add-spell").on("click", (e) => {
			e.preventDefault();
			window.location.href = "spells.html";
		});
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
}