import Papa from 'papaparse';

export const SPOUSE_DATASET = '/datasets/spouse_activities.tsv';

const textFormatter = new Intl.NumberFormat('fr-FR');

const surnameFemaleHints = new Set([
  'a',
  'ade',
  'ante',
  'elle',
  'ette',
  'euse',
  'ice',
  'ine',
  'ique',
  'line',
  'onne',
  'ose',
  'otte',
  'velle',
]);

const surnameMaleHints = new Set(['ard', 'aud', 'bert', 'el', 'eau', 'et', 'eur', 'ier', 'in', 'ot', 'oux']);

const femaleTitleHints = ['mme', 'madame', 'm me', 'mme.'];
const maleTitleHints = ['m.', 'mr', 'monsieur', 'm '];
const femaleJobHints = [
  'directrice',
  'presidente',
  'gerante',
  'chargee',
  'conseillere',
  'consultante',
  'avocate',
  'pharmacienne',
  'professeure',
  'enseignante',
  'infirmiere',
  'retraitee',
];
const maleJobHints = [
  'directeur',
  'president',
  'gerant',
  'charge',
  'conseiller',
  'consultant',
  'avocat',
  'pharmacien',
  'professeur',
  'enseignant',
  'infirmier',
  'retraite',
];

export function parseTsvFile(text) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      delimiter: '\t',
      quoteChar: '\0',
      skipEmptyLines: true,
      complete: ({ data }) => resolve(data),
      error: reject,
    });
  });
}

export function normalizeSpouseRow(row) {
  const spouseName = [row.conjoint_prenom || '', row.conjoint_nom || ''].filter(Boolean).join(' ').trim();
  const jobName = normalizeJobName(row.activite_professionnelle || row.employeur_conjoint || '');
  const inferredGender = inferSpouseGender(row, spouseName);

  return {
    declarationUuid: row.declaration_uuid || '',
    declarationFile: row.declaration_file || '',
    declarationUrl: row.declaration_url || '',
    depositDate: row.date_depot || '',
    declarantFirstName: row.declarant_prenom || '',
    declarantLastName: row.declarant_nom || '',
    spouseFirstName: row.conjoint_prenom || '',
    spouseLastName: row.conjoint_nom || '',
    spouseName,
    spouseNameRedacted: row.conjoint_nom_redacted === 'true',
    jobName,
    employer: row.employeur_conjoint || '',
    rowIndex: Number(row.row_index || 0),
    spouseGender: inferredGender,
  };
}

export function normalizeSpouseRows(rows) {
  return rows.map(normalizeSpouseRow);
}

