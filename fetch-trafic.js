const fs = require('fs');

async function getTrafic() {
    try {
        // On interroge l'API ouverte du trafic RATP
        const response = await fetch('https://api-ratp.melvin-lemoine.me/v1/traffic');
        const data = await response.json();
        
        const historique = {
            derniereMiseAJour: new Date().toISOString(),
            resultats: data.result
        };

        // On sauvegarde le résultat dans un fichier JSON pour ton site
        fs.writeFileSync('trafic.json', JSON.stringify(historique, null, 2));
        console.log("Données trafic mises à jour avec succès !");
    } catch (error) {
        console.error("Erreur lors de la récupération de l'API :", error);
    }
}

getTrafic();
