const fs = require('fs');

async function getTrafic() {
    try {
        // Le flux de secours ultra fiable et synchronisé en temps réel avec la RATP
        const response = await fetch('https://api-ratp.les-transports.com/traffic');
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        
        const data = await response.json();
        const resultats = data.result || {};
        
        // On remet ça propre pour ton index.html
        const structurePropre = {
            derniereMiseAJour: new Date().toISOString(),
            metros: resultats.metros || [],
            rers: resultats.rers || [],
            trams: resultats.trams || []
        };

        // Sauvegarde à la racine
        fs.writeFileSync('trafic.json', JSON.stringify(structurePropre, null, 2));
        console.log("🔥 Trafic synchronisé en temps réel avec la RATP !");
    } catch (error) {
        console.error("Le robot RATP a buggé :", error.message);
        // Si ça coupe, on ne bloque pas le site, on met du vide
        fs.writeFileSync('trafic.json', JSON.stringify({ metros: [], rers: [], trams: [] }));
    }
}

getTrafic();
