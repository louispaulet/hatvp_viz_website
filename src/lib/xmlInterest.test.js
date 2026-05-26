import { describe, expect, it } from 'vitest';
import { classifyXmlLeaf, classifyXmlNode, isBusinessEmptyXmlValue, isInterestingXmlValue } from './xmlInterest.js';

describe('XML interest classifier', () => {
  it.each([
    ['commentaire', 'NEANT'],
    ['commentaire', 'néant'],
    ['nomConjoint', '[Données non publiées]'],
    ['neant', 'true'],
    ['montant', '0'],
  ])('classifies %s = %s as empty business content', (key, value) => {
    expect(classifyXmlLeaf(key, value)).toBe('empty');
    expect(isBusinessEmptyXmlValue(key, value)).toBe(true);
  });

  it.each([
    ['id', 'CREATION'],
    ['origine', 'ADEL'],
    ['complete', 'true'],
    ['declarationModificative', 'false'],
    ['brutNet', 'Net'],
    ['fileName', 'VUE_PDF_DU_RECEPISSE_DU_DEPOT_XML'],
    ['declarationVersion', '20171221'],
  ])('classifies %s = %s as boilerplate', (key, value) => {
    expect(classifyXmlLeaf(key, value)).toBe('boilerplate');
  });

  it.each([
    ['montant', '12500'],
    ['commentaire', 'Mandat exercé sans avantage particulier'],
    ['nomSociete', 'Association locale'],
    ['descriptionMandat', 'Maire'],
    ['activite', 'Président'],
    ['employeur', 'Commune'],
    ['evaluation', '877'],
    ['nombreParts', '83'],
  ])('classifies %s = %s as interesting', (key, value) => {
    expect(classifyXmlLeaf(key, value)).toBe('interesting');
    expect(isInterestingXmlValue(key, value)).toBe(true);
  });

  it('marks a branch interesting when it contains useful values despite neant=false', () => {
    const value = {
      neant: 'false',
      items: {
        nomSociete: 'Association locale',
        remuneration: '0',
      },
    };

    expect(classifyXmlNode('participationDirigeantDto', value)).toBe('interesting');
  });

  it('marks a branch empty when it only contains neant=true', () => {
    expect(classifyXmlNode('activConsultantDto', { neant: 'true' })).toBe('empty');
  });
});
