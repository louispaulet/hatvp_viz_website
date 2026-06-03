import { useMemo, useState } from 'react';
import { formatCount } from '../lib/spouseData.js';

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;

function polarPoint(centerX, centerY, radius, index, total, offset = -Math.PI / 2) {
  const angle = offset + (Math.PI * 2 * index) / Math.max(total, 1);
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function buildPositions(nodes, links, selectedJobId) {
  const jobNodes = nodes
    .filter((node) => node.type === 'job')
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));
  const activeJobNodes = selectedJobId ? jobNodes.filter((node) => node.id === selectedJobId) : jobNodes;
  const activeJobIds = new Set(activeJobNodes.map((node) => node.id));
  const activeLinks = links.filter((link) => activeJobIds.has(link.target));
  const positions = new Map();

  activeJobNodes.forEach((jobNode, index) => {
    const point = selectedJobId ? { x: CENTER, y: CENTER } : polarPoint(CENTER, CENTER, 22, index, activeJobNodes.length);
    positions.set(jobNode.id, { ...jobNode, ...point });

    const linkedPoliticianIds = activeLinks.filter((link) => link.target === jobNode.id).map((link) => link.source);
    linkedPoliticianIds.forEach((politicianId, politicianIndex) => {
      const politicianNode = nodes.find((node) => node.id === politicianId);
      if (!politicianNode || positions.has(politicianId)) return;
      const radius = selectedJobId ? 30 : 10 + Math.min(linkedPoliticianIds.length, 16) * 0.25;
      positions.set(politicianId, {
        ...politicianNode,
        ...polarPoint(point.x, point.y, radius, politicianIndex, linkedPoliticianIds.length, index * 0.55),
      });
    });
  });

  return {
    positionedNodes: [...positions.values()],
    positionedLinks: activeLinks
      .map((link) => ({
        ...link,
        sourceNode: positions.get(link.source),
        targetNode: positions.get(link.target),
      }))
      .filter((link) => link.sourceNode && link.targetNode),
  };
}

export default function SpouseNetworkChart({ nodes, links }) {
  const jobNodes = useMemo(
    () => nodes.filter((node) => node.type === 'job').sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label)),
    [nodes],
  );
  const [selectedJobId, setSelectedJobId] = useState('');
  const { positionedNodes, positionedLinks } = useMemo(
    () => buildPositions(nodes, links, selectedJobId),
    [links, nodes, selectedJobId],
  );

  return (
    <section className="panel spouse-network-panel">
      <div className="table-header">
        <div>
          <p className="eyebrow">Réseau des conjoints</p>
          <h2>Élus reliés par les métiers de leurs conjoints</h2>
          <p className="note">
            Les points bleus sont les métiers, les points orange sont les élus. Un même métier devient un carrefour
            lorsque plusieurs déclarants indiquent une activité similaire pour leur conjoint.
          </p>
        </div>
      </div>

      <div className="network-toolbar" aria-label="Filtrer le réseau par métier">
        <button className={!selectedJobId ? 'network-chip active' : 'network-chip'} onClick={() => setSelectedJobId('')}>
          Tous
        </button>
        {jobNodes.map((jobNode) => (
          <button
            key={jobNode.id}
            className={selectedJobId === jobNode.id ? 'network-chip active' : 'network-chip'}
            onClick={() => setSelectedJobId(jobNode.id)}
          >
            {jobNode.label}
          </button>
        ))}
      </div>

      <div className="spouse-network-canvas">
        <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} role="img" aria-label="Graphe des liens entre élus et métiers des conjoints">
          <g>
            {positionedLinks.map((link, index) => (
              <line
                key={`${link.source}-${link.target}-${index}`}
                className={`network-line gender-${link.gender || 'unknown'}`}
                x1={link.sourceNode.x}
                y1={link.sourceNode.y}
                x2={link.targetNode.x}
                y2={link.targetNode.y}
              />
            ))}
          </g>
          <g>
            {positionedNodes.map((node) => {
              const isJob = node.type === 'job';
              return (
                <g key={node.id} className={`network-node ${isJob ? 'job-node' : 'politician-node'}`}>
                  <circle cx={node.x} cy={node.y} r={isJob ? 2.45 + Math.min(node.weight, 80) / 55 : 1.25} />
                  <title>
                    {node.label} · {isJob ? `${formatCount(node.weight)} déclarations` : 'élu'}
                  </title>
                  {(isJob || selectedJobId) ? (
                    <text x={node.x + (isJob ? 3.4 : 1.8)} y={node.y + 0.9}>
                      {node.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="network-legend">
        <span><i className="legend-dot job" /> Métier du conjoint</span>
        <span><i className="legend-dot politician" /> Élu</span>
        <span><i className="legend-line female" /> Genre estimé féminin</span>
        <span><i className="legend-line male" /> Genre estimé masculin</span>
      </div>
    </section>
  );
}
