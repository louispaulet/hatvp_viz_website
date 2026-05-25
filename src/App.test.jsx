import { render, screen, waitFor } from '@testing-library/react';
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

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('renders the overall dashboard after loading data', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('Plus hautes rémunérations de tous les temps')).toBeInTheDocument());
    expect(screen.getByText('Martin')).toBeInTheDocument();
  });

  it('opens the yearly tab from the hash', async () => {
    window.location.hash = '#/annees';
    render(<App />);

    await waitFor(() => expect(screen.getByText('Choisir une année de mandat')).toBeInTheDocument());
    expect(screen.getByText('Plus hautes rémunérations en 2022')).toBeInTheDocument();
  });
});
