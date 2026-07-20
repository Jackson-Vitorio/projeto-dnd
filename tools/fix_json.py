#!/usr/bin/env python3
"""
Ferramenta para reparar arquivos JSON corrompidos.
Remove caracteres de controle inválidos e corrige problemas comuns de parser.
"""
import json, os, re, glob, sys

DATA_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '5etools-src-translation-main', 'data'))

def repair_file(fpath):
    """Tenta reparar um arquivo JSON corrompido."""
    with open(fpath, 'rb') as f:
        raw = f.read()
    
    # 1. Remove bytes de controle (0x00-0x1F) exceto tab(0x09), lf(0x0A), cr(0x0D)
    # Também remove 0x7F
    cleaned = bytearray()
    for b in raw:
        if b == 0x09 or b == 0x0A or b == 0x0D or (b >= 0x20 and b != 0x7F):
            cleaned.append(b)
    
    content = cleaned.decode('utf-8', errors='replace')
    content = content.replace('\ufffd', ' ')  # substitui caracteres de substituição
    
    # 2. Corrige campos vazios: "type": ,  -> "type": "",
    content = re.sub(r'\"(\w+)\"\s*:\s*,', r'"\1": "",', content)
    
    # 3. Remove vírgulas soltas em arrays (ocorre em tags arrays danificados)
    content = re.sub(r',\s*,', ',', content)
    content = re.sub(r'\[\s*,', '[', content)
    
    # 4. Tenta parsear
    decoder = json.JSONDecoder()
    try:
        data, idx = decoder.raw_decode(content)
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent='\t')
        return True
    except json.JSONDecodeError:
        # 5. Se ainda falhar, tenta encontrar o JSON principal
        try:
            start = content.index('{')
            for end in range(start + 1, len(content)):
                try:
                    data, idx = decoder.raw_decode(content, start)
                    break
                except json.JSONDecodeError:
                    continue
            
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent='\t')
            return True
        except:
            return False

def main():
    force = '--force' in sys.argv
    
    # Encontra arquivos corrompidos
    corrompidos = []
    for fpath in sorted(glob.glob(os.path.join(DATA_DIR, '**/*.json'), recursive=True)):
        try:
            with open(fpath, 'rb') as f:
                json.loads(f.read().decode('utf-8', errors='strict'))
        except:
            corrompidos.append(fpath)
    
    print(f'Arquivos corrompidos: {len(corrompidos)}')
    
    reparados = 0
    falhas = 0
    for fpath in corrompidos:
        nome = os.path.relpath(fpath, DATA_DIR)
        print(f'  Reparando {nome}...', end=' ')
        if repair_file(fpath):
            print('✅ OK')
            reparados += 1
        else:
            print('❌ Falha')
            falhas += 1
    
    print(f'\nReparados: {reparados}, Falhas: {falhas}')

if __name__ == '__main__':
    main()