import { describe, expect, it } from 'vitest';
import {
  buildMonthlyPublicationSeries,
  formatCurrency,
  getTopN,
  getYears,
  groupRowsByYear,
  normalizePublicationRows,
  normalizeSalaryRows,
  parseDeclarationUrlCsv,
} from './data.js';

const rawSalaryRows = [
  {
    '': '1',
    date_depot: '2022-11-27 18:18:23',
    type_mandat: 'Député',
    declarant_prenom: 'A',
    declarant_nom: 'Alpha',
    remuneration: '1000',
    annee_mandat: '2022',
    code_postal: '75',
    description_mandat: 'Mandat A',
  },
  {
    '': '2',
    date_depot: '2022-11-27 18:18:23',
    type_mandat: 'Maire',
    declarant_prenom: 'B',
    declarant_nom: 'Beta',
    remuneration: '5000',
    annee_mandat: '2021',
    code_postal: '69',
    description_mandat: 'Mandat B',
  },
  {
    '': '3',
    remuneration: '200',
    annee_mandat: '2022',
  },
];

describe('data utilities', () => {
  it('normalizes and sorts salary rows', () => {
    const rows = normalizeSalaryRows(rawSalaryRows);

    expect(rows).toHaveLength(3);
    expect(getTopN(rows, 'desc', 1)[0].lastName).toBe('Beta');
    expect(getTopN(rows, 'asc', 1)[0].salary).toBe(200);
  });

  it('groups rows by mandate year', () => {
    const rows = normalizeSalaryRows(rawSalaryRows);

    expect(getYears(rows)).toEqual(['2022', '2021']);
    expect(groupRowsByYear(rows)['2022']).toHaveLength(2);
  });

  it('formats euros for French readers', () => {
    expect(formatCurrency(1234)).toContain('1\u202f234');
  });

  it('normalizes publication rows and builds a monthly series', () => {
    const rows = normalizePublicationRows([
      { datedepot: '2020-01-02 12:00:00', uuid_count: '4' },
      { datedepot: '2020-01-20 12:00:00', uuid_count: '6' },
      { datedepot: 'bad', uuid_count: '12' },
    ]);
    const series = buildMonthlyPublicationSeries(rows);

    expect(rows).toHaveLength(2);
    expect(series).toEqual([{ month: '2020-01', count: 10, label: 'janv. 2020' }]);
  });

  it('parses declaration URL CSV files', () => {
    expect(parseDeclarationUrlCsv(',url\n1,https://example.test/declaration.xml\n')).toEqual([
      'https://example.test/declaration.xml',
    ]);
  });
});
