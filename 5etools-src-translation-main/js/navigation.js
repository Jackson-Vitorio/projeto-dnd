"use strict";

class NavBar {
	static init () {
		this._initInstallPrompt();
		// render the visible elements ASAP
		window.addEventListener("DOMContentLoaded", NavBar._onDomContentLoaded);
		window.addEventListener("load", NavBar._onLoad);
	}

	static _onDomContentLoaded () {
		NavBar._initElements();
		NavBar.highlightCurrentPage();
	}

	static _onLoad () {
		NavBar._dropdowns = [...NavBar._navbar.querySelectorAll(`li.dropdown--navbar`)];
		document.addEventListener("click", () => NavBar._closeAllDropdowns());

		NavBar._clearAllTimers();

		NavBar._initAdventureBookElements().then(null);
	}

	static _initInstallPrompt () {
		NavBar._cachedInstallEvent = null;
		window.addEventListener("beforeinstallprompt", e => NavBar._cachedInstallEvent = e);
	}

	static _initElements () {
		NavBar._navbar = document.getElementById("navbar");
		NavBar._tree = new NavBar.Node({
			body: NavBar._navbar,
		});

		// create mobile "Menu" button
		const btnShowHide = document.createElement("button");
		btnShowHide.className = "ve-btn ve-btn-default page__btn-toggle-nav";
		btnShowHide.innerHTML = "Menu";
		btnShowHide.onclick = () => {
			$(btnShowHide).toggleClass("active");
			$(`.page__nav-hidden-mobile`).toggleClass("block", $(btnShowHide).hasClass("active"));
		};
		document.getElementById("navigation").prepend(btnShowHide);

		this._addElement_li(null, "index.html", "Início", {isRoot: true});

		this._addElement_dropdown(null, NavBar._CAT_RULES);
		this._addElement_li(NavBar._CAT_RULES, "variantrules.html", "Glossário de Regras");
		this._addElement_li(NavBar._CAT_RULES, "tables.html", "Tabelas");
		this._addElement_divider(NavBar._CAT_RULES);
		this._addElement_dropdown(NavBar._CAT_RULES, NavBar._CAT_BOOKS, {isSide: true, page: "books.html"});
		this._addElement_li(NavBar._CAT_BOOKS, "books.html", "Ver Todos/Homebrew");
		this._addElement_divider(NavBar._CAT_RULES);
		this._addElement_li(NavBar._CAT_RULES, "quickreference.html", "Referência Rápida (2014)");

		this._addElement_dropdown(null, NavBar._CAT_PLAYER);
		this._addElement_li(NavBar._CAT_PLAYER, "classes.html", "Classes");
		this._addElement_li(NavBar._CAT_PLAYER, "backgrounds.html", "Antecedentes");
		this._addElement_li(NavBar._CAT_PLAYER, "feats.html", "Talentos");
		this._addElement_li(NavBar._CAT_PLAYER, "races.html", "Espécies");
		this._addElement_li(NavBar._CAT_PLAYER, "charcreationoptions.html", "Outras Opções de Criação de Personagem");
		this._addElement_li(NavBar._CAT_PLAYER, "optionalfeatures.html", "Outras Opções & Recursos");
		this._addElement_divider(NavBar._CAT_PLAYER);
		this._addElement_li(NavBar._CAT_PLAYER, "statgen.html", "Gerador de Atributos");
		this._addElement_divider(NavBar._CAT_PLAYER);
		this._addElement_li(NavBar._CAT_PLAYER, "lifegen.html", "Isto é a Sua Vida");
		this._addElement_li(NavBar._CAT_PLAYER, "names.html", "Nomes");

		this._addElement_dropdown(null, NavBar._CAT_DUNGEON_MASTER);
		this._addElement_li(NavBar._CAT_DUNGEON_MASTER, "dmscreen.html", "Tela do Mestre");
		this._addElement_divider(NavBar._CAT_DUNGEON_MASTER);
		this._addElement_dropdown(NavBar._CAT_DUNGEON_MASTER, NavBar._CAT_ADVENTURES, {isSide: true, page: "adventures.html"});
		this._addElement_li(NavBar._CAT_ADVENTURES, "adventures.html", "Ver Todas/Homebrew");
		this._addElement_li(NavBar._CAT_DUNGEON_MASTER, "cultsboons.html", "Cultos & Bênçãos Sobrenaturais");
		this._addElement_li(NavBar._CAT_DUNGEON_MASTER, "objects.html", "Objetos");
		this._addElement_li(NavBar._CAT_DUNGEON_MASTER, "trapshazards.html", "Armadilhas & Perigos");
		this._addElement_divider(NavBar._CAT_DUNGEON_MASTER);
		this._addElement_li(NavBar._CAT_DUNGEON_MASTER, "crcalculator.html", "Calculadora de CR (2014)");
		this._addElement_li(NavBar._CAT_DUNGEON_MASTER, "encountergen.html", "Gerador de Encontros");
		this._addElement_li(NavBar._CAT_DUNGEON_MASTER, "lootgen.html", "Gerador de Tesouros");
		this._addElement_divider(NavBar._CAT_DUNGEON_MASTER);
		this._addElement_li(NavBar._CAT_DUNGEON_MASTER, "maps.html", "Mapas");

		this._addElement_dropdown(null, NavBar._CAT_REFERENCES);
		this._addElement_li(NavBar._CAT_REFERENCES, "actions.html", "Ações");
		this._addElement_li(NavBar._CAT_REFERENCES, "bastions.html", "Bastiões");
		this._addElement_li(NavBar._CAT_REFERENCES, "bestiary.html", "Bestiário");
		this._addElement_li(NavBar._CAT_REFERENCES, "conditionsdiseases.html", "Condições & Doenças");
		this._addElement_li(NavBar._CAT_REFERENCES, "decks.html", "Baralhos");
		this._addElement_li(NavBar._CAT_REFERENCES, "deities.html", "Divindades");
		this._addElement_li(NavBar._CAT_REFERENCES, "items.html", "Itens");
		this._addElement_li(NavBar._CAT_REFERENCES, "languages.html", "Idiomas");
		this._addElement_li(NavBar._CAT_REFERENCES, "rewards.html", "Dons & Recompensas Sobrenaturais");
		this._addElement_li(NavBar._CAT_REFERENCES, "psionics.html", "Psíônicos");
		this._addElement_li(NavBar._CAT_REFERENCES, "spells.html", "Magias");
		this._addElement_li(NavBar._CAT_REFERENCES, "vehicles.html", "Véículos");
		this._addElement_divider(NavBar._CAT_REFERENCES);
		this._addElement_li(NavBar._CAT_REFERENCES, "recipes.html", "Receitas");

		this._addElement_dropdown(null, NavBar._CAT_UTILITIES);
		this._addElement_li(NavBar._CAT_UTILITIES, "search.html", "Buscar");
		this._addElement_divider(NavBar._CAT_UTILITIES);
		this._addElement_li(NavBar._CAT_UTILITIES, "blocklist.html", "Lista de Bloqueio de Conteúdo");
		this._addElement_li(NavBar._CAT_UTILITIES, "manageprerelease.html", "Gerenciador de Conteúdo de Pré-Lançamento");
		this._addElement_li(NavBar._CAT_UTILITIES, "managebrew.html", "Gerenciador de Homebrew");
		this._addElement_buttonSplit(
			NavBar._CAT_UTILITIES,
			{
				metas: [
					{
						html: "Carregar Todo o Conteúdo de Parceiros",
						click: async evt => {
							evt.stopPropagation();
							evt.preventDefault();
							const {ManageBrewUi} = await import("./utils-brew/utils-brew-ui-manage.js");
							await ManageBrewUi.pOnClickBtnLoadAllPartnered();
						},
					},
					{
						html: `<span class="glyphicon glyphicon-link"></span>`,
						title: `Exportar Lista de Pré-Lançamento/Homebrew como URL`,
						click: async evt => {
							evt.stopPropagation();
							evt.preventDefault();
							const ele = evt.currentTarget;
							const {ManageBrewUi} = await import("./utils-brew/utils-brew-ui-manage.js");
							await ManageBrewUi.pOnClickBtnExportListAsUrl({ele});
						},
					},
				],
			},
		);
		this._addElement_divider(NavBar._CAT_UTILITIES);
		this._addElement_li(NavBar._CAT_UTILITIES, "inittrackerplayerview.html", "Visão do Jogador do Rastreador de Iniciativa");
		this._addElement_divider(NavBar._CAT_UTILITIES);
		this._addElement_li(NavBar._CAT_UTILITIES, "renderdemo.html", "Demonstração do Renderizador");
		this._addElement_li(NavBar._CAT_UTILITIES, "makebrew.html", "Construtor de Homebrew");
		this._addElement_li(NavBar._CAT_UTILITIES, "makecards.html", "Construtor de Cartas RPG (JSON)");
		this._addElement_li(NavBar._CAT_UTILITIES, "converter.html", "Conversor de Texto");
		this._addElement_divider(NavBar._CAT_UTILITIES);
		this._addElement_li(NavBar._CAT_UTILITIES, "plutonium.html", "Recursos do Plutonium (Módulo Foundry)");
		this._addElement_divider(NavBar._CAT_UTILITIES);
		this._addElement_li(NavBar._CAT_UTILITIES, "https://wiki.tercept.net/en/betteR20", "Ajuda do Script Roll20", {isExternal: true});
		this._addElement_divider(NavBar._CAT_UTILITIES);
		this._addElement_li(NavBar._CAT_UTILITIES, "changelog.html", "Registro de Alterações");
		this._addElement_li(NavBar._CAT_UTILITIES, NavBar._getCurrentWikiHelpPage(), "Ajuda", {isExternal: true});
		this._addElement_divider(NavBar._CAT_UTILITIES);
		this._addElement_li(NavBar._CAT_UTILITIES, "privacy-policy.html", "Política de Privacidade");

		this._addElement_dropdown(null, NavBar._CAT_SETTINGS);
		this._addElement_button(
			NavBar._CAT_SETTINGS,
			{
				html: "Preferências",
				click: () => {
					ConfigUi.show();
					NavBar._closeAllDropdowns();
				},
			},
		);
		this._addElement_divider(NavBar._CAT_SETTINGS);
		this._addElement_button(
			NavBar._CAT_SETTINGS,
			{
				html: "Salvar Estado em Arquivo",
				click: async (evt) => NavBar.InteractionManager._pOnClick_button_saveStateFile(evt),
				title: "Salva quaisquer dados armazenados localmente (homebrew carregado, blocklists ativos, configuração da Tela do Mestre...) em um arquivo.",
			},
		);
		this._addElement_button(
			NavBar._CAT_SETTINGS,
			{
				html: "Carregar Estado de Arquivo",
				click: async (evt) => NavBar.InteractionManager._pOnClick_button_loadStateFile(evt),
				title: "Carrega dados salvos anteriormente (homebrew carregado, blocklists ativos, configuração da Tela do Mestre...) de um arquivo.",
			},
		);
		this._addElement_divider(NavBar._CAT_SETTINGS);
		this._addElement_button(
			NavBar._CAT_SETTINGS,
			{
				html: "Adicionar como App",
				click: async (evt) => NavBar.InteractionManager._pOnClick_button_addApp(evt),
				title: "Adiciona o site à sua tela inicial. Quando usado em conjunto com a opção Pré-Carregar Dados Offline, isso pode criar uma cópia offline funcional do site.",
			},
		);
		this._addElement_dropdown(NavBar._CAT_SETTINGS, NavBar._CAT_CACHE, {isSide: true});
		this._addElement_label(NavBar._CAT_CACHE, `<p>Pré-carregue dados para uso offline.</p><p>Note que visitar uma página carregará automaticamente os dados dela.</p><p>Note que dados já pré-carregados não serão sobrescritos, a menos que estejam desatualizados.</p>`);
		this._addElement_button(
			NavBar._CAT_CACHE,
			{
				html: "Pré-carregar Texto de Aventura <small>(50MB+)</small>",
				click: (evt) => NavBar.InteractionManager._pOnClick_button_preloadOffline(evt, {route: /data\/adventure/}),
				title: "Pré-carrega texto de aventuras para uso offline.",
			},
		);
		this._addElement_button(
			NavBar._CAT_CACHE,
			{
				html: "Pré-carregar Imagens de Livros <small>(1GB+)</small>",
				click: (evt) => NavBar.InteractionManager._pOnClick_button_preloadOffline(evt, {route: /img\/book/, isRequireImages: true}),
				title: "Pré-carrega imagens de livros para uso offline. Note que o texto dos livros é pré-carregado automaticamente.",
			},
		);
		this._addElement_button(
			NavBar._CAT_CACHE,
			{
				html: "Pré-carregar Texto e Imagens de Aventura <small>(2GB+)</small>",
				click: (evt) => NavBar.InteractionManager._pOnClick_button_preloadOffline(evt, {route: /(?:data|img)\/adventure/, isRequireImages: true}),
				title: "Pré-carrega texto e imagens de aventuras para uso offline.",
			},
		);
		this._addElement_button(
			NavBar._CAT_CACHE,
			{
				html: "Pré-carregar Todas as Imagens <small>(4GB+)</small>",
				click: (evt) => NavBar.InteractionManager._pOnClick_button_preloadOffline(evt, {route: /img/, isRequireImages: true}),
				title: "Pré-carrega todas as imagens para uso offline.",
			},
		);
		this._addElement_button(
			NavBar._CAT_CACHE,
			{
				html: "Pré-carregar Tudo <small>(5GB+)</small>",
				click: (evt) => NavBar.InteractionManager._pOnClick_button_preloadOffline(evt, {route: /./, isRequireImages: true}),
				title: "Pré-carrega tudo para uso offline.",
			},
		);
		this._addElement_divider(NavBar._CAT_CACHE);
		this._addElement_button(
			NavBar._CAT_CACHE,
			{
				html: "Redefinir Dados Pré-carregados",
				click: (evt) => NavBar.InteractionManager._pOnClick_button_clearOffline(evt),
				title: "Remove todos os dados pré-carregados e limpa os caches.",
			},
		);
	}

