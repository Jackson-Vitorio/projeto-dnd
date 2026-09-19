/* Editor universal de itens — cria ou edita armas, armaduras, escudos, consumíveis e
 * itens personalizados. Usado pelo popup de inventário e pela ação
 * "Adicionar Item > Criar Novo Item". */
const ITEM_TYPE_LABELS = {
weapon: "Arma",
armor: "Armadura",
shield: "Escudo",
consumable: "Consumível",
other: "Outro",
};

const PROPERTY_LABELS = {
V: "Versátil",
F: "Flexível",
T: "Traumático",
"2H": "Duas Mãos",
L: "Leve",
P: "Penalidade",
S: "Alcance Curto",
A: "Alcance Longo",
RLD: "Recarregar",
AF: "Alcance Especial",
};

const RARITY_LABEL = {
none: "Comum (sem raridade)",
comum: "Comum",
incomum: "Incomum",
raro: "Raro",
muito_raro: "Muito Raro",
artefato: "Artefato",
};

const MODIFIER_OPTIONS = [
{ value: "str", label: "Força" },
{ value: "dex", label: "Destreza" },
];

const DMG_TYPE_OPTIONS = [
"Perforante", "Contundente", "Cortante",
"Fogo", "Frio", "Elétrico", "Necrótico", "Psíquico",
"Veneno", "Fogo sagrado", "Fogo fúrio", "Força", "Alcance",
];

const RARITY_COLORS = {
none: "#999",
comum: "#00cc66",
incomum: "#3399ff",
raro: "#b35900",
muito_raro: "#cc33ff",
artefato: "#ff3300",
};

function esc(str) {
if (!str) return "";
return String(str).replace(/[&<>"']/g, function (m) {
return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
});
}

export function closeItemEditorPopup() {
$("#itemeditor-overlay").remove();
}

