import { describe, expect, it } from 'vitest';
import { buildSpouseNetwork, buildSpouseStats, normalizeSpouseRows, parseTsvFile } from './spouseData.js';

const rawText = `declaration_uuid\tdeclaration_file\tdeclaration_url\tdate_depot\tdeclarant_prenom\tdeclarant_nom\tconjoint_nom\tconjoint_prenom\tconjoint_nom_complet\tconjoint_nom_redacted\tactivite_professionnelle\temployeur_conjoint\trow_index
1\ta.xml\turl\t2020\tAlice\tMartin\tDupont\tMme Claire\tClaire Dupont\tfalse\tInfirmière\tCHU\t1
2\tb.xml\turl\t2020\tBruno\tDurand\tDurand\tM. Jean\tJean Durand\tfalse\tInfirmière\tHôpital\t1
`;

describe('spouse data utilities', () => {
  it('parses tsv text', async () => {
    const rows = await parseTsvFile(rawText);
    expect(rows).toHaveLength(2);
  });

  it('keeps TSV rows separate when values contain quotes', async () => {
    const rows = await parseTsvFile(
      `declaration_uuid\tdeclarant_prenom\tdeclarant_nom\tactivite_professionnelle\temployeur_conjoint\trow_index
1\tAlice\tMartin\tDirigeant de la "SAS"\tParis\t1
2\tBruno\tDurand\tInfirmière\tCHU\t1
`,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].activite_professionnelle).toBe('Dirigeant de la "SAS"');
  });

  it('normalizes spouse rows and builds stats', async () => {
    const parsed = await parseTsvFile(rawText);
    const rows = normalizeSpouseRows(parsed);
    const stats = buildSpouseStats(rows);

    expect(rows).toHaveLength(2);
    expect(stats.totalRows).toBe(2);
    expect(stats.uniquePoliticians).toBe(2);
    expect(stats.jobCounts['Infirmière']).toBe(2);
    expect(stats.genderCounts.female).toBe(1);
    expect(stats.genderCounts.male).toBe(1);
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

  it('normalizes frequent job labels and infers gender from gendered jobs', () => {
    const rows = normalizeSpouseRows([
      {
        declarant_prenom: 'Alice',
        declarant_nom: 'Martin',
        activite_professionnelle: 'retraitée',
      },
      {
        declarant_prenom: 'Bruno',
        declarant_nom: 'Durand',
        activite_professionnelle: 'RETRAITEE',
      },
      {
        declarant_prenom: 'Carla',
        declarant_nom: 'Petit',
        activite_professionnelle: 'Directeur',
      },
    ]);
    const stats = buildSpouseStats(rows);

    expect(stats.jobCounts['Retraitée']).toBe(2);
    expect(stats.jobCounts['Directeur']).toBe(1);
    expect(stats.genderCounts.female).toBe(2);
    expect(stats.genderCounts.male).toBe(1);
  });

  it('builds a capped unique politician-job network', () => {
    const rows = normalizeSpouseRows([
      { declarant_prenom: 'Alice', declarant_nom: 'Martin', activite_professionnelle: 'Infirmière' },
      { declarant_prenom: 'Alice', declarant_nom: 'Martin', activite_professionnelle: 'Infirmière' },
      { declarant_prenom: 'Bruno', declarant_nom: 'Durand', activite_professionnelle: 'Infirmière' },
      { declarant_prenom: 'Carla', declarant_nom: 'Petit', activite_professionnelle: 'Infirmière' },
    ]);
    const network = buildSpouseNetwork(rows, 1, 2);

    expect(network.nodes.filter((node) => node.type === 'job')).toHaveLength(1);
    expect(network.nodes.filter((node) => node.type === 'politician')).toHaveLength(2);
    expect(network.links).toHaveLength(2);
  });
});
