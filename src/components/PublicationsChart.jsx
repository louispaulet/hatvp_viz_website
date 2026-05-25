import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '../lib/data.js';

export default function PublicationsChart({ data }) {
  return (
    <section className="panel">
      <div className="table-header">
        <div>
          <p className="eyebrow">Déclarations publiées</p>
          <h2>Volume mensuel des publications</h2>
        </div>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={data} margin={{ top: 16, right: 18, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="publicationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8dee8" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={30} stroke="#64748b" />
            <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} stroke="#64748b" width={54} />
            <Tooltip
              formatter={(value) => [formatNumber(value), 'déclarations']}
              labelStyle={{ color: '#0f172a', fontWeight: 700 }}
              contentStyle={{ borderRadius: 8, borderColor: '#cbd5e1' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#publicationGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
