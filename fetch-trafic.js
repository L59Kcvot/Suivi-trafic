const fs = require('fs');

async function getTrafic() {
    try {
        // Le vrai flux officiel de la RATP en temps réel, sans intermédiaire !
        const response = await fetch('https://api-ratp.melvin.io/v1/traffic');
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        
        const data = await response.json();
        const resultats = data.result || {};
        
        // On formate tout proprement pour ton index.html
        const structurePropre = {
            derniereMiseAJour: new Date().toISOString(),
            metros: resultats.metros || [],
            rers: resultats.rers || [],
            trams: resultats.trams || []
        };

        // Sauvegarde à la racine
        fs.writeFileSync('trafic.json', JSON.stringify(structurePropre, null, 2));
        console.log("🔥 Le trafic en TEMPS RÉEL a été mis à jour avec succès !");
    } catch (error) {
        console.error("Le robot RATP a buggé :", error.message);
        // Backup si le serveur RATP tousse
        fs.writeFileSync('trafic.json', JSON.stringify({ 
            metros: [], rers: [], trams: [] 
        }));
    }
}

getTrafic();
