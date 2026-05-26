import { describe, expect, it } from 'vitest';
import {
  extractRowsFromXml,
  parseDeclarationUrlCsv,
  rowsToTsv,
} from './extract-spouse-activities.mjs';

function wrapDeclaration(innerXml) {
  return `<declarations><declaration>${innerXml}</declaration></declarations>`;
}

const generalXml = `
  <uuid>4344aaa1-874d-4e6d-9b1a-45f7725b710c</uuid>
  <dateDepot>11/07/2022 15:40:13</dateDepot>
  <general>
    <declarant>
      <nom>ABAD</nom>
      <prenom>DAMIEN</prenom>
    </declarant>
  </general>
`;

describe('spouse activity extraction', () => {
  it('extracts a Damien Abad-style spouse activity with a redacted spouse name', () => {
    const rows = extractRowsFromXml(
      wrapDeclaration(`
        ${generalXml}
        <activProfConjointDto>
          <items>
            <items>
              <nomConjoint>
                [Donn&#233;es non publi&#233;es]
              </nomConjoint>
              <employeurConjoint>CENTRE HOSPITALIER DU HAUT-BUGEY</employeurConjoint>
              <activiteProf>Infirmi&#232;re</activiteProf>
            </items>
          </items>
          <neant>false</neant>
        </activProfConjointDto>
      `),
      'https://example.test/declarations_hatvp_batch_00000001.xml',
    );

    expect(rows).toEqual([
      {
        declaration_uuid: '4344aaa1-874d-4e6d-9b1a-45f7725b710c',
        declaration_file: 'declarations_hatvp_batch_00000001.xml',
        declaration_url: 'https://example.test/declarations_hatvp_batch_00000001.xml',
        date_depot: '11/07/2022 15:40:13',
        declarant_prenom: 'DAMIEN',
        declarant_nom: 'ABAD',
        conjoint_nom: '',
        conjoint_prenom: '',
        conjoint_nom_complet: '',
        conjoint_nom_redacted: 'true',
        activite_professionnelle: 'Infirmière',
        employeur_conjoint: 'CENTRE HOSPITALIER DU HAUT-BUGEY',
        row_index: '1',
      },
    ]);
  });

  it('does not emit rows when the spouse activity section is marked neant', () => {
    const rows = extractRowsFromXml(
      wrapDeclaration(`
        ${generalXml}
        <activProfConjointDto>
          <neant>true</neant>
        </activProfConjointDto>
      `),
    );

    expect(rows).toEqual([]);
  });

  it('emits one row per spouse activity item', () => {
    const rows = extractRowsFromXml(
      wrapDeclaration(`
        ${generalXml}
        <activProfConjointDto>
          <items>
            <items>
              <nomConjoint>Dupont</nomConjoint>
              <prenomConjoint>Claire</prenomConjoint>
              <employeurConjoint>Autoentrepreneur</employeurConjoint>
              <activiteProf>D&#233;veloppement informatique</activiteProf>
            </items>
            <items>
              <nomConjoint>Dupont</nomConjoint>
              <prenomConjoint>Claire</prenomConjoint>
              <employeurConjoint>Universit&#233;</employeurConjoint>
              <activiteProf>Enseignante</activiteProf>
            </items>
          </items>
          <neant>false</neant>
        </activProfConjointDto>
      `),
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.row_index)).toEqual(['1', '2']);
    expect(rows.map((row) => row.conjoint_nom_complet)).toEqual(['Claire Dupont', 'Claire Dupont']);
    expect(rows.map((row) => row.employeur_conjoint)).toEqual(['Autoentrepreneur', 'Université']);
  });

  it('normalizes missing spouse first name, empty employer, and multiline values', () => {
    const rows = extractRowsFromXml(
      wrapDeclaration(`
        ${generalXml}
        <activProfConjointDto>
          <items>
            <items>
              <nomConjoint>Martin</nomConjoint>
              <employeurConjoint/>
              <activiteProf>Cheffe de service
                Minist&#232;re des arm&#233;es
              </activiteProf>
            </items>
          </items>
          <neant>false</neant>
        </activProfConjointDto>
      `),
    );

    expect(rows[0]).toMatchObject({
      conjoint_nom: 'Martin',
      conjoint_prenom: '',
      conjoint_nom_complet: 'Martin',
      conjoint_nom_redacted: 'false',
      employeur_conjoint: '',
      activite_professionnelle: 'Cheffe de service Ministère des armées',
    });
  });

  it('parses declaration URL CSV files and serializes TSV rows', () => {
    const urls = parseDeclarationUrlCsv(',url\n1,https://example.test/a.xml\n');
    const tsv = rowsToTsv([
      {
        declaration_uuid: 'uuid-1',
        declaration_file: 'a.xml',
        declaration_url: urls[0],
        date_depot: 'date',
        declarant_prenom: 'A',
        declarant_nom: 'B',
        conjoint_nom: 'C',
        conjoint_prenom: '',
        conjoint_nom_complet: 'C',
        conjoint_nom_redacted: 'false',
        activite_professionnelle: 'Job\twith tab',
        employeur_conjoint: 'Line\nbreak',
        row_index: '1',
      },
    ]);

    expect(urls).toEqual(['https://example.test/a.xml']);
    expect(tsv.split('\n')[1]).toContain('Job with tab');
    expect(tsv.split('\n')[1]).toContain('Line break');
  });
});
