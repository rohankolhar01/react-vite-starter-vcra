const SERIES_VARS = [
  "--series-1",
  "--series-2",
  "--series-3",
  "--series-4",
  "--series-5",
  "--series-6",
  "--series-7",
  "--series-8",
];

// Assign each distinct category a stable slot based on its name (alphabetical),
// not its current rank/count, so a bar's color never changes when the data reorders.
export function makeCategoryColorMap(categories) {
  const sorted = [...new Set(categories)].sort();
  const map = {};
  sorted.forEach((cat, i) => {
    map[cat] = `var(${SERIES_VARS[i % SERIES_VARS.length]})`;
  });
  return map;
}

export function statusColor(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("closed") || l.includes("resolved")) return "var(--status-good)";
  if (l.includes("investigation") || l.includes("open") || l.includes("pending"))
    return "var(--status-warning)";
  return "var(--status-serious)";
}
