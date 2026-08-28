#!/usr/bin/env python3
"""
Sistema de Tradução de Bestiário usando Google Tradutor (deep-translator)

- Traduz campos: trait, action, reaction, legendary, mythic, bonus, lair
- Divide textos grandes em blocos para não exceder limites da API
- Salva progresso para continuar de onde parou
- Preserva marcações especiais como {@tag ...} da tradução
- Barra de progresso ao vivo no terminal
"""

import json
import os
import re
import sys
import time
import glob
import uuid
import shutil
from pathlib import Path

from deep_translator import GoogleTranslator

# ============================================================
# CONFIGURAÇÕES
# ============================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BESTIARY_DIR = os.path.join(SCRIPT_DIR, '..', '5etools-src-translation-main', 'data', 'bestiary')
BESTIARY_DIR = os.path.normpath(BESTIARY_DIR)
PROGRESS_DIR = os.path.join(SCRIPT_DIR, '.progress')

TARGET_LANG = 'pt'
SOURCE_LANG = 'en'
MAX_CHUNK_SIZE = 4500
REQUEST_DELAY = 0.3

# Tags do 5eTools que devem ser preservadas
TAG_PATTERN = re.compile(r'\{@[^}]*\}')
FORMAT_PATTERN = re.compile(r'\{/?[#iub][^}]*\}')

# Todos os campos que contêm arrays de traits/actions
# NÃO inclui 'name' - nomes ficam em inglês para o sistema _copy
FIELDS_TO_TRANSLATE = ['trait', 'action', 'reaction', 'legendary', 'mythic', 'bonus']

# Campos especiais (não são arrays)
SPECIAL_FIELDS = ['lair']

# Arquivo de Legendary Groups
LEGENDARY_GROUPS_FILE = os.path.join(BESTIARY_DIR, 'legendarygroups.json')


# ============================================================
# FUNÇÕES DE PROGRESSO
# ============================================================

def get_progress_file(bestiary_file: str) -> str:
    os.makedirs(PROGRESS_DIR, exist_ok=True)
    base_name = os.path.basename(bestiary_file)
    return os.path.join(PROGRESS_DIR, f"{base_name}.progress.json")


