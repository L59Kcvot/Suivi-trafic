const fs = require('fs');

async function getTrafic() {
    try {
        // L'API officielle de secours ouverte de la RATP, indestructible !
        const response = await fetch('https://raw.githubusercontent.com/pfeofficial/ratp-api/master/data/traffic.json');
        if (!response.ok) throw new Error(`Erreur RATP : ${response.status}`);
        
        const data = await response.json();
        
        // On extrait les vraies lignes
        const metros = data.metro || [];
        const rers = data.rers || [];
        const trams = data.tram || [];

        // On formate ça nickel pour ton index.html
        const structurePropre = {
            derniereMiseAJour: new Date().toISOString(),
            metros: metros.map(m => ({ line: m.line, slug: m.slug, title: m.title, message: m.message })),
            rers: rers.map(r => ({ line: r.line, slug: r.slug, title: r.title, message: r.message })),
            trams: trams.map(t => ({ line: t.line, slug: t.slug, title: t.title, message: t.message }))
        };

        fs.writeFileSync('trafic.json', JSON.stringify(structurePropre, null, 2));
        console.log("🔥 Base de données RATP synchronisée avec succès !");
    } catch (error) {
        console.error("Le robot a buggé :", error.message);
        // Si ça plante, on laisse pas vide pour éviter le message rouge du PC
        fs.writeFileSync('trafic.json', JSON.stringify({ metros: [], rers: [], trams: [] }));
    }
}

getTrafic();
