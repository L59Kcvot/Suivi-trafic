const fs = require('fs');

// Table de correspondance officielle PRIM -> Ton site
const idfmToNomUnique = {
    // Métros
    'C01371': '1', 'C01372': '2', 'C01373': '3', 'C01386': '3bis', 'C01374': '4',
    'C01375': '5', 'C01376': '6', 'C01377': '7', 'C01387': '7bis', 'C01378': '8',
    'C01379': '9', 'C01380': '10', 'C01381': '11', 'C01382': '12', 'C01383': '13', 'C01384': '14',
    // RER
    'C01742': 'A', 'C01743': 'B', 'C01727': 'C', 'C01728': 'D', 'C01729': 'E',
    // Trams
    'C01389': '1', 'C01390': '2', 'C01391': '3a', 'C01392': '3b', 'C01393': '4',
    'C01394': '5', 'C01395': '6', 'C01396': '7', 'C01397': '8', 'C01398': '9',
    'C01794': '10', 'C01795': '11', 'C01796': '12', 'C01797': '13', 'C01801': '14'
};

async function getTrafic() {
    try {
        const response = await fetch('https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/line_reports/line_reports', {
            method: 'GET',
            headers: { 'accept': 'application/json', 'apiKey': 'WEtotfEFSLYs1wE9QMSK6nC46rvqnf4f' }
        });

        if (!response.ok) throw new Error(`Erreur API IDFM : ${response.status}`);
        const data = await response.json();
        const reports = data.line_reports || [];
        
        const metros = []; const rers = []; const trams = [];
        
        // Charger l'historique
        let historique = {};
        if (fs.existsSync('historique.json')) {
            try { historique = json.parse(fs.readFileSync('historique.json', 'utf8')); } catch { historique = {}; }
        }

        const nowStr = new Date().toLocaleString("fr-FR", {timeZone: "Europe/Paris"}).substring(0, 16);

        // Pré-remplir tout le monde en trafic régulier
        Object.entries(idfmToNomUnique).forEach(([id, nom]) => {
            let item = { line: nom, slug: "normal", title: "Trafic régulier", message: "Trafic régulier sur l'ensemble de la ligne." };
            if (id.startsWith('C0137') || id === 'C01386' || id === 'C01387' || id.startsWith('C01380') || id.startsWith('C01381') || id.startsWith('C01382') || id.startsWith('C01383') || id.startsWith('C01384')) {
                if (!metros.some(m => m.line === nom)) metros.push(item);
            } else if (id === 'C01742' || id === 'C01743' || id === 'C01727' || id === 'C01728' || id === 'C01729') {
                if (!rers.some(r => r.line === nom)) rers.push(item);
            } else {
                if (!trams.some(t => t.line === nom)) trams.push(item);
            }
        });

        reports.forEach(item => {
            if (!item.line || !item.line.id) return;
            const match = item.line.id.toString().toUpperCase().match(/C\d{5}/);
            if (!match) return;
            const cleanId = match[0];
            const nomSimpleLigne = idfmToNomUnique[cleanId];
            if (!nomSimpleLigne) return;

            const lineAlerts = item.line_reports || [];
            if (lineAlerts.length > 0) {
                const alert = lineAlerts[0];
                const titreIncident = alert.title || "Perturbation";
                const messageIncident = alert.message || "Incident en cours.";
                const commercialMode = (item.line.commercial_mode?.name || "").toUpperCase();

                let cible = commercialMode.includes("RER") ? rers : (commercialMode.includes("TRAM") ? trams : metros);
                let ligneExistante = cible.find(l => l.line === nomSimpleLigne);
                
                if (ligneExistante) {
                    ligneExistante.slug = "alert";
                    ligneExistante.title = titreIncident;
                    ligneExistante.message = messageIncident;
                }

                // Sauvegarde Historique
                const typeLabel = commercialMode.includes("RER") ? "RER" : (commercialMode.includes("TRAM") ? "TRAMWAY T" : "MÉTRO");
                const nomHistorique = `${typeLabel} ${nomSimpleLigne}`;
                if (!historique[nomHistorique]) historique[nomHistorique] = [];
                
                if (historique[nomHistorique].length === 0 || historique[nomHistorique][historique[nomHistorique].length - 1].message !== messageIncident) {
                    historique[nomHistorique].push({ date: nowStr, title: titreIncident, message: messageIncident });
                }
            }
        });

        fs.writeFileSync('trafic.json', JSON.stringify({ metros, rers, trams }, null, 4));
        fs.writeFileSync('historique.json', JSON.stringify(historique, null, 4));
        console.log("🔥 Le robot JS a mis à jour le trafic et l'historique !");
    } catch (error) {
        console.error("Erreur robot :", error.message);
    }
}
getTrafic();
