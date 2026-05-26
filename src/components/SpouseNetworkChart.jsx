import { useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCount } from '../lib/spouseData.js';

function buildChartData(nodes) {
  const positioned = [];
  const jobNodes = nodes.filter((node) => node.type === 'job');
  const politicianNodes = nodes.filter((node) => node.type === 'politician');
  const jobStep = jobNodes.length > 1 ? 100 / (jobNodes.length - 1) : 50;
  const politicianStep = politicianNodes.length > 1 ? 100 / (politicianNodes.length - 1) : 50;

  jobNodes.forEach((node, index) => {
    positioned.push({ ...node, x: 18, y: index * jobStep, fill: '#2563eb' });
  });
  politicianNodes.forEach((node, index) => {
    positioned.push({ ...node, x: 82, y: index * politicianStep, fill: '#f97316' });
  });

  return positioned;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const node = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{node.label}</strong>
      <span>{node.type === 'job' ? 'Métier de conjoint' : 'Élu'}</span>
      <span>{formatCount(node.value)} liens</span>
    </div>
  );
}

function NodeShape({ cx, cy, payload }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={payload.type === 'job' ? 8 : 10} fill={payload.fill} opacity="0.92" />
      <text x={cx + 12} y={cy + 4} className="network-label">
        {payload.label}
      </text>
    </g>
  );
}

export default function SpouseNetworkChart({ nodes, links }) {
  const points = useMemo(() => buildChartData(nodes), [nodes]);
  const linkSegments = useMemo(() => {
    const pointMap = new Map(points.map((point) => [point.id, point]));
    return links
      .map((link) => ({ source: pointMap.get(link.source), target: pointMap.get(link.target) }))
      .filter((link) => link.source && link.target);
  }, [links, points]);

  return (
    <section className="panel">
      <div className="table-header">
        <div>
          <p className="eyebrow">Réseau des conjoints</p>
          <h2>Élus reliés par les métiers de leurs conjoints</h2>
        </div>
      </div>
      <div className="chart-frame spouse-network-frame network-wrapper">
        <svg className="network-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {linkSegments.map((link, index) => (
            <line
              key={`${link.source.id}-${link.target.id}-${index}`}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="#94a3b8"
              strokeOpacity="0.28"
              strokeWidth="0.8"
            />
          ))}
        </svg>
        <ResponsiveContainer width="100%" height={520}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
            <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
            <Scatter data={points} shape={<NodeShape />} />
            <Tooltip content={<CustomTooltip />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
