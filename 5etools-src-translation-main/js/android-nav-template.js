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
	 *
	 * IMPORTANTE: registrar um listener de `backButton` DESABILITA o comportamento
	 * padrão do Capacitor (webView.goBack()). Portanto precisamos chamar
	 * `window.history.back()` manualmente. O método `App.navigateBack()` usado
	 * anteriormente NÃO existe em @capacitor/app@8.x (nem no JS nem no nativo), então
	 * a chamada falhava silenciosamente e o botão não fazia nada (bug relatado).
	 */
	App.addListener("backButton", ({canGoBack}) => {
		if (canGoBack || (window.history?.length || 0) > 1) {
			// Volta na navegação do WebView (páginas/hash). Este é o comportamento
			// oficial recomendado pela documentação do Capacitor App plugin.
			window.history.back();
			return;
		}

		// Não há para onde voltar: minimiza o app em vez de fechá-lo.
		App.minimizeApp();
	});
})();