	static _getNode (category) {
		if (category == null) return NavBar._tree;

		const _getNodeInner = (level) => {
			for (const [k, v] of Object.entries(level)) {
				if (k === category) return v;

				const subNode = _getNodeInner(v.children);
				if (subNode) return subNode;
			}
		};

		return _getNodeInner(NavBar._tree.children);
	}

	/**
	 * Adventure/book elements are added as a second, asynchronous, step, as they require loading of:
	 * - An index JSON file.
	 * - The user's Blocklist.
	 */
	static async _initAdventureBookElements () {
		await Promise.all([
			PrereleaseUtil.pInit(),
			BrewUtil2.pInit(),
		]);
		const [adventureBookIndex] = await Promise.all([
			DataUtil.loadJSON(`${Renderer.get().baseUrl}data/generated/gendata-nav-adventure-book-index.json`),
			ExcludeUtil.pInitialise(),
		]);
		const [prerelease, brew] = await Promise.all([
			PrereleaseUtil.pGetBrewProcessed(),
			BrewUtil2.pGetBrewProcessed(),
		]);

		[
			{
				prop: "book",
				parentCategory: NavBar._CAT_BOOKS,
				page: "book.html",
				fnSort: SortUtil.ascSortBook.bind(SortUtil),
			},
			{
				prop: "adventure",
				page: "adventure.html",
				parentCategory: NavBar._CAT_ADVENTURES,
				fnSort: SortUtil.ascSortAdventure.bind(SortUtil),
			},
		].forEach(({prop, parentCategory, page, fnSort}) => {
			const fromPrerelease = MiscUtil.copyFast(prerelease?.[prop] || []);
			const fromBrew = MiscUtil.copyFast(brew?.[prop] || []);

			const mutParentName = (it) => {
				if (it.parentSource) it.parentName = Parser.sourceJsonToFull(it.parentSource);
			};

			fromPrerelease.forEach(mutParentName);
			fromBrew.forEach(mutParentName);

			const metas = [...adventureBookIndex[prop], ...fromPrerelease, ...fromBrew]
				.filter(it => !ExcludeUtil.isExcluded(UrlUtil.encodeForHash(it.id), prop, it.source, {isNoCount: true}));

			if (!metas.length) return;

			SourceUtil.ADV_BOOK_GROUPS
				.forEach(({group, displayName}) => {
					const inGroup = metas.filter(it => (it.group || "other") === group);
					if (!inGroup.length) return;

					this._addElement_divider(parentCategory);
					this._addElement_label(parentCategory, displayName, {isAddDateSpacer: true});

					const seenYears = new Set();

					inGroup
						.sort(fnSort)
						.forEach(indexMeta => {
							const year = indexMeta.published ? (new Date(indexMeta.published).getFullYear()) : null;
							const isNewYear = year != null && !seenYears.has(year);
							if (year != null) seenYears.add(year);

							if (indexMeta.parentSource) {
								if (!this._getNode(indexMeta.parentName)) {
									this._addElement_accordion(
										parentCategory,
										indexMeta.parentName,
										{
											date: isNewYear ? year : null,
											source: indexMeta.parentSource,
											isAddDateSpacer: !isNewYear,
										},
									);
								}

								let cleanName = indexMeta.name.startsWith(indexMeta.parentName)
									? indexMeta.name.slice(indexMeta.parentName.length).replace(/^:\s+/, "")
									: indexMeta.name;
								this._addElement_li(
									indexMeta.parentName,
									page,
									cleanName,
									{
										aHash: indexMeta.id,
										isAddDateSpacer: true,
										isSide: true,
										isInAccordion: true,
									},
								);

								return;
							}

							this._addElement_li(
								parentCategory,
								page,
								indexMeta.name,
								{
									aHash: indexMeta.id,
									date: isNewYear ? year : null,
									isAddDateSpacer: !isNewYear,
									source: indexMeta.source,
									isSide: true,
								},
							);
						});
				});
		});

		NavBar.highlightCurrentPage();
	}

