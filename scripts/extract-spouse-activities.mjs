#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

export const DEFAULT_SOURCE_URL =
  'https://raw.githubusercontent.com/louispaulet/hatvp_viz/main/datasets/xml_unitary_declarations/content/unitary_dataset_url_df.csv';
export const DEFAULT_OUTPUT = 'public/datasets/spouse_activities.tsv';
export const TSV_COLUMNS = [
  'declaration_uuid',
  'declaration_file',
  'declaration_url',
  'date_depot',
  'declarant_prenom',
  'declarant_nom',
  'conjoint_nom',
  'conjoint_prenom',
  'conjoint_nom_complet',
  'conjoint_nom_redacted',
  'activite_professionnelle',
  'employeur_conjoint',
  'row_index',
];

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
});

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    sourceUrl: DEFAULT_SOURCE_URL,
    output: DEFAULT_OUTPUT,
    limit: null,
    concurrency: 8,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === '--source-url') {
      args.sourceUrl = value;
      index += 1;
    } else if (flag === '--output') {
      args.output = value;
      index += 1;
    } else if (flag === '--limit') {
      args.limit = Number(value);
      index += 1;
    } else if (flag === '--concurrency') {
      args.concurrency = Number(value);
      index += 1;
    } else {
      throw new Error(`Option inconnue: ${flag}`);
    }
  }

  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error('--limit doit être un entier positif.');
  }

  if (!Number.isInteger(args.concurrency) || args.concurrency < 1) {
    throw new Error('--concurrency doit être un entier positif.');
  }

  return args;
}

export function parseDeclarationUrlCsv(csvText) {
  return String(csvText)
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.split(',');
      return columns[columns.length - 1]?.trim() || '';
    })
    .filter(Boolean);
}

export function normalizeText(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'object') {
    return normalizeText(value['#text'] ?? '');
  }

  return decodeEntities(String(value)).replace(/\s+/g, ' ').trim();
}

export function decodeEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function isRedacted(value) {
  const normalized = normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return normalized.includes('[donnees non publiees]');
}

export function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || typeof value === 'undefined' || value === '') {
    return [];
  }

  return [value];
}

export function getSpouseActivityItems(activProfConjointDto) {
  if (!activProfConjointDto || normalizeText(activProfConjointDto.neant).toLowerCase() === 'true') {
    return [];
  }

  return asArray(activProfConjointDto.items?.items);
}

export function extractRowsFromXml(xmlText, declarationUrl = '') {
  const parsed = parser.parse(xmlText);
  const declaration = parsed?.declarations?.declaration;

  if (!declaration) {
    return [];
  }

  const declarant = declaration.general?.declarant || {};
  const activityItems = getSpouseActivityItems(declaration.activProfConjointDto);
  const declarationFile = formatDeclarationFilename(declarationUrl);

  return activityItems.map((item, index) => {
    const spouseLastNameRaw = normalizeText(item.nomConjoint);
    const spouseFirstNameRaw = normalizeText(item.prenomConjoint);
    const redacted = isRedacted(spouseLastNameRaw) || isRedacted(spouseFirstNameRaw);
    const spouseLastName = redacted ? '' : spouseLastNameRaw;
    const spouseFirstName = redacted ? '' : spouseFirstNameRaw;
    const spouseFullName = [spouseFirstName, spouseLastName].filter(Boolean).join(' ');

    return {
      declaration_uuid: normalizeText(declaration.uuid),
      declaration_file: declarationFile,
      declaration_url: declarationUrl,
      date_depot: normalizeText(declaration.dateDepot),
      declarant_prenom: normalizeText(declarant.prenom),
      declarant_nom: normalizeText(declarant.nom),
      conjoint_nom: spouseLastName,
      conjoint_prenom: spouseFirstName,
      conjoint_nom_complet: spouseFullName,
      conjoint_nom_redacted: redacted ? 'true' : 'false',
      activite_professionnelle: normalizeText(item.activiteProf),
      employeur_conjoint: normalizeText(item.employeurConjoint),
      row_index: String(index + 1),
    };
  });
}

export function formatDeclarationFilename(url) {
  return String(url || '').split('/').filter(Boolean).pop() || '';
}

export function rowsToTsv(rows) {
  const lines = [TSV_COLUMNS.join('\t')];

  for (const row of rows) {
    lines.push(TSV_COLUMNS.map((column) => escapeTsvValue(row[column])).join('\t'));
  }

  return `${lines.join('\n')}\n`;
}

export function escapeTsvValue(value) {
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
}

async function fetchText(url, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(250 * attempt);
      }
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

export async function runExtraction(options = {}) {
  const args = {
    sourceUrl: DEFAULT_SOURCE_URL,
    output: DEFAULT_OUTPUT,
    limit: null,
    concurrency: 8,
    ...options,
  };
  const sourceCsv = await fetchText(args.sourceUrl);
  const allUrls = parseDeclarationUrlCsv(sourceCsv);
  const urls = args.limit ? allUrls.slice(0, args.limit) : allUrls;
  const rows = [];
  const failures = [];
  let processed = 0;

  console.log(`Déclarations à analyser: ${urls.length}`);

  await mapWithConcurrency(urls, args.concurrency, async (url) => {
    try {
      const xmlText = await fetchText(url);
      rows.push(...extractRowsFromXml(xmlText, url));
    } catch (error) {
      failures.push({ url, error });
    } finally {
      processed += 1;
      if (processed === urls.length || processed % 250 === 0) {
        console.log(`Progression: ${processed}/${urls.length} déclarations`);
      }
    }
  });

  rows.sort((a, b) => {
    const uuidCompare = a.declaration_uuid.localeCompare(b.declaration_uuid);
    return uuidCompare || Number(a.row_index) - Number(b.row_index);
  });

  const outputPath = path.resolve(args.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rowsToTsv(rows), 'utf8');

  console.log(`Lignes extraites: ${rows.length}`);
  console.log(`Fichier écrit: ${outputPath}`);

  if (failures.length) {
    const examples = failures
      .slice(0, 5)
      .map(({ url, error }) => `- ${formatDeclarationFilename(url)}: ${error.message}`)
      .join('\n');
    throw new Error(`${failures.length} déclaration(s) impossible(s) à analyser.\n${examples}`);
  }

  return { rows, outputPath };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  runExtraction(parseArgs()).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
