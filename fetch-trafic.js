const fs = require('fs');

// Table de correspondance élargie pour bloquer toutes les variantes d'IDFM
const idfmToNomUnique = {
    // Métros
    'C01371': '1', 'C01372': '2', 'C01373': '3', 'C01386': '3bis', 'C01374': '4',
    'C01375': '5', 'C01376': '6', 'C01377': '7', 'C01387': '7bis', 'C01378': '8',
    'C01379': '9', 'C01380': '10', 'C01381': '11', 'C01382': '12', 'C01383': '13', 'C01384': '14',
    // RER (Inclusion des anciennes et nouvelles variantes IDFM)
    'C01742': 'A', 'C01724': 'A', 
    'C01743': 'B', 'C01725': 'B',
    'C01727': 'C', 'C01718': 'C', 
    'C01728': 'D', 'C01727': 'D', 
    'C01729': 'E', 'C01728': 'E',
    // Trams
    'C01389': '1', 'C01390': '2', 'C01391': '3a', 'C01392': '3b', 'C01393': '4',
    'C01394': '5', 'C01395': '6', 'C01396': '7', 'C01397': '8', 'C01398': '9',
    'C01794': '10', 'C01795': '11', 'C01796': '12', 'C01797': '13', 'C01801': '14'
};

async function getTrafic() {
    try {
        // Ajout d'un paramètre pour forcer la fraîcheur des données de l'API
        const response = await fetch('https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/line_reports/line_reports?count=100', {
            method: 'GET',
            headers: { 'accept': 'application/json', 'apiKey': 'WEtotfEFSLYs1wE9QMSK6nC46rvqnf4f' }
        });

        if (!response.ok) throw new Error(`Erreur API IDFM : ${response.status}`);
        const data = await response.json();
        const reports = data.line_reports || [];
        
        console.log(`🤖 Nombre de rapports récupérés de l'API : ${reports.length}`);

        const metros = []; const rers = []; const trams = [];
        let historique = {};
        if (fs.existsSync('historique.json')) {
            try { historique = JSON.parse(fs.readFileSync('historique.json', 'utf8')); } catch { historique = {}; }
        }

        const nowStr = new Date().toLocaleString("fr-FR", {timeZone: "Europe/Paris"}).substring(0, 16);

        // Remplissage initial en Vert (Trafic Régulier)
        Object.entries(idfmToNomUnique).forEach(([id, nom]) => {
            let item = { line: nom, slug: "normal", title: "Trafic régulier", message: "Trafic régulier sur l'ensemble de la ligne." };
            if (id.startsWith('C0137') || ['C01386', 'C01387', 'C01380', 'C01381', 'C01382', 'C01383', 'C01384'].includes(id)) {
                if (!metros.some(m => m.line === nom)) metros.push(item);
            } else if (['C01742', 'C01724', 'C01743', 'C01725', 'C01727', 'C01718', 'C01728', 'C01729'].includes(id)) {
                if (!rers.some(r => r.line === nom)) rers.push(item);
            } else {
                if (!trams.some(t => t.line === nom)) trams.push(item);
            }
        });

        // Analyse des incidents réels
        reports.forEach(item => {
            if (!item.line || !item.line.id) return;
            const lineIdRaw = item.line.id.toString().toUpperCase();
            const match = lineIdRaw.match(/C\d{5}/);
            if (!match) return;
            const cleanId = match[0];
            
            const nomSimpleLigne = idfmToNomUnique[cleanId];
            const lineAlerts = item.line_reports || [];

            if (lineAlerts.length > 0 && nomSimpleLigne) {
                const alert = lineAlerts[0];
                const titreIncident = alert.title || "Perturbation";
                const messageIncident = alert.text || alert.message || "Incident en cours.";
                
                console.log(`⚠️ INCIDENT DÉTECTÉ sur la ligne ${nomSimpleLigne} (ID: ${cleanId})`);

                // Recherche et mise à jour de l'état dans nos tableaux
                [metros, rers, trams].forEach(grid => {
                    let l = grid.find(x => x.line === nomSimpleLigne);
                    if (l) {
                        l.slug = "alert";
                        l.title = titreIncident;
                        l.message = messageIncident;
                    }
                });

                // Enregistrement dans l'historique
                const nomHistorique = `Ligne ${nomSimpleLigne}`;
                if (!historique[nomHistorique]) historique[nomHistorique] = [];
                if (historique[nomHistorique].length === 0 || historique[nomHistorique][historique[nomHistorique].length - 1].message !== messageIncident) {
                    historique[nomHistorique].push({ date: nowStr, title: titreIncident, message: messageIncident });
                }
            }
        });

        fs.writeFileSync('trafic.json', JSON.stringify({ metros, rers, trams }, null, 4));
        fs.writeFileSync('historique.json', JSON.stringify(historique, null, 4));
        console.log("🔥 Fichiers JSON mis à jour avec succès !");
    } catch (error) {
        console.error("Erreur robot :", error.message);
    }
}
getTrafic();
