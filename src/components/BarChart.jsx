import { useState } from "react";
import { makeCategoryColorMap } from "./colors";

const ROW_H = 32;
const BAR_H = 20;
const LABEL_W = 110;

export default function BarChart({ title, data, colorMap: colorMapProp }) {
  const [hover, setHover] = useState(null);
  const colorMap = colorMapProp || makeCategoryColorMap(data.map((d) => d.label));
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 360;
  const trackW = width - LABEL_W - 40;
  const height = data.length * ROW_H + 8;

  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
        {data.map((d, i) => {
          const y = i * ROW_H + 4;
          const w = Math.max(2, (d.count / max) * trackW);
          const color = colorMap[d.label] || "var(--series-1)";
          const isHover = hover === i;
          return (
            <g
              key={d.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "default" }}
            >
              <text
                x={LABEL_W - 8}
                y={y + BAR_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {d.label}
              </text>
              <rect
                x={LABEL_W}
                y={y}
                width={trackW}
                height={BAR_H}
                fill="var(--surface-2)"
                rx="4"
              />
              <rect
                x={LABEL_W}
                y={y}
                width={w}
                height={BAR_H}
                fill={color}
                rx="4"
                opacity={isHover ? 1 : 0.92}
              />
              <text
                x={LABEL_W + w + 6}
                y={y + BAR_H / 2}
                dominantBaseline="middle"
                fontSize="11"
                fontWeight={isHover ? 700 : 500}
                fill="var(--text-primary)"
              >
                {d.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
