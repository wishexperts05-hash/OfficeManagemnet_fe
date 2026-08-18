import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { OfficeEmployee, SalaryRecord } from "../lib/types";
import { useAppSelector } from "../store/hooks";

function nowMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [y, m] = value.split("-").map(Number);
  return { year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 };
}

function money(n?: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function employeeIdOf(row: SalaryRecord) {
  return typeof row.employeeId === "object" && row.employeeId ? row.employeeId._id : String(row.employeeId || "");
}

function employeeLabel(row: SalaryRecord, fallback = "Employee") {
  if (typeof row.employeeId === "object" && row.employeeId) {
    return row.employeeId.fullName || row.employeeId.mobile || fallback;
  }
  return fallback;
}

function employeeMeta(row: SalaryRecord) {
  if (typeof row.employeeId === "object" && row.employeeId) {
    return [row.employeeId.designation, row.employeeId.mobile].filter(Boolean).join(" · ");
  }
  return "";
}

function statusTone(status: string) {
  if (status === "paid") return "ok";
  if (status === "finalized") return "warn";
  return "";
}

export default function SalaryPage() {
  const { t } = useTranslation();
  const { user, activeEmployerId } = useAppSelector((s) => s.auth);
  const isEmployer = user?.accountType === "employer";

  const [items, setItems] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<OfficeEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("all");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [monthValue, setMonthValue] = useState(nowMonthValue());
  const [calcEmployeeId, setCalcEmployeeId] = useState("");
  const [calcEmployeeQuery, setCalcEmployeeQuery] = useState("");
  const [calcPickerOpen, setCalcPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const empPickerRef = useRef<HTMLDivElement>(null);
  const calcPickerRef = useRef<HTMLDivElement>(null);

  const { year, month } = useMemo(() => parseMonth(monthValue), [monthValue]);

  const filterEmployeeList = (list: OfficeEmployee[], qRaw: string) => {
    const q = qRaw.trim().toLowerCase();
    if (!q) return list;
    return list.filter((emp) => {
      const hay = `${emp.fullName || ""} ${emp.mobile || ""} ${emp.designation || ""} ${emp.department || ""}`.toLowerCase();
      return hay.includes(q);
    });
  };

  const filteredEmployees = useMemo(
    () => filterEmployeeList(employees, employeeQuery),
    [employees, employeeQuery],
  );

  const calcFilteredEmployees = useMemo(
    () => filterEmployeeList(employees, calcEmployeeQuery),
    [employees, calcEmployeeQuery],
  );

  const selectedEmployeeLabel = useMemo(() => {
    if (employeeId === "all") return t("allEmployees");
    return employees.find((e) => e._id === employeeId)?.fullName || t("employees");
  }, [employeeId, employees, t]);

  const calcEmployeeLabel = useMemo(() => {
    return employees.find((e) => e._id === calcEmployeeId)?.fullName || t("selectEmployeeFirst");
  }, [calcEmployeeId, employees, t]);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: 200,
        year,
        month,
      };
      if (!isEmployer && activeEmployerId) params.employerId = activeEmployerId;
      if (isEmployer && employeeId !== "all") params.employeeId = employeeId;

      const { data } = await api.get<ApiSuccess<SalaryRecord[]>>("/office/salary", { params });
      setItems(data.data || []);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [isEmployer, activeEmployerId, t, monthValue, employeeId]);

  useEffect(() => {
    if (!isEmployer) return;
    void api
      .get<ApiSuccess<OfficeEmployee[]>>("/office/employees", { params: { limit: 200, status: "active" } })
      .then(({ data }) => {
        const list = data.data.filter((e) => e.status === "active");
        setEmployees(list);
        if (!calcEmployeeId && list[0]) setCalcEmployeeId(list[0]._id);
      });
  }, [isEmployer]);

  useEffect(() => {
    if (!empPickerOpen && !calcPickerOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (empPickerOpen && empPickerRef.current && !empPickerRef.current.contains(target)) {
        setEmpPickerOpen(false);
        setEmployeeQuery("");
      }
      if (calcPickerOpen && calcPickerRef.current && !calcPickerRef.current.contains(target)) {
        setCalcPickerOpen(false);
        setCalcEmployeeQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [empPickerOpen, calcPickerOpen]);

  const stats = useMemo(() => {
    let net = 0;
    let paid = 0;
    let draft = 0;
    let finalized = 0;
    for (const row of items) {
      net += Number(row.netAmount || 0);
      if (row.status === "paid") paid += 1;
      else if (row.status === "finalized") finalized += 1;
      else draft += 1;
    }
    return { net, paid, draft, finalized, count: items.length };
  }, [items]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const pickEmployee = (id: string) => {
    setEmployeeId(id);
    setEmpPickerOpen(false);
    setEmployeeQuery("");
  };

  const pickCalcEmployee = (id: string) => {
    setCalcEmployeeId(id);
    setCalcPickerOpen(false);
    setCalcEmployeeQuery("");
  };

  const calculate = async (targetEmployeeId?: string) => {
    const id = targetEmployeeId || calcEmployeeId;
    if (!id) {
      setError(t("selectEmployeeFirst"));
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/office/salary/calculate", {
        employeeId: id,
        year,
        month,
      });
      setSuccess(t("salaryCalculated"));
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusy(false);
    }
  };

  const calculateAll = async () => {
    if (!employees.length) {
      setError(t("noData"));
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      for (const emp of employees) {
        await api.post("/office/salary/calculate", {
          employeeId: emp._id,
          year,
          month,
        });
      }
      setSuccess(t("salaryCalculatedAll"));
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/office/salary/${id}/status`, { status });
      setSuccess(status === "paid" ? t("salaryMarkedPaid") : t("salaryFinalized"));
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="salary-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("navGroupFinance")}</p>
          <h2 className="display page-title">{t("salary")}</h2>
          <p className="muted page-sub">
            {isEmployer ? t("salarySubEmployer") : t("salarySubEmployee")}
          </p>
        </div>
        <div className="row att-filters">
          {isEmployer ? (
            <div className="field" style={{ marginBottom: 0, minWidth: 240 }} ref={empPickerRef}>
              <label className="label">{t("employees")}</label>
              <div className={`att-emp-combo${empPickerOpen ? " open" : ""}`}>
                <button
                  type="button"
                  className="att-emp-trigger"
                  aria-expanded={empPickerOpen}
                  onClick={() => setEmpPickerOpen((o) => !o)}
                >
                  <span className="att-emp-trigger-label">{selectedEmployeeLabel}</span>
                  <span className="att-emp-caret" aria-hidden>
                    ▾
                  </span>
                </button>
                {empPickerOpen ? (
                  <div className="att-emp-menu">
                    <input
                      className="input att-emp-search"
                      autoFocus
                      value={employeeQuery}
                      placeholder={t("searchEmployees")}
                      onChange={(e) => setEmployeeQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEmpPickerOpen(false);
                          setEmployeeQuery("");
                        }
                      }}
                    />
                    <div className="att-emp-options">
                      {!employeeQuery.trim() ||
                      t("allEmployees").toLowerCase().includes(employeeQuery.trim().toLowerCase()) ? (
                        <button
                          type="button"
                          className={`att-emp-option${employeeId === "all" ? " active" : ""}`}
                          onClick={() => pickEmployee("all")}
                        >
                          {t("allEmployees")}
                        </button>
                      ) : null}
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp._id}
                          type="button"
                          className={`att-emp-option${employeeId === emp._id ? " active" : ""}`}
                          onClick={() => pickEmployee(emp._id)}
                        >
                          <span className="att-emp-option-name">{emp.fullName}</span>
                          <span className="muted att-emp-option-sub">
                            {[emp.designation, emp.mobile].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      ))}
                      {filteredEmployees.length === 0 ? (
                        <p className="muted att-emp-empty">{t("noData")}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">{t("monthFilter")}</label>
            <input
              className="input"
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value || nowMonthValue())}
            />
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonthValue(nowMonthValue())}>
            {t("thisMonth")}
          </button>
        </div>
      </div>

      {isEmployer ? (
        <div className="panel salary-calc-panel">
          <div className="salary-calc-grid">
            <div className="field" style={{ marginBottom: 0 }} ref={calcPickerRef}>
              <label className="label">{t("calculateFor")}</label>
              <div className={`att-emp-combo${calcPickerOpen ? " open" : ""}`}>
                <button
                  type="button"
                  className="att-emp-trigger"
                  aria-expanded={calcPickerOpen}
                  onClick={() => setCalcPickerOpen((o) => !o)}
                >
                  <span className="att-emp-trigger-label">{calcEmployeeLabel}</span>
                  <span className="att-emp-caret" aria-hidden>
                    ▾
                  </span>
                </button>
                {calcPickerOpen ? (
                  <div className="att-emp-menu">
                    <input
                      className="input att-emp-search"
                      autoFocus
                      value={calcEmployeeQuery}
                      placeholder={t("searchEmployees")}
                      onChange={(e) => setCalcEmployeeQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setCalcPickerOpen(false);
                          setCalcEmployeeQuery("");
                        }
                      }}
                    />
                    <div className="att-emp-options">
                      {calcFilteredEmployees.map((emp) => (
                        <button
                          key={emp._id}
                          type="button"
                          className={`att-emp-option${calcEmployeeId === emp._id ? " active" : ""}`}
                          onClick={() => pickCalcEmployee(emp._id)}
                        >
                          <span className="att-emp-option-name">{emp.fullName}</span>
                          <span className="muted att-emp-option-sub">
                            {[emp.designation, emp.mobile].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      ))}
                      {calcFilteredEmployees.length === 0 ? (
                        <p className="muted att-emp-empty">{t("noData")}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="salary-calc-actions">
              <button type="button" className="btn" disabled={busy} onClick={() => void calculate()}>
                {busy ? t("loading") : t("calculateSalary")}
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void calculateAll()}>
                {t("calculateAllEmployees")}
              </button>
            </div>
          </div>
          <p className="muted salary-calc-hint">{t("salaryCalcHint", { month: monthLabel })}</p>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <div className="sites-metrics">
        <div className="panel sites-metric-card tone-ok">
          <div className="label">{t("salaryTotalNet")}</div>
          <div className="display sites-metric-value">{money(stats.net)}</div>
        </div>
        <div className="panel sites-metric-card">
          <div className="label">{t("salaryRecords")}</div>
          <div className="display sites-metric-value">{stats.count}</div>
        </div>
        <div className="panel sites-metric-card tone-warn">
          <div className="label">{t("salaryDraft")}</div>
          <div className="sites-metric-name">{stats.draft}</div>
        </div>
        <div className="panel sites-metric-card">
          <div className="label">{t("salaryPaid")}</div>
          <div className="sites-metric-name">{stats.paid}</div>
        </div>
      </div>

      <div className="panel">
        <div className="employees-toolbar salary-toolbar">
          <span className="muted sites-count">
            {items.length} {t("salaryRecords").toLowerCase()} · {monthLabel}
          </span>
        </div>

        {loading ? (
          <p className="muted">{t("loading")}</p>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p className="display" style={{ margin: 0, fontSize: "1.2rem" }}>
              {t("noSalaryRecords")}
            </p>
            <p className="muted">{isEmployer ? t("noSalaryHintEmployer") : t("noSalaryHintEmployee")}</p>
          </div>
        ) : (
          <div className="salary-grid">
            {items.map((row) => (
              <article key={row._id} className={`salary-card status-${row.status}`}>
                <div className="salary-card-top">
                  <div>
                    <h3 className="salary-card-title">
                      {isEmployer ? employeeLabel(row, t("employee")) : monthLabel}
                      <span className={`badge ${statusTone(row.status)}`}>
                        {t(`salaryStatus.${row.status}`, { defaultValue: row.status })}
                      </span>
                    </h3>
                    <p className="muted salary-card-meta">
                      {isEmployer
                        ? employeeMeta(row) || t("employee")
                        : `${t("month")}: ${row.month}/${row.year}`}
                    </p>
                  </div>
                  <div className="salary-net">
                    <div className="label">{t("netPay")}</div>
                    <div className="salary-net-value">{money(row.netAmount)}</div>
                  </div>
                </div>

                <div className="salary-card-stats">
                  <div>
                    <div className="label">{t("present")}</div>
                    <div className="site-stat-value">{row.presentDays}</div>
                  </div>
                  <div>
                    <div className="label">{t("halfDay")}</div>
                    <div className="site-stat-value">{row.halfDays}</div>
                  </div>
                  <div>
                    <div className="label">{t("absent")}</div>
                    <div className="site-stat-value">{row.absentDays}</div>
                  </div>
                  <div>
                    <div className="label">{t("onLeave")}</div>
                    <div className="site-stat-value">{row.leaveDays ?? 0}</div>
                  </div>
                </div>

                <div className="salary-card-money">
                  <span>
                    {t("baseSalary")}: <strong>{money(row.baseSalary)}</strong>
                  </span>
                  <span>
                    {t("deductions")}: <strong>{money(row.deductions)}</strong>
                  </span>
                  <span>
                    {t("bonuses")}: <strong>{money(row.bonuses)}</strong>
                  </span>
                </div>

                {isEmployer ? (
                  <div className="salary-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => void calculate(employeeIdOf(row))}
                    >
                      {t("recalculate")}
                    </button>
                    {row.status === "draft" ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => void setStatus(row._id, "finalized")}
                      >
                        {t("finalizeSalary")}
                      </button>
                    ) : null}
                    {row.status === "finalized" ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => void setStatus(row._id, "paid")}
                      >
                        {t("markPaid")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
