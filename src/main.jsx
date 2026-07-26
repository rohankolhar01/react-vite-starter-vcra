import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, Segoe UI, sans-serif; }
  body { background: #0f172a; color: #e2e8f0; min-height: 100vh; }
`;
const s = document.createElement('style'); s.textContent = styles; document.head.appendChild(s);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
