// Classe principal da UI de Fichas
import {CharactersStore} from "./characters-store.js";
import {CharactersUiCreate} from "./characters-ui-create.js";
import {CharactersUiSheet} from "./characters-ui-sheet.js";

export class CharactersUi {
	constructor(opts) {
		this._$root = opts.$root;
		this._races = opts.races || [];
		this._backgrounds = opts.backgrounds || [];
		this._classes = opts.classes || [];
		this._currentView = "list";
	}

	async pRender() {
		this._renderList();
	}

	_renderList() {
		const chars = CharactersStore.getAll();
		const $content = $(
			'<div class="characters__view">' +
				'<div class="characters__list-header">' +
					'<h2 class="characters__list-title">Suas Fichas</h2>' +
					'<button class="characters__btn characters__btn--primary" id="char-btn-new">+ Nova Ficha</button>' +
				'</div>' +
				'<div id="char-list"></div>' +
			'</div>'
		);

		$content.find("#char-btn-new").on("click", () => this._startCreation());
		this._$root.empty().append($content);

		const $list = $content.find("#char-list");

		if (!chars.length) {
			$list.html(
				'<div class="characters__empty">' +
					'<div class="characters__empty-icon"><span class="glyphicon glyphicon-user"></span></div>' +
					'<div class="characters__empty-title">Nenhuma ficha criada</div>' +
					'<div class="characters__empty-text">Crie seu primeiro personagem de D&D 5e!</div>' +
					'<button class="characters__btn characters__btn--primary characters__btn-full" id="char-btn-new-empty">+ Criar Personagem</button>' +
				'</div>'
			);
			$list.find("#char-btn-new-empty").on("click", () => this._startCreation());
			return;
		}

		const $grid = $('<div class="characters__grid"></div>');
		chars.forEach(char => {
			const $card = $(
				'<div class="characters__card" data-id="' + this._esc(char.id) + '">' +
					'<div class="characters__card-name">' + this._esc(char.name || "Sem nome") + '</div>' +
					'<div class="characters__card-info">' + this._esc(char.className || "—") + ' • Nível ' + (char.level || 1) + '</div>' +
					'<div class="characters__card-info">' + this._esc(char.race ? char.race.name : "—") + ' • ' + this._esc(char.background || "—") + '</div>' +
					'<span class="characters__card-level">Nv. ' + (char.level || 1) + '</span>' +
					'<div class="characters__card-actions">' +
						'<button class="characters__btn characters__btn--primary" data-action="open">Abrir</button>' +
						'<button class="characters__btn characters__btn--danger" data-action="delete">Excluir</button>' +
					'</div>' +
				'</div>'
			);

			$card.on("click", (e) => {
				const action = $(e.target).data("action");
				if (action === "open") this._openCharacter(char.id);
				else if (action === "delete") this._deleteCharacter(char.id);
				else this._openCharacter(char.id);
			});

			$grid.append($card);
		});

		$list.append($grid);
	}

	_startCreation() {
		this._currentView = "create";
		const createUi = new CharactersUiCreate({
			$root: this._$root,
			races: this._races,
			backgrounds: this._backgrounds,
			classes: this._classes,
			pOnDone: () => {
				this._currentView = "list";
				this._renderList();
			},
			pOnCancel: () => {
				this._currentView = "list";
				this._renderList();
			},
		});
		createUi.pRender();
	}

	_openCharacter(id) {
		const char = CharactersStore.getById(id);
		if (!char) return;
		this._currentView = "sheet";
		const sheetUi = new CharactersUiSheet({
			$root: this._$root,
			character: char,
			pOnBack: () => {
				this._currentView = "list";
				this._renderList();
			},
		});
		sheetUi.pRender();
	}

	_deleteCharacter(id) {
		if (!confirm("Excluir esta ficha?")) return;
		CharactersStore.remove(id);
		this._renderList();
	}

	_esc(str) {
		if (!str) return "";
		const map = {
			"&": "\x26amp;",
			"<": "\x3clt;",
			">": "\x3egt;",
			'"': "\x22quot;",
			"'": "\x27039;",
		};
		return String(str).replace(/[&<>"']/g, m => map[m]);
	}
}
