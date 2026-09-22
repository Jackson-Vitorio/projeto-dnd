import json, re

def strings(o):
    if isinstance(o, str): yield o
    elif isinstance(o, dict):
        for v in o.values(): yield from strings(v)
    elif isinstance(o, list):
        for v in o: yield from strings(v)

rs = json.load(open('data/races.json'))
subs = [s for s in rs['subrace'] if s.get('name') in ('Fallen', 'Scourge', 'Protector')]
for s in subs:
    for e in s.get('entries', []):
        if e.get('name') in ('Necrotic Shroud', 'Radiant Soul', 'Radiant Consumption'):
            txt = ' '.join(x if isinstance(x, str) else '' for x in e.get('entries', []))
            print(s['raceName'] + '/' + s['name'], '->')
            print('  ', txt)
            print()

# padrão "não pode usar novamente até concluir descanso X" em todas as raças/sub-raças
pat = re.compile(r'(n[aã]o\s+(?:poder[aá]|pode)[^.]{0,60}(?:novamente|de novo)|depois de usar[^.]{0,40})[^.]{0,80}descanso\s+(longo|curto)', re.I | re.S)
count = 0; exemplos = []
def walk_named(o, rname, fname):
    global count
    if isinstance(o, dict):
        n = o.get('name'); e = o.get('entries')
        if n and isinstance(e, list):
            txt = ' '.join(x for x in strings(e))
            m = pat.search(txt)
            if m:
                count += 1
                exemplos.append((rname, n, m.group(0)[:90], txt[:60]))
        for v in o.values(): walk_named(v, rname, fname)
    elif isinstance(o, list):
        for v in o: walk_named(v, rname, fname)

for r in rs['race']:
    walk_named(r.get('entries', []), r['name'] + ' (' + r.get('source', '?') + ')', None)
for s in rs['subrace']:
    walk_named(s.get('entries', []), s.get('raceName', '?') + '/' + s.get('name', '?') + ' (' + s.get('source', '?') + ')', None)

print('=== TRAÇOS RAÇA/SUB-RAÇA com padrão "novamente...descanso":', count, '===')
for e in exemplos:
    print('  ', e[0], '|', e[1], '|', e[2].replace('\n', ' '))

# o mesmo padrão em feats e features de classe (todas as classes)
ft = json.load(open('data/feats.json'))
fc = 0; fex = []
for f in ft.get('feat', []):
    txt = ' '.join(x for x in strings(f.get('entries', [])))
    if pat.search(txt):
        fc += 1
        if len(fex) < 8: fex.append(f['name'] + ' (' + f.get('source', '?') + ')')
print()
print('=== TALENTOS com padrão "novamente...descanso":', fc, '===')
print('  ', ' | '.join(fex))

total_cf = 0; cex = []
import glob
for path in glob.glob('data/class/class-*.json'):
    j = json.load(open(path))
    for f in j.get('classFeature', []) + j.get('subclassFeature', []):
        txt = ' '.join(x for x in strings(f.get('entries', [])))
        if pat.search(txt):
            total_cf += 1
            if len(cex) < 10: cex.append(f['name'] + ' (' + path.split('-')[-1].replace('.json', '') + ' nv' + str(f.get('level', '?')) + ')')
print()
print('=== FEATURES DE CLASSE com padrão "novamente...descanso":', total_cf, '===')
print('  ', ' | '.join(cex))

