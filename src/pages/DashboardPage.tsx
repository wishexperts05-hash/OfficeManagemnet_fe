import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { useAppSelector } from "../store/hooks";
import {
  AttendanceAreaChart,
  ChartCard,
  SpendBarChart,
  StatCard,
  TasksPieChart,
  formatINR,
} from "../components/charts";

type DashboardData = {
  role: "employer" | "employee";
  employees?: number;
  activeEmployees?: number;
  sites?: number;
  tasksOpen: number;
  presentToday: number;
  absentHint?: number;
  tasksByStatus: Array<{ status: string; count: number }>;
  attendanceTrend: Array<{ date: string; label: string; present: number; total?: number }>;
  expenditure: { credit: number; debit: number; balance: number };
  recentTasks?: Array<{ _id: string; title: string; status: string; priority?: string; dueDate?: string }>;
  myTasks?: Array<{ _id: string; title: string; status: string; priority?: string; dueDate?: string }>;
};

function statusLabel(status: string, t: (k: string) => string) {
  const key = `taskStatus.${status}`;
  const translated = t(key);
  return translated === key ? status.replaceAll("_", " ") : translated;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, activeEmployerId } = useAppSelector((s) => s.auth);
  const isEmployer = user?.accountType === "employer";
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, string> = {};
        if (!isEmployer && activeEmployerId) params.employerId = activeEmployerId;
        const { data: res } = await api.get<ApiSuccess<DashboardData>>("/office/dashboard", {
          params,
        });
        setData(res.data);
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isEmployer, activeEmployerId, t]);

  const taskPie = useMemo(() => {
    if (!data?.tasksByStatus) return [];
    return data.tasksByStatus.map((row) => ({
      name: statusLabel(row.status, t),
      value: row.count,
    }));
  }, [data, t]);

  if (loading && !data) return <p className="muted">{t("loading")}</p>;
  if (error) return <p className="error">{error}</p>;
  if (!data) return null;

  const recent = isEmployer ? data.recentTasks || [] : data.myTasks || [];

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{isEmployer ? t("roleEmployer") : t("roleEmployee")}</p>
          <h2 className="display dash-title">{t("dashWelcome")}</h2>
          <p className="muted">{isEmployer ? t("dashWelcomeSubEmployer") : t("dashWelcomeSubEmployee")}</p>
        </div>
        <div className="row">
          {isEmployer ? (
            <>
              <Link to="/app/employees" className="btn btn-ghost">
                {t("employees")}
              </Link>
              <Link to="/app/tasks" className="btn">
                {t("tasks")}
              </Link>
            </>
          ) : (
            <>
              <Link to="/app/attendance" className="btn btn-ghost">
                {t("attendance")}
              </Link>
              <Link to="/app/tasks" className="btn">
                {t("tasks")}
              </Link>
            </>
          )}
        </div>
      </div>

      {isEmployer ? (
        <div className="grid-4">
          <StatCard label={t("employees")} value={data.employees ?? 0} tone="accent" hint={t("activeCount", { count: data.activeEmployees ?? 0 })} />
          <StatCard label={t("tasksOpen")} value={data.tasksOpen} tone="warn" />
          <StatCard label={t("presentToday")} value={data.presentToday} tone="ok" hint={t("notLoggedIn", { count: data.absentHint ?? 0 })} />
          <StatCard label={t("sites")} value={data.sites ?? 0} />
        </div>
      ) : (
        <div className="grid-3">
          <StatCard label={t("tasksOpen")} value={data.tasksOpen} tone="warn" />
          <StatCard label={t("presentToday")} value={data.presentToday} tone="ok" />
          <StatCard label={t("expBalance")} value={formatINR(data.expenditure.balance)} />
        </div>
      )}

      <div className="grid-2">
        <ChartCard title={t("chartTasks")} subtitle={t("chartTasksSub")}>
          <TasksPieChart data={taskPie} />
        </ChartCard>
        <ChartCard title={t("chartAttendance")} subtitle={t("chartAttendanceSub")}>
          <AttendanceAreaChart data={data.attendanceTrend} />
        </ChartCard>
      </div>

      <div className="grid-2">
        <ChartCard
          title={isEmployer ? t("chartSpend") : t("chartSpendPersonal")}
          subtitle={isEmployer ? t("chartSpendSub") : t("chartSpendPersonalSub")}
        >
          <SpendBarChart credit={data.expenditure.credit} debit={data.expenditure.debit} />
        </ChartCard>

        <div className="panel">
          <div className="chart-card-head">
            <div>
              <h3 className="chart-card-title">{isEmployer ? t("recentTasks") : t("myTasks")}</h3>
              <p className="muted chart-card-sub">{t("recentTasksSub")}</p>
            </div>
            <Link to="/app/tasks" className="btn btn-ghost" style={{ padding: "0.4rem 0.8rem" }}>
              {t("viewAll")}
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="muted">{t("noData")}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t("taskTitle")}</th>
                  <th>{t("status")}</th>
                  <th>{t("priority")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((task) => (
                  <tr key={task._id}>
                    <td>{task.title}</td>
                    <td>
                      <span className={`badge ${task.status === "done" ? "ok" : "warn"}`}>
                        {statusLabel(task.status, t)}
                      </span>
                    </td>
                    <td>{task.priority || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isEmployer && (
        <div className="grid-3">
          <StatCard label={t("credit")} value={formatINR(data.expenditure.credit)} tone="ok" />
          <StatCard label={t("debit")} value={formatINR(data.expenditure.debit)} tone="warn" />
          <StatCard label={t("expBalance")} value={formatINR(data.expenditure.balance)} tone="accent" />
        </div>
      )}
    </div>
  );
}