	/**
	 * Adds a new item to the navigation bar. Can be used either in root, or in a different UL.
	 * @param parentCategory - Element to append this link to.
	 * @param page - Where does this link to.
	 * @param aText - What text does this link have.
	 * @param [opts] - Options object.
	 * @param [opts.isSide] - True if this item is part of a side menu.
	 * @param [opts.aHash] - Optional hash to be appended to the base href
	 * @param [opts.isRoot] - If the item is a root navbar element.
	 * @param [opts.isExternal] - If the item is an external link.
	 * @param [opts.date] - A date to prefix the list item with.
	 * @param [opts.isAddDateSpacer] - True if this item has no date, but is in a list of items with dates.
	 * @param [opts.source] - A source associated with this item, which should be displayed as a colored marker.
	 * @param [opts.isInAccordion] - True if this item is inside an accordion.
	 *        FIXME(Future) this is a bodge; refactor the navbar CSS to avoid using Bootstrap.
	 */
	static _addElement_li (parentCategory, page, aText, opts) {
		opts = opts || {};

		const parentNode = this._getNode(parentCategory);

		const hashPart = opts.aHash ? `#${opts.aHash}`.toLowerCase() : "";
		const href = `${page}${hashPart}`;

		const li = document.createElement("li");
		li.setAttribute("role", "presentation");
		li.setAttribute("data-page", href);
		if (opts.isRoot) {
			li.classList.add("page__nav-hidden-mobile");
			li.classList.add("page__btn-nav-root");
		}
		if (opts.isSide) {
			li.onmouseenter = function () { NavBar._handleSideItemMouseEnter(this); };
		} else {
			li.onmouseenter = function () { NavBar._handleItemMouseEnter(this); };
			li.onclick = function () { NavBar._dropdowns.forEach(ele => NavBar._closeDropdownElement(ele)); };
		}

		const a = document.createElement("a");
		a.href = href;
		a.innerHTML = `${this._addElement_getDatePrefix({date: opts.date, isAddDateSpacer: opts.isAddDateSpacer})}${this._addElement_getSourcePrefix({source: opts.source})}${aText}${this._addElement_getSourceSuffix({source: opts.source})}`;
		a.classList.add("nav__link");
		if (opts.isInAccordion) a.classList.add(`nav2-accord__lnk-item`, `inline-block`, `w-100`);

		if (opts.isExternal) {
			a.setAttribute("target", "_blank");
			a.classList.add("inline-split-v-center");
			a.classList.add("w-100");
			a.innerHTML = `<span>${aText}</span><span class="glyphicon glyphicon-new-window"></span>`;
		}

		li.appendChild(a);
		parentNode.body.appendChild(li);

		parentNode.children[href] = new NavBar.NodeLink({
			parent: parentNode,
			head: li,
			isInAccordion: opts.isInAccordion,
			lnk: a,
		});
	}

