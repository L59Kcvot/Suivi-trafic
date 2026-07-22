/**
 * fetch-trafic.js
 * -----------------------------------------------------------------------
 * Ce script :
 *   1. interroge l'API "line_reports" de PRIM (Île-de-France Mobilités)
 *   2. reconstruit trafic.json (état ACTUEL de chaque ligne)
 *   3. met à jour historique.json (garde une trace de tous les incidents,
 *      avec leur date de début et de fin)
 *
 * Il est fait pour tourner via GitHub Actions (voir .github/workflows/update-trafic.yml)
 * mais tu peux aussi le lancer toi-même en local avec :
 *      PRIM_API_KEY=ta_cle node fetch-trafic.js
 *
 * Il ne nécessite AUCUNE librairie externe (Node 20+ a fetch() intégré).
 * -----------------------------------------------------------------------
 */

const fs = require('fs');

const API_KEY = process.env.PRIM_API_KEY;
const ENDPOINT =
  'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/line_reports/line_reports' +
  '?count=100&forbidden_uris[]=physical_mode:Bus&forbidden_uris[]=physical_mode:Coach';

const TRAFIC_FILE = 'trafic.json';
const HISTORIQUE_FILE = 'historique.json';

// -----------------------------------------------------------------------
// TABLE DES LIGNES QUE L'ON SUIT (doit correspondre aux logos dans index.html)
// -----------------------------------------------------------------------
const METROS = ['1', '2', '3', '3bis', '4', '5', '6', '7', '7bis', '8', '9', '10', '11', '12', '13', '14'];
const RERS = ['A', 'B', 'C', 'D', 'E'];
const TRAMS = ['1', '2', '3a', '3b', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];

// Si jamais une ligne ne se fait pas reconnaître automatiquement (voir logs
// de l'action GitHub), tu peux forcer la correspondance ici :
// "code renvoyé par l'API" -> "notre slug interne"
const ALIASES = {
  metro: { '3B': '3bis', '7B': '7bis' },
  tram: { T1: '1', T2: '2', T3A: '3a', T3B: '3b', T4: '4', T5: '5', T6: '6', T7: '7', T8: '8', T9: '9', T10: '10', T11: '11', T12: '12', T13: '13', T14: '14' },
  rer: {},
};

function normalize(str) {
  return (str || '').toString().trim().toLowerCase();
}

// Devine le "type" (metro/rer/tram) et le "slug" (ex: '3bis', 'a', '3a')
// à partir de l'objet "line" renvoyé par l'API Navitia.
function classifyLine(line) {
  const mode = normalize(line.commercial_mode && line.commercial_mode.name);
  const rawCode = (line.code || line.name || '').toString().trim();

  let type = null;
  if (mode.includes('metro') || mode.includes('étro')) type = 'metro';
  else if (mode.includes('rer')) type = 'rer';
  else if (mode.includes('tram')) type = 'tram';
  else return null;

  let slug = normalize(rawCode);

  const aliasTable = ALIASES[type];
  if (aliasTable && aliasTable[rawCode.toUpperCase()]) {
    slug = normalize(aliasTable[rawCode.toUpperCase()]);
  }

  // petites normalisations courantes
  slug = slug.replace(/^t/, ''); // "t3a" -> "3a"
  slug = slug.replace('bis', 'bis'); // no-op, gardé explicite pour lisibilité

  const list = type === 'metro' ? METROS : type === 'rer' ? RERS : TRAMS;
  const match = list.find((l) => normalize(l) === slug);
  if (!match) return null;

  return { type, slug: match };
}