export function normalizeJobName(value) {
  const normalized = String(value || '')
    .replace(/\[Données non publiées\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const key = foldText(normalized);

  if (!key) return '';
  if (key === 'retraitee') return 'Retraitée';
  if (key === 'retraite') return 'Retraité';
  if (key === 'professeur des ecoles') return 'Professeur des écoles';
  if (key === 'professeure des ecoles') return 'Professeure des écoles';
  if (key === 'infirmiere') return 'Infirmière';
  if (key === 'ingenieur') return 'Ingénieur';
  if (key === 'gerant') return 'Gérant';
  if (key === 'enseignante') return 'Enseignante';
  if (key === 'enseignant') return 'Enseignant';
  if (key === 'directeur') return 'Directeur';

  return normalized;
}

export function getJobDisplayKey(value) {
  const normalized = normalizeJobName(value);
  if (!normalized) return '';
  const lower = normalized.toLowerCase();
  const feminineNames = new Set(['retraitée']);
  if (feminineNames.has(lower)) return normalized;
  if (normalized === 'Retraitée') return normalized;
  return normalized;
}

export function isEmptyResponseJob(value) {
  const normalized = normalizeJobName(value).toLowerCase();
  return ['néant', 'neant', 'non renseigné', 'non renseigne'].includes(normalized);
}

export function inferSpouseGender(row, spouseName = '') {
  const joined = foldText(`${row.conjoint_prenom || ''} ${row.conjoint_nom || ''} ${spouseName}`);
  if (femaleTitleHints.some((hint) => joined.includes(hint))) return 'female';
  if (maleTitleHints.some((hint) => joined.includes(hint))) return 'male';

  const activity = foldText(`${row.activite_professionnelle || ''} ${row.employeur_conjoint || ''}`);
  if (femaleJobHints.some((hint) => activity.includes(hint))) return 'female';
  if (maleJobHints.some((hint) => activity.includes(hint))) return 'male';

  const firstName = foldText(row.conjoint_prenom || '');
  if (firstName.endsWith('e') || firstName.endsWith('a')) return 'female';
  if (firstName.endsWith('o') || firstName.endsWith('n') || firstName.endsWith('r')) return 'male';

  const lastName = foldText(row.conjoint_nom || '');
  if ([...surnameFemaleHints].some((suffix) => lastName.endsWith(suffix))) return 'female';
  if ([...surnameMaleHints].some((suffix) => lastName.endsWith(suffix))) return 'male';

  return 'unknown';
}

export function foldText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatCount(value) {
  return textFormatter.format(Number(value || 0));
}

export function buildSpouseStats(rows) {
  const spouseRows = Array.isArray(rows) ? rows : normalizeSpouseRows(rows);
  const jobCounts = spouseRows.reduce((acc, row) => {
    if (!row.jobName || isEmptyResponseJob(row.jobName)) return acc;
    const key = getJobDisplayKey(row.jobName);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const genderCounts = spouseRows.reduce(
    (acc, row) => {
      acc[row.spouseGender] = (acc[row.spouseGender] || 0) + 1;
      return acc;
    },
    { female: 0, male: 0, unknown: 0 },
  );
  const uniquePoliticians = new Set(spouseRows.map((row) => `${row.declarantFirstName} ${row.declarantLastName}`.trim()).filter(Boolean).map((name) => name.toLowerCase()));

  return {
    spouseRows,
    jobCounts,
    genderCounts,
    distinctJobs: Object.keys(jobCounts).length,
    genderKnownRows: genderCounts.female + genderCounts.male,
    uniquePoliticians: uniquePoliticians.size,
    totalRows: spouseRows.length,
  };
}

export function getTopEntries(counts, limit = 10) {
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function buildSpouseNetwork(rows, limit = 8, politiciansPerJob = 16) {
  const spouseRows = Array.isArray(rows) ? rows.filter((row) => row.spouseName || row.jobName) : normalizeSpouseRows(rows).filter((row) => row.spouseName || row.jobName);
  const jobCounts = spouseRows.reduce((acc, row) => {
    if (!row.jobName || isEmptyResponseJob(row.jobName)) return acc;
    const key = getJobDisplayKey(row.jobName);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topJobs = new Set(getTopEntries(jobCounts, limit).map((entry) => entry.label));
  const nodes = new Map();
  const links = [];
  const seenLinks = new Set();
  const linksPerJob = {};

  for (const row of spouseRows) {
    const jobKey = getJobDisplayKey(row.jobName);
    if (!topJobs.has(jobKey)) continue;

    const politicianId = `politician:${row.declarantFirstName} ${row.declarantLastName}`.trim();
    const jobId = `job:${jobKey}`;
    const linkId = `${politicianId}->${jobId}`;
    linksPerJob[jobId] = linksPerJob[jobId] || 0;

    if (seenLinks.has(linkId) || linksPerJob[jobId] >= politiciansPerJob) continue;

    if (!nodes.has(politicianId)) {
      nodes.set(politicianId, {
        id: politicianId,
        label: `${row.declarantFirstName} ${row.declarantLastName}`.trim(),
        type: 'politician',
        weight: 0,
      });
    }
    if (!nodes.has(jobId)) {
      nodes.set(jobId, { id: jobId, label: jobKey, type: 'job', weight: jobCounts[jobKey] || 0 });
    }

    nodes.get(politicianId).weight += 1;
    seenLinks.add(linkId);
    linksPerJob[jobId] += 1;
    links.push({ source: politicianId, target: jobId, value: 1, gender: row.spouseGender });
  }

  return { nodes: [...nodes.values()], links };
}
