import { useCallback, useEffect, useState } from "react";
import { fetchStats } from "./api";
import StatTile from "./components/StatTile";
import BarChart from "./components/BarChart";
import TrendChart from "./components/TrendChart";
import Meter from "./components/Meter";
import IncidentsTable from "./components/IncidentsTable";
import AskPanel from "./components/AskPanel";
import { statusColor } from "./components/colors";

const REFRESH_MS = 30000;

export default function App() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const statusColorMap = stats
    ? Object.fromEntries(stats.by_status.map((s) => [s.label, statusColor(s.label)]))
    : {};

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Crime Ops Dashboard</h1>
          <p className="subtitle">Catalyst Data Store + QuickML RAG + LLM Serving</p>
        </div>
        <div className="header-actions">
          <span className="last-updated">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading..."}
          </span>
          <button onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="error-box">Could not load dashboard data: {error}</div>}

      {stats && (
        <>
          <section className="kpi-row">
            <StatTile label="Total FIRs" value={stats.total} />
            <StatTile label="Open cases" value={stats.open} accent="var(--status-warning)" />
            <StatTile label="Closed cases" value={stats.closed} accent="var(--status-good)" />
            <StatTile label="Reported today" value={stats.today} />
          </section>

          <section className="chart-grid">
            <BarChart title="Crime type breakdown" data={stats.by_crime_type} />
            <BarChart
              title="By status"
              data={stats.by_status}
              colorMap={statusColorMap}
            />
            <BarChart title="Top locations" data={stats.by_location} />
            <Meter title="Resolution rate" value={stats.closed} total={stats.total} />
          </section>

          <section className="chart-grid-wide">
            <TrendChart title="Reports over time" data={stats.trend} />
          </section>

          <section className="chart-grid-wide">
            <IncidentsTable records={stats.recent} />
          </section>

          <section className="chart-grid-wide">
            <AskPanel />
          </section>
        </>
      )}
    </div>
  );
}
