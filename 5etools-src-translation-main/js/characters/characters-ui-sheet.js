// Visualização da ficha do personagem
import {
	ABILITY_ABVS, ABILITY_NAMES, ABILITY_SHORT, SKILLS,
	CLASS_HIT_DICE, SKILL_KEY_TO_PT,
	calcMod, calcProfBonus
} from "./characters-consts.js";
import {CharactersStore} from "./characters-store.js";
import {openItemEditorPopup, closeItemEditorPopup, RARITY_LABEL, RARITY_COLORS, PROPERTY_LABELS, MODIFIER_OPTIONS, DMG_TYPE_OPTIONS} from "./char-item-editor.js";

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

				// === Inventário & Equipamento (tabs: Equipado / Armas / Inventário) ===
		html += '<div class="characters__sheet-section"><h4 class="characters__sheet-section-title">Equipamento</h4>';
		html += '<ul class="characters__tabs" id="inv-tabs">';
		html += '<li class="characters__tab-item active" data-tab="equipped">Equipado</li>';
		html += '<li class="characters__tab-item" data-tab="weapons">Armas</li>';
		html += '<li class="characters__tab-item" data-tab="inventory">Inventário</li>';
		html += '</ul>';

		// Conteúdo das tabs (preenchido dinamicamente via JS)
		html += '<div class="characters__tab-content" id="tab-equipped" style="display:block">';
		html += '<div class="characters__sheet-items" id="sheet-equipped"></div>';
		html += '<div class="characters__ac-breakdown" id="ac-breakdown"></div>';
		html += '</div>';
		html += '<div class="characters__tab-content" id="tab-weapons" style="display:none">';
		html += '<div class="characters__sheet-items" id="sheet-weapons"></div>';
		html += '</div>';
		html += '<div class="characters__tab-content" id="tab-inventory" style="display:none">';
		html += '<div class="characters__sheet-items" id="sheet-inventory"></div>';
		html += '</div>';

		// Barra de ações: dropdown "Adicionar Item"
		html += '<div class="characters__actions-bar mt-2" style="display:flex;gap:8px;flex-wrap:wrap">';
		html += '<button class="characters__btn characters__btn--primary characters__btn--sm" id="btn-add-item-main">➕ Adicionar Item</button>';
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

		// --- Navegação de tabs de equipamento ---
		$root.find(".characters__tab-item").on("click", (e) => {
			e.preventDefault();
			const tab = $(e.currentTarget).data("tab");
			$root.find(".characters__tab-item").removeClass("active");
			$(e.currentTarget).addClass("active");
			$root.find(".characters__tab-content").hide();
			$root.find("#tab-" + tab).show();
		});

		// --- Dropdown "Adicionar Item" ---
		$root.find("#btn-add-item-main").off("click").on("click", (e) => {
			e.preventDefault();
			closeAddItemMenu();
			let menu = '<div class="characters__action-menu" id="additem-menu">';
			menu += '<button class="characters__actions-item" data-add="official">📖 Escolher Item Oficial</button>';
			menu += '<button class="characters__actions-item" data-add="create">➕ Criar Novo Item</button>';
			menu += '</div>';
			$(document.body).append(menu);
			let $m = $("#additem-menu");
			let r = $root.find("#btn-add-item-main")[0].getBoundingClientRect();
			$m.css({ position: "fixed", left: r.left + "px", top: (r.bottom + 4) + "px" });
			$m.find('[data-add="official"]').on("click", () => {
				$m.remove();
				window.location.href = "items.html";
			});
			$m.find('[data-add="create"]').on("click", () => {
				$m.remove();
				this._openItemEditor({ mode: "create" });
			});
			$(document).off(".additem").on("click.additem", function (ev) {
				if (!$(ev.target).closest("#additem-menu").length && ev.target !== $root.find("#btn-add-item-main")[0]) {
					$m.remove();
				}
			});
		});

		// Renderiza equipamentos, armas e inventário dinamicamente
		this._renderEquipado(der);
		this._renderArmas(der);
		this._renderInventario(der);
	}

		_computeDerived(char) {
		const result = JSON.parse(JSON.stringify(char));
		const hd = CLASS_HIT_DICE[result.className] || 8;
		const conMod = calcMod((result.scores.con || 8) + (result.rawScores.con || 0));
		result.hp.max = hd + conMod;
		result.hp.current = result.hp.current || result.hp.max;
		result.initiative = calcMod((result.scores.dex || 8) + (result.rawScores.dex || 0));

		// Calcula CA com bônus de armaduras, escudos e estilos de luta
		const acInfo = this._computeAC(char, result);
		result.ac = acInfo.total;
		result.acBreakdown = acInfo.breakdown;

		return result;
		}

	/**
	 * Calcula a CA total considerando armaduras, escudos, estilo de luta e bônus feitiço.
	 * PHB p.7: CA = armadura + DEX (limitado) + escudo + estilo.
	 */
	_computeAC(char, der) {
		const dexModRaw = calcMod((char.scores.dex || 8) + (char.rawScores.dex || 0));
		const breakdown = [];
		let armorBase = 10;
		let maxDex = Infinity;
		let shieldBonus = 0;

		const equipped = [
			...(char.equipment || []),
			...(char.armors || []),
		].filter(it => it && it.equipped && it.armor);

		equipped.forEach(it => {
			if (it.type === "S") {
				shieldBonus = (it.ac != null) ? Number(it.ac) : 2;
				breakdown.push({ label: it.name + " (escudo)", value: shieldBonus });
			} else if (["LA", "MA", "HA"].includes(it.type)) {
				armorBase = Number(it.ac) || 10;
				maxDex = (it.maxDex != null) ? Number(it.maxDex) : Infinity;
				breakdown.push({ label: it.name + (it.stealth ? " ⚠" : ""), value: 0, color: "#006bc4", raw: true });
			}
		});

		const dexContrib = Math.min(dexModRaw, maxDex);
		breakdown.push({ label: "Destreza", value: dexContrib });

		let styleBonus = 0;
		if (char.fightingStyle === "Defense") {
			styleBonus = 1;
			breakdown.push({ label: "Estilo de Luta (Defesa)", value: 1, color: "#006bc4" });
		}

		let magicBonus = 0;
		if (der && der.acBonus) {
			magicBonus = Number(der.acBonus);
			if (magicBonus) breakdown.push({ label: "Bônus Mágico", value: magicBonus, color: "#cc33ff" });
		}

		const total = armorBase + dexContrib + shieldBonus + styleBonus + magicBonus;
		return { total: total, breakdown: breakdown };
		}

	_renderEquipado(der) {
		const $container = this._$root.find("#sheet-equipped");
		const equipped = [
			...(this._character.equipment || []),
			...(this._character.armors || []),
		].filter(it => it && it.equipped);

		$container.empty();
		if (!equipped.length) {
			$container.append('<div class="characters__sheet-item">Nenhum item equipado</div>');
		} else {
			equipped.forEach(it => $container.append(this._renderEquipItem(it)));
		}

		const $ac = this._$root.find("#ac-breakdown");
		const bc = der.acBreakdown || [];
		let acHtml = '<div class="characters__ac-line"><span class="characters__ac-label">CA:</span> <b>' + der.ac + '</b>';
		if (bc.length) {
			acHtml += ' <span class="characters__ac-components">(' + bc.map(c => {
				const cls = c.color ? ' style="color:' + c.color + '" ' : '';
				const v = c.value >= 0 ? "+" + c.value : c.value;
				return '<span ' + cls + '>' + esc(c.label) + (c.value !== 0 ? ' (' + v + ')' : '') + '</span>';
			}).join(" + ") + ')';
		}
		acHtml += '</div>';
		$ac.html(acHtml);
	}

	_renderEquipItem(item) {
		const self = this;
		const $el = $(
			'<div class="characters__sheet-item characters__sheet-item--equipped" data-itemid="' + esc(item._id || item.id || "") + '">' +
			'<span class="characters__equipped-badge">Equipado</span>' +
			'<span class="characters__item-name">' + esc(item.name || item.id) + '</span>' +
			'<button class="characters__btn characters__btn--sm characters__btn--outline characters__btn--unequip" style="margin-left:auto" title="Desequipar">✕</button>' +
			'</div>'
		);

		let pressTimer = null;
		$(document).off("mouseup.itemhold").on("mouseup.itemhold", () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
		$el.on("mousedown", function (e) {
			e.preventDefault();
			pressTimer = setTimeout(function () { $(this).find(".characters__equipped-badge").toggleClass("characters__equipped-badge--active"); }.bind(this), 600);
		}).on("mouseup", function () { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });

		$el.on("click", function (e) { e.stopPropagation(); self._openItemPopup(item); });
		$el.find(".characters__btn--unequip").on("click", function (e) { e.stopPropagation(); self._unequipItem(item); });
		return $el;
	}

	/** Renderiza a aba de armas (com modificador de dano configurável). */
	_renderArmas(der) {
		const $container = this._$root.find("#sheet-weapons");
		const weps = (this._character.weapons || []).filter(w => w && w.name);
		$container.empty();
		if (!weps.length) { $container.append('<div class="characters__sheet-item">Nenhuma arma equipada</div>'); return; }
		const self = this;
		weps.forEach(w => {
			const modType = w.modifier === "dex"
				? calcMod((this._character.scores.dex || 8) + (this._character.rawScores.dex || 0))
				: calcMod((this._character.scores.str || 8) + (this._character.rawScores.str || 0));
			const dmg = w.dmg1 || "1d4";
			const fullDmg = modType > 0 ? dmg + "+" + modType : dmg;
			const versatile = w.dmg2 ? " / " + w.dmg2 + (modType > 0 ? "+" + modType : "") : "";

			const $el = $(
				'<div class="characters__sheet-item characters__sheet-item--weapon" data-itemid="' + esc(w._id || w.id || "") + '">' +
				'<span class="characters__item-name">' + esc(w.name || "") + ' <span class="characters__weapon-dmg">' + esc(fullDmg + versatile) + '</span></span>' +
				'<select class="characters__weapon-mod" title="Modificador de dano">' +
				MODIFIER_OPTIONS.map(m => '<option value="' + m.value + '" ' + (m.value === (w.modifier || "str") ? "selected" : "") + '>' + m.label + '</option>').join("") +
				'</select>' +
				'<button class="characters__btn characters__btn--sm characters__btn--outline" title="Editar">✎</button>' +
				'</div>'
			);
			$el.find(".characters__weapon-mod").on("change", function () { w.modifier = $(this).val(); self._saveItem(w); });
			$el.find('button[title="Editar"]').on("click", function (e) { e.stopPropagation(); self._openItemEditor({ mode: "edit", item: w, itemType: "weapon" }); });
			$el.on("click", function (e) { e.stopPropagation(); self._openItemPopup(w); });
			$container.append($el);
		});
	}

	/** Renderiza a aba de inventário geral (consumíveis, itens diversos). */
	_renderInventario(der) {
		const $container = this._$root.find("#sheet-inventory");
		const inv = [...(this._character.inventory || [])]
			.filter(it => it && !it.equipped && !it.weapon && !it.armor && !(["LA", "MA", "HA", "S"].includes(it.type)));
		$container.empty();
		if (!inv.length) { $container.append('<div class="characters__sheet-item">Inventário vazio</div>'); return; }
		const self = this;
		inv.forEach(it => {
			const qty = it.quantity ? ' <span class="characters__item-qty">x' + it.quantity + '</span>' : "";
			const $el = $(
				'<div class="characters__sheet-item characters__sheet-item--inventory" data-itemid="' + esc(it._id || it.id || "") + '">' +
				'<span class="characters__item-name">' + esc(it.name || it.id) + qty + '</span>' +
				'<button class="characters__btn characters__btn--sm characters__btn--outline" title="Editar">✎</button>' +
				'</div>'
			);
			$el.on("click", function (e) { e.stopPropagation(); self._openItemPopup(it); });
			$el.find('button[title="Editar"]').on("click", function (e) { e.stopPropagation(); self._openItemEditor({ mode: "edit", item: it, itemType: "other" }); });
			$container.append($el);
		});
	}

	/** Popup de detalhes do item (com botão Editar no topo). */
	_openItemPopup(item) {
		closeItemDetailPopup();
		const detect = (it) => it.weapon ? "weapon" : (it.armor && it.type === "S" ? "shield" : (it.armor ? "armor" : (it.type === "consumable" ? "consumable" : "other")));
		const lbl = { weapon: "Arma", armor: "Armadura", shield: "Escudo", consumable: "Consumível", other: "Outro" };
		const self = this;
		let h = '<div class="characters__detail-overlay" id="itemdetail-overlay"><div class="characters__detail">';
		h += '<div class="characters__detail-title">' + esc(item.name || item.id || "Item") + '</div>';
		h += '<div class="characters__detail-body">';
		h += '<div class="characters__detail-row"><b>Raridade:</b> <span style="color:' + (RARITY_COLORS[item.rarity] || "#999") + '">' + esc(RARITY_LABEL[item.rarity] || item.rarity || "Comum") + '</span></div>';
		h += '<div class="characters__detail-row"><b>Tipo:</b> ' + esc(lbl[detect(item)] || "Outro") + '</div>';
		if (item.weight) h += '<div class="characters__detail-row"><b>Peso:</b> ' + esc(String(item.weight)) + ' kg</div>';
		if (item.value) h += '<div class="characters__detail-row"><b>Valor:</b> ' + esc(String(item.value)) + ' gp</div>';
		if (item.attunement) h += '<div class="characters__detail-row"><b>Requer Atunhamento:</b> Sim</div>';
		if (item.dmg1) h += '<div class="characters__detail-row"><b>Dano:</b> ' + esc(item.dmg1 + (item.dmg2 ? " / " + item.dmg2 : "")) + " " + esc(item.dmgType || "") + '</div>';
		if (item.range) h += '<div class="characters__detail-row"><b>Alcance:</b> ' + esc(item.range) + '</div>';
		if (item.property && item.property.length) h += '<div class="characters__detail-row"><b>Propriedades:</b> ' + esc(item.property.map(p => PROPERTY_LABELS[p] || p).join(", ")) + '</div>';
		if (item.ac != null && item.armor) h += '<div class="characters__detail-row"><b>CA:</b> +' + esc(String(item.ac)) + '</div>';
		if (item.entries && item.entries.length) h += '<div class="characters__detail-row"><b>Descrição:</b><div style="margin-top:6px">' + esc(item.entries.join("\n")) + '</div></div>';
		h += '</div><div class="characters__detail-actions">';
		h += '<button class="characters__btn characters__btn--secondary" id="item-edit">✎ Editar</button>';
		h += '<button class="characters__btn characters__btn--secondary" id="item-close">Fechar</button>';
		h += '</div></div></div>';
		$(document.body).append(h);

		const $ov = $("#itemdetail-overlay");
		$ov.on("click", function (e) { if (e.target === this) closeItemDetailPopup(); });
		$ov.find("#item-edit").on("click", () => { closeItemDetailPopup(); self._openItemEditor({ mode: "edit", item, itemType: detect(item) }); });
		$ov.find("#item-close").on("click", closeItemDetailPopup);
	}

	closeItemDetailPopup() { $("#itemdetail-overlay").remove(); }
	closeAddItemMenu() { $("#additem-menu").remove(); }

	_openItemEditor(opts) {
		openItemEditorPopup(opts, (savedItem, itemType) => { this._saveItem(savedItem); this._refreshEquipment(); });
	}

	_saveItem(item) {
		const char = this._character;
		if (item.weapon) {
			if (!char.weapons) char.weapons = [];
			const ex = char.weapons.find(w => w._id === item._id);
			if (ex) Object.assign(ex, item); else char.weapons.push(item);
			if (!char.equipment) char.equipment = [];
			if (!char.equipment.find(w => w._id === item._id)) char.equipment.push({ ...item, equipped: false });
		} else if (item.armor || item.type === "S") {
			if (!char.equipment) char.equipment = [];
			const ex = char.equipment.find(w => w._id === item._id);
			if (ex) Object.assign(ex, item); else char.equipment.push({ ...item, equipped: false });
		} else {
			if (!char.inventory) char.inventory = [];
			const ex = char.inventory.find(w => w._id === item._id);
			if (ex) Object.assign(ex, item); else char.inventory.push(item);
		}
		CharactersStore.save(char);
	}

	_unequipItem(item) {
		const eq = this._character.equipment || [];
		const ix = eq.findIndex(it => (it._id || it.id) === (item._id || item.id));
		if (ix >= 0) eq[ix].equipped = false;
		CharactersStore.save(this._character);
		this._refreshEquipment();
	}

	_refreshEquipment() {
		const der = this._computeDerived(this._character);
		this._renderEquipado(der);
		this._renderArmas(der);
		this._renderInventario(der);
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