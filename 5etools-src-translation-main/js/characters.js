// =============================================
// Página de Fichas de Personagem - 5eTools
// =============================================
import {CharactersUi} from "./characters/characters-ui.js";

class CharactersPage {
	constructor() {
		this._ui = null;
	}

	async pInit() {
		console.log("[Characters] Inicializando...");
		try {
			const [races, backgrounds, feats, classes] = await Promise.allSettled([
				this._pLoadRaces(),
				this._pLoadBackgrounds(),
				this._pLoadFeats(),
				this._pLoadClasses(),
			]);

			console.log("[Characters] Dados:", {
				races: races.status === "fulfilled" ? races.value.length : "ERRO",
				backgrounds: backgrounds.status === "fulfilled" ? backgrounds.value.length : "ERRO",
				feats: feats.status === "fulfilled" ? feats.value.length : "ERRO",
				classes: classes.status === "fulfilled" ? classes.value.length : "ERRO",
				errors: [races, backgrounds, feats, classes].filter(r => r.status === "rejected").map(r => r.reason?.message || r.reason)
			});

			this._ui = new CharactersUi({
				$root: $(`#characters-main`),
				races: races.status === "fulfilled" ? races.value : [],
				backgrounds: backgrounds.status === "fulfilled" ? backgrounds.value : [],
				feats: feats.status === "fulfilled" ? feats.value : [],
				classes: classes.status === "fulfilled" ? classes.value : [],
			});
			await this._ui.pRender();
			console.log("[Characters] UI renderizada com sucesso!");

			window.dispatchEvent(new Event("toolsLoaded"));
			$(`#characters-main .initial-message`).remove();
		} catch (e) {
			console.error("[Characters] ERRO:", e);
			$(`#characters-main`).html(`<div class="ve-flex-vh-center w-100 h-100"><div>Erro ao carregar: ${(e?.message || "" + e).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</div></div>`);
		}
	}

	async _pLoadRaces() {
		try {
			const resp = await fetch("data/races.json");
			const json = await resp.json();
			const races = json.race || [];
			// Filtrar para raças principais do PHB e deduplicar
			const seen = new Set();
			const unique = [];
			races.forEach(r => {
				const key = r.name.toLowerCase();
				if (!seen.has(key) && (r.source === "PHB" || r.source === "MPMM")) {
					seen.add(key);
					unique.push(r);
				}
			});
			// Se não houver PHB, pega todas as únicas
			if (!unique.length) {
				races.forEach(r => {
					const key = r.name.toLowerCase();
					if (!seen.has(key)) {
						seen.add(key);
						unique.push(r);
					}
				});
			}
			return unique;
		} catch (e) {
			console.error("Erro ao carregar raças:", e);
			return [];
		}
	}

	async _pLoadBackgrounds() {
		try {
			const resp = await fetch("data/backgrounds.json");
			const json = await resp.json();
			const backgrounds = json.background || [];
			// Filtrar para PHB primário e deduplicar
			const seen = new Set();
			const unique = [];
			backgrounds.forEach(b => {
				const key = b.name.toLowerCase();
				if (!seen.has(key) && b.source === "PHB") {
					seen.add(key);
					unique.push(b);
				}
			});
			return unique.length ? unique : backgrounds;
		} catch (e) {
			console.error("Erro ao carregar antecedentes:", e);
			return [];
		}
	}

	async _pLoadFeats() {
		try {
			const resp = await fetch("data/feats.json");
			const json = await resp.json();
			return json.feat || [];
		} catch (e) {
			console.error("Erro ao carregar talentos:", e);
			return [];
		}
	}

	async _pLoadClasses() {
		try {
			const resp = await fetch("data/class/index.json");
			const classIndex = await resp.json();
			const classes = [];
			for (const [key, file] of Object.entries(classIndex)) {
				try {
					// Guard anti path-traversal: só aceita nomes de arquivo simples
					if (!/^[\w-]+\.json$/.test(file)) continue;
					const cResp = await fetch(`data/class/${file}`);
					const cJson = await cResp.json();
					if (cJson.class) classes.push(...cJson.class.filter(c => c.source === "PHB"));
				} catch (e) {
					console.warn(`Falha ao carregar classe ${key}:`, e);
				}
			}
			// Deduplicar por nome
			const seen = new Set();
			const unique = [];
			classes.forEach(c => {
				if (!seen.has(c.name.toLowerCase())) {
					seen.add(c.name.toLowerCase());
					unique.push(c);
				}
			});
			return unique;
		} catch (e) {
			console.error("Erro ao carregar classes:", e);
			return [];
		}
	}
}

const charactersPage = new CharactersPage();
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => charactersPage.pInit());
} else {
	charactersPage.pInit();
}
globalThis.dbg_charactersPage = charactersPage;
