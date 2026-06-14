const fs = require('fs');

async function getTrafic() {
    try {
        // On utilise l'API directe et officielle des données du trafic RATP
        const response = await fetch('https://data.ratp.fr/api/explore/v2.1/catalog/datasets/trafic-rattache-au-compte-twitter/records?limit=100');
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        const data = await response.json();
        
        // On formate les données proprement pour notre fichier
        const historique = {
            derniereMiseAJour: new Date().toISOString(),
            resultats: data.results || []
        };

        // On crée de force le fichier
        fs.writeFileSync('trafic.json', JSON.stringify(historique, null, 2));
        console.log("Fichier trafic.json créé avec succès !");

    } catch (error) {
        console.error("Le script a planté :", error.message);
        // On crée quand même un fichier vide pour éviter que le robot GitHub plante sur l'étape suivante
        fs.writeFileSync('trafic.json', JSON.stringify({ error: error.message, date: new Date().toISOString() }));
    }
}

getTrafic();
