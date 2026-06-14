const fs = require('fs');

// Table de correspondance pour remettre les vrais noms simples dans ton fichier trafic.json
const idfmToNomUnique = {
    'C01371': '1', 'C01372': '2', 'C01373': '3', 'C01386': '3bis', 'C01374': '4',
    'C01375': '5', 'C01376': '6', 'C01377': '7', 'C01387': '7bis', 'C01378': '8',
    'C01379': '9', 'C01380': '10', 'C01381': '11', 'C01382': '12', 'C01383': '13', 'C01384': '14',
    'C01742': 'A', 'C01743': 'B', 'C01744': 'C', 'C01745': 'D', 'C01746': 'E',
    'C01389': '1', 'C01390': '2', 'C01391': '3a', 'C01392': '3b', 'C01819': '4',
    'C01684': '5', 'C01794': '6', 'C01795': '7', 'C01796': '8', 'C02317': '9'
};

async function getTrafic() {
    try {
        // Requête officielle avec ton super Token VIP sur le vrai flux de pannes
        const response = await fetch('https://prim.iledefrance-mobilites.fr/api/v2/gbfs/lines/line_reports.json', {
            method: 'GET',
            headers: { 'accept': '*/*', 'apiKey': 'WEtotfEFSLYs1wE9QMSK6nC46rvqnf4f' }
        });

        if (!response.ok) throw new Error(`Erreur API IDFM : ${response.status}`);
        const data = await response.json();
        const reports = data.line_reports || [];
        
        const metros = []; const rers = []; const trams = [];

        reports.forEach(item => {
            if (!item.line || !item.line.id) return;

            const lineIdRaw = item.line.id.toString().toUpperCase();
            
            // On extrait l'ID unique (ex: C01742 depuis STIF:Line::C01742:)
            const match = lineIdRaw.match(/C\d{5}/);
            if (!match) return;
            const cleanId = match[0];

            // On trouve le nom simple (ex: "A", "3bis") attendu par ton index.html
            const nomSimpleLigne = idfmToNomUnique[cleanId];
            if (!nomSimpleLigne) return;

            const titreIncident = item.cause || "Perturbation";
            const messageIncident = item.description || "Trafic perturbé.";
            const nomReseau = (item.line.network || "").toString().toUpperCase();

            const ligneFormatee = {
                line: nomSimpleLigne,
                slug: "incident",
                title: titreIncident,
                message: messageIncident
            };

            if (nomReseau.includes("MÉTRO") || nomReseau.includes("METRO")) {
                metros.push(ligneFormatee);
            } else if (nomReseau.includes("RER")) {
                rers.push(ligneFormatee);
            } else if (nomReseau.includes("TRAM")) {
                trams.push(ligneFormatee);
            }
        });

        // On génère le fichier trafic.json parfait que ton code adore
        fs.writeFileSync('trafic.json', JSON.stringify({ 
            derniereMiseAJour: new Date().toISOString(), 
            metros, rers, trams 
        }, null, 2));
        
        console.log("🔥 Le robot a traduit et mis à jour le trafic avec ton Token !");
    } catch (error) {
        console.error("Erreur robot :", error.message);
        fs.writeFileSync('trafic.json', JSON.stringify({ metros: [], rers: [], trams: [] }));
    }
}
getTrafic();
