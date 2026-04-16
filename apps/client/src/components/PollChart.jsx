import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const dataPoint = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <strong>{dataPoint.label}</strong>
      <span>{dataPoint.votes} votes</span>
      <span>{dataPoint.percentage}% share</span>
    </div>
  );
}

export function PollChart({ options, leadingOptionId }) {
  const data = options.map((option) => ({
    label: option.label,
    votes: option.voteCount,
    percentage: option.percentage,
    isLeading: option.id === leadingOptionId
  }));

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <p className="eyebrow">Live result board</p>
          <h2>Vote distribution</h2>
        </div>
        <span className="status-pill status-pill--neutral">{options.length} options</span>
      </div>

      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 8, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#9eb7bb" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="#9eb7bb" />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="votes" radius={[14, 14, 4, 4]}>
              {data.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={entry.isLeading ? "var(--color-coral)" : "var(--color-mint)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

