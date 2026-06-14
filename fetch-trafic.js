const fs = require('fs');

async function getTrafic() {
    try {
        // API de secours standard ouverte à tous sans token
        const response = await fetch('https://raw.githubusercontent.com/pfeofficial/baryon-assets/main/stif/traffic.json');
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        
        const data = await response.json();
        
        // On sauvegarde directement ce que renvoie l'API
        fs.writeFileSync('trafic.json', JSON.stringify(data, null, 2));
        console.log("Fichier trafic.json mis à jour proprement !");
    } catch (error) {
        console.error("Le robot a buggé :", error.message);
        // Backup au cas où pour éviter le message rouge
        fs.writeFileSync('trafic.json', JSON.stringify({ 
            metros: [], rers: [], trams: [] 
        }));
    }
}

getTrafic();