def load_progress(bestiary_file: str) -> set:
    progress_file = get_progress_file(bestiary_file)
    if os.path.exists(progress_file):
        with open(progress_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return set(data.get('translated_entries', []))
    return set()


def save_progress(bestiary_file: str, translated_entries: set):
    progress_file = get_progress_file(bestiary_file)
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump({
            'translated_entries': list(translated_entries)
        }, f, ensure_ascii=False, indent=2)


def make_entry_key(monster_name: str, field_type: str, entry_index: int, sub_index: int = 0) -> str:
    return f"{monster_name}|{field_type}|{entry_index}|{sub_index}"


# ============================================================
# FUNÇÕES DE TAGS
# ============================================================

def replace_tags(text: str) -> tuple:
    placeholder_map = {}
    def replace_tag(match):
        tag = match.group(0)
        placeholder = f"%%T{str(uuid.uuid4())[:8]}%%"
        placeholder_map[placeholder] = tag
        return placeholder
    result = TAG_PATTERN.sub(replace_tag, text)
    result = FORMAT_PATTERN.sub(replace_tag, result)
    return result, placeholder_map


def restore_tags(text: str, placeholder_map: dict) -> str:
    for placeholder, tag in placeholder_map.items():
        text = text.replace(placeholder, tag)
    return text


# ============================================================
# FUNÇÕES DE TRADUÇÃO
# ============================================================

def chunk_texts(texts: list[str], max_size: int = MAX_CHUNK_SIZE) -> list[list[str]]:
    chunks = []
    current_chunk = []
    current_size = 0
    for text in texts:
        text_len = len(text)
        if current_size + text_len > max_size and current_chunk:
            chunks.append(current_chunk)
            current_chunk = []
            current_size = 0
        current_chunk.append(text)
        current_size += text_len
    if current_chunk:
        chunks.append(current_chunk)
    return chunks


def translate_batch(texts: list[str], translator: GoogleTranslator) -> list[str]:
    if not texts:
        return []
    
    prepared_texts = []
    all_maps = []
    for text in texts:
        t, m = replace_tags(text)
        prepared_texts.append(t)
        all_maps.append(m)
    
    SEP = "\n¶¶¶\n"
    results = []
    batch_size = max(1, min(30, MAX_CHUNK_SIZE // max((len(t) for t in prepared_texts), default=1)))
    
    for start in range(0, len(prepared_texts), batch_size):
        batch = prepared_texts[start:start + batch_size]
        batch_maps = all_maps[start:start + batch_size]
        combined = SEP.join(batch)
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                translated = translator.translate(combined)
                if translated is None:
                    raise ValueError("None")
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(REQUEST_DELAY * 2)
                else:
                    for i, orig_text in enumerate(batch):
                        results.append(restore_tags(orig_text, batch_maps[i]))
                    continue
        
        parts = translated.split("¶¶¶")
        parts = [p.strip() for p in parts]
        while len(parts) < len(batch):
            parts.append("")
        parts = parts[:len(batch)]
        
        for i, (part, tag_map) in enumerate(zip(parts, batch_maps)):
            results.append(restore_tags(part, tag_map))
        
        if start + batch_size < len(prepared_texts):
            time.sleep(REQUEST_DELAY)
    
    return results


# ============================================================
# EXTRAÇÃO DE ENTRIADS DOS MONSTROS
# ============================================================

def extract_string_entries(monster_name: str, field: str, idx: int, item: dict) -> list:
    """
    Extrai entradas de texto de um item (que pode ser um trait, action, etc).
    Retorna lista de dicts com chave key e texto.
    """
    entries = []
    # NÃO traduzimos 'name' - fica em inglês para o sistema _copy
    
    if 'headerEntries' in item:
        for h_idx, entry in enumerate(item['headerEntries']):
            entries.append({
                'key': make_entry_key(monster_name, field, idx, h_idx),
                'text': entry
            })
    
    if 'entries' in item:
        for e_idx, entry in enumerate(item['entries']):
            if isinstance(entry, str):
                entries.append({
                    'key': make_entry_key(monster_name, field, idx, e_idx),
                    'text': entry
                })
    
    if 'footerEntries' in item:
        for f_idx, entry in enumerate(item['footerEntries']):
            entries.append({
                'key': make_entry_key(monster_name, field, idx, f_idx + 1000),
                'text': entry
            })
    
    return entries


def extract_entries_from_monster(monster: dict) -> list:
    """
    Extrai todas as entradas textuais de todos os campos do monstro.
    """
    entries_to_translate = []
    monster_name = monster.get('name', 'Unknown')
    
    # Campos que são arrays de objetos (trait, action, reaction, legendary, mythic, bonus)
    for field in FIELDS_TO_TRANSLATE:
        if field not in monster or monster[field] is None:
            continue
        for idx, item in enumerate(monster[field]):
            entries_to_translate.extend(extract_string_entries(monster_name, field, idx, item))
    
    # Campos especiais - 'lair' é um objeto único com entries
    if 'lair' in monster and monster['lair'] is not None:
        lair = monster['lair']
        if isinstance(lair, list):
            for idx, item in enumerate(lair):
                entries_to_translate.extend(extract_string_entries(monster_name, 'lair', idx, item))
        elif isinstance(lair, dict):
            entries_to_translate.extend(extract_string_entries(monster_name, 'lair', 0, lair))
    
    return entries_to_translate


def apply_translations(monsters: list, translations: dict):
    """
    Aplica as traduções de volta aos monstros.
    """
    for monster in monsters:
        monster_name = monster.get('name', 'Unknown')
        
        for field in FIELDS_TO_TRANSLATE:
            if field not in monster or monster[field] is None:
                continue
            for idx, item in enumerate(monster[field]):
                if 'headerEntries' in item:
                    for h_idx in range(len(item['headerEntries'])):
                        key = make_entry_key(monster_name, field, idx, h_idx)
                        if key in translations:
                            item['headerEntries'][h_idx] = translations[key]
                if 'entries' in item:
                    for e_idx in range(len(item['entries'])):
                        if isinstance(item['entries'][e_idx], str):
                            key = make_entry_key(monster_name, field, idx, e_idx)
                            if key in translations:
                                item['entries'][e_idx] = translations[key]
                if 'footerEntries' in item:
                    for f_idx in range(len(item['footerEntries'])):
                        key = make_entry_key(monster_name, field, idx, f_idx + 1000)
                        if key in translations:
                            item['footerEntries'][f_idx] = translations[key]
        
        if 'lair' in monster and monster['lair'] is not None:
            lair = monster['lair']
            items = lair if isinstance(lair, list) else [lair]
            for idx, item in enumerate(items):
                if 'headerEntries' in item:
                    for h_idx in range(len(item['headerEntries'])):
                        key = make_entry_key(monster_name, 'lair', idx, h_idx)
                        if key in translations:
                            item['headerEntries'][h_idx] = translations[key]
                if 'entries' in item:
                    for e_idx in range(len(item['entries'])):
                        if isinstance(item['entries'][e_idx], str):
                            key = make_entry_key(monster_name, 'lair', idx, e_idx)
                            if key in translations:
                                item['entries'][e_idx] = translations[key]
                if 'footerEntries' in item:
                    for f_idx in range(len(item['footerEntries'])):
                        key = make_entry_key(monster_name, 'lair', idx, f_idx + 1000)
                        if key in translations:
                            item['footerEntries'][f_idx] = translations[key]


# ============================================================
# BARRA DE PROGRESSO
# ============================================================

def print_progress_bar(current: int, total: int, prefix: str = "", suffix: str = "", 
                       current_file: str = "", current_monsters: int = 0,
                       total_monsters: int = 0, files_done: int = 0, total_files: int = 0):
    """Imprime uma barra de progresso animada no terminal."""
    terminal_width = shutil.get_terminal_size().columns
    bar_width = min(30, terminal_width - 40)
    
    if total > 0:
        percent = current / total
        filled = int(bar_width * percent)
        bar = '█' * filled + '░' * (bar_width - filled)
        pct = f"{percent:.0%}"
    else:
        bar = '░' * bar_width
        pct = "0%"
    
    # Linha 1: Barra de tradução atual
    line1 = f"\r  {prefix}[{bar}] {pct} | {current}/{total} {suffix}"
    if len(line1) > terminal_width:
        line1 = line1[:terminal_width - 3] + "..."
    
    sys.stdout.write(line1 + " " * max(0, terminal_width - len(line1)))
    
    # Linha 2: Info do arquivo e progresso geral
    if current_file:
        file_info = f"  📄 {current_file[:30]:30s} | "
        if total_files > 0:
            file_info += f"Arquivos: {files_done}/{total_files}"
        sys.stdout.write(f"\n{file_info}")
    
    sys.stdout.write(f"\n  👾 Monstros: {current_monsters}/{total_monsters}")
    
    sys.stdout.flush()


# ============================================================
# TRADUTOR DE ARQUIVO
# ============================================================

def translate_bestiary_file(bestiary_file: str, force: bool = False,
                           global_stats: dict = None):
    """
    Traduz um arquivo de bestiário inteiro.
    """
    filename = os.path.basename(bestiary_file)
    
    # Carrega progresso
    translated_keys = load_progress(bestiary_file)
    
    # Carrega arquivo JSON
    with open(bestiary_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'monster' not in data:
        if global_stats:
            global_stats['files_done'] += 1
        return
    
    monsters = data['monster']
    
    # Coleta entradas pendentes
    pending_entries = []
    for monster in monsters:
        entries = extract_entries_from_monster(monster)
        for entry in entries:
            if entry['key'] in translated_keys and not force:
                continue
            pending_entries.append(entry)
    
    total_pending = len(pending_entries)
    
    if total_pending == 0:
        if global_stats:
            global_stats['files_done'] += 1
            global_stats['skipped_files'] += 1
        return
    
    # Inicializa tradutor
    translator = GoogleTranslator(source=SOURCE_LANG, target=TARGET_LANG)
    
    # Prepara textos
    texts_to_translate = [entry['text'] for entry in pending_entries]
    text_chunks = chunk_texts(texts_to_translate, MAX_CHUNK_SIZE)
    
    all_translations = {}
    processed = 0
    
    for chunk_idx, chunk in enumerate(text_chunks):
        chunk_start = sum(len(c) for c in text_chunks[:chunk_idx])
        chunk_entries = pending_entries[chunk_start:chunk_start + len(chunk)]
        
        # Traduz lote
        translated_texts = translate_batch(chunk, translator)
        
        for entry, translated in zip(chunk_entries, translated_texts):
            all_translations[entry['key']] = translated
            translated_keys.add(entry['key'])
            processed += 1
        
        # Progresso ao vivo
        total_monsters = len(monsters)
        files_done = global_stats['files_done'] if global_stats else 0
        total_files = global_stats['total_files'] if global_stats else 1
        
        print_progress_bar(
            processed, total_pending,
            prefix=f"[{filename[:15]:15s}] ",
            suffix="entradas",
            current_file=filename,
            current_monsters=total_monsters,
            total_monsters=total_monsters,
            files_done=files_done,
            total_files=total_files
        )
        
        # Salva progresso a cada bloco
        save_progress(bestiary_file, translated_keys)
        
        if chunk_idx < len(text_chunks) - 1:
            time.sleep(REQUEST_DELAY)
    
    # Aplica as traduções
    apply_translations(monsters, all_translations)
    
    # Salva arquivo
    with open(bestiary_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')
    
    # Limpa linha da barra e mostra conclusão
    sys.stdout.write("\n" + " " * shutil.get_terminal_size().columns + "\r")
    print(f"  ✅ {filename} - {processed} entradas traduzidas (+{len(all_translations)} novas)")
    
    if global_stats:
        global_stats['files_done'] += 1
        global_stats['total_translated'] += processed


# ============================================================
# MAIN
# ============================================================

def translate_all_bestiary(force: bool = False):
    """Traduz TODOS os arquivos de bestiário com barra de progresso."""
    pattern = os.path.join(BESTIARY_DIR, 'bestiary-*.json')
    files = sorted(glob.glob(pattern))
    
    total_files = len(files)
    print(f"\n{'='*60}")
    print(f"📚 TRADUÇÃO COMPLETA DO BESTIÁRIO")
    print(f"{'='*60}")
    print(f"Total de arquivos: {total_files}")
    print(f"Campos: {', '.join(FIELDS_TO_TRANSLATE + SPECIAL_FIELDS)}")
    print(f"{'='*60}\n")
    
    global_stats = {
        'files_done': 0,
        'total_translated': 0,
        'skipped_files': 0,
        'total_files': total_files
    }
    
    for file_path in files:
        translate_bestiary_file(file_path, force=force, global_stats=global_stats)
    
    # Limpa barra final
    sys.stdout.write("\n" + " " * shutil.get_terminal_size().columns + "\r")
    
    print(f"\n{'='*60}")
    print(f"✅ TRADUÇÃO CONCLUÍDA!")
    print(f"  Arquivos processados: {global_stats['files_done']}/{total_files}")
    print(f"  Total de entradas traduzidas nesta sessão: {global_stats['total_translated']}")
    print(f"  Arquivos sem novas entradas: {global_stats['skipped_files']}")
    print(f"{'='*60}")


def translate_single_file(filename: str, force: bool = False):
    """Traduz um único arquivo de bestiário pelo nome."""
    if not filename.endswith('.json'):
        filename += '.json'
    
    file_path = os.path.join(BESTIARY_DIR, filename)
    if not os.path.exists(file_path):
        file_path = os.path.join(BESTIARY_DIR, f"bestiary-{filename}")
        if not os.path.exists(file_path):
            bare_name = filename.replace('bestiary-', '')
            file_path = os.path.join(BESTIARY_DIR, f"bestiary-{bare_name}")
    
    if not os.path.exists(file_path):
        print(f"Arquivo '{filename}' não encontrado em {BESTIARY_DIR}")
        print(f"Arquivos disponíveis:")
        for f in sorted(glob.glob(os.path.join(BESTIARY_DIR, 'bestiary-*.json'))):
            print(f"  - {os.path.basename(f)}")
        sys.exit(1)
    
    translate_bestiary_file(file_path, force=force)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Tradutor de Bestiário 5eTools - v2 (com todos os campos)'
    )
    parser.add_argument('file', nargs='?',
        help='Nome do arquivo (ex: aitfr-isf ou bestiary-aitfr-isf.json)')
    parser.add_argument('--all', action='store_true',
        help='Traduzir TODOS os arquivos')
    parser.add_argument('--force', action='store_true',
        help='Forçar retradução')
    parser.add_argument('--reset-progress', action='store_true',
        help='Resetar progresso para o arquivo')
    
    args = parser.parse_args()
    
    if args.reset_progress:
        if not args.file:
            print("Especifique um arquivo.")
            sys.exit(1)
        filename = args.file
        if not filename.endswith('.json'):
            filename += '.json'
        candidates = [
            os.path.join(PROGRESS_DIR, f"{filename}.progress.json"),
            os.path.join(PROGRESS_DIR, f"bestiary-{filename}.progress.json"),
        ]
        found = False
        for pf in candidates:
            if os.path.exists(pf):
                os.remove(pf)
                print(f"Progresso resetado para '{args.file}'")
                found = True
        if not found:
            print(f"Nenhum progresso encontrado")
        sys.exit(0)
    
    if args.all:
        translate_all_bestiary(force=args.force)
    elif args.file:
        translate_single_file(args.file, force=args.force)
    else:
        parser.print_help()
        print("\nExemplos:")
        print("  python translate_bestiary.py aitfr-isf")
        print("  python translate_bestiary.py --all")
        print("  python translate_bestiary.py --all --force")