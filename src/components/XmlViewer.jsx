import { cleanXmlKey } from '../lib/xml.js';

export default function XmlViewer({ value, depth = 0 }) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return <span className="muted">Non renseigné</span>;
  }

  if (typeof value !== 'object') {
    return <span>{cleanXmlKey(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="xml-list">
        {value.map((item, index) => (
          <div key={index} className="xml-item">
            <XmlViewer value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== '');

  return (
    <div className={depth > 1 ? 'xml-grid nested' : 'xml-grid'}>
      {entries.map(([key, entryValue]) => (
        <div key={key} className="xml-row">
          <dt>{cleanXmlKey(key) || 'Valeur'}</dt>
          <dd>
            <XmlViewer value={entryValue} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </div>
  );
}
