const fs = require('fs');

async function getTrafic() {
    try {
        // Interrogation directe de la plateforme Open Data RATP
        const responseMetro = await fetch('https://data.ratp.fr/api/explore/v2.1/catalog/datasets/trafic-metro-ratp/records?limit=30');
        const responseRer = await fetch('https://data.ratp.fr/api/explore/v2.1/catalog/datasets/trafic-rers-ratp/records?limit=10');
        const responseTram = await fetch('https://data.ratp.fr/api/explore/v2.1/catalog/datasets/trafic-tramways-ratp/records?limit=20');

        if (!responseMetro.ok || !responseRer.ok || !responseTram.ok) {
            throw new Error("Impossible de joindre les serveurs Open Data.");
        }

        const dataMetro = await responseMetro.json();
        const dataRer = await responseRer.json();
        const dataTram = await responseTram.json();

        // Fonction magique pour nettoyer la réponse brute
        const filtrerData = (records) => {
            return (records.results || []).map(item => {
                const textTrafic = item.texte || "";
                const titreTrafic = item.titre || "";
                
                // Si le texte dit que c'est normal, le slug est "normal"
                const estNormal = textTrafic.toLowerCase().includes("normal") || titreTrafic.toLowerCase().includes("normal");

                return {
                    line: item.ligne.toString().trim(),
                    slug: estNormal ? "normal" : "incident",
                    title: item.titre || "Information",
                    message: item.texte || "Trafic régulier."
                };
            });
        };

        const structureFinale = {
            derniereMiseAJour: new Date().toISOString(),
            metros: filtrerData(dataMetro),
            rers: filtrerData(dataRer),
            trams: filtrerData(dataTram)
        };

        fs.writeFileSync('trafic.json', JSON.stringify(structureFinale, null, 2));
        console.log("🔥 L'API Open Data a parlé ! Données en temps réel enregistrées !");
    } catch (error) {
        console.error("Erreur robot :", error.message);
        // Backup si bug pour ne pas bloquer l'index.html
        fs.writeFileSync('trafic.json', JSON.stringify({ metros: [], rers: [], trams: [] }));
    }
}

getTrafic();