	static _addElement_accordion (
		parentCategory,
		category,
		{
			date = null,
			isAddDateSpacer = false,
			source = null,
		} = {},
	) {
		const parentNode = this._getNode(parentCategory);

		const li = document.createElement("li");
		li.className = "nav2-accord__wrp";
		li.onmouseenter = function () { NavBar._handleItemMouseEnter(this); };

		// region Header button
		const wrpHead = document.createElement("div");
		wrpHead.className = "nav2-accord__head split-v-center clickable";
		wrpHead.onclick = evt => {
			evt.stopPropagation();
			evt.preventDefault();
			node.isExpanded = !node.isExpanded;
		};

		const dispText = document.createElement("div");
		dispText.innerHTML = `${this._addElement_getDatePrefix({date, isAddDateSpacer})}${this._addElement_getSourcePrefix({source})}${category}`;

		const dispToggle = document.createElement("div");
		dispToggle.textContent = NavBar.NodeAccordion.getDispToggleDisplayHtml(false);

		wrpHead.appendChild(dispText);
		wrpHead.appendChild(dispToggle);
		// endregion

		// region Body list
		const wrpBody = document.createElement("div");
		wrpBody.className = `nav2-accord__body ve-hidden`;
		wrpBody.onclick = function (event) { event.stopPropagation(); };
		// endregion

		li.appendChild(wrpHead);
		li.appendChild(wrpBody);
		parentNode.body.appendChild(li);

		const node = new NavBar.NodeAccordion({
			parent: parentNode,
			head: wrpHead,
			body: wrpBody,
			dispToggle,
		});
		parentNode.children[category] = node;
	}