async function main() {
  if (!API_KEY) {
    console.error('❌ Il manque la variable d\'environnement PRIM_API_KEY.');
    process.exit(1);
  }

  console.log('→ Interrogation de l\'API PRIM...');
  const res = await fetch(ENDPOINT, {
    headers: { apikey: API_KEY, Accept: 'application/json' },
  });

  if (!res.ok) {
    console.error(`❌ Erreur API PRIM : ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const lineReports = data.line_reports || [];
  const allDisruptions = data.disruptions || [];

  console.log(`→ ${lineReports.length} lignes reçues, ${allDisruptions.length} perturbations en cours.`);

  // Résultat "état actuel"
  const result = { metros: [], rers: [], trams: [], updated_at: new Date().toISOString() };
  const unrecognized = [];

  // Perturbations actives à cet instant, indexées par "type-slug"
  const activeByLine = {}; // { "metro-1": [ {id, title, message} ] }

  for (const report of lineReports) {
    const line = report.line;
    if (!line) continue;
    const classified = classifyLine(line);
    if (!classified) {
      unrecognized.push(`${line.commercial_mode && line.commercial_mode.name} / ${line.code || line.name}`);
      continue;
    }
    const key = `${classified.type}-${classified.slug}`;

    // Les perturbations liées à cette ligne apparaissent dans "line.links"
    // (Navitia) ou, plus fiable, en croisant impacted_objects du tableau
    // global "disruptions" avec l'id de la ligne.
    const linked = allDisruptions.filter((d) =>
      (d.impacted_objects || []).some(
        (io) => io.pt_object && io.pt_object.id === line.id
      )
    );

    if (linked.length > 0) {
      activeByLine[key] = linked.map((d) => ({
        id: d.disruption_id || d.id,
        title: (d.severity && d.severity.name) || 'Perturbation',
        message:
          (d.messages && d.messages[0] && d.messages[0].text) ||
          d.cause ||
          'Perturbation en cours, plus de détails sur le site officiel.',
      }));
    }
  }

  if (unrecognized.length) {
    console.log('⚠️ Lignes reçues mais non reconnues (bus/car exclus normalement) :');
    console.log([...new Set(unrecognized)].slice(0, 20).join(', '));
  }

  // Construit trafic.json (une entrée par ligne suivie, "normal" si rien en cours)
  function buildBucket(list, type, bucketKey) {
    for (const l of list) {
      const key = `${type}-${l}`;
      const incidents = activeByLine[key];
      if (incidents && incidents.length) {
        result[bucketKey].push({
          line: l,
          slug: 'perturbation',
          title: incidents[0].title,
          message: incidents.map((i) => i.message).join(' | '),
        });
      } else {
        result[bucketKey].push({ line: l, slug: 'normal', title: 'Trafic normal', message: '' });
      }
    }
  }
  buildBucket(METROS, 'metro', 'metros');
  buildBucket(RERS, 'rer', 'rers');
  buildBucket(TRAMS, 'tram', 'trams');

  fs.writeFileSync(TRAFIC_FILE, JSON.stringify(result, null, 2));
  console.log(`✔ ${TRAFIC_FILE} mis à jour.`);

  // ---------------------------------------------------------------------
  // Mise à jour de l'historique
  // ---------------------------------------------------------------------
  let historique = [];
  if (fs.existsSync(HISTORIQUE_FILE)) {
    try {
      historique = JSON.parse(fs.readFileSync(HISTORIQUE_FILE, 'utf8'));
    } catch (e) {
      console.warn('⚠️ historique.json illisible, on repart de zéro.');
      historique = [];
    }
  }

  const now = new Date().toISOString();
  const stillActiveIds = new Set();

  for (const [key, incidents] of Object.entries(activeByLine)) {
    const [type, slug] = key.split('-');
    for (const inc of incidents) {
      stillActiveIds.add(inc.id);
      const existing = historique.find((h) => h.id === inc.id);
      if (existing) {
        existing.end = null; // toujours en cours
        existing.message = inc.message;
      } else {
        historique.push({
          id: inc.id,
          type,
          line: slug,
          title: inc.title,
          message: inc.message,
          start: now,
          end: null,
        });
      }
    }
  }

  // Toute perturbation qui était "en cours" (end: null) et qui n'apparaît
  // plus dans l'appel d'aujourd'hui est considérée comme terminée.
  for (const h of historique) {
    if (h.end === null && !stillActiveIds.has(h.id)) {
      h.end = now;
    }
  }

  // tri : plus récent en premier
  historique.sort((a, b) => new Date(b.start) - new Date(a.start));

  fs.writeFileSync(HISTORIQUE_FILE, JSON.stringify(historique, null, 2));
  console.log(`✔ ${HISTORIQUE_FILE} mis à jour (${historique.length} incidents au total).`);
}

main().catch((err) => {
  console.error('❌ Erreur inattendue :', err);
  process.exit(1);
});
