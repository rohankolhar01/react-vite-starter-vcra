import { useState } from "react";
import { askQuestion } from "../api";

export default function AskPanel() {
  const [query, setQuery] = useState("what happened in Jayanagar");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  async function send() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      setResponse(await askQuestion(query));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel panel-wide">
      <div className="panel-title">Ask the case data</div>
      <div className="ask-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about a crime, location, or status..."
        />
        <button onClick={send} disabled={loading}>
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {response && (
        <div className="ask-answer">
          <p>{response.answer}</p>
          {response.facts?.length > 0 && (
            <details>
              <summary>{response.facts.length} matching record(s)</summary>
              <ul className="fact-list">
                {response.facts.map((f) => (
                  <li key={f.fir_id}>
                    <span className="tabular">#{f.fir_id}</span> — {f.crime_type} at {f.location} (
                    {(f.status || "").trim()})
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
