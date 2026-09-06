"use strict";

// Menu radial da página inicial — lógica de abrir/fechar painéis.
// Não modifica a estrutura das páginas; apenas adiciona comportamentos.

class HomeRadial {
	static init () {
		const $radial = document.querySelector(".home__radial");
		if (!$radial) return;

		HomeRadial._radial = $radial;

		HomeRadial._items = [...$radial.querySelectorAll(".home__radial-item[data-panel]")];
		HomeRadial._panels = [...$radial.querySelectorAll(".home__radial-panel")];

		HomeRadial._bindItems();
		HomeRadial._bindCloseTriggers();
		HomeRadial._bindActions();
		HomeRadial._bindKeyboard();
	}

	static _bindItems () {
		HomeRadial._items.forEach(item => {
			item.addEventListener("click", evt => {
				evt.preventDefault();
				evt.stopPropagation();

				const panelName = item.getAttribute("data-panel");
				const isOpen = item.classList.contains("is-open");

				// Fecha tudo
				HomeRadial.closeAll();

				if (!isOpen) HomeRadial.open(panelName, item);
			});
		});
	}

	static open (panelName, item) {
		const panel = HomeRadial._panels.find(p => p.getAttribute("data-panel-body") === panelName);
		if (!panel) return;

		panel.classList.add("is-open");
		if (item) item.classList.add("is-open");

		HomeRadial._radial.classList.add("has-open");
		HomeRadial._currentPanel = panel;
		panel.setAttribute("aria-hidden", "false");
		if (item) item.setAttribute("aria-expanded", "true");
	}

	static closeAll () {
		HomeRadial._items.forEach(it => {
			it.classList.remove("is-open");
			it.setAttribute("aria-expanded", "false");
		});
		HomeRadial._panels.forEach(p => {
			p.classList.remove("is-open");
			p.setAttribute("aria-hidden", "true");
		});
		HomeRadial._radial?.classList.remove("has-open");
		HomeRadial._currentPanel = null;
	}

	static _bindCloseTriggers () {
		// Fecha ao tocar FORA do painel (no dim, no radial ou na página).
		// Cliques DENTRO do painel (links/título/grade) passam normalmente.
		document.addEventListener("click", evt => {
			if (!HomeRadial._currentPanel) return;
			if (evt.target.closest(".home__radial-panel")) return;
			HomeRadial.closeAll();
		});
		HomeRadial._radial.querySelector(".home__radial-center")?.addEventListener("click", () => HomeRadial.closeAll());
	}

	static _bindActions () {
		// Itens com data-action: executam ação (ex: abrir Config UI)
		document.querySelectorAll("[data-radial-action]").forEach(btn => {
			btn.addEventListener("click", evt => {
				evt.preventDefault();
				const action = btn.getAttribute("data-radial-action");
				HomeRadial._runAction(action, btn);
			});
		});
	}

	static _runAction (action, btn) {
		switch (action) {
			case "preferences":
				if (typeof ConfigUi !== "undefined" && typeof ConfigUi.show === "function") {
					ConfigUi.show();
					HomeRadial.closeAll();
					return;
				}
				break;
			case "save-state":
				if (NavBar?.InteractionManager?._pOnClick_button_saveStateFile) {
					NavBar.InteractionManager._pOnClick_button_saveStateFile(btn).then(() => HomeRadial.closeAll());
					return;
				}
				break;
			case "load-state":
				if (NavBar?.InteractionManager?._pOnClick_button_loadStateFile) {
					NavBar.InteractionManager._pOnClick_button_loadStateFile(btn).then(() => HomeRadial.closeAll());
					return;
				}
				break;
			case "add-app":
				if (NavBar?.InteractionManager?._pOnClick_button_addApp) {
					NavBar.InteractionManager._pOnClick_button_addApp(btn).then(() => HomeRadial.closeAll());
					return;
				}
				break;
			case "preload":
				if (NavBar?.InteractionManager?._pOnClick_button_preloadOffline) {
					NavBar.InteractionManager._pOnClick_button_preloadOffline(btn, {route: /./, isRequireImages: true});
					HomeRadial.closeAll();
					return;
				}
				break;
			case "reset-cache":
				if (NavBar?.InteractionManager?._pOnClick_button_clearOffline) {
					NavBar.InteractionManager._pOnClick_button_clearOffline(btn);
					HomeRadial.closeAll();
					return;
				}
				break;
		}
		// Fallback: abre o menu de configurações nativo se existir botão.
		const $dropdown = document.querySelector(".dropdown--navbar");
		if ($dropdown) $dropdown.classList.add("open");
	}

	static _bindKeyboard () {
		document.addEventListener("keydown", evt => {
			if (evt.key === "Escape" && HomeRadial._currentPanel) HomeRadial.closeAll();
		});
		// Foco entra no painel ao abrir
		HomeRadial._items.forEach(item => {
			item.addEventListener("keydown", evt => {
				if (evt.key === "Enter" || evt.key === " ") {
					evt.preventDefault();
					item.click();
				}
			});
		});
	}
}

// Inicializa após DOM pronto
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => HomeRadial.init());
} else {
	HomeRadial.init();
}

window.HomeRadial = HomeRadial;