	static _addElement_getDatePrefix ({date, isAddDateSpacer}) { return `${(date != null || isAddDateSpacer) ? `<div class="ve-small mr-2 page__nav-date inline-block ve-text-right inline-block" aria-hidden="true">${date || ""}</div>` : ""}`; }
	static _addElement_getSourcePrefix ({source}) { return `${source != null ? `<div class="nav2-list__disp-source ${Parser.sourceJsonToSourceClassname(source)}" ${Parser.sourceJsonToStyle(source)}></div>` : ""}`; }

	static _addElement_getSourceSuffix ({source}) {
		if (source == null) return "";
		return Parser.sourceJsonToMarkerHtml(source, {isList: false, additionalStyles: "ml-1 nav2-list__disp-legacy-marker"});
	}

	static _addElement_divider (parentCategory) {
		const parentNode = this._getNode(parentCategory);

		const li = document.createElement("li");
		li.setAttribute("role", "presentation");
		li.className = "ve-dropdown-divider";

		parentNode.body.appendChild(li);
	}

	static _addElement_label (parentCategory, html, {date, isAddDateSpacer} = {}) {
		const parentNode = this._getNode(parentCategory);

		const li = document.createElement("li");
		li.setAttribute("role", "presentation");
		li.className = "italic ve-muted ve-small nav2-list__label";
		li.innerHTML = `${this._addElement_getDatePrefix({date, isAddDateSpacer})}${html}`;

		parentNode.body.appendChild(li);
	}

	/**
	 * Adds a new dropdown starting list to the navigation bar
	 * @param {String} parentCategory - Element to append this link to.
	 * @param {String} category - Dropdown text.
	 * @param {boolean} [isSide=false] - If this is a sideways dropdown.
	 * @param {String} [page=null] - The page this dropdown is associated with.
	 */
	static _addElement_dropdown (parentCategory, category, {isSide = false, page = null} = {}) {
		const parentNode = this._getNode(parentCategory);

		const li = document.createElement("li");
		li.setAttribute("role", "presentation");
		li.className = `dropdown dropdown--navbar page__nav-hidden-mobile ${isSide ? "" : "page__btn-nav-root"}`;
		if (isSide) {
			li.onmouseenter = function () { NavBar._handleSideItemMouseEnter(this); };
		} else {
			li.onmouseenter = function () { NavBar._handleItemMouseEnter(this); };
		}

		const a = document.createElement("a");
		a.className = "ve-dropdown-toggle";
		a.href = "#";
		a.setAttribute("role", "button");
		a.setAttribute("aria-haspopup", "true");
		a.onclick = function (event) { NavBar._handleDropdownClick(this, event, isSide); };
		if (isSide) {
			a.onmouseenter = function () { NavBar._handleSideDropdownMouseEnter(this); };
			a.onmouseleave = function () { NavBar._handleSideDropdownMouseLeave(this); };
			a
				.addEventListener("keydown", evt => {
					if (evt.key !== "Enter") return;

					if (NavBar._isDropdownOpen(a)) NavBar._closeDropdown(a);
					else NavBar._openDropdown(a);
				});

			a.setAttribute("aria-haspopup", "true");
		}
		a.innerHTML = `${category} <span class="caret ${isSide ? "caret--right" : ""}"></span>`;

		const ul = document.createElement("ul");
		ul.setAttribute("role", "menu");
		ul.className = `ve-dropdown-menu ${isSide ? "ve-dropdown-menu--side" : "ve-dropdown-menu--top"}`;
		ul.onclick = function (event) { event.stopPropagation(); };

		li.appendChild(a);
		li.appendChild(ul);
		parentNode.body.appendChild(li);

		parentNode.children[category] = new NavBar.Node({
			parent: parentNode,
			head: li,
			body: ul,
		});
	}

