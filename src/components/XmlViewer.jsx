import { ChevronRight, EyeOff, Layers2, Search, UnfoldVertical } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { cleanXmlKey } from '../lib/xml.js';

const ROOT_PATH = 'racine';

function unwrapTextNode(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0][0] === '#text') {
    return entries[0][1];
  }

  return value;
}

function isEmptyValue(value) {
  const unwrappedValue = unwrapTextNode(value);
  if (unwrappedValue !== value) {
    return isEmptyValue(unwrappedValue);
  }

  if (value === null || typeof value === 'undefined' || value === '') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEmptyValue);
  }

  if (typeof value === 'object') {
    return Object.values(value).every(isEmptyValue);
  }

  return false;
}

function isBranch(value) {
  const unwrappedValue = unwrapTextNode(value);
  return unwrappedValue !== null && typeof unwrappedValue === 'object';
}

function labelForKey(key, index) {
  if (typeof index === 'number') {
    return `Élément ${index + 1}`;
  }

  return cleanXmlKey(key) || 'Valeur';
}

function valueToText(value) {
  const unwrappedValue = unwrapTextNode(value);
  if (unwrappedValue !== value) {
    return valueToText(unwrappedValue);
  }

  if (isEmptyValue(value)) {
    return 'Non renseigné';
  }

  if (typeof value !== 'object') {
    return cleanXmlKey(value);
  }

  return Object.entries(value)
    .map(([key, child]) => `${labelForKey(key)} ${valueToText(child)}`)
    .join(' ');
}

function summarizeValue(value, hideEmpty) {
  const unwrappedValue = unwrapTextNode(value);
  if (unwrappedValue !== value) {
    return summarizeValue(unwrappedValue, hideEmpty);
  }

  if (Array.isArray(value)) {
    const count = hideEmpty ? value.filter((item) => !isEmptyValue(item)).length : value.length;
    return `${count} ${count > 1 ? 'éléments' : 'élément'}`;
  }

  if (value !== null && typeof value === 'object') {
    const count = Object.values(value).filter((item) => !hideEmpty || !isEmptyValue(item)).length;
    return `${count} ${count > 1 ? 'entrées' : 'entrée'}`;
  }

  return 'Valeur';
}

function childrenFor(value, hideEmpty) {
  const unwrappedValue = unwrapTextNode(value);
  if (unwrappedValue !== value) {
    return childrenFor(unwrappedValue, hideEmpty);
  }

  if (Array.isArray(value)) {
    return value
      .map((child, index) => ({ key: String(index), label: labelForKey('', index), value: child }))
      .filter((child) => !hideEmpty || !isEmptyValue(child.value));
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, child]) => ({ key, label: labelForKey(key), value: child }))
      .filter((child) => !hideEmpty || !isEmptyValue(child.value));
  }

  return [];
}

function normalizeSearch(value) {
  return cleanXmlKey(value).toLowerCase();
}

function nodeMatches(label, value, pathLabel, query) {
  if (!query) {
    return true;
  }

  const haystack = `${label} ${pathLabel} ${valueToText(value)}`.toLowerCase();
  return haystack.includes(query);
}

function collectExpandablePaths(value, options = {}) {
  const { hideEmpty = true, maxDepth = Infinity, query = '' } = options;
  const paths = [];

  function walk(nodeValue, path, label, depth, ancestors) {
    if (!isBranch(nodeValue) || depth >= maxDepth) {
      return false;
    }

    const pathLabel = path.join(' > ');
    const selfMatches = nodeMatches(label, nodeValue, pathLabel, query);
    const childEntries = childrenFor(nodeValue, hideEmpty);
    let childMatches = false;

    childEntries.forEach((child) => {
      const childPath = [...path, child.label];
      if (walk(child.value, childPath, child.label, depth + 1, [...ancestors, pathLabel])) {
        childMatches = true;
      }
    });

    if (!query || selfMatches || childMatches) {
      paths.push(pathLabel);
      if (query) {
        ancestors.forEach((ancestor) => paths.push(ancestor));
      }
    }

    return selfMatches || childMatches;
  }

  walk(value, [ROOT_PATH], ROOT_PATH, 0, []);
  return new Set(paths);
}

function hasVisibleMatch(value, label, path, query, hideEmpty) {
  if (!query) {
    return true;
  }

  if (nodeMatches(label, value, path.join(' > '), query)) {
    return true;
  }

  return childrenFor(value, hideEmpty).some((child) =>
    hasVisibleMatch(child.value, child.label, [...path, child.label], query, hideEmpty),
  );
}

