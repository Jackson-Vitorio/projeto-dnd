#!/usr/bin/env python3
"""
Sistema de Tradução de Bestiário usando Google Tradutor (deep-translator)

- Traduz campos 'trait' e 'action' de arquivos de bestiário
- Divide textos grandes em blocos para não exceder limites da API
- Salva progresso para continuar de onde parou
- Preserva marcações especiais como {@tag ...} da tradução
- Altera o arquivo original diretamente
"""

import json
import os
import re
import sys
import time
import glob
import uuid
from pathlib import Path

from deep_translator import GoogleTranslator

# ============================================================
# CONFIGURAÇÕES
# ============================================================

# Diretório raiz dos dados do bestiário (resolvido relativo ao script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BESTIARY_DIR = os.path.join(SCRIPT_DIR, '..', '5etools-src-translation-main', 'data', 'bestiary')
BESTIARY_DIR = os.path.normpath(BESTIARY_DIR)

# Arquivo de progresso (salva quais entradas já foram traduzidas)
PROGRESS_DIR = os.path.join(SCRIPT_DIR, '.progress')

# Idioma
TARGET_LANG = 'pt'
SOURCE_LANG = 'en'

# Tamanho máximo de cada bloco de texto para tradução (caracteres)
# Google tradutor gratuito: ~5000 chars por requisição
MAX_CHUNK_SIZE = 4500

# Pausa entre requisições para evitar rate limiting (segundos)
REQUEST_DELAY = 0.3

# Padrão para tags do 5eTools: {@tag ...}
TAG_PATTERN = re.compile(r'\{@[^}]*\}')

# Padrão para formatação: {#b}, {/b}, {#i}, {/i}, etc.
FORMAT_PATTERN = re.compile(r'\{/?[#iub][^}]*\}')


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def get_progress_file(bestiary_file: str) -> str:
    """Retorna o caminho do arquivo de progresso para um arquivo de bestiário."""
    os.makedirs(PROGRESS_DIR, exist_ok=True)
    base_name = os.path.basename(bestiary_file)
    return os.path.join(PROGRESS_DIR, f"{base_name}.progress.json")


