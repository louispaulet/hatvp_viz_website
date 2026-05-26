import { ChevronRight, EyeOff, Layers2, Search, UnfoldVertical } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import {
  classifyXmlNode,
  isBusinessEmptyXmlValue,
  isInterestingXmlValue,
  isXmlBranch,
  normalizeXmlTerm,
  unwrapXmlTextNode,
} from '../lib/xmlInterest.js';
import { cleanXmlKey } from '../lib/xml.js';

const ROOT_PATH = 'racine';

function isEmptyValue(value) {
  const unwrappedValue = unwrapXmlTextNode(value);
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
  return isXmlBranch(value);
}

function labelForKey(key, index) {
  if (typeof index === 'number') {
    return `Élément ${index + 1}`;
  }

  return cleanXmlKey(key) || 'Valeur';
}

function valueToText(value) {
  const unwrappedValue = unwrapXmlTextNode(value);
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
  const unwrappedValue = unwrapXmlTextNode(value);
  if (unwrappedValue !== value) {
    return summarizeValue(unwrappedValue, hideEmpty);
  }

  if (Array.isArray(value)) {
    const count = hideEmpty ? value.filter((item) => !isBusinessEmptyXmlValue('', item)).length : value.length;
    return `${count} ${count > 1 ? 'éléments' : 'élément'}`;
  }

  if (value !== null && typeof value === 'object') {
    const count = Object.entries(value).filter(([key, item]) => !hideEmpty || !isBusinessEmptyXmlValue(key, item)).length;
    return `${count} ${count > 1 ? 'entrées' : 'entrée'}`;
  }

  return 'Valeur';
}

function childrenFor(value, hideEmpty) {
  const unwrappedValue = unwrapXmlTextNode(value);
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
      .flatMap(([key, child]) => {
        if (key === 'items' && Array.isArray(child)) {
          return child.map((item, index) => ({ key: `${key}-${index}`, label: labelForKey('', index), value: item }));
        }
        if (key === 'items') {
          return [{ key, label: 'Élément 1', value: child }];
        }
        return [{ key, label: labelForKey(key), value: child }];
      })
      .filter((child) => !hideEmpty || !isBusinessEmptyXmlValue(child.key, child.value));
  }

  return [];
}

function normalizeSearch(value) {
  return normalizeXmlTerm(cleanXmlKey(value)).toLowerCase();
}

function nodeMatches(label, value, pathLabel, query) {
  if (!query) {
    return true;
  }

  const haystack = `${label} ${pathLabel} ${valueToText(value)}`.toLowerCase();
  return haystack.includes(query);
}

