import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SalaryTable from './SalaryTable.jsx';

const rows = [
  {
    id: '1',
    depositDate: '2022-01-01',
    mandateType: 'Député',
    firstName: 'Alice',
    lastName: 'Martin',
    salary: 9000,
    mandateYear: '2022',
    postalCode: '75',
    description: 'Assemblée',
  },
  {
    id: '2',
    depositDate: '2022-01-01',
    mandateType: 'Maire',
    firstName: 'Bruno',
    lastName: 'Durand',
    salary: 1200,
    mandateYear: '2021',
    postalCode: '13',
    description: 'Commune',
  },
];

describe('SalaryTable', () => {
  it('filters rows with the search field', () => {
    render(<SalaryTable rows={rows} title="Classement" mode="best" onModeChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Rechercher un nom, mandat, année...'), {
      target: { value: 'durand' },
    });

    expect(screen.getByText('Durand')).toBeInTheDocument();
    expect(screen.queryByText('Martin')).not.toBeInTheDocument();
  });

  it('switches between best and worst modes', () => {
    const onModeChange = vi.fn();
    render(<SalaryTable rows={rows} title="Classement" mode="best" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plus bas' }));

    expect(onModeChange).toHaveBeenCalledWith('worst');
  });

  it('sorts salary rows from a column header', () => {
    render(<SalaryTable rows={rows} title="Classement" mode="best" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Rémunération/ }));
    const bodyRows = screen.getAllByRole('row').slice(1);

    expect(within(bodyRows[0]).getByText('Durand')).toBeInTheDocument();
  });
});
