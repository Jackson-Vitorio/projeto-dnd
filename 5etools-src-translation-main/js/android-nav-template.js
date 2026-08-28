// Template de integração com o botão "voltar" do Android via Capacitor.
// Este arquivo NÃO é servido diretamente — é bundlado para `js/android-nav.js`
// (ver `node/build-android-nav.mjs`), seguindo o mesmo padrão do `sw-injector.js`.
import {App} from "@capacitor/app";
import {Capacitor} from "@capacitor/core";

(async () => {
	// Em navegador web normal, não fazemos nada — o Capacitor só existe no app nativo.
	if (!Capacitor.isNativePlatform?.()) return;

	/**
	 * Sobrescreve o comportamento padrão do botão voltar do Android.
	 * Padrão (sem listener): fecha a app. Queremos: voltar na navegação quando
	 * possível, e, quando não houver histórico, apenas minimizar (ir para o
	 * background) em vez de fechar.
	 */
	App.addListener("backButton", ({canGoBack}) => {
		if (canGoBack || (window.history?.length || 0) > 1) {
			// Volta na navegação do WebView (hash/rotas incluídos).
			App.navigateBack();
			return;
		}

		// Não há para onde voltar: minimiza o app em vez de fechá-lo.
		App.minimizeApp();
	});
})();