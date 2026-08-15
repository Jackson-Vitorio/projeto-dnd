// =============================================
// Desativa service worker legado e limpa caches.
// Mantido em arquivo externo para permitir CSP com script-src 'self'
// (sem 'unsafe-inline') no statgen.html.
// =============================================
(function () {
	"use strict";

	// Service Worker antigo (não é mais usado; evita cache obsoleto do SW)
	if (navigator.serviceWorker) {
		navigator.serviceWorker.getRegistrations().then(function (regs) {
			regs.forEach(function (reg) { reg.unregister(); });
		});
	}

	// Limpa caches antigos do Service Worker
	if (window.caches) {
		caches.keys().then(function (keys) {
			keys.forEach(function (key) { caches.delete(key); });
		});
	}
})();