export function openItemEditorPopup(opts, onSave) {
const mode = opts.mode || "create";
const existing = opts.item || {};
const itemType = opts.itemType || "weapon";
const title = mode === "edit" ? "Editar Item" : "Criar Novo Item";

closeItemEditorPopup();

let h = '<div class="characters__detail-overlay" id="itemeditor-overlay">';
h += '<div class="characters__detail" style="max-width:520px;max-height:90vh;overflow-y:auto">';
h += '<div class="characters__detail-title">' + esc(title) + '</div>';

// Tipo de item
h += '<div class="characters__form-row">';
h += '<label class="characters__form-label">Tipo de Item</label>';
h += '<select class="characters__form-select" id="ie-type">';
Object.keys(ITEM_TYPE_LABELS).forEach(t => {
const def = ["armor","shield"].includes(t) ? "armor" : (t === "consumable" ? "consumable" : (t === "other" ? "other" : "weapon"));
const sel = t === def ? "selected" : "";
h += '<option value="' + t + '" ' + sel + '>' + ITEM_TYPE_LABELS[t] + '</option>';
});
h += '</select></div>';

// Nome
h += '<div class="characters__form-row"><label class="characters__form-label">Nome</label>';
h += '<input class="characters__form-input" id="ie-name" value="' + esc(existing.name || "") + '"></div>';

// Raridade
h += '<div class="characters__form-row"><label class="characters__form-label">Raridade</label>';
h += '<select class="characters__form-select" id="ie-rarity">';
["none", "comum", "incomum", "raro", "muito_raro", "artefato"].forEach(r => {
h += '<option value="' + r + '" ' + (r === (existing.rarity || "none") ? "selected" : "") + '>' + RARITY_LABEL[r] + '</option>';
});
h += '</select></div>';

// Descrição
h += '<div class="characters__form-row"><label class="characters__form-label">Descrição</label>';
h += '<textarea class="characters__form-input" id="ie-desc" rows="3" style="resize:vertical" placeholder="Descrição completa do item...">' + esc(existing.entries ? existing.entries.join("\n") : "") + '</textarea></div>';

// Campos de arma
h += '<div id="ie-fields-weapon" style="display:' + (itemType === "weapon" ? "block" : "none") + '">';
h += '<div class="characters__form-row"><label class="characters__form-label">Dano Base (ex: 1d8)</label>';
h += '<input class="characters__form-input" id="ie-dmg1" value="' + esc(existing.dmg1 || "") + '" placeholder="ex: 1d8"></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Dano Versátil (ex: 1d10)</label>';
h += '<input class="characters__form-input" id="ie-dmg2" value="' + esc(existing.dmg2 || "") + '" placeholder="ex: 1d10"></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Tipo de Dano</label>';
h += '<select class="characters__form-select" id="ie-ddtype">';
DMG_TYPE_OPTIONS.forEach(dt => h += '<option value="' + dt + '" ' + (dt === (existing.dmgType || "Contundente") ? "selected" : "") + '>' + dt + '</option>');
h += '</select></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Modificador de Dano</label>';
h += '<select class="characters__form-select" id="ie-modifier">';
MODIFIER_OPTIONS.forEach(m => h += '<option value="' + m.value + '" ' + (m.value === (existing.modifier || "str") ? "selected" : "") + '>' + m.label + '</option>');
h += '</select></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Alcance</label>';
h += '<input class="characters__form-input" id="ie-range" value="' + esc(existing.range || "") + '" placeholder="ex: 80/320"></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Propriedades</label>';
h += '<select class="characters__form-select" id="ie-props" multiple style="height:100px">';
Object.keys(PROPERTY_LABELS).forEach(p => h += '<option value="' + p + '" ' + (existing.property && existing.property.includes(p) ? "selected" : "") + '>' + PROPERTY_LABELS[p] + '</option>');
h += '</select></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Recarga (ex: 1/dia, recarga 5-6)</label>';
h += '<input class="characters__form-input" id="ie-recharge" value="' + esc(existing.recharge || existing.charges || "") + '"></div>';

h += '<div class="characters__form-row" style="display:flex;gap:20px">';
h += '<label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="ie-silver" ' + (existing.silver ? "checked" : "") + '> Prata</label>';
h += '<label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="ie-2h" ' + (existing.twoHand ? "checked" : "") + '> Duas Mãos</label>';
h += '</div></div>';

// Campos de armadura/escudo
h += '<div id="ie-fields-armor" style="display:' + (["armor", "shield"].includes(itemType) ? "block" : "none") + '">';
h += '<div class="characters__form-row"><label class="characters__form-label">CA Base</label>';
h += '<input class="characters__form-input" type="number" id="ie-ac" value="' + (existing.ac != null ? existing.ac : "") + '" min="1" max="30"></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Destreza Máxima (0 = sem limite)</label>';
h += '<input class="characters__form-input" type="number" id="ie-maxdex" value="' + (existing.maxDex != null ? existing.maxDex : "") + '" min="0" max="10"></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Requer Força</label>';
h += '<input class="characters__form-input" type="number" id="ie-strreq" value="' + (existing.strReq || "") + '" min="0" max="30"></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Impedimento de Furtividade</label>';
h += '<select class="characters__form-select" id="ie-stealth">';
h += '<option value="false">Não</option><option value="true" ' + (existing.stealth ? "selected" : "") + '>Sim</option>';
h += '</select></div>';

h += '<div class="characters__form-row"><label class="characters__form-label">Requer Atunhamento</label>';
h += '<select class="characters__form-select" id="ie-attune">';
h += '<option value="false">Não</option><option value="true" ' + (existing.attunement ? "selected" : "") + '>Sim</option>';
h += '</select></div></div>';

// Campos comuns: peso, valor, quantidade
h += '<div class="characters__form-row" style="display:flex;gap:10px;flex-wrap:wrap">';
h += '<div style="flex:1;min-width:80px"><label class="characters__form-label">Peso (kg)</label><input class="characters__form-input" type="number" id="ie-weight" value="' + (existing.weight || 0) + '" min="0" step="0.1"></div>';
h += '<div style="flex:1;min-width:80px"><label class="characters__form-label">Valor (gp)</label><input class="characters__form-input" type="number" id="ie-value" value="' + (existing.value || existing.vgp || 0) + '" min="0" step="0.01"></div>';
h += '<div id="ie-qty-row" style="display:' + (itemType === "consumable" ? "block" : "none") + ';flex:1;min-width:80px"><label class="characters__form-label">Quantidade</label><input class="characters__form-input" type="number" id="ie-qty" value="' + (existing.quantity || 1) + '" min="1"></div>';
h += '</div></div>';

// Ações
h += '<div class="characters__detail-actions">';
h += '<button class="characters__btn characters__btn--primary" id="ie-save">' + (mode === "edit" ? "Salvar" : "Criar") + '</button>';
h += '<button class="characters__btn characters__btn--secondary" id="ie-cancel">Cancelar</button>';
h += '</div></div></div>';

$(document.body).append(h);

// Bind eventos
$("#ie-type").off("change").on("change", function () {
const t = $(this).val();
$("#ie-fields-weapon").toggle(t === "weapon");
$("#ie-fields-armor").toggle(t === "armor" || t === "shield");
$("#ie-qty-row").toggle(t === "consumable");
});
$("#ie-type").trigger("change");

$("#ie-save").off("click").on("click", function () {
const type = $("#ie-type").val();
const name = $("#ie-name").val().trim();
if (!name) {
if (window.JqueryUtil && JqueryUtil.doToast) JqueryUtil.doToast({ type: "warning", content: "Dê um nome ao item!" });
return;
}

const base = {
name,
rarity: $("#ie-rarity").val() || "none",
weight: Number($("#ie-weight").val()) || 0,
value: Number($("#ie-value").val()) || 0,
entries: $("#ie-desc").val().trim() ? [$("#ie-desc").val().trim()] : [],
attunement: $("#ie-attune").val() === "true",
};

let item;
if (type === "weapon") {
const props = $("#ie-props").val() || [];
item = {
...base,
type: "M",
weapon: true,
dmg1: $("#ie-dmg1").val(),
dmg2: $("#ie-dmg2").val() || undefined,
dmgType: $("#ie-ddtype").val(),
modifier: $("#ie-modifier").val() || "str",
property: props,
range: $("#ie-range").val() || undefined,
twoHand: $("#ie-2h").is(":checked"),
silver: $("#ie-silver").is(":checked"),
recharge: $("#ie-recharge").val() || undefined,
};
} else if (type === "armor") {
item = {
...base,
type: "MA",
armor: true,
ac: Number($("#ie-ac").val()) || 10,
maxDex: Number($("#ie-maxdex").val()) || 0,
strReq: $("#ie-strreq").val() ? Number($("#ie-strreq").val()) : undefined,
stealth: $("#ie-stealth").val() === "true",
};
} else if (type === "shield") {
item = {
...base,
type: "S",
armor: true,
ac: Number($("#ie-ac").val()) || 2,
strReq: $("#ie-strreq").val() ? Number($("#ie-strreq").val()) : undefined,
stealth: $("#ie-stealth").val() === "true",
};
} else if (type === "consumable") {
item = {
...base,
type: "consumable",
quantity: Number($("#ie-qty").val()) || 1,
};
} else {
item = { ...base, type: "other" };
}

if (!existing.id) {
item.id = (base.source || "Homebrew") + "|" + name;
} else {
item.id = existing.id;
}
item._id = existing._id || Math.random().toString(36).substr(2, 9);

onSave && onSave(item, type);
closeItemEditorPopup();
});

$("#ie-cancel").off("click").on("click", function () {
closeItemEditorPopup();
});

$("#itemeditor-overlay").off("click.ie").on("click.ie", function (e) {
if (e.target === this) closeItemEditorPopup();
});
}

export { ITEM_TYPE_LABELS, RARITY_LABEL, RARITY_COLORS, PROPERTY_LABELS, MODIFIER_OPTIONS, DMG_TYPE_OPTIONS };
