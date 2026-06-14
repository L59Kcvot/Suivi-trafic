const fs = require('fs');

async function getTrafic() {
    try {
        // Nouvelle API libre, ultra stable et mise à jour en temps réel
        const response = await fetch('https://prochains-passages.les-transports.com/api/v1/traffic');
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        
        const data = await response.json();
        
        // On sauvegarde le résultat direct
        const historique = {
            derniereMiseAJour: new Date().toISOString(),
            resultats: data.result || {}
        };

        fs.writeFileSync('trafic.json', JSON.stringify(historique, null, 2));
        console.log("Données trafic rechargées avec succès !");
    } catch (error) {
        console.error("Le robot a buggé :", error.message);
        fs.writeFileSync('trafic.json', JSON.stringify({ error: error.message, result: {} }));
    }
}

getTrafic();
