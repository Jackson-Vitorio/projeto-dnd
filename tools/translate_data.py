#!/usr/bin/env python3
"""
Sistema de Tradução Genérico para todos os arquivos JSON de data/
"""

import json, os, re, sys, time, uuid, shutil, glob
from deep_translator import GoogleTranslator

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '5etools-src-translation-main', 'data'))
PROGRESS_DIR = os.path.join(SCRIPT_DIR, '.progress')

TARGET_LANG = 'pt'
SOURCE_LANG = 'en'
MAX_CHUNK_SIZE = 4500
REQUEST_DELAY = 0.3

TAG_PATTERN = re.compile(r'\{@[^}]*\}')
FORMAT_PATTERN = re.compile(r'\{/?[#iub][^}]*\}')

# Campos seguros para tradução
TRANSLATABLE_FIELDS = [
    'entries', 'headerEntries', 'footerEntries', 'description', 'desc',
    'lairActions', 'regionalEffects', 'variant', 'additionalEntries',
    'additionalEntriesHeader', 'additionalSources', 'fluff', 'text',
    'content', 'body', 'result', 'note', 'notes', 'example', 'examples',
]

# Campos que NUNCA devem ser traduzidos
NEVER_TRANSLATE_FIELDS = [
    'name', 'source', 'page', 'type', 'url', 'id', 'tag', 'tagSource',
    'senses', 'skills', 'ac', 'hp', 'speed', 'save', 'skill',
    'immune', 'resist', 'vulnerable', 'conditionImmune',
    'languages', 'spellcasting', 'conditionInflict',
    'savingThrowForced', 'damageTags', 'miscTags', 'senseTags',
    'actionTags', 'languageTags', 'damageTagsSpell', 'spellcastingTags',
    'traitTags', 'conditionInflictLegendary', 'damageTagsLegendary',
    'savingThrowForcedLegendary', 'attachedItems',
    'hasToken', 'hasFluff', 'hasFluffImages', 'isNpc', 'isNamedCreature',
    'environment', 'soundClip', 'tokenCredit', 'otherSources',
    'alignmentPrefix', 'size', 'alignment', 'str', 'dex', 'con',
    'int', 'wis', 'cha', 'cr', 'srd', 'legendaryGroup',
    'passive', '_meta', 'old', 'base', 'data', 'copy', 'uuid', 'timestamp',
    'count', 'total', 'pages', 'edition', 'editions',
    'author', 'authors', 'publisher', 'published', 'version',
    'legal', 'trademark', 'copyright', 'permission', 'ogl',
    'ssrd', 'hasSrd', 'hasFluffImage', 'hasTokenImage',
    'image', 'images', 'token', 'tokens', 'map', 'maps',
    'displayedEntry', 'displayedEntries', 'displayedSpell',
    'displayedCreature', 'displayedItem', 'displayedFeat',
    'displayedOptionalFeature', 'displayedClass',
    'color', 'backgroundColor', 'borderColor', 'textColor',
    'requiredLevel', 'specific',
]


def get_progress_file(file_path):
    os.makedirs(PROGRESS_DIR, exist_ok=True)
    normalized = os.path.normpath(file_path)
    key = normalized.replace(os.sep, '_').replace('.', '_')
    return os.path.join(PROGRESS_DIR, f"{key}.progress.json")

def load_progress(file_path):
    pf = get_progress_file(file_path)
    if os.path.exists(pf):
        with open(pf, 'r', encoding='utf-8') as f:
            return set(json.load(f).get('translated', []))
    return set()

def save_progress(file_path, translated):
    pf = get_progress_file(file_path)
    with open(pf, 'w', encoding='utf-8') as f:
        json.dump({'translated': list(translated)}, f)

def replace_tags(text):
    pm = {}
    def rep(m):
        t = m.group(0)
        p = f"%%T{str(uuid.uuid4())[:8]}%%"
        pm[p] = t
        return p
    r = TAG_PATTERN.sub(rep, text)
    r = FORMAT_PATTERN.sub(rep, r)
    return r, pm

def restore_tags(text, pm):
    for p, t in pm.items():
        text = text.replace(p, t)
    return text

def extract_texts_from_value(value, prefix="", depth=0):
    if depth > 15:
        return []
    texts = []
    if isinstance(value, str):
        texts.append((prefix, value))
    elif isinstance(value, dict):
        for k, v in value.items():
            if k in NEVER_TRANSLATE_FIELDS or k.startswith('_'):
                continue
            new_prefix = f"{prefix}/{k}" if prefix else k
            texts.extend(extract_texts_from_value(v, new_prefix, depth+1))
    elif isinstance(value, list):
        for i, item in enumerate(value):
            new_prefix = f"{prefix}/{i}" if prefix else str(i)
            texts.extend(extract_texts_from_value(item, new_prefix, depth+1))
    return texts

def chunk_texts(texts, max_size=MAX_CHUNK_SIZE):
    chunks = []
    cur = []
    cur_size = 0
    for text in texts:
        if cur_size + len(text) > max_size and cur:
            chunks.append(cur)
            cur = []
            cur_size = 0
        cur.append(text)
        cur_size += len(text)
    if cur:
        chunks.append(cur)
    return chunks

