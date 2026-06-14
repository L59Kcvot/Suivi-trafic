const fs = require('fs');

async function getTrafic() {
    try {
        // Requête officielle sur l'API IDFM (PRIM v2 LineReports) avec ta clé secrète
        const response = await fetch('https://prim.iledefrance-mobilites.fr/api/v2/gbfs/lines/station_status.json', {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'apiKey': 'WEtotfEFSLYs1wE9QMSK6nC46rvqnf4f' // Ta clé de hacker est là !
            }
        });

        if (!response.ok) throw new Error(`Erreur IDFM API : ${response.status}`);
        
        const data = await response.json();
        
        // On récupère la liste brute des lignes de l'API IDFM
        const linesRaw = data.data || [];
        
        // Tableaux vides pour trier proprement pour ton index.html
        const metros = [];
        const rers = [];
        const trams = [];

        linesRaw.forEach(item => {
            const nomLigne = (item.line_name || "").toString().toUpperCase().trim();
            const idLigne = (item.line_id || "").toString();
            const messageTrafic = item.text || "";
            const titreTrafic = item.title || "Information Trafic";
            
            // On détecte si le statut est normal ou pas
            const statusRaw = (item.status || "").toLowerCase();
            const estNormal = statusRaw.includes("normal") || statusRaw.includes("regular") || messageTrafic === "";

            const ligneFormatee = {
                line: item.line_code || "",
                slug: estNormal ? "normal" : "incident",
                title: titreTrafic,
                message: messageTrafic || "Trafic régulier sur l'ensemble de la ligne."
            };

            // On trie par type de transport selon le nom renvoyé par IDFM
            if (nomLigne.includes("MÉTRO")) {
                metros.push(ligneFormatee);
            } else if (nomLigne.includes("RER")) {
                rers.push(ligneFormatee);
            } else if (nomLigne.includes("TRAM")) {
                trams.push(ligneFormatee);
            }
        });

        // Structure finale propre que ton index.html va lire
        const structurePropre = {
            derniereMiseAJour: new Date().toISOString(),
            metros: metros,
            rers: rers,
            trams: trams
        };

        // On écrit le fichier trafic.json à la racine de ton GitHub
        fs.writeFileSync('trafic.json', JSON.stringify(structurePropre, null, 2));
        console.log("🔥 Le robot a braqué l'API IDFM avec succès ! Données à jour.");
    } catch (error) {
        console.error("Le robot IDFM a buggé :", error.message);
        // Backup de sécurité pour pas que le site crash
        fs.writeFileSync('trafic.json', JSON.stringify({ metros: [], rers: [], trams: [] }));
    }
}

getTrafic();
