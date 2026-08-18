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

export const CHART_COLORS = ["#0f766e", "#c2410c", "#0369a1", "#7c3aed", "#b45309", "#047857"];

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
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <p className="muted">No task data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
          {filtered.map((_, index) => (
            <Cell key={filtered[index].name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
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
  if (data.length === 0) return <p className="muted">No attendance data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area type="monotone" dataKey="present" stroke="#0f766e" fill="url(#presentFill)" name="Present" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendBarChart({ credit, debit }: { credit: number; debit: number }) {
  const data = [
    { name: "Credit", value: credit },
    { name: "Debit", value: debit },
  ];
  if (credit === 0 && debit === 0) return <p className="muted">No expenditure data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => formatINR(Number(v || 0))} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          <Cell fill="#047857" />
          <Cell fill="#c2410c" />
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
  if (data.length === 0) return <p className="muted">No trend data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="expCreditFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#047857" stopOpacity={0.34} />
            <stop offset="95%" stopColor="#047857" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="expDebitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c2410c" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#c2410c" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => formatINR(Number(v || 0))} />
        <Legend />
        <Area type="monotone" dataKey="credit" stroke="#047857" fill="url(#expCreditFill)" name="Credit" />
        <Area type="monotone" dataKey="debit" stroke="#c2410c" fill="url(#expDebitFill)" name="Debit" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
