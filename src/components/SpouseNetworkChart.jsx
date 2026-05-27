import { useMemo } from 'react';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCount } from '../lib/spouseData.js';

function buildChartData(nodes, links, jobName) {
  const positioned = [];
  const jobNode = nodes.find((node) => node.type === 'job' && (!jobName || node.label === jobName));
  const linkedPoliticianIds = new Set(links.filter((link) => link.target === jobNode?.id).map((link) => link.source));
  const politicianNodes = nodes.filter((node) => node.type === 'politician' && linkedPoliticianIds.has(node.id));
  const radius = 28;
  const step = (Math.PI * 2) / Math.max(politicianNodes.length, 1);

  if (jobNode) {
    positioned.push({ ...jobNode, x: 50, y: 50, fill: '#2563eb', value: links.filter((link) => link.target === jobNode.id).length });
    politicianNodes.forEach((node, index) => {
      const angle = index * step;
      const labelPosition = Math.cos(angle) >= 0 ? 'right' : 'left';
      positioned.push({
        ...node,
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        fill: '#f97316',
        labelPosition,
        value: links.filter((link) => link.source === node.id).length,
      });
    });
  }

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
  const labelPosition = payload.labelPosition || 'right';
  const labelOffsetX = labelPosition === 'left' ? -12 : 12;
  const textAnchor = labelPosition === 'left' ? 'end' : 'start';
  return (
    <g>
      <circle cx={cx} cy={cy} r={payload.type === 'job' ? 8 : 10} fill={payload.fill} opacity="0.92" />
      <text x={cx + labelOffsetX} y={cy + 4} className="network-label" textAnchor={textAnchor}>
        {payload.label}
      </text>
    </g>
  );
}

export default function SpouseNetworkChart({ nodes, links }) {
  const jobNodes = useMemo(() => nodes.filter((node) => node.type === 'job'), [nodes]);
  const panels = useMemo(() => jobNodes.map((jobNode) => {
    const points = buildChartData(nodes, links, jobNode.label);
    const pointMap = new Map(points.map((point) => [point.id, point]));
    const linkSegments = links
      .filter((link) => link.target === jobNode.id)
      .map((link) => ({ source: pointMap.get(link.source), target: pointMap.get(link.target) }))
      .filter((link) => link.source && link.target);

    return { jobNode, points, linkSegments };
  }), [jobNodes, links, nodes]);

  return (
    <section className="panel">
      <div className="table-header">
        <div>
          <p className="eyebrow">Réseau des conjoints</p>
          <h2>Élus reliés par les métiers de leurs conjoints</h2>
          <p className="note">
            Chaque élu est relié au métier de son conjoint. Deux élus partageant le même métier de conjoint se
            retrouvent donc connectés indirectement, ce qui crée des grappes amusantes à explorer. Les statistiques
            de genre restent indicatives, car elles reposent sur les indices disponibles dans les noms et titres.
          </p>
        </div>
      </div>
      <div className="spouse-network-grid">
        {panels.map(({ jobNode, points, linkSegments }) => (
          <div key={jobNode.id} className="chart-frame spouse-network-frame network-wrapper">
            <div className="spouse-network-title">{jobNode.label}</div>
            <ResponsiveContainer width="100%" height={520}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
                <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
                <Scatter data={points} shape={<NodeShape />} />
                <Tooltip content={<CustomTooltip />} />
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
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </section>
  );
}
