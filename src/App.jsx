import React, { useState } from 'react';

const API_URL = '/api';

export default function App() {
  const [query, setQuery] = useState('tell me about theft');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  async function send() {
    setLoading(true); setError(null); setResponse(null);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResponse(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🚔 Hello Crime — POC</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>
        Catalyst Data Store + QuickML RAG + LLM Serving
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about a crime..."
          style={{
            flex: 1, padding: '12px 16px', fontSize: 16,
            background: '#1e293b', color: '#e2e8f0',
            border: '1px solid #334155', borderRadius: 8, outline: 'none',
          }}
        />
        <button
          onClick={send} disabled={loading}
          style={{
            padding: '12px 24px', fontSize: 16, cursor: 'pointer',
            background: loading ? '#475569' : '#3b82f6', color: 'white',
            border: 'none', borderRadius: 8, fontWeight: 600,
          }}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, background: '#7f1d1d', borderRadius: 8, marginTop: 16 }}>
          ❌ {error}
        </div>
      )}

      {response && (
        <div style={{ marginTop: 24 }}>
          <div style={{ padding: 20, background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
            <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Answer</h3>
            <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{response.answer}</p>
          </div>

          {response.facts?.length > 0 && (
            <details style={{ marginTop: 12, padding: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}>
              <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>
                📊 Structured facts ({response.facts.length})
              </summary>
              <pre style={{ marginTop: 12, fontSize: 12, overflow: 'auto', color: '#cbd5e1' }}>
                {JSON.stringify(response.facts, null, 2)}
              </pre>
            </details>
          )}

          {response.context && (
            <details style={{ marginTop: 12, padding: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}>
              <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>📚 RAG context</summary>
              <pre style={{ marginTop: 12, fontSize: 12, overflow: 'auto', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                {response.context}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
