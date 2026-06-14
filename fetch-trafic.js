const fs = require('fs');

async function getTrafic() {
    try {
        // On interroge l'API de secours ultra stable
        const response = await fetch('https://prochains-passages.les-transports.com/api/v1/traffic');
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        
        const data = await response.json();
        
        // On récupère la liste brute des métros, rers et trams
        const bruts = data.result || {};
        
        // Structure propre pour le site index.html
        const historique = {
            derniereMiseAJour: new Date().toISOString(),
            resultats: {
                metros: bruts.metros || [],
                rers: bruts.rers || [],
                trams: bruts.trams || []
            }
        };

        // On écrit le fichier proprement
        fs.writeFileSync('trafic.json', JSON.stringify(historique, null, 2));
        console.log("Données nettoyées et enregistrées avec succès !");
    } catch (error) {
        console.error("Le robot a buggé :", error.message);
        // En cas de plantage de l'API, on crée une fausse structure vide pour éviter le crash du site
        fs.writeFileSync('trafic.json', JSON.stringify({ 
            derniereMiseAJour: new Date().toISOString(), 
            resultats: { metros: [], rers: [], trams: [] } 
        }));
    }
}

getTrafic();
