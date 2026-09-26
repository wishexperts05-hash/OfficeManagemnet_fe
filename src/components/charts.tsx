import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "./ThemeToggle";

export const CHART_COLORS_LIGHT = ["#c8322b", "#334155", "#16a34a", "#c2410c", "#64748b", "#1d1d1f"];
export const CHART_COLORS_DARK = ["#c8322b", "#94a3b8", "#4ade80", "#fb923c", "#cbd5e1", "#f5f5f7"];
export const CHART_COLORS = CHART_COLORS_LIGHT;

function useChartChrome() {
  const theme = useTheme();
  const dark = theme === "dark";
  return {
    colors: dark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT,
    grid: dark ? "#222222" : "#e5e7eb",
    tick: { fontSize: 12, fill: dark ? "#a1a1a6" : "#6e6e73" },
    tooltip: {
      backgroundColor: dark ? "#000000" : "#ffffff",
      border: `1px solid ${dark ? "#222222" : "#e5e5ea"}`,
      borderRadius: 12,
      color: dark ? "#f5f5f7" : "#1d1d1f",
    },
  };
}

export function formatINR(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="panel chart-card">
      <div className="chart-card-head">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle ? <p className="muted chart-card-sub">{subtitle}</p> : null}
        </div>
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "accent";
}) {
  return (
    <div className={`panel stat-card tone-${tone}`}>
      <div className="label">{label}</div>
      <div className="value display">{value}</div>
      {hint ? <div className="muted stat-hint">{hint}</div> : null}
    </div>
  );
}

export function TasksPieChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const chrome = useChartChrome();
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <p className="muted">No task data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
          {filtered.map((_, index) => (
            <Cell key={filtered[index].name} fill={chrome.colors[index % chrome.colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={chrome.tooltip} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AttendanceAreaChart({
  data,
}: {
  data: Array<{ label: string; present: number; total?: number }>;
}) {
  const chrome = useChartChrome();
  if (data.length === 0) return <p className="muted">No attendance data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c8322b" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#c8322b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} />
        <XAxis dataKey="label" tick={chrome.tick} />
        <YAxis allowDecimals={false} tick={chrome.tick} />
        <Tooltip contentStyle={chrome.tooltip} />
        <Area type="monotone" dataKey="present" stroke="#c8322b" fill="url(#presentFill)" name="Present" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendBarChart({ credit, debit }: { credit: number; debit: number }) {
  const chrome = useChartChrome();
  const data = [
    { name: "Credit", value: credit },
    { name: "Debit", value: debit },
  ];
  if (credit === 0 && debit === 0) return <p className="muted">No expenditure data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} />
        <XAxis dataKey="name" tick={chrome.tick} />
        <YAxis tick={chrome.tick} />
        <Tooltip contentStyle={chrome.tooltip} formatter={(v) => formatINR(Number(v || 0))} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          <Cell fill="#16a34a" />
          <Cell fill="#c8322b" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExpenditureTrendChart({
  data,
}: {
  data: Array<{ label: string; credit: number; debit: number }>;
}) {
  const chrome = useChartChrome();
  if (data.length === 0) return <p className="muted">No trend data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="expCreditFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expDebitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c8322b" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#c8322b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} />
        <XAxis dataKey="label" tick={chrome.tick} />
        <YAxis tick={chrome.tick} />
        <Tooltip contentStyle={chrome.tooltip} formatter={(v) => formatINR(Number(v || 0))} />
        <Legend />
        <Area type="monotone" dataKey="credit" stroke="#16a34a" fill="url(#expCreditFill)" name="Credit" />
        <Area type="monotone" dataKey="debit" stroke="#c8322b" fill="url(#expDebitFill)" name="Debit" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
