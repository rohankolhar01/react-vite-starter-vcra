import { useRef, useState } from "react";

const WIDTH = 640;
const HEIGHT = 180;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;

export default function TrendChart({ title, data }) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const plotW = WIDTH - PAD_L - PAD_R;
  const plotH = HEIGHT - PAD_T - PAD_B;
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;

  const x = (i) => PAD_L + i * step;
  const y = (v) => PAD_T + plotH - (v / max) * plotH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.count)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD_T + plotH} L ${x(0)} ${PAD_T + plotH} Z`;

  const yTicks = [0, Math.round(max / 2), max];

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let idx = Math.round((px - PAD_L) / (step || 1));
    idx = Math.max(0, Math.min(data.length - 1, idx));
    setHoverIdx(idx);
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L}
              x2={WIDTH - PAD_R}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--gridline)"
              strokeWidth="1"
            />
            <text x={4} y={y(t) + 3} fontSize="10" fill="var(--text-muted)">
              {t}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="var(--series-1)" opacity="0.1" />
        <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hovered && (
          <>
            <line
              x1={x(hoverIdx)}
              x2={x(hoverIdx)}
              y1={PAD_T}
              y2={PAD_T + plotH}
              stroke="var(--baseline)"
              strokeWidth="1"
            />
            <circle
              cx={x(hoverIdx)}
              cy={y(hovered.count)}
              r="4"
              fill="var(--series-1)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          </>
        )}

        <text x={PAD_L} y={HEIGHT - 4} fontSize="10" fill="var(--text-muted)">
          {data[0]?.date}
        </text>
        <text x={WIDTH - PAD_R} y={HEIGHT - 4} fontSize="10" fill="var(--text-muted)" textAnchor="end">
          {data[data.length - 1]?.date}
        </text>
      </svg>
      <div className="chart-tooltip-row">
        {hovered ? `${hovered.date} — ${hovered.count} report${hovered.count === 1 ? "" : "s"}` : "Hover the line for a date"}
      </div>
    </div>
  );
}