def load_progress(bestiary_file: str) -> set:
    """Carrega o progresso já salvo para um arquivo de bestiário."""
    progress_file = get_progress_file(bestiary_file)
    if os.path.exists(progress_file):
        with open(progress_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return set(data.get('translated_entries', []))
    return set()


def save_progress(bestiary_file: str, translated_entries: set):
    """Salva o progresso atual."""
    progress_file = get_progress_file(bestiary_file)
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump({
            'translated_entries': list(translated_entries)
        }, f, ensure_ascii=False, indent=2)


def make_entry_key(monster_name: str, field_type: str, entry_index: int, sub_index: int = 0) -> str:
    """Gera uma chave única para cada entrada traduzida."""
    return f"{monster_name}|{field_type}|{entry_index}|{sub_index}"


def replace_tags_with_placeholders(text: str) -> tuple:
    """
    Substitui tags por placeholders seguros (UUID).
    Retorna (texto_com_placeholders, dict {placeholder: tag_original})
    """
    placeholder_map = {}
    
    def replace_tag(match):
        tag = match.group(0)
        # Gera um placeholder único e curto
        placeholder = f"%%T{str(uuid.uuid4())[:8]}%%"
        placeholder_map[placeholder] = tag
        return placeholder
    
    result = TAG_PATTERN.sub(replace_tag, text)
    result = FORMAT_PATTERN.sub(replace_tag, result)
    return result, placeholder_map


def restore_tags_from_map(text: str, placeholder_map: dict) -> str:
    """Restaura as tags originais a partir do mapa de placeholders."""
    for placeholder, tag in placeholder_map.items():
        text = text.replace(placeholder, tag)
    return text


def chunk_texts(texts: list[str], max_size: int = MAX_CHUNK_SIZE) -> list[list[str]]:
    """
    Divide uma lista de textos em blocos que não excedam max_size caracteres.
    """
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


def translate_text_batch(texts: list[str], translator: GoogleTranslator) -> list[str]:
    """
    Traduz uma lista de textos em lote, usando separador resistente à tradução.
    Muito mais rápido que traduzir individualmente.
    """
    if not texts:
        return []
    
    # Prepara cada texto com placeholders para tags
    prepared_texts = []
    all_maps = []
    
    for text in texts:
        text_with_ph, tag_map = replace_tags_with_placeholders(text)
        prepared_texts.append(text_with_ph)
        all_maps.append(tag_map)
    
    # Separa em sub-lotes para não exceder limite de caracteres
    # Usa um marcador numérico como separador (resistente à tradução)
    SEP = "\n¶¶¶\n"
    
    results = []
    batch_size = max(1, min(30, MAX_CHUNK_SIZE // max((len(t) for t in prepared_texts), default=1)))
    
    for start in range(0, len(prepared_texts), batch_size):
        batch = prepared_texts[start:start + batch_size]
        batch_maps = all_maps[start:start + batch_size]
        
        # Junta com separador
        combined = SEP.join(batch)
        
        # Traduz
        max_retries = 3
        for attempt in range(max_retries):
            try:
                translated = translator.translate(combined)
                if translated is None:
                    raise ValueError("Tradução retornou None")
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(REQUEST_DELAY * 2)
                else:
                    print(f"    [ERRO] Lote falhou após {max_retries} tentativas: {e}")
                    # Retorna originais para este lote
                    for i, orig_text in enumerate(batch):
                        results.append(restore_tags_from_map(orig_text, batch_maps[i]))
                    continue
        
        # Divide pelo separador
        parts = translated.split("¶¶¶")
        parts = [p.strip() for p in parts]
        
        # Garante mesmo número de resultados
        while len(parts) < len(batch):
            parts.append("")
        parts = parts[:len(batch)]
        
        # Restaura tags em cada parte
        for i, (part, tag_map) in enumerate(zip(parts, batch_maps)):
            restored = restore_tags_from_map(part, tag_map)
            results.append(restored)
        
        # Pequena pausa entre lotes
        if start + batch_size < len(prepared_texts):
            time.sleep(REQUEST_DELAY)
    
    return results


def extract_entries_from_monster(monster: dict) -> list:
    """
    Extrai todas as entradas textuais de 'trait' e 'action' de um monstro.
    Retorna lista de dicts com informações para tradução.
    """
    entries_to_translate = []
    monster_name = monster.get('name', 'Unknown')
    
    for field in ['trait', 'action']:
        if field not in monster or monster[field] is None:
            continue
        
        for idx, item in enumerate(monster[field]):
            # NOTA: O campo 'name' NÃO é traduzido porque é usado como chave
            # pelo sistema _copy do 5eTools. Por exemplo, monstros que usam
            # _copy podem referenciar traits/actions pelo nome para modificá-los.
            # Traduzir o nome quebraria essas referências.
            # if 'name' in item:
            #     entries_to_translate.append(...)
            
            # headerEntries
            if 'headerEntries' in item:
                for h_idx, entry in enumerate(item['headerEntries']):
                    entries_to_translate.append({
                        'key': make_entry_key(monster_name, field, idx, h_idx),
                        'type': 'headerEntries',
                        'text': entry,
                        'field': field,
                        'idx': idx,
                        'sub_idx': h_idx,
                        'field_key': 'headerEntries'
                    })
            
            # entries (array de strings)
            if 'entries' in item:
                for e_idx, entry in enumerate(item['entries']):
                    if isinstance(entry, str):
                        entries_to_translate.append({
                            'key': make_entry_key(monster_name, field, idx, e_idx),
                            'type': 'entries',
                            'text': entry,
                            'field': field,
                            'idx': idx,
                            'sub_idx': e_idx,
                            'field_key': 'entries'
                        })
            
            # footerEntries
            if 'footerEntries' in item:
                for f_idx, entry in enumerate(item['footerEntries']):
                    entries_to_translate.append({
                        'key': make_entry_key(monster_name, field, idx, f_idx + 1000),
                        'type': 'footerEntries',
                        'text': entry,
                        'field': field,
                        'idx': idx,
                        'sub_idx': f_idx + 1000,
                        'field_key': 'footerEntries'
                    })
    
    return entries_to_translate


def apply_translations_to_monsters(monsters: list, translations: dict):
    """
    Aplica as traduções aos monstros no dicionário de dados.
    translations: dict {key: translated_text}
    """
    for monster in monsters:
        monster_name = monster.get('name', 'Unknown')

        # Processa cada monstro procurando por chaves de tradução
        for field in ['trait', 'action']:
            if field not in monster or monster[field] is None:
                continue
            
            for idx, item in enumerate(monster[field]):
                # Nome
                name_key = make_entry_key(monster_name, field, idx, -1)
                if name_key in translations:
                    item['name'] = translations[name_key]
                
                # headerEntries
                if 'headerEntries' in item:
                    for h_idx in range(len(item['headerEntries'])):
                        key = make_entry_key(monster_name, field, idx, h_idx)
                        if key in translations:
                            item['headerEntries'][h_idx] = translations[key]
                
                # entries
                if 'entries' in item:
                    for e_idx in range(len(item['entries'])):
                        if isinstance(item['entries'][e_idx], str):
                            key = make_entry_key(monster_name, field, idx, e_idx)
                            if key in translations:
                                item['entries'][e_idx] = translations[key]
                
                # footerEntries
                if 'footerEntries' in item:
                    for f_idx in range(len(item['footerEntries'])):
                        key = make_entry_key(monster_name, field, idx, f_idx + 1000)
                        if key in translations:
                            item['footerEntries'][f_idx] = translations[key]


def translate_bestiary_file(bestiary_file: str, force: bool = False):
    """
    Traduz um arquivo de bestiário inteiro.
    Se force=False, usa o progresso salvo para continuar de onde parou.
    """
    print(f"\n{'='*60}")
    print(f"Processando: {os.path.basename(bestiary_file)}")
    print(f"{'='*60}")
    
    # Carrega progresso
    translated_keys = load_progress(bestiary_file)
    print(f"  Progresso anterior: {len(translated_keys)} entradas já traduzidas")
    
    # Carrega arquivo JSON
    with open(bestiary_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'monster' not in data:
        print(f"  [AVISO] '{bestiary_file}' não contém 'monster'. Pulando.")
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
    print(f"  Total de monstros: {len(monsters)}")
    print(f"  Entradas a traduzir: {total_pending}")
    
    if total_pending == 0:
        print(f"  Nenhuma entrada pendente!")
        return
    
    # Inicializa tradutor
    translator = GoogleTranslator(source=SOURCE_LANG, target=TARGET_LANG)
    
    # Prepara textos para tradução
    texts_to_translate = [entry['text'] for entry in pending_entries]
    
    # Divide em chunks
    text_chunks = chunk_texts(texts_to_translate, MAX_CHUNK_SIZE)
    
    all_translations = {}
    processed = 0
    
    print(f"  Dividido em {len(text_chunks)} bloco(s) de tradução")
    
    for chunk_idx, chunk in enumerate(text_chunks):
        # Pega as entradas correspondentes a este chunk
        chunk_start = sum(len(c) for c in text_chunks[:chunk_idx])
        chunk_entries = pending_entries[chunk_start:chunk_start + len(chunk)]
        
        chunk_size = sum(len(t) for t in chunk)
        print(f"\n  Bloco {chunk_idx + 1}/{len(text_chunks)}: "
              f"{len(chunk)} textos, ~{chunk_size} caracteres")
        
        # Traduz o chunk inteiro em lote (muito mais rápido)
        translated_texts = translate_text_batch(chunk, translator)
        
        for t_idx, (entry, translated) in enumerate(zip(chunk_entries, translated_texts)):
            all_translations[entry['key']] = translated
            translated_keys.add(entry['key'])
            processed += 1
        
        print(f"    Bloco concluído: {len(chunk)} textos traduzidos em lote")
        
        # Salva progresso após cada bloco
        save_progress(bestiary_file, translated_keys)
        print(f"  [PROGRESSO] Total acumulado: {len(translated_keys)} entradas")
        
        # Pausa entre blocos
        if chunk_idx < len(text_chunks) - 1:
            time.sleep(REQUEST_DELAY)
    
    # Aplica as traduções
    print(f"\n  Aplicando traduções ao arquivo original...")
    apply_translations_to_monsters(monsters, all_translations)
    
    # Salva arquivo
    with open(bestiary_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')
    
    print(f"\n  ✅ Tradução concluída para '{os.path.basename(bestiary_file)}'!")
    print(f"  Total: {processed} entradas traduzidas")


def translate_all_bestiary(force: bool = False):
    """Traduz TODOS os arquivos de bestiário."""
    pattern = os.path.join(BESTIARY_DIR, 'bestiary-*.json')
    files = sorted(glob.glob(pattern))
    
    print(f"Encontrados {len(files)} arquivos de bestiário para processar.")
    
    for file_path in files:
        translate_bestiary_file(file_path, force=force)


def translate_single_file(filename: str, force: bool = False):
    """Traduz um único arquivo de bestiário pelo nome."""
    # Adiciona extensão .json se não tiver
    if not filename.endswith('.json'):
        filename += '.json'
    
    # Tenta o nome exato
    file_path = os.path.join(BESTIARY_DIR, filename)
    if not os.path.exists(file_path):
        # Tenta com prefixo bestiary-
        file_path = os.path.join(BESTIARY_DIR, f"bestiary-{filename}")
        if not os.path.exists(file_path):
            # Tenta só o nome sem prefixo
            bare_name = filename.replace('bestiary-', '')
            file_path = os.path.join(BESTIARY_DIR, f"bestiary-{bare_name}")
    
    if not os.path.exists(file_path):
        print(f"Arquivo '{filename}' não encontrado em {BESTIARY_DIR}")
        print(f"Arquivos disponíveis:")
        for f in sorted(glob.glob(os.path.join(BESTIARY_DIR, 'bestiary-*.json'))):
            print(f"  - {os.path.basename(f)}")
        sys.exit(1)
    
    translate_bestiary_file(file_path, force=force)


# ============================================================
# MAIN
# ============================================================

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Tradutor de Bestiário 5eTools usando Google Tradutor'
    )
    parser.add_argument(
        'file',
        nargs='?',
        help='Nome do arquivo de bestiário para traduzir (ex: bestiary-aitfr-isf.json ou aitfr-isf)'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Traduzir TODOS os arquivos de bestiário'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Forçar retradução de entradas já traduzidas'
    )
    parser.add_argument(
        '--reset-progress',
        action='store_true',
        help='Resetar progresso salvo para o arquivo'
    )
    
    args = parser.parse_args()
    
    # Resetar progresso
    if args.reset_progress:
        if not args.file:
            print("Especifique um arquivo para resetar o progresso.")
            sys.exit(1)
        
        filename = args.file
        if not filename.endswith('.json'):
            filename += '.json'
        
        # Tenta encontrar o arquivo de progresso
        candidates = [
            os.path.join(PROGRESS_DIR, f"{filename}.progress.json"),
            os.path.join(PROGRESS_DIR, f"bestiary-{filename}.progress.json"),
        ]
        
        found = False
        for prog_file in candidates:
            if os.path.exists(prog_file):
                os.remove(prog_file)
                print(f"Progresso resetado para '{args.file}'")
                found = True
                break
        
        if not found:
            print(f"Nenhum progresso encontrado para '{args.file}'")
        sys.exit(0)
    
    if args.all:
        translate_all_bestiary(force=args.force)
    elif args.file:
        translate_single_file(args.file, force=args.force)
    else:
        parser.print_help()
        print("\n\nExemplos de uso:")
        print("  python translate_bestiary.py aitfr-isf")
        print("  python translate_bestiary.py bestiary-aitfr-isf.json")
        print("  python translate_bestiary.py --all")
        print("  python translate_bestiary.py aitfr-isf --force")
        print("  python translate_bestiary.py aitfr-isf --reset-progress")