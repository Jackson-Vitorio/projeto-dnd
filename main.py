import json
import requests
from translate import Translator

def magias():
    spell = input("Digite o nome da magia(usando > - < como espaço): ")
    req = requests.get("https://www.dnd5eapi.co/api/spells/" + spell)
    saida = json.loads(req.text)
    desc = saida["desc"][0]
    res = s.translate(desc)
    print("\nNome: ", saida["name"], "\n", "\nDescrição: ", res,
          "\n", "\nTempo de cast: ", saida["casting_time"], "\n")
    if "M" in saida["components"]:
        material_desc = saida["material"]
        material_traduct = s.translate(material_desc)
        print("Componente M (Material):", material_traduct, "\n")


    return

def monstros():
    monster = input("Digite o nome do monstro: ")
    req = requests.get("https://www.dnd5eapi.co/api/monsters/" + monster)
    saida = json.loads(req.text)
    print("\nNome: ", s.translate(saida["name"]), "\n", "Tamanho: ", s.translate(saida["size"]), "\n", "Tipo: ", s.translate(
        saida["type"]), "\n", "Armadura: ", saida["armor_class"], "\n", "Pontos de vida: ", saida["hit_points"])
    if "actions" in saida:
        translated_actions = [s.translate(action["name"])
                              for action in saida["actions"]]
        print("Ações: ", ",".join(translated_actions))


    return

s = Translator(from_lang="en", to_lang="pt")
escolhas = int(
    input("O que você deseja procurar?\nPara magias, use 1\nPara monstros, use 2: "))
if escolhas == 1:
    magias()
elif escolhas == 2:
    monstros()
else:
    print("Erro: Opção inválida.")


