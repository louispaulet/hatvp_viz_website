import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import XmlViewer from './XmlViewer.jsx';

function buildDeepValue(depth) {
  return Array.from({ length: depth }).reduceRight((child, _, index) => ({ [`niveau${index + 1}`]: child }), 'valeur finale');
}

describe('XmlViewer', () => {
  it('renders a deep XML object as a collapsible tree', () => {
    render(<XmlViewer value={buildDeepValue(20)} initialDepth={4} />);

    expect(screen.getAllByRole('button', { name: /racine/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /niveau1/i })[0]).toBeInTheDocument();
    expect(screen.queryByText('valeur finale')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /niveau4/i })[0]);
    expect(screen.getAllByRole('button', { name: /niveau5/i })[0]).toBeInTheDocument();
  });

  it('labels array entries as numbered collapsible items', () => {
    render(<XmlViewer value={{ mandatElectifDto: [{ descriptionMandat: 'Député' }] }} initialDepth={3} />);

    expect(screen.getAllByRole('button', { name: /mandatElectifDto/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Élément 1/i })[0]).toBeInTheDocument();
    expect(screen.getByText('Député')).toBeInTheDocument();
  });

  it('searches keys and values, then expands matching branches', () => {
    render(<XmlViewer value={{ general: { declarant: { nom: 'ABAD', prenom: 'DAMIEN' } } }} />);

    fireEvent.change(screen.getByLabelText(/rechercher/i), { target: { value: 'ABAD' } });

    expect(screen.getByText('ABAD')).toBeInTheDocument();
    expect(screen.queryByText('DAMIEN')).not.toBeInTheDocument();
  });

  it('flattens XML text nodes into readable field values', () => {
    render(<XmlViewer value={{ declarant: { nom: { '#text': 'ABAD' } } }} initialDepth={3} />);

    expect(screen.getByText('nom')).toBeInTheDocument();
    expect(screen.getByText('ABAD')).toBeInTheDocument();
    expect(screen.queryByText('Valeur')).not.toBeInTheDocument();
  });

  it('hides empty fields by default and can show them again', () => {
    render(<XmlViewer value={{ nom: 'ABAD', dateFinMandat: '' }} />);

    expect(screen.queryByText('dateFinMandat')).not.toBeInTheDocument();

    const toggle = within(screen.getByText('Masquer les champs vides').closest('label')).getByRole('checkbox');
    fireEvent.click(toggle);

    expect(screen.getByText('dateFinMandat')).toBeInTheDocument();
    expect(screen.getByText('Non renseigné')).toBeInTheDocument();
  });
});