	/**
	 * Special LI for button
	 * @param parentCategory The element to append to.
	 * @param options Options.
	 * @param options.html Button text.
	 * @param options.click Button click handler.
	 * @param [options.context] Button context menu handler.
	 * @param options.title Button title.
	 * @param options.className Additional button classes.
	 */
	static _addElement_button (parentCategory, options) {
		const parentNode = this._getNode(parentCategory);

		const li = document.createElement("li");
		li.setAttribute("role", "presentation");

		const eleSpan = document.createElement("span");
		if (options.className) eleSpan.className = options.className;
		eleSpan.onclick = options.click;
		eleSpan.innerHTML = options.html;

		if (options.context) eleSpan.oncontextmenu = options.context;

		if (options.title) li.setAttribute("title", options.title);

		li.appendChild(eleSpan);
		parentNode.body.appendChild(li);
	}

	/**
	 * Special LI for button
	 * @param parentCategory The element to append to.
	 * @param options Options.
	 * @param options.html
	 * @param options.metas
	 */
	static _addElement_buttonSplit (parentCategory, options) {
		const parentNode = this._getNode(parentCategory);

		const li = document.createElement("li");
		li.setAttribute("role", "presentation");
		li.className = "ve-flex-v-center";

		options.metas
			.forEach(({className, click, html, title}, i) => {
				const eleSpan = document.createElement("span");

				eleSpan.className = [
					className,
					"inline-block",
					i ? null : "w-100 min-w-0",
				]
					.filter(Boolean)
					.join(" ");

				eleSpan.onclick = click;
				eleSpan.innerHTML = html;

				if (title) eleSpan.setAttribute("title", title);

				li.appendChild(eleSpan);
			});

		parentNode.body.appendChild(li);
	}

	static _getCurrentPage () {
		let currentPage = window.location.pathname;
		currentPage = currentPage.substr(currentPage.lastIndexOf("/") + 1);

		if (!currentPage) currentPage = "index.html";
		return currentPage.trim();
	}

	static _getCurrentWikiHelpPage () {
		const slug = NavBar._getCurrentPage().replace(/.html$/i, "");
		return `https://wiki.tercept.net/en/5eTools/HelpPages/${slug === "index" ? "" : slug}`;
	}

	static highlightCurrentPage () {
		let currentPage = NavBar._getCurrentPage();
		let hash = "";

		if (typeof _SEO_PAGE !== "undefined") currentPage = `${_SEO_PAGE}.html`;
		else if (currentPage.toLowerCase() === "book.html" || currentPage.toLowerCase() === "adventure.html") {
			hash = window.location.hash.split(",")[0].toLowerCase();
		}

		const href = `${currentPage}${hash}`;

		this._doRemoveAllPageHighlights();
		const node = this._getNode(href);
		if (!node) {
			if (NavBar._ALT_CHILD_PAGES[currentPage]) {
				const nodeFallback = this._getNode(NavBar._ALT_CHILD_PAGES[currentPage]);
				nodeFallback.isActive = true;
			}
			return;
		}

		node.isActive = true;
	}

	static _doRemoveAllPageHighlights () {
		const _doRemoveAllPageHighlightsInner = (level) => {
			for (const node of Object.values(level)) {
				node.isActive = false;
				if (node.children) _doRemoveAllPageHighlightsInner(node.children);
			}
		};

		_doRemoveAllPageHighlightsInner(NavBar._tree.children);
	}

	static _handleDropdownClick (ele, event, isSide) {
		event.preventDefault();
		event.stopPropagation();
		if (isSide) return;
		const isOpen = this._isDropdownOpen(ele);
		if (isOpen) NavBar._dropdowns.forEach(ele => NavBar._closeDropdownElement(ele));
		else NavBar._openDropdown(ele);
	}

	/* -------------------------------------------- */

	static _isDropdownOpen (ele) {
		return ele.parentNode.classList.contains("open");
	}

	/* -------------------------------------------- */

	static _closeDropdown (ele) {
		this._closeDropdownElement(ele.parentNode);
	}

	static _closeDropdownElement (ele) {
		ele.classList.remove("open");
		ele.firstChild.setAttribute("aria-expanded", "false");
	}

	static _closeAllDropdowns () {
		NavBar._dropdowns.forEach(ele => NavBar._closeDropdownElement(ele));
	}

	/* -------------------------------------------- */

