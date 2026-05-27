export const GENDER_JOB_HINTS = {
  female: [
    'directrice',
    'présidente',
    'presidente',
    'gérante',
    'gerante',
    'consultante',
    'avocate',
    'pharmacienne',
    'professeure',
    'enseignante',
    'secrétaire',
    'secretaire',
  ],
  male: [
    'directeur',
    'président',
    'president',
    'gérant',
    'gerant',
    'consultant',
    'avocat',
    'pharmacien',
    'professeur',
    'enseignant',
    'secrétaire',
    'secretaire',
  ],
};

export function inferSpouseGenderFromJob(row) {
  const activity = `${row.activite_professionnelle || ''} ${row.employeur_conjoint || ''}`.toLowerCase();
  if (GENDER_JOB_HINTS.female.some((hint) => activity.includes(hint))) return 'female';
  if (GENDER_JOB_HINTS.male.some((hint) => activity.includes(hint))) return 'male';
  return 'unknown';
}

export function buildGenderStats(rows) {
  const genderCounts = { female: 0, male: 0, unknown: 0 };
  for (const row of rows) {
    const gender = inferSpouseGenderFromJob(row);
    genderCounts[gender] += 1;
  }
  const known = genderCounts.female + genderCounts.male;
  return {
    genderCounts,
    genderTotal: genderCounts.female + genderCounts.male + genderCounts.unknown,
    genderPercent: known ? Math.round((genderCounts.female / known) * 100) : 0,
  };
}
