// Gera `js/android-nav.js` (bundle) a partir de `js/android-nav-template.js`,
// embutindo `@capacitor/app` e `@capacitor/core` (não dependemos de node_modules no runtime).
import esbuild from "esbuild";

const args = process.argv.slice(2);
const prod = args[0] === "prod";

await esbuild.build({
	entryPoints: ["js/android-nav-template.js"],
	bundle: true,
	format: "esm",
	minify: prod,
	drop: prod ? ["console"] : undefined,
	allowOverwrite: true,
	outfile: "js/android-nav.js",
});

console.log("ok: gerado js/android-nav.js", prod ? "(prod)" : "(dev)");