	static _openDropdown (ele) {
		const lisOpen = [];

		let parent = ele.parentNode;
		NavBar._openDropdownElement(parent);
		lisOpen.push(parent);

		do {
			parent = parent.parentNode;
			if (parent.nodeName === "LI") {
				NavBar._openDropdownElement(parent);
				lisOpen.push(parent);
			}
		} while (parent.nodeName !== "NAV");

		NavBar._dropdowns.filter(ele => !lisOpen.includes(ele)).forEach(ele => NavBar._closeDropdownElement(ele));

		this._openDropdown_mutAlignment({liNavbar: lisOpen.slice(-1)[0]});
	}

	static _openDropdownElement (ele) {
		ele.classList.add("open");
		ele.firstChild.setAttribute("aria-expanded", "true");
	}

	/**
	 * If a dropdown
	 * @param liNavbar
	 * @private
	 */
	static _openDropdown_mutAlignment ({liNavbar}) {
		const uls = [...liNavbar.querySelectorAll("ul.ve-dropdown-menu")];
		const widthRequired = window.innerWidth < 1200
			? Math.max(...uls.map(ul => ul.getBoundingClientRect().width))
			: uls.map(ul => ul.getBoundingClientRect().width).reduce((a, b) => a + b, 0);

		const isForceRightAlign = liNavbar.getBoundingClientRect().left >= (window.innerWidth - widthRequired);

		uls.forEach(ul => {
			ul.style.left = isForceRightAlign ? `${-Math.round(ul.getBoundingClientRect().width) + ul.parentNode.getBoundingClientRect().width}px` : "";
		});
	}

	/* -------------------------------------------- */

	static _handleItemMouseEnter (ele) {
		const $ele = $(ele);
		const timerIds = $ele.siblings("[data-timer-id]").map((i, e) => ({$ele: $(e), timerId: $(e).data("timer-id")})).get();
		timerIds.forEach(({$ele, timerId}) => {
			if (NavBar._timersOpen[timerId]) {
				clearTimeout(NavBar._timersOpen[timerId]);
				delete NavBar._timersOpen[timerId];
			}

			if (!NavBar._timersClose[timerId] && $ele.hasClass("open")) {
				const getTimeoutFn = () => {
					if (NavBar._timerMousePos[timerId]) {
						const [xStart, yStart] = NavBar._timerMousePos[timerId];
						// for generalised use, this should be made check against the bounding box for the side menu
						// and possibly also check Y pos; e.g.
						// || EventUtil._mouseY > yStart + NavBar._MIN_MOVE_PX
						if (EventUtil._mouseX > xStart + NavBar._MIN_MOVE_PX) {
							NavBar._timerMousePos[timerId] = [EventUtil._mouseX, EventUtil._mouseY];
							NavBar._timersClose[timerId] = setTimeout(() => getTimeoutFn(), NavBar._DROP_TIME / 2);
						} else {
							NavBar._closeDropdownElement($ele[0]);
							delete NavBar._timersClose[timerId];
						}
					} else {
						NavBar._closeDropdownElement($ele[0]);
						delete NavBar._timersClose[timerId];
					}
				};

				NavBar._timersClose[timerId] = setTimeout(() => getTimeoutFn(), NavBar._DROP_TIME);
			}
		});
	}

	static _handleSideItemMouseEnter (ele) {
		const timerId = $(ele).closest(`li.dropdown`).data("timer-id");
		if (NavBar._timersClose[timerId]) {
			clearTimeout(NavBar._timersClose[timerId]);
			delete NavBar._timersClose[timerId];
			delete NavBar._timerMousePos[timerId];
		}
	}

	static _handleSideDropdownMouseEnter (ele) {
		const $ele = $(ele);
		const timerId = $ele.parent().data("timer-id") || NavBar._timerId++;
		$ele.parent().attr("data-timer-id", timerId);

		if (NavBar._timersClose[timerId]) {
			clearTimeout(NavBar._timersClose[timerId]);
			delete NavBar._timersClose[timerId];
		}

		if (!NavBar._timersOpen[timerId]) {
			NavBar._timersOpen[timerId] = setTimeout(() => {
				NavBar._openDropdown(ele);
				delete NavBar._timersOpen[timerId];
				NavBar._timerMousePos[timerId] = [EventUtil._mouseX, EventUtil._mouseY];
			}, NavBar._DROP_TIME);
		}
	}

	static _handleSideDropdownMouseLeave (ele) {
		const $ele = $(ele);
		if (!$ele.parent().data("timer-id")) return;
		const timerId = $ele.parent().data("timer-id");
		clearTimeout(NavBar._timersOpen[timerId]);
		delete NavBar._timersOpen[timerId];
	}

	static _clearAllTimers () {
		Object.entries(NavBar._timersOpen).forEach(([k, v]) => {
			clearTimeout(v);
			delete NavBar._timersOpen[k];
		});
	}
}
NavBar._DROP_TIME = 250;
NavBar._MIN_MOVE_PX = 3;
NavBar._ALT_CHILD_PAGES = {
	"book.html": "books.html",
	"adventure.html": "adventures.html",
};
NavBar._CAT_RULES = "Regras";
NavBar._CAT_BOOKS = "Livros";
NavBar._CAT_PLAYER = "Jogador";
NavBar._CAT_DUNGEON_MASTER = "Mestre";
NavBar._CAT_ADVENTURES = "Aventuras";
NavBar._CAT_REFERENCES = "Referências";
NavBar._CAT_UTILITIES = "Ferramentas";
NavBar._CAT_SETTINGS = "Configurações";
NavBar._CAT_CACHE = "Pré-Carregar Dados";

