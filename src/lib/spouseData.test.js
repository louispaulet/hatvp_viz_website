import { describe, expect, it } from 'vitest';
import { buildSpouseStats, normalizeSpouseRows, parseTsvFile } from './spouseData.js';

const rawText = `declaration_uuid\tdeclaration_file\tdeclaration_url\tdate_depot\tdeclarant_prenom\tdeclarant_nom\tconjoint_nom\tconjoint_prenom\tconjoint_nom_complet\tconjoint_nom_redacted\tactivite_professionnelle\temployeur_conjoint\trow_index
1\ta.xml\turl\t2020\tAlice\tMartin\tDupont\tMme Claire\tClaire Dupont\tfalse\tInfirmière\tCHU\t1
2\tb.xml\turl\t2020\tBruno\tDurand\tDurand\tM. Jean\tJean Durand\tfalse\tInfirmière\tHôpital\t1
`;

describe('spouse data utilities', () => {
  it('parses tsv text', async () => {
    const rows = await parseTsvFile(rawText);
    expect(rows).toHaveLength(2);
  });

  it('normalizes spouse rows and builds stats', async () => {
    const parsed = await parseTsvFile(rawText);
    const rows = normalizeSpouseRows(parsed);
    const stats = buildSpouseStats(rows);

    expect(rows).toHaveLength(2);
    expect(stats.totalRows).toBe(2);
    expect(stats.uniquePoliticians).toBe(2);
    expect(stats.jobCounts['Infirmière']).toBe(2);
  });

  it('ignores empty response jobs in counts', () => {
    const stats = buildSpouseStats([
      {
        declarantFirstName: 'Alice',
        declarantLastName: 'Martin',
        spouseGender: 'female',
        jobName: 'Néant',
      },
      {
        declarantFirstName: 'Bruno',
        declarantLastName: 'Durand',
        spouseGender: 'male',
        jobName: 'Non renseigné',
      },
      {
        declarantFirstName: 'Carla',
        declarantLastName: 'Petit',
        spouseGender: 'female',
        jobName: 'Infirmière',
      },
    ]);

    expect(stats.jobCounts['Néant']).toBeUndefined();
    expect(stats.jobCounts['Non renseigné']).toBeUndefined();
    expect(stats.jobCounts['Infirmière']).toBe(1);
  });
});
