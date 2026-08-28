// Armazenamento de fichas em localStorage
const STORAGE_KEY = "5etools_characters";

export const CharactersStore = {
	getAll() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch (e) {
			console.error("Erro ao ler fichas:", e);
			return [];
		}
	},

	getById(id) {
		return this.getAll().find(c => c.id === id) || null;
	},

	save(character) {
		const all = this.getAll();
		// Sanitiza o id: só caracteres seguros são aceitos. Se vier um id
		// malicioso (ex.: via importação de um .cah adulterado), descarta e
		// gera um novo. Isso impede injeção de atributos/HTML via data-id.
		if (character.id != null) {
			const clean = String(character.id).replace(/[^a-zA-Z0-9_-]/g, "");
			if (clean !== String(character.id)) {
				character.id = this._genId();
			}
		}
		if (character.id) {
			const ix = all.findIndex(c => c.id === character.id);
			if (ix >= 0) {
				character.updated = Date.now();
				all[ix] = character;
			} else {
				character.id = this._genId();
				character.updated = Date.now();
				all.push(character);
			}
		} else {
			character.id = this._genId();
			character.updated = Date.now();
			all.push(character);
		}
		this._write(all);
		return character;
	},

	remove(id) {
		const all = this.getAll().filter(c => c.id !== id);
		this._write(all);
	},

	_genId() {
		return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	},

	_write(all) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
		} catch (e) {
			console.error("Erro ao salvar fichas:", e);
		}
	}
};