function XmlTreeNode({ value, label, path, depth, expandedPaths, onToggle, query, hideEmpty }) {
  const displayValue = unwrapTextNode(value);
  const pathLabel = path.join(' > ');

  if (hideEmpty && isEmptyValue(displayValue)) {
    return null;
  }

  if (query && !hasVisibleMatch(displayValue, label, path, query, hideEmpty)) {
    return null;
  }

  if (!isBranch(displayValue)) {
    const formattedValue = isEmptyValue(displayValue) ? 'Non renseigné' : cleanXmlKey(displayValue);
    const isPrivate = formattedValue === '[Données non publiées]';

    return (
      <div className="xml-tree-leaf" style={{ '--depth': depth }} title={pathLabel}>
        <span className="xml-tree-spacer" aria-hidden="true" />
        <div className="xml-tree-leaf-content">
          <span className="xml-tree-key">{label}</span>
          <span className={isPrivate ? 'xml-tree-private-value' : 'xml-tree-value'}>{formattedValue}</span>
        </div>
      </div>
    );
  }

  const children = childrenFor(displayValue, hideEmpty);
  const isOpen = expandedPaths.has(pathLabel);

  if (!children.length) {
    return (
      <div className="xml-tree-leaf" style={{ '--depth': depth }} title={pathLabel}>
        <span className="xml-tree-spacer" aria-hidden="true" />
        <div className="xml-tree-leaf-content">
          <span className="xml-tree-key">{label}</span>
          <span className="muted">Non renseigné</span>
        </div>
      </div>
    );
  }

  return (
    <div className="xml-tree-branch" title={pathLabel}>
      <button
        type="button"
        className="xml-tree-node"
        style={{ '--depth': depth }}
        aria-expanded={isOpen}
        onClick={() => onToggle(pathLabel)}
      >
        <ChevronRight className={isOpen ? 'xml-tree-chevron open' : 'xml-tree-chevron'} size={16} aria-hidden="true" />
        <span className="xml-tree-key">{label}</span>
        <span className="xml-tree-summary">{summarizeValue(displayValue, hideEmpty)}</span>
        <span className="xml-tree-path">{path.slice(1).join(' > ') || ROOT_PATH}</span>
      </button>
      {isOpen ? (
        <div className="xml-tree-children">
          {children.map((child) => (
            <XmlTreeNode
              key={`${pathLabel}-${child.key}`}
              value={child.value}
              label={child.label}
              path={[...path, child.label]}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              query={query}
              hideEmpty={hideEmpty}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function XmlViewer({ value, compact = false, initialDepth = compact ? 4 : 2, controls = !compact }) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [hideEmpty, setHideEmpty] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState(() => collectExpandablePaths(value, { hideEmpty: true, maxDepth: initialDepth }));
  const normalizedQuery = normalizeSearch(query.trim());

  useEffect(() => {
    setQuery('');
    setHideEmpty(true);
    setExpandedPaths(collectExpandablePaths(value, { hideEmpty: true, maxDepth: initialDepth }));
  }, [initialDepth, value]);

  useEffect(() => {
    if (normalizedQuery) {
      setExpandedPaths(collectExpandablePaths(value, { hideEmpty, query: normalizedQuery }));
    }
  }, [hideEmpty, normalizedQuery, value]);

  function togglePath(path) {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function expandToDepth(depth) {
    setExpandedPaths(collectExpandablePaths(value, { hideEmpty, maxDepth: depth }));
  }

  function expandResults() {
    setExpandedPaths(collectExpandablePaths(value, { hideEmpty, query: normalizedQuery }));
  }

  if (value === null || typeof value === 'undefined' || value === '') {
    return <span className="muted">Non renseigné</span>;
  }

  return (
    <div className={compact ? 'xml-viewer compact' : 'xml-viewer'}>
      {controls ? (
        <div className="xml-toolbar">
          <label className="search-field xml-search" htmlFor={searchId}>
            <Search size={17} aria-hidden="true" />
            <input
              id={searchId}
              aria-label="Rechercher une clé, une valeur ou un chemin"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une clé, une valeur ou un chemin"
            />
          </label>
          <div className="xml-toolbar-actions">
            <button type="button" className="secondary-button" onClick={() => setExpandedPaths(new Set())}>
              <EyeOff size={16} aria-hidden="true" />
              Tout replier
            </button>
            <button type="button" className="secondary-button" onClick={expandResults} disabled={!normalizedQuery}>
              <UnfoldVertical size={16} aria-hidden="true" />
              Déplier les résultats
            </button>
            <div className="segmented-control xml-depth-control" aria-label="Profondeur affichée">
              <button type="button" onClick={() => expandToDepth(2)}>
                Niveau 2
              </button>
              <button type="button" onClick={() => expandToDepth(4)}>
                Niveau 4
              </button>
            </div>
            <label className="xml-toggle">
              <input type="checkbox" checked={hideEmpty} onChange={(event) => setHideEmpty(event.target.checked)} />
              <span>Masquer les champs vides</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="xml-compact-note">
          <Layers2 size={16} aria-hidden="true" />
          <span>Arbre ouvert sur les principaux champs déclarés.</span>
        </div>
      )}
      <div className="xml-tree" aria-label="Explorateur de déclaration XML">
        <XmlTreeNode
          value={value}
          label={ROOT_PATH}
          path={[ROOT_PATH]}
          depth={0}
          expandedPaths={expandedPaths}
          onToggle={togglePath}
          query={normalizedQuery}
          hideEmpty={hideEmpty}
        />
      </div>
    </div>
  );
}
