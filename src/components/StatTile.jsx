export default function StatTile({ label, value, accent }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}
