import Papa from 'papaparse';

export const SALARY_DATASET = '/datasets/best_of_mandatElectifDto.csv';
export const PUBLICATION_DATASET = '/datasets/submissions_per_date.csv';
export const DECLARATION_URL_DATASET =
  'https://raw.githubusercontent.com/louispaulet/hatvp_viz/main/datasets/xml_unitary_declarations/content/unitary_dataset_url_df.csv';

const euroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('fr-FR');

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => resolve(data),
      error: reject,
    });
  });
}

export function normalizeSalaryRow(row) {
  return {
    id: row[''] || row.id || '',
    depositDate: row.date_depot || '',
    mandateType: row.type_mandat || '',
    firstName: row.declarant_prenom || '',
    lastName: row.declarant_nom || '',
    birthDate: row.declarant_date_naissance || '',
    salary: Number(row.remuneration || 0),
    mandateYear: row.annee_mandat || '',
    postalCode: row.code_postal || '',
    description: row.description_mandat || '',
  };
}

export function normalizeSalaryRows(rows) {
  return rows.map(normalizeSalaryRow).filter((row) => row.mandateYear && Number.isFinite(row.salary));
}

export function getTopN(rows, order = 'desc', n = 100) {
  const direction = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => direction * (a.salary - b.salary)).slice(0, n);
}

export function groupRowsByYear(rows) {
  return rows.reduce((groups, row) => {
    if (!groups[row.mandateYear]) {
      groups[row.mandateYear] = [];
    }
    groups[row.mandateYear].push(row);
    return groups;
  }, {});
}

export function getYears(rows) {
  return Object.keys(groupRowsByYear(rows)).sort((a, b) => Number(b) - Number(a));
}

export function formatCurrency(value) {
  return euroFormatter.format(Number(value || 0));
}

export function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

export function formatDeclarationFilename(url) {
  return String(url || '').split('/').filter(Boolean).pop() || '';
}

export function formatDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function normalizePublicationRows(rows) {
  return rows
    .map((row) => ({
      date: new Date(row.datedepot),
      count: Number(row.uuid_count || 0),
    }))
    .filter((row) => !Number.isNaN(row.date.getTime()) && Number.isFinite(row.count));
}

export function buildMonthlyPublicationSeries(rows) {
  const buckets = rows.reduce((acc, row) => {
    const month = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
    acc[month] = (acc[month] || 0) + row.count;
    return acc;
  }, {});

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month,
      count,
      label: new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(
        new Date(`${month}-01T00:00:00`),
      ),
    }));
}

export function salaryStats(rows) {
  const salaries = rows.map((row) => row.salary);
  const total = salaries.reduce((sum, salary) => sum + salary, 0);
  return {
    declarations: rows.length,
    years: getYears(rows).length,
    averageSalary: salaries.length ? total / salaries.length : 0,
    maxSalary: salaries.length ? Math.max(...salaries) : 0,
  };
}

export function parseDeclarationUrlCsv(csvText) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  return parsed.data.map((row) => row.url || Object.values(row)[1]).filter(Boolean);
}
