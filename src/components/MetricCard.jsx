export default function MetricCard({ label, value, helper }) {
  return (
    <section className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      {helper ? <span>{helper}</span> : null}
    </section>
  );
}
