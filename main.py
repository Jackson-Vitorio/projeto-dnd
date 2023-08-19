
import json
import requests
import translators as ts


def magias():
    spell = input("digite o nome da magia: ")
    req = requests.get("https://www.dnd5eapi.co/api/spells/" + spell)
    saida = json.loads(req.text)
    print("\n Nome: ", saida["name"], "\n")
    print("Descrição: ", saida["desc"], "\n")
    print("Tempo de cast: ", saida["casting_time"], "\n")
    print("Componentes: ", saida["components"], "\n")
    return




def monstros():
    monster = input("digite o nome do monstro: ")
    req = requests.get("https://www.dnd5eapi.co/api/monsters/" + monster)
    saida = json.loads(req.text)
    print("\n Nome: ", saida["name"], "\n")
    print("Tamanho: ", saida["size"], "\n")
    print("Tipo: ", saida["type"], "\n")
    print("Armadura: ", saida["armor_class"], "\n")
    print("Pontos de vida: ", saida["hit_points"], "\n")
    print("Ações: ", saida["actions"])
    return




escolhas = int(input(
    "oque voce deseja procurar ? \n para magias use 1 \n para monstros use 2: "))
if escolhas == 1:
    magias()
elif escolhas == 2:
    monstros()
else:
    print("erro")