function collectExpandablePaths(value, options = {}) {
  const { hideEmpty = true, maxDepth = Infinity, query = '', smart = false } = options;
  const paths = [];

  function walk(nodeValue, path, label, depth, ancestors) {
    if (!isBranch(nodeValue) || depth >= maxDepth) {
      return { matches: false, interesting: isInterestingXmlValue(label, nodeValue) };
    }

    const pathLabel = path.join(' > ');
    const selfMatches = nodeMatches(label, nodeValue, pathLabel, query);
    const childEntries = childrenFor(nodeValue, hideEmpty);
    const nodeIsInteresting = isInterestingXmlValue(label, nodeValue);
    let childMatches = false;
    let childInteresting = false;

    childEntries.forEach((child) => {
      const childPath = [...path, child.label];
      const childResult = walk(child.value, childPath, child.label, depth + 1, [...ancestors, pathLabel]);
      if (childResult.matches) {
        childMatches = true;
      }
      if (childResult.interesting) {
        childInteresting = true;
      }
    });

    const shouldOpen = query
      ? selfMatches || childMatches
      : smart
        ? nodeIsInteresting || childInteresting
        : depth < maxDepth;

    if (shouldOpen) {
      paths.push(pathLabel);
      if (query) {
        ancestors.forEach((ancestor) => paths.push(ancestor));
      }
    }

    return { matches: selfMatches || childMatches, interesting: nodeIsInteresting || childInteresting };
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

function interestLabel(status) {
  if (status === 'interesting') {
    return 'contenu déclaré';
  }
  if (status === 'boilerplate') {
    return 'technique';
  }
  return 'vide';
}

function highlightText(text, query) {
  const value = String(text);
  if (!query) {
    return value;
  }

  const normalizedValue = normalizeSearch(value);
  const index = normalizedValue.indexOf(query);
  if (index === -1) {
    return value;
  }

  const before = value.slice(0, index);
  const match = value.slice(index, index + query.length);
  const after = value.slice(index + query.length);
  return (
    <>
      {before}
      <mark>{match}</mark>
      {after}
    </>
  );
}

function XmlTreeNode({ value, label, path, depth, expandedPaths, onToggle, query, hideEmpty }) {
  const displayValue = unwrapXmlTextNode(value);
  const pathLabel = path.join(' > ');
  const interestStatus = classifyXmlNode(label, displayValue);

  if (hideEmpty && isBusinessEmptyXmlValue(label, displayValue)) {
    return null;
  }

  if (query && !hasVisibleMatch(displayValue, label, path, query, hideEmpty)) {
    return null;
  }

  if (!isBranch(displayValue)) {
    const formattedValue = isEmptyValue(displayValue) ? 'Non renseigné' : cleanXmlKey(displayValue);
    const isPrivate = formattedValue === '[Données non publiées]';
    const valueClassName = [
      isPrivate ? 'xml-tree-private-value' : 'xml-tree-value',
      interestStatus !== 'interesting' ? 'xml-tree-muted-value' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`xml-tree-leaf ${interestStatus}`} style={{ '--depth': depth }} title={pathLabel}>
        <span className="xml-tree-spacer" aria-hidden="true" />
        <div className="xml-tree-leaf-content">
          <span className="xml-tree-key">{highlightText(label, query)}</span>
          <span className={valueClassName}>{highlightText(formattedValue, query)}</span>
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
    <div className={`xml-tree-branch ${interestStatus}`} title={pathLabel}>
      <button
        type="button"
        className="xml-tree-node"
        style={{ '--depth': depth }}
        aria-expanded={isOpen}
        onClick={() => onToggle(pathLabel)}
      >
        <ChevronRight className={isOpen ? 'xml-tree-chevron open' : 'xml-tree-chevron'} size={16} aria-hidden="true" />
        <span className="xml-tree-key">{highlightText(label, query)}</span>
        <span className="xml-tree-meta">
          <span className="xml-tree-summary">{summarizeValue(displayValue, hideEmpty)}</span>
          <span className={`xml-interest-badge ${interestStatus}`}>{interestLabel(interestStatus)}</span>
        </span>
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
  const [expansionMode, setExpansionMode] = useState(compact ? 'depth' : 'smart');
  const [expandedPaths, setExpandedPaths] = useState(() =>
    collectExpandablePaths(value, { hideEmpty: true, maxDepth: initialDepth, smart: !compact }),
  );
  const normalizedQuery = normalizeSearch(query.trim());

  useEffect(() => {
    setQuery('');
    setHideEmpty(true);
    setExpansionMode(compact ? 'depth' : 'smart');
    setExpandedPaths(collectExpandablePaths(value, { hideEmpty: true, maxDepth: initialDepth, smart: !compact }));
  }, [compact, initialDepth, value]);

  useEffect(() => {
    if (normalizedQuery) {
      setExpandedPaths(collectExpandablePaths(value, { hideEmpty, query: normalizedQuery }));
    } else if (expansionMode === 'smart') {
      setExpandedPaths(collectExpandablePaths(value, { hideEmpty, smart: true }));
    }
  }, [expansionMode, hideEmpty, normalizedQuery, value]);

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
    setExpansionMode(`depth-${depth}`);
    setExpandedPaths(collectExpandablePaths(value, { hideEmpty, maxDepth: depth }));
  }

  function expandSmart() {
    setExpansionMode('smart');
    setExpandedPaths(collectExpandablePaths(value, { hideEmpty, smart: true }));
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
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setExpansionMode('collapsed');
                setExpandedPaths(new Set());
              }}
            >
              <EyeOff size={16} aria-hidden="true" />
              Tout replier
            </button>
            <button type="button" className="secondary-button" onClick={expandResults} disabled={!normalizedQuery}>
              <UnfoldVertical size={16} aria-hidden="true" />
              Déplier les résultats
            </button>
            <div className="segmented-control xml-depth-control" aria-label="Profondeur affichée">
              <button type="button" className={expansionMode === 'smart' ? 'active' : ''} onClick={expandSmart}>
                Vue intelligente
              </button>
              <button type="button" className={expansionMode === 'depth-2' ? 'active' : ''} onClick={() => expandToDepth(2)}>
                Niveau 2
              </button>
              <button type="button" className={expansionMode === 'depth-4' ? 'active' : ''} onClick={() => expandToDepth(4)}>
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
