import os
import requests
import json
from datetime import datetime

URL_API = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/line_reports/line_reports"
API_KEY = "C09mKshN7RVEFSLYs1wE9QMSK6nC46rvqnf4f"

headers = {
    "Accept": "application/json",
    "apikey": API_KEY
}

# Mapping exact entre les IDs barbares de l'API IDFM et les noms de ton site
MAPPING_LIGNES = {
    # Métros
    "line:IDFM:C01371": ("metro", "1"), "line:IDFM:C01372": ("metro", "2"), "line:IDFM:C01373": ("metro", "3"),
    "line:IDFM:C01386": ("metro", "3bis"), "line:IDFM:C01374": ("metro", "4"), "line:IDFM:C01375": ("metro", "5"),
    "line:IDFM:C01376": ("metro", "6"), "line:IDFM:C01377": ("metro", "7"), "line:IDFM:C01387": ("metro", "7bis"),
    "line:IDFM:C01378": ("metro", "8"), "line:IDFM:C01379": ("metro", "9"), "line:IDFM:C01380": ("metro", "10"),
    "line:IDFM:C01381": ("metro", "11"), "line:IDFM:C01382": ("metro", "12"), "line:IDFM:C01383": ("metro", "13"),
    "line:IDFM:C01384": ("metro", "14"),
    # RER
    "line:IDFM:C01742": ("rer", "A"), "line:IDFM:C01743": ("rer", "B"), "line:IDFM:C01718": ("rer", "C"),
    "line:IDFM:C01727": ("rer", "D"), "line:IDFM:C01728": ("rer", "E"),
    # Trams
    "line:IDFM:C01389": ("tram", "1"), "line:IDFM:C01390": ("tram", "2"), "line:IDFM:C01391": ("tram", "3a"),
    "line:IDFM:C01392": ("tram", "3b"), "line:IDFM:C01393": ("tram", "4"), "line:IDFM:C01394": ("tram", "5"),
    "line:IDFM:C01395": ("tram", "6"), "line:IDFM:C01396": ("tram", "7"), "line:IDFM:C01397": ("tram", "8"),
    "line:IDFM:C01398": ("tram", "9"), "line:IDFM:C01794": ("tram", "10"), "line:IDFM:C01795": ("tram", "11"),
    "line:IDFM:C01796": ("tram", "12"), "line:IDFM:C01797": ("tram", "13"), "line:IDFM:C01801": ("tram", "14")
}

def update_data():
    try:
        response = requests.get(URL_API, headers=headers)
        if response.status_code != 200:
            print(f"Erreur API PRIM: {response.status_code}")
            return
        raw_data = response.json()
    except Exception as e:
        print(f"Erreur de connexion: {e}")
        return

    trafic_actuel = {"metros": [], "rers": [], "trams": []}
    historique_file = "historique.json"
    historique = {}
    
    if os.path.exists(historique_file):
        with open(historique_file, "r", encoding="utf-8") as f:
            try: historique = json.load(f)
            except: historique = {}

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")

    # Initialisation de base
    for id_technique, (type_transport, nom_ligne) in MAPPING_LIGNES.items():
        key_json = "metros" if type_transport == "metro" else ("rers" if type_transport == "rer" else "trams")
        trafic_actuel[key_json].append({
            "line": nom_ligne,
            "slug": "normal",
            "title": "Trafic régulier",
            "message": "Trafic régulier sur l'ensemble de la ligne."
        })

    # Analyse sécurisée des incidents
    for report in raw_data.get("line_reports", []):
        line_obj = report.get("line")
        if not line_obj:
            continue
            
        line_id = line_obj.get("id")
        if line_id in MAPPING_LIGNES:
            type_transport, nom_ligne = MAPPING_LIGNES[line_id]
            key_json = "metros" if type_transport == "metro" else ("rers" if type_transport == "rer" else "trams")
            
            line_alerts = report.get("line_reports", [])
            if line_alerts:
                alert = line_alerts[0]
                title = alert.get("title", "Perturbation")
                message = alert.get("message", "Incident en cours.")
                
                for item in trafic_actuel[key_json]:
                    if item["line"] == nom_ligne:
                        item["slug"] = "alert"
                        item["title"] = title
                        item["message"] = message

                nom_historique = f"{type_transport.upper()} {nom_ligne}"
                if nom_historique not in historique:
                    historique[nom_historique] = []
                
                if not historique[nom_historique] or historique[nom_historique][-1]["message"] != message:
                    historique[nom_historique].append({
                        "date": now_str,
                        "title": title,
                        "message": message
                    })

    with open("trafic.json", "w", encoding="utf-8") as f:
        json.dump(trafic_actuel, f, ensure_ascii=False, indent=4)

    with open(historique_file, "w", encoding="utf-8") as f:
        json.dump(historique, f, ensure_ascii=False, indent=4)
        
    print("🤖 Mode Robot : OK")

if __name__ == "__main__":
    update_data()
