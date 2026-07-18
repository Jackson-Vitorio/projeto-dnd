#!/usr/bin/env python3
"""
Tradutor do arquivo legendarygroups.json
Traduz: lairActions, regionalEffects de todos os grupos lendários
"""
import json, os, re, sys, time, uuid, shutil, glob
from deep_translator import GoogleTranslator

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BESTIARY_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '5etools-src-translation-main', 'data', 'bestiary'))
PROGRESS_DIR = os.path.join(SCRIPT_DIR, '.progress')
LG_FILE = os.path.join(BESTIARY_DIR, 'legendarygroups.json')
PROGRESS_FILE = os.path.join(PROGRESS_DIR, 'legendarygroups.json.progress.json')

TAG_PATTERN = re.compile(r'\{@[^}]*\}')
FORMAT_PATTERN = re.compile(r'\{/?[#iub][^}]*\}')

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

def extract_texts_from_item(item, prefix="", depth=0):
    """Extrai textos de um item que pode ser string, dict com entries, ou list."""
    texts = []
    if depth > 10:
        return texts
    if isinstance(item, str):
        texts.append((prefix, item))
    elif isinstance(item, dict):
        if 'entries' in item:
            for i, e in enumerate(item['entries']):
                texts.extend(extract_texts_from_item(e, f"{prefix}/entries/{i}", depth+1))
        if 'items' in item:
            for i, e in enumerate(item['items']):
                texts.extend(extract_texts_from_item(e, f"{prefix}/items/{i}", depth+1))
        if 'entry' in item:
            texts.extend(extract_texts_from_item(item['entry'], f"{prefix}/entry", depth+1))
        if 'headerEntries' in item:
            for i, e in enumerate(item['headerEntries']):
                texts.append((f"{prefix}/header/{i}", e))
        if 'footerEntries' in item:
            for i, e in enumerate(item['footerEntries']):
                texts.append((f"{prefix}/footer/{i}", e))
    elif isinstance(item, list):
        for i, e in enumerate(item):
            texts.extend(extract_texts_from_item(e, f"{prefix}/{i}", depth+1))
    return texts

def load_progress():
    os.makedirs(PROGRESS_DIR, exist_ok=True)
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return set(json.load(f).get('translated', []))
    return set()

def save_progress(translated):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump({'translated': list(translated)}, f, ensure_ascii=False, indent=2)

def translate():
    print(f"\n{'='*60}")
    print("📚 TRADUZINDO LEGENDARY GROUPS")
    print(f"{'='*60}")
    
    translated = load_progress()
    print(f"  Progresso anterior: {len(translated)} textos")
    
    with open(LG_FILE, 'r') as f:
        data = json.load(f)
    
    groups = data.get('legendaryGroup', [])
    print(f"  Total de grupos: {len(groups)}")
    
    # Coleta textos pendentes
    pending = []
    for g_idx, group in enumerate(groups):
        name = group.get('name', f'Group_{g_idx}')
        for field in ['lairActions', 'regionalEffects']:
            if field not in group:
                continue
            items = group[field]
            if isinstance(items, list):
                for i_idx, item in enumerate(items):
                    texts = extract_texts_from_item(item, f"{name}|{field}|{i_idx}")
                    for path, text in texts:
                        key = f"{name}|{field}|{i_idx}|{path}"
                        if key not in translated:
                            pending.append((key, text))
    
    total = len(pending)
    print(f"  Textos a traduzir: {total}")
    
    if total == 0:
        print("  Nada pendente!")
        return
    
    translator = GoogleTranslator(source='en', target='pt')
    
    # Traduz em lotes
    batch_size = 20
    processed = 0
    translations = {}
    
    for start in range(0, total, batch_size):
        batch = pending[start:start + batch_size]
        texts = [t[1] for t in batch]
        keys = [t[0] for t in batch]
        
        # Prepara com placeholders
        prepared = []
        maps = []
        for text in texts:
            t, m = replace_tags(text)
            prepared.append(t)
            maps.append(m)
        
        # Traduz em lote
        SEP = "\n¶¶¶\n"
        combined = SEP.join(prepared)
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                translated_text = translator.translate(combined)
                if translated_text:
                    break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(0.5)
                else:
                    print(f"  [ERRO] Lote falhou: {e}")
                    translated_text = combined
        
        if translated_text:
            parts = translated_text.split("¶¶¶")
            parts = [p.strip() for p in parts]
            while len(parts) < len(batch):
                parts.append("")
            parts = parts[:len(batch)]
            
            for i, (part, tag_map) in enumerate(zip(parts, maps)):
                restored = restore_tags(part, tag_map)
                translations[keys[i]] = restored
                translated.add(keys[i])
        
        processed += len(batch)
        
        # Barra de progresso
        tw = shutil.get_terminal_size().columns
        bw = min(30, tw - 40)
        pct = processed / total
        bar = '█' * int(bw * pct) + '░' * (bw - int(bw * pct))
        sys.stdout.write(f"\r  [{bar}] {pct:.0%} | {processed}/{total}")
        sys.stdout.flush()
        
        save_progress(translated)
        
        if start + batch_size < total:
            time.sleep(0.3)
    
    # Aplica as traduções
    print(f"\n\n  Aplicando traduções...")
    for g_idx, group in enumerate(groups):
        name = group.get('name', f'Group_{g_idx}')
        for field in ['lairActions', 'regionalEffects']:
            if field not in group:
                continue
            items = group[field]
            if isinstance(items, list):
                for i_idx, item in enumerate(items):
                    _apply_translations(item, f"{name}|{field}|{i_idx}", translations)
    
    with open(LG_FILE, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Legendary Groups traduzido! {processed} textos processados")

def _apply_translations(item, prefix, translations, depth=0):
    if depth > 10:
        return
    if isinstance(item, str):
        key = prefix
        if key in translations:
            return translations[key]
        return item
    elif isinstance(item, dict):
        if 'entries' in item:
            for i, e in enumerate(item['entries']):
                result = _apply_translations(e, f"{prefix}/entries/{i}", translations, depth+1)
                if result:
                    item['entries'][i] = result
        if 'items' in item:
            for i, e in enumerate(item['items']):
                result = _apply_translations(e, f"{prefix}/items/{i}", translations, depth+1)
                if result:
                    item['items'][i] = result
        if 'entry' in item:
            result = _apply_translations(item['entry'], f"{prefix}/entry", translations, depth+1)
            if result:
                item['entry'] = result
        if 'headerEntries' in item:
            for i, e in enumerate(item['headerEntries']):
                key = f"{prefix}/header/{i}"
                if key in translations:
                    item['headerEntries'][i] = translations[key]
        if 'footerEntries' in item:
            for i, e in enumerate(item['footerEntries']):
                key = f"{prefix}/footer/{i}"
                if key in translations:
                    item['footerEntries'][i] = translations[key]
    elif isinstance(item, list):
        for i, e in enumerate(item):
            result = _apply_translations(e, f"{prefix}/{i}", translations, depth+1)
            if result:
                item[i] = result
    return None

if __name__ == '__main__':
    translate()