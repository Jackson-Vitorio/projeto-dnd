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

	pRender() {
		const char = this._character;
		const profBonus = calcProfBonus(char.level || 1);
		const der = this._computeDerived(char);

		const A = String.fromCharCode(38);
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

		// Inventário
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Inventário</h4>';
		html += '<div class="characters__sheet-items">';
		html += '<div class="characters__sheet-item">' + esc((der.inventory && der.inventory.length ? der.inventory.join(", ") : "Vazio")) + '</div>';
		html += '</div>';
		html += '<textarea class="characters__sheet-textarea mt-2" id="in-inv" placeholder="Anote seus itens (um por linha)...">' + esc((der.inventory || []).join("\n")) + '</textarea>';
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