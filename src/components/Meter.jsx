export default function Meter({ title, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <div className="meter-value">{pct}%</div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-caption">
        {value} of {total} cases closed
      </div>
    </div>
  );
}
