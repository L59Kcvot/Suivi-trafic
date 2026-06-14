const fs = require('fs');

async function getTrafic() {
    try {
        // LE VRAI FLUX DES PANNES DE LIGNES (line_reports) avec ton apiKey !
        const response = await fetch('https://prim.iledefrance-mobilites.fr/api/v2/gbfs/lines/line_reports.json', {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'apiKey': 'WEtotfEFSLYs1wE9QMSK6nC46rvqnf4f'
            }
        });

        if (!response.ok) throw new Error(`Erreur PRIM API : ${response.status}`);
        
        const data = await response.json();
        const reports = data.line_reports || [];
        
        const metros = [];
        const rers = [];
        const trams = [];

        reports.forEach(item => {
            if (!item.line) return;

            const codeLigne = (item.line.code || "").toString().toUpperCase().trim();
            const nomReseau = (item.line.network || "").toString().toUpperCase().trim();
            
            // On extrait le titre et la description de la panne
            const titreIncident = item.cause || "Perturbation";
            const messageIncident = item.description || "Trafic perturbé.";

            const ligneFormatee = {
                line: codeLigne,
                slug: "incident",
                title: titreIncident,
                message: messageIncident
            };

            // On trie selon le réseau IDFM
            if (nomReseau.includes("MÉTRO") || nomReseau.includes("METRO")) {
                metros.push(ligneFormatee);
            } else if (nomReseau.includes("RER")) {
                rers.push(ligneFormatee);
            } else if (nomReseau.includes("TRAM")) {
                trams.push(ligneFormatee);
            }
        });

        const structurePropre = {
            derniereMiseAJour: new Date().toISOString(),
            metros: metros,
            rers: rers,
            trams: trams
        };

        fs.writeFileSync('trafic.json', JSON.stringify(structurePropre, null, 2));
        console.log("🔥 Le robot a récupéré les VRAIES pannes IDFM !");
    } catch (error) {
        console.error("Erreur robot :", error.message);
        fs.writeFileSync('trafic.json', JSON.stringify({ metros: [], rers: [], trams: [] }));
    }
}

getTrafic();
