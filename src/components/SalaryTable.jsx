import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatCurrency, formatDate } from '../lib/data.js';

const columns = [
  { key: 'lastName', label: 'Nom' },
  { key: 'firstName', label: 'Prénom' },
  { key: 'salary', label: 'Rémunération' },
  { key: 'mandateYear', label: 'Année' },
  { key: 'mandateType', label: 'Mandat' },
  { key: 'postalCode', label: 'Code postal' },
  { key: 'depositDate', label: 'Dépôt' },
  { key: 'description', label: 'Description' },
];

export default function SalaryTable({ rows, title, mode, onModeChange }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'salary', direction: mode === 'worst' ? 'asc' : 'desc' });

  const displayedRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? rows.filter((row) =>
          [
            row.lastName,
            row.firstName,
            row.mandateType,
            row.mandateYear,
            row.postalCode,
            row.description,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : rows;

    return [...filtered].sort((a, b) => {
      const aValue = a[sort.key];
      const bValue = b[sort.key];
      const direction = sort.direction === 'asc' ? 1 : -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction * (aValue - bValue);
      }

      return direction * String(aValue || '').localeCompare(String(bValue || ''), 'fr');
    });
  }, [query, rows, sort]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  return (
    <section className="panel">
      <div className="table-header">
        <div>
          <p className="eyebrow">{displayedRows.length} lignes affichées</p>
          <h2>{title}</h2>
        </div>
        <div className="table-actions">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Rechercher dans le tableau</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un nom, mandat, année..."
            />
          </label>
          <div className="segmented-control" aria-label="Type de classement">
            <button className={mode === 'best' ? 'active' : ''} onClick={() => onModeChange('best')}>
              Plus hauts
            </button>
            <button className={mode === 'worst' ? 'active' : ''} onClick={() => onModeChange('worst')}>
              Plus bas
            </button>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button onClick={() => toggleSort(column.key)}>
                    {column.label}
                    {sort.key === column.key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp size={14} aria-hidden="true" />
                      ) : (
                        <ArrowDown size={14} aria-hidden="true" />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row, index) => (
              <tr key={`${row.id}-${row.mandateYear}-${index}`}>
                <td>{row.lastName}</td>
                <td>{row.firstName}</td>
                <td className="money">{formatCurrency(row.salary)}</td>
                <td>{row.mandateYear}</td>
                <td>{row.mandateType}</td>
                <td>{row.postalCode}</td>
                <td>{formatDate(row.depositDate)}</td>
                <td className="description-cell">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
