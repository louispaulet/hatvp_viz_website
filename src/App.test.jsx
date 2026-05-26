import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

vi.mock('./lib/data.js', async () => {
  const actual = await vi.importActual('./lib/data.js');
  return {
    ...actual,
    parseCsvFile: vi.fn((file) => {
      if (file.includes('submissions')) {
        return Promise.resolve([{ datedepot: '2020-01-02 12:00:00', uuid_count: '4' }]);
      }
      return Promise.resolve([
        {
          '': '1',
          date_depot: '2022-01-01',
          type_mandat: 'Député',
          declarant_prenom: 'Alice',
          declarant_nom: 'Martin',
          remuneration: '9000',
          annee_mandat: '2022',
          code_postal: '75',
          description_mandat: 'Assemblée',
        },
        {
          '': '2',
          date_depot: '2021-01-01',
          type_mandat: 'Maire',
          declarant_prenom: 'Bruno',
          declarant_nom: 'Durand',
          remuneration: '1200',
          annee_mandat: '2021',
          code_postal: '13',
          description_mandat: 'Commune',
        },
      ]);
    }),
  };
});

vi.mock('./lib/spouseData.js', async () => {
  const actual = await vi.importActual('./lib/spouseData.js');
  return {
    ...actual,
    parseTsvFile: vi.fn(() =>
      Promise.resolve([
        {
          declaration_uuid: '1',
          declarant_prenom: 'Alice',
          declarant_nom: 'Martin',
          conjoint_prenom: 'Mme Claire',
          conjoint_nom: 'Dupont',
          activite_professionnelle: 'Infirmière',
          employeur_conjoint: 'CHU',
          conjoint_nom_redacted: 'false',
          row_index: '1',
        },
        {
          declaration_uuid: '2',
          declarant_prenom: 'Bruno',
          declarant_nom: 'Durand',
          conjoint_prenom: 'M. Jean',
          conjoint_nom: 'Durand',
          activite_professionnelle: 'Infirmière',
          employeur_conjoint: 'Hôpital',
          conjoint_nom_redacted: 'false',
          row_index: '1',
        },
      ]),
    ),
  };
});

describe('App', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = '';
  });

  it('renders the overall dashboard after loading data', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('Plus hautes rémunérations de tous les temps')).toBeInTheDocument());
    expect(screen.getByText('0 lignes affichées')).toBeInTheDocument();
  });

  it('opens the yearly tab from the hash', async () => {
    window.location.hash = '#/annees';
    render(<App />);

    await waitFor(() => expect(screen.getByText('Sélectionner une année de mandat')).toBeInTheDocument());
    expect(screen.getByText((content, element) => element?.tagName === 'H2' && content.startsWith('Plus hautes rémunérations en'))).toBeInTheDocument();
  });

  it('loads a declaration and renders the XML explorer controls', async () => {
    window.location.hash = '#/declarations';
    const fetchMock = vi.fn((url) => {
      const body = String(url).endsWith('.xml')
        ? '<declarations><declaration><general><declarant><nom>ABAD</nom><prenom>DAMIEN</prenom></declarant></general></declaration></declarations>'
        : ',url\n1,https://example.test/declaration.xml\n';

      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(body),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const loadButton = await screen.findByRole('button', { name: 'Charger la déclaration' });
    await waitFor(() => expect(loadButton).not.toBeDisabled());
    fireEvent.click(loadButton);

    await waitFor(() => expect(screen.getByText('Déclaration complète')).toBeInTheDocument());
    expect(screen.getByLabelText(/rechercher une clé/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tout replier/i })).toBeInTheDocument();
    expect(screen.getAllByText('ABAD').length).toBeGreaterThan(0);
  });
});
