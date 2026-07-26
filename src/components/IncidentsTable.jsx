import { useMemo, useState } from "react";
import { statusColor } from "./colors";

export default function IncidentsTable({ records }) {
  const [crimeFilter, setCrimeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const crimeTypes = useMemo(
    () => [...new Set(records.map((r) => r.crime_type).filter(Boolean))].sort(),
    [records]
  );
  const locations = useMemo(
    () => [...new Set(records.map((r) => r.location).filter(Boolean))].sort(),
    [records]
  );
  const statuses = useMemo(() => {
    const byLower = new Map();
    for (const r of records) {
      const raw = (r.status || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!byLower.has(key)) byLower.set(key, raw);
    }
    return [...byLower.values()].sort();
  }, [records]);

  const filtered = records.filter(
    (r) =>
      (crimeFilter === "all" || r.crime_type === crimeFilter) &&
      (locationFilter === "all" || r.location === locationFilter) &&
      (statusFilter === "all" || (r.status || "").trim().toLowerCase() === statusFilter.toLowerCase())
  );

  return (
    <div className="panel panel-wide">
      <div className="panel-title">Recent incidents</div>
      <div className="filter-row">
        <select value={crimeFilter} onChange={(e) => setCrimeFilter(e.target.value)}>
          <option value="all">All crime types</option>
          {crimeTypes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="filter-count">
          {filtered.length} of {records.length}
        </span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>FIR #</th>
              <th>Date</th>
              <th>Crime type</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.fir_id}>
                <td className="tabular">{r.fir_id}</td>
                <td className="tabular">{(r.datereported || "").slice(0, 10)}</td>
                <td>{r.crime_type}</td>
                <td>{r.location}</td>
                <td>
                  <span className="status-dot" style={{ background: statusColor(r.status) }} />
                  {(r.status || "").trim()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">
                  No incidents match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