def translate_batch(texts, translator):
    if not texts:
        return []
    prepared, maps = [], []
    for t in texts:
        pt, m = replace_tags(t)
        prepared.append(pt)
        maps.append(m)
    SEP = "\n¶¶¶\n"
    results = []
    bs = max(1, min(30, MAX_CHUNK_SIZE // max((len(t) for t in prepared), default=1)))
    for start in range(0, len(prepared), bs):
        batch = prepared[start:start+bs]
        bmaps = maps[start:start+bs]
        combined = SEP.join(batch)
        for attempt in range(3):
            try:
                tr = translator.translate(combined)
                if tr:
                    break
            except:
                time.sleep(REQUEST_DELAY*2)
        else:
            for i, orig in enumerate(batch):
                results.append(restore_tags(orig, bmaps[i]))
            continue
        parts = tr.split("¶¶¶")
        parts = [p.strip() for p in parts]
        while len(parts) < len(batch):
            parts.append("")
        parts = parts[:len(batch)]
        for part, bm in zip(parts, bmaps):
            results.append(restore_tags(part, bm))
        if start+bs < len(prepared):
            time.sleep(REQUEST_DELAY)
    return results

def apply_translations(data, translations, prefix=""):
    if isinstance(data, dict):
        for k, v in list(data.items()):
            if k in NEVER_TRANSLATE_FIELDS or k.startswith('_'):
                continue
            key = f"{prefix}/{k}" if prefix else k
            if isinstance(v, str) and key in translations:
                data[k] = translations[key]
            else:
                apply_translations(v, translations, key)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            key = f"{prefix}/{i}" if prefix else str(i)
            if isinstance(item, str) and key in translations:
                data[i] = translations[key]
            else:
                apply_translations(item, translations, key)

def process_file(file_path, force=False):
    filename = os.path.basename(file_path)
    print(f"\n{'='*60}")
    print(f"📄 {filename}")
    print(f"{'='*60}")
    
    translated = load_progress(file_path)
    if translated and not force:
        print(f"  Progresso anterior: {len(translated)} textos")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"  ❌ Erro ao ler arquivo: {e}")
        return 0
    
    texts = extract_texts_from_value(data)
    pending = [(key, text) for key, text in texts if key not in translated]
    
    total = len(pending)
    if total == 0:
        print(f"  ✅ Nada pendente!")
        return 0
    
    print(f"  Textos pendentes: {total}")
    
    translator = GoogleTranslator(source=SOURCE_LANG, target=TARGET_LANG)
    translations = {}
    processed = 0
    
    chunks = chunk_texts([t[1] for t in pending])
    pending_iter = iter(pending)
    
    for chunk in chunks:
        batch_keys = []
        batch_texts = []
        for _ in range(len(chunk)):
            try:
                key, text = next(pending_iter)
                batch_keys.append(key)
                batch_texts.append(text)
            except StopIteration:
                break
        
        translated_texts = translate_batch(batch_texts, translator)
        
        for key, tr_text in zip(batch_keys, translated_texts):
            translations[key] = tr_text
            translated.add(key)
            processed += 1
        
        tw = shutil.get_terminal_size().columns
        bw = min(30, tw - 40)
        pct = processed / total
        bar = '█' * int(bw * pct) + '░' * (bw - int(bw * pct))
        sys.stdout.write(f"\r  [{bar}] {pct:.0%} | {processed}/{total}")
        sys.stdout.flush()
        
        save_progress(file_path, translated)
        if processed < total:
            time.sleep(REQUEST_DELAY)
    
    apply_translations(data, translations)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')
    
    sys.stdout.write("\n" + " " * tw + "\r")
    print(f"  ✅ {filename} - {processed} entradas traduzidas")
    return processed

def translate_all(force=False, pattern=None):
    if pattern:
        files = glob.glob(os.path.join(DATA_DIR, pattern), recursive=True)
    else:
        files = glob.glob(os.path.join(DATA_DIR, '**/*.json'), recursive=True)
    
    filtered = []
    for f in files:
        basename = os.path.basename(f)
        if any(basename.startswith(p.replace('*', '')) for p in ['_', 'foundry-', 'gendata-', 'bookref-']):
            continue
        if basename in ['legendarygroups.json', '_meta.json', 'index.json']:
            continue
        filtered.append(f)
    
    filtered.sort()
    total_files = len(filtered)
    
    print(f"\n{'='*60}")
    print(f"📚 TRADUÇÃO GENÉRICA DE DATA/")
    print(f"{'='*60}")
    print(f"Total de arquivos: {total_files}")
    print(f"{'='*60}")
    
    total_processed = 0
    for file_path in filtered:
        try:
            total_processed += process_file(file_path, force=force)
        except Exception as e:
            print(f"\n  ❌ Erro em {os.path.basename(file_path)}: {e}")
    
    print(f"\n{'='*60}")
    print(f"✅ TRADUÇÃO CONCLUÍDA!")
    print(f"  Arquivos processados: {total_files}")
    print(f"  Total de entradas traduzidas: {total_processed}")
    print(f"{'='*60}")

def translate_single(filepath, force=False):
    if not os.path.exists(filepath):
        import glob
        matches = glob.glob(os.path.join(DATA_DIR, '**', filepath), recursive=True)
        if matches:
            filepath = matches[0]
        else:
            print(f"Arquivo '{filepath}' não encontrado")
            return
    process_file(filepath, force=force)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Tradutor Genérico de Data JSON')
    parser.add_argument('file', nargs='?', help='Arquivo ou padrão (ex: bestiary/*.json)')
    parser.add_argument('--all', action='store_true', help='Traduzir TODOS os arquivos')
    parser.add_argument('--force', action='store_true', help='Forçar retradução')
    
    args = parser.parse_args()
    if args.all:
        translate_all(force=args.force)
    elif args.file:
        translate_single(args.file, force=args.force)
    else:
        parser.print_help()