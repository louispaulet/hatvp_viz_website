# HATVP Viz

Tableau de bord React pour explorer des données publiques HATVP : rémunérations déclarées, classements par année, rythme de publication des déclarations et consultation de déclarations XML brutes.

Site canonique : [https://hatvp.thefrenchartist.dev/](https://hatvp.thefrenchartist.dev/)

## Commandes

```bash
make up      # installe les dépendances puis lance Vite
make test    # lance les tests Vitest
make build   # génère dist/
make deploy  # build puis publie dist/ avec gh-pages
```

Les commandes npm équivalentes sont disponibles dans `package.json` : `dev`, `test`, `build`, `preview` et `deploy`.

## Stack

- Vite + React
- Tailwind CSS v4 via `@tailwindcss/vite`
- Papa Parse pour les CSV
- Recharts pour le graphique de publication
- Vitest + Testing Library pour les tests
- `gh-pages` pour le déploiement GitHub Pages

## Structure

- `src/` : application React, composants, styles et utilitaires de données.
- `public/datasets/` : CSV locaux embarqués dans le build.
- `public/CNAME` : domaine personnalisé GitHub Pages (`hatvp.thefrenchartist.dev`).
- `public/*.html` : redirections de compatibilité pour les anciennes pages HTML.
- `Makefile` : raccourcis de développement, test, build et déploiement.

## Données

Les classements utilisent `public/datasets/best_of_mandatElectifDto.csv`.

Les statistiques de publication utilisent `public/datasets/submissions_per_date.csv`.

Le lecteur de déclarations brutes conserve la source distante historique :

```text
https://raw.githubusercontent.com/louispaulet/hatvp_viz/main/datasets/xml_unitary_declarations/content/unitary_dataset_url_df.csv
```

## Déploiement

Le site est servi à la racine du domaine personnalisé, donc `vite.config.js` garde `base: "/"`.

`make deploy` exécute le build Vite puis publie `dist/` sur GitHub Pages avec le paquet `gh-pages`.