NavBar._navbar = null;

NavBar._tree = {};

NavBar._timerId = 1;
NavBar._timersOpen = {};
NavBar._timersClose = {};
NavBar._timerMousePos = {};
NavBar._cachedInstallEvent = null;

NavBar.InteractionManager = class {
	static _onClick_button_dayNight (evt) {
		evt.preventDefault();
		styleSwitcher.cycleDayNightMode();
	}

	static _onContext_button_dayNight (evt) {
		evt.preventDefault();
		styleSwitcher.cycleDayNightMode(-1);
	}

	static _onClick_button_wideMode (evt) {
		evt.preventDefault();
		styleSwitcher.toggleWide();
	}

	static async _pOnClick_button_saveStateFile (evt) {
		evt.preventDefault();
		const sync = StorageUtil.syncGetDump();
		const async = await StorageUtil.pGetDump();
		const dump = {sync, async};
		DataUtil.userDownload("5etools", dump, {fileType: "5etools"});
	}

	static async _pOnClick_button_loadStateFile (evt) {
		evt.preventDefault();
		const {jsons, errors} = await InputUiUtil.pGetUserUploadJson({expectedFileTypes: ["5etools"]});

		DataUtil.doHandleFileLoadErrorsGeneric(errors);

		if (!jsons?.length) return;
		const dump = jsons[0];

		try {
			StorageUtil.syncSetFromDump(dump.sync);
			await StorageUtil.pSetFromDump(dump.async);
			location.reload();
		} catch (e) {
			JqueryUtil.doToast({type: "danger", content: `Failed to load state! ${VeCt.STR_SEE_CONSOLE}`});
			throw e;
		}
	}

	static async _pOnClick_button_addApp (evt) {
		evt.preventDefault();
		try {
			NavBar._cachedInstallEvent.prompt();
		} catch (e) {
			// Ignore errors
		}
	}

	static async _pOnClick_button_preloadOffline (evt, {route, isRequireImages = false}) {
		evt.preventDefault();

		if (globalThis.swCacheRoutes === undefined) {
			JqueryUtil.doToast(`The loader was not yet available! Reload the page and try again. If this problem persists, your browser may not support preloading.`);
			return;
		}

		if (isRequireImages && globalThis.DEPLOYED_IMG_ROOT) {
			JqueryUtil.doToast({
				type: "danger",
				content: `The "${evt.currentTarget.innerText.split("(")[0].trim()}" option is not currently supported on this site version. Try again some other time!`,
			});
			return;
		}

		globalThis.swCacheRoutes(route);
	}

	static async _pOnClick_button_clearOffline (evt) {
		evt.preventDefault();

		if (globalThis.swResetAll === undefined) {
			JqueryUtil.doToast(`The loader was not yet available! Reload the page and try again. If this problem persists, your browser may not support preloading.`);
			return;
		}

		globalThis.swResetAll();
	}
};

NavBar.Node = class {
	constructor ({parent, head, body}) {
		this.parent = parent;
		this.head = head;
		this.body = body;
		this.children = {};

		this._isActive = false;
	}

	set isActive (val) {
		this._isActive = !!val;
		this?.head?.classList?.toggle("active", this._isActive);
		if (this.parent) this.parent.isActive = this._isActive;
	}

	get isActive () {
		return this._isActive;
	}
};

NavBar.NodeLink = class extends NavBar.Node {
	constructor ({isInAccordion, lnk, ...rest}) {
		super(rest);
		this._isInAccordion = !!isInAccordion;
		this._lnk = lnk;
	}

	set isActive (val) {
		if (!this._isInAccordion) {
			super.isActive = val;
			return;
		}

		this._isActive = !!val;
		this._lnk.classList.toggle("nav2-accord__lnk-item--active", this._isActive);
		if (this.parent) this.parent.isActive = this._isActive;
	}

	get isActive () { // Overriding the setter clobbers the getter, so, re-make it
		return super.isActive;
	}
};

NavBar.NodeAccordion = class extends NavBar.Node {
	static getDispToggleDisplayHtml (val) { return val ? `[\u2212]` : `[+]`; }

	constructor ({dispToggle, ...rest}) {
		super(rest);
		this._dispToggle = dispToggle;
		this._isExpanded = false;
	}

	set isActive (val) {
		this._isActive = !!val;
		this?.head?.classList?.toggle("nav2-accord__head--active", this._isActive);
		if (val && !this._isExpanded) this.isExpanded = true;
		if (this.parent) this.parent.isActive = this._isActive;
	}

	get isActive () { // Overriding the setter clobbers the getter, so, re-make it
		return super.isActive;
	}

	set isExpanded (val) {
		this._isExpanded = val;
		this?.body?.classList?.toggle("ve-hidden", !val);
		this._dispToggle.textContent = NavBar.NodeAccordion.getDispToggleDisplayHtml(val);
	}

	get isExpanded () {
		return this._isExpanded;
	}
};

NavBar.init();
