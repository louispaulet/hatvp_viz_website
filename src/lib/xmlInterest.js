const EMPTY_TERMS = new Set([
  '',
  'NEANT',
  'NÉANT',
  'NEANTS',
  'NÉANTS',
  '[DONNEES NON PUBLIEES]',
  '[DONNÉES NON PUBLIÉES]',
  '[DONNEE NON PUBLIEE]',
  '[DONNÉE NON PUBLIÉE]',
]);

const BOILERPLATE_TERMS = new Set([
  'ADEL',
  'BRUT',
  'CREATION',
  'FALSE',
  'M.',
  'MME',
  'NET',
  'TRUE',
  'VUE_PDF_DU_RECEPISSE_DU_DEPOT_XML',
  '20171221',
]);

const BOILERPLATE_KEYS = new Set([
  'attributes',
  'attachedFiles',
  'base64EncodedContent',
  'complete',
  'declarationVersion',
  'fileName',
  'motif',
  'origine',
  'serverFileName',
]);

const INTERESTING_KEYS = new Set([
  'activite',
  'actiConseil',
  'capitalDetenu',
  'chiffreAffaire',
  'commentaire',
  'contenu',
  'dateDebut',
  'dateDebutMandat',
  'dateFin',
  'description',
  'descriptionActivite',
  'descriptionMandat',
  'employeur',
  'employeurConjoint',
  'evaluation',
  'labelOrgane',
  'labelTypeMandat',
  'montant',
  'nbLogements',
  'nom',
  'nomConjoint',
  'nomSociete',
  'nomSocieteMere',
  'nombreParts',
  'prenom',
  'qualiteDeclarantForPDF',
  'remuneration',
  'typeMandat',
]);

const SHORT_TECHNICAL_CODE = /^[A-Z]{2,4}$/;
const NUMERIC_ZERO = /^0(?:[,.]0+)?$/;
const XML_RECEIPT = /(XML|PDF|RECEPISSE|RÉCÉPISSÉ|RECIPISSE|RÉCIPISSÉ)/;

export function unwrapXmlTextNode(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0][0] === '#text') {
    return entries[0][1];
  }

  return value;
}

export function normalizeXmlTerm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function isXmlBranch(value) {
  const unwrappedValue = unwrapXmlTextNode(value);
  return unwrappedValue !== null && typeof unwrappedValue === 'object';
}

export function classifyXmlLeaf(key, value) {
  const unwrappedValue = unwrapXmlTextNode(value);
  const normalizedKey = String(key || '');
  const normalizedValue = normalizeXmlTerm(unwrappedValue);

  if (EMPTY_TERMS.has(normalizedValue)) {
    return 'empty';
  }

  if (normalizedKey === 'neant' && normalizedValue === 'TRUE') {
    return 'empty';
  }

  if (NUMERIC_ZERO.test(normalizedValue)) {
    return 'empty';
  }

  if (normalizedKey === 'neant' && normalizedValue === 'FALSE') {
    return 'boilerplate';
  }

  if (BOILERPLATE_KEYS.has(normalizedKey)) {
    return 'boilerplate';
  }

  if (BOILERPLATE_TERMS.has(normalizedValue) || XML_RECEIPT.test(normalizedValue)) {
    return 'boilerplate';
  }

  if (SHORT_TECHNICAL_CODE.test(normalizedValue) && !INTERESTING_KEYS.has(normalizedKey)) {
    return 'boilerplate';
  }

  if (INTERESTING_KEYS.has(normalizedKey)) {
    return 'interesting';
  }

  return normalizedValue ? 'interesting' : 'empty';
}

export function mergeXmlInterest(current, next) {
  if (current === 'interesting' || next === 'interesting') {
    return 'interesting';
  }
  if (current === 'boilerplate' || next === 'boilerplate') {
    return 'boilerplate';
  }
  return 'empty';
}

export function classifyXmlNode(key, value) {
  const unwrappedValue = unwrapXmlTextNode(value);

  if (!isXmlBranch(unwrappedValue)) {
    return classifyXmlLeaf(key, unwrappedValue);
  }

  if (Array.isArray(unwrappedValue)) {
    return unwrappedValue.reduce((status, child) => mergeXmlInterest(status, classifyXmlNode(key, child)), 'empty');
  }

  return Object.entries(unwrappedValue).reduce(
    (status, [childKey, childValue]) => mergeXmlInterest(status, classifyXmlNode(childKey, childValue)),
    'empty',
  );
}

export function isBusinessEmptyXmlValue(key, value) {
  return classifyXmlNode(key, value) === 'empty';
}

export function isInterestingXmlValue(key, value) {
  return classifyXmlNode(key, value) === 'interesting';
}
