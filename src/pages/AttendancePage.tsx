import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { Attendance, CompanySite, OfficeEmployee } from "../lib/types";
import { useAppSelector } from "../store/hooks";
import { getCurrentPosition } from "../lib/geo";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nowMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [y, m] = value.split("-").map(Number);
  return { year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatHours(minutes?: number) {
  if (minutes == null || Number.isNaN(Number(minutes))) return "—";
  const total = Math.max(0, Number(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function employeeLabel(row: Attendance) {
  if (typeof row.employeeId === "object" && row.employeeId) {
    return row.employeeId.fullName || row.employeeId.mobile || "Employee";
  }
  return "Employee";
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const { user, activeEmployerId } = useAppSelector((s) => s.auth);
  const isEmployer = user?.accountType === "employer";

  const [items, setItems] = useState<Attendance[]>([]);
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [employees, setEmployees] = useState<OfficeEmployee[]>([]);
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [siteId, setSiteId] = useState("");
  const [employeeId, setEmployeeId] = useState("all");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [monthValue, setMonthValue] = useState(nowMonthValue());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const empPickerRef = useRef<HTMLDivElement>(null);

  const { year, month } = useMemo(() => parseMonth(monthValue), [monthValue]);

  const todayKey = useMemo(() => {
    const d = new Date();
    return toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const hay = `${emp.fullName || ""} ${emp.mobile || ""} ${emp.designation || ""} ${emp.department || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [employees, employeeQuery]);

  const selectedEmployeeLabel = useMemo(() => {
    if (employeeId === "all") return t("allEmployees");
    return employees.find((e) => e._id === employeeId)?.fullName || t("employees");
  }, [employeeId, employees, t]);

  const load = async () => {
    setFetching(true);
    try {
      const params: Record<string, string> = {
        limit: "500",
        sortBy: "date",
        sortOrder: "asc",
        month: String(month),
        year: String(year),
      };
      if (!isEmployer && activeEmployerId) params.employerId = activeEmployerId;
      if (isEmployer && employeeId !== "all") params.employeeId = employeeId;

      const { data } = await api.get<ApiSuccess<Attendance[]>>("/office/attendance", { params });
      setItems(data.data || []);

      if (!isEmployer && activeEmployerId) {
        const todayRes = await api.get<ApiSuccess<Attendance[]>>("/office/attendance", {
          params: { date: todayKey, employerId: activeEmployerId, limit: "5" },
        });
        setTodayRecord(todayRes.data.data?.[0] || null);
      } else {
        setTodayRecord(null);
      }
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    void load();
  }, [isEmployer, activeEmployerId, t, monthValue, employeeId]);

  useEffect(() => {
    if (!isEmployer) return;
    void api
      .get<ApiSuccess<OfficeEmployee[]>>("/office/employees", { params: { limit: 200, status: "active" } })
      .then(({ data }) => setEmployees(data.data.filter((e) => e.status === "active")));
  }, [isEmployer]);

  useEffect(() => {
    if (!empPickerOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (empPickerRef.current && !empPickerRef.current.contains(e.target as Node)) {
        setEmpPickerOpen(false);
        setEmployeeQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [empPickerOpen]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (!isEmployer) {
      if (!activeEmployerId) return;
      params.employerId = activeEmployerId;
    }
    void api.get<ApiSuccess<CompanySite[]>>("/office/sites", { params }).then(({ data }) => {
      setSites(data.data);
      const primary = data.data.find((s) => s.isPrimary) || data.data[0];
      if (primary) setSiteId(primary._id);
    });
  }, [isEmployer, activeEmployerId]);

  const pickEmployee = (id: string) => {
    setEmployeeId(id);
    setEmpPickerOpen(false);
    setEmployeeQuery("");
    setSelectedDay(null);
  };

  const byDate = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    for (const row of items) {
      const key = String(row.date).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map;
  }, [items]);

  const calendarCells = useMemo(() => {
    const totalDays = daysInMonth(year, month);
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: null, key: `pad-${i}` });
    for (let d = 1; d <= totalDays; d += 1) {
      cells.push({ day: d, key: toDateKey(year, month, d) });
    }
    return cells;
  }, [year, month]);

  const dayStatus = (dateKey: string) => {
    const rows = byDate.get(dateKey) || [];
    if (rows.length === 0) {
      if (dateKey > todayKey) return "future";
      return "absent";
    }

    const effective = (row: Attendance) => {
      if (row.status === "on_leave") return "leave";
      // Login without logout: open today, absent after day ends
      if (row.loginAt && !row.logoutAt) {
        return dateKey >= todayKey ? "open" : "absent";
      }
      if (row.status === "half_day") return "half";
      if (row.status === "present") return "present";
      if (row.status === "absent") return "absent";
      return "absent";
    };

    const statuses = rows.map(effective);
    if (statuses.some((s) => s === "half")) return "half";
    if (statuses.some((s) => s === "present" || s === "open")) return "present";
    if (statuses.some((s) => s === "leave")) return "leave";
    return "absent";
  };

  const dayHours = (dateKey: string) => {
    const rows = byDate.get(dateKey) || [];
    const minutes = rows.reduce((sum, r) => sum + Number(r.workedMinutes || 0), 0);
    return minutes > 0 ? formatHours(minutes) : "";
  };

  const stats = useMemo(() => {
    const totalDays = daysInMonth(year, month);
    let present = 0;
    let absent = 0;
    let half = 0;
    let leave = 0;
    let workedMinutes = 0;

    for (let d = 1; d <= totalDays; d += 1) {
      const key = toDateKey(year, month, d);
      if (key > todayKey) continue;
      const status = dayStatus(key);
      if (status === "present") present += 1;
      else if (status === "half") half += 1;
      else if (status === "leave") leave += 1;
      else if (status === "absent") absent += 1;
    }
    for (const row of items) workedMinutes += Number(row.workedMinutes || 0);

    return { present, absent, half, leave, workedHours: formatHours(workedMinutes) };
  }, [byDate, items, month, year, todayKey]);

  const selectedRows = selectedDay ? byDate.get(selectedDay) || [] : [];

  const canLogin =
    !isEmployer && !todayRecord?.loginAt && todayRecord?.status !== "on_leave";
  const canLogout =
    !isEmployer &&
    Boolean(todayRecord?.loginAt) &&
    !todayRecord?.logoutAt &&
    todayRecord?.status !== "on_leave";
  const canLeave =
    !isEmployer && !todayRecord?.loginAt && todayRecord?.status !== "on_leave";

  const mark = async (action: "login" | "logout" | "leave") => {
    setError("");
    setMsg("");
    setLoading(true);
    try {
      if (!activeEmployerId) throw new Error(t("selectCompanyFirst"));
      if (action === "leave") {
        await api.post("/office/attendance/leave", {
          employerId: activeEmployerId,
          siteId: siteId || undefined,
        });
        setMsg(t("leaveRecorded"));
      } else {
        if (!siteId) throw new Error(t("noSiteConfigured"));
        const pos = await getCurrentPosition();
        await api.post(`/office/attendance/${action}`, {
          employerId: activeEmployerId,
          siteId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setMsg(action === "login" ? t("loginRecorded") : t("logoutRecorded"));
      }
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (row: Attendance, status: string) => {
    setError("");
    setMsg("");
    setLoading(true);
    try {
      await api.patch(`/office/attendance/${row._id}/status`, { status });
      setMsg(t("attendanceStatusUpdated"));
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  const createStatus = async (status: string) => {
    if (!selectedDay || employeeId === "all") {
      setError(t("filterEmployeeHint"));
      return;
    }
    setError("");
    setMsg("");
    setLoading(true);
    try {
      await api.post("/office/attendance/adjust", {
        employeeId,
        date: selectedDay,
        status,
      });
      setMsg(t("attendanceStatusUpdated"));
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="attendance-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("navGroupOps")}</p>
          <h2 className="display page-title">{t("attendance")}</h2>
          <p className="muted page-sub">
            {isEmployer ? t("attendanceSubEmployer") : t("attendanceSubEmployee")}
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
                      {!employeeQuery.trim() || t("allEmployees").toLowerCase().includes(employeeQuery.trim().toLowerCase()) ? (
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
              onChange={(e) => {
                setMonthValue(e.target.value || nowMonthValue());
                setSelectedDay(null);
              }}
            />
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonthValue(nowMonthValue())}>
            {t("thisMonth")}
          </button>
        </div>
      </div>

      {!isEmployer ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="att-today-bar">
            <p className="muted" style={{ margin: 0 }}>
              {t("attendanceGeofenceHint")}
            </p>
            <span
              className={`att-today-chip ${
                todayRecord?.status === "on_leave"
                  ? "leave"
                  : todayRecord?.logoutAt
                    ? "done"
                    : todayRecord?.loginAt
                      ? "present"
                      : "idle"
              }`}
            >
              {todayRecord?.status === "on_leave"
                ? t("onLeaveToday")
                : todayRecord?.logoutAt
                  ? t("loggedOutToday")
                  : todayRecord?.loginAt
                    ? t("loggedInToday")
                    : t("notMarkedToday")}
            </span>
          </div>
          <div className="field">
            <label className="label">{t("sites")}</label>
            <select className="select" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.geofenceRadiusMeters}m)
                </option>
              ))}
            </select>
          </div>
          <div className="row att-action-row">
            <button
              type="button"
              className="btn"
              disabled={loading || !canLogin}
              onClick={() => void mark("login")}
            >
              {t("loginAttendance")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={loading || !canLogout}
              onClick={() => void mark("logout")}
            >
              {t("logoutAttendance")}
            </button>
            <button
              type="button"
              className="btn btn-ghost att-leave-btn"
              disabled={loading || !canLeave}
              onClick={() => void mark("leave")}
            >
              {t("markOnLeave")}
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {msg ? <p className="success">{msg}</p> : null}
        </div>
      ) : null}

      {error && isEmployer ? <p className="error">{error}</p> : null}

      <div className="sites-metrics">
        <div className="panel sites-metric-card tone-ok">
          <div className="label">{t("present")}</div>
          <div className="display sites-metric-value">{stats.present}</div>
        </div>
        <div className="panel sites-metric-card tone-warn">
          <div className="label">{t("absent")}</div>
          <div className="display sites-metric-value">{stats.absent}</div>
        </div>
        <div className="panel sites-metric-card">
          <div className="label">{t("halfDay")}</div>
          <div className="sites-metric-name">{stats.half}</div>
        </div>
        <div className="panel sites-metric-card">
          <div className="label">{t("workedHours")}</div>
          <div className="sites-metric-name">{stats.workedHours}</div>
        </div>
      </div>

      <div className="att-layout">
        <div className="panel att-calendar-panel">
          <div className="att-calendar-head">
            <h3 className="chart-card-title">{monthLabel}</h3>
            <div className="att-legend">
              <span className="att-legend-item present">{t("present")}</span>
              <span className="att-legend-item half">{t("halfDay")}</span>
              <span className="att-legend-item absent">{t("absent")}</span>
              <span className="att-legend-item leave">{t("onLeave")}</span>
            </div>
          </div>

          {fetching ? (
            <p className="muted">{t("loading")}</p>
          ) : (
            <>
              <div className="att-weekdays">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="att-weekday">
                    {d}
                  </div>
                ))}
              </div>
              <div className="att-grid">
                {calendarCells.map((cell) => {
                  if (!cell.day) return <div key={cell.key} className="att-day empty" />;
                  const status = dayStatus(cell.key);
                  const hours = dayHours(cell.key);
                  const isSelected = selectedDay === cell.key;
                  const isToday = cell.key === todayKey;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={`att-day ${status}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
                      onClick={() => setSelectedDay(cell.key)}
                    >
                      <span className="att-day-num">{cell.day}</span>
                      {hours ? <span className="att-day-hours">{hours}</span> : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="panel att-detail-panel">
          <h3 className="chart-card-title">
            {selectedDay ? t("dayDetails") : t("pickADay")}
          </h3>
          <p className="muted chart-card-sub">
            {selectedDay || t("attendanceCalendarHint")}
          </p>

          {!selectedDay ? (
            <p className="muted" style={{ marginTop: 16 }}>
              {t("attendanceClickDay")}
            </p>
          ) : selectedRows.length === 0 ? (
            <div className="att-empty-day">
              <span className="badge warn">{t("absent")}</span>
              <p className="muted">{t("noAttendanceOnDay")}</p>
              {isEmployer && employeeId !== "all" && selectedDay <= todayKey ? (
                <div className="att-status-edit">
                  <label className="label">{t("setAttendanceStatus")}</label>
                  <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                    {(["present", "half_day", "absent", "on_leave"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={loading}
                        onClick={() => void createStatus(st)}
                      >
                        {t(`attStatus.${st}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isEmployer ? (
                <p className="muted" style={{ fontSize: "0.82rem" }}>
                  {t("filterEmployeeToEdit")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="att-day-list">
              {selectedRows.map((row) => {
                const openSession = Boolean(row.loginAt && !row.logoutAt);
                const displayStatus =
                  openSession && String(row.date).slice(0, 10) >= todayKey
                    ? "open"
                    : openSession
                      ? "absent"
                      : row.status;
                return (
                  <article key={row._id} className="att-day-card">
                    {isEmployer ? (
                      <p className="att-emp-name">{employeeLabel(row)}</p>
                    ) : null}
                    <div className="att-day-meta">
                      <span
                        className={`badge ${
                          displayStatus === "present" || displayStatus === "open" ? "ok" : "warn"
                        }`}
                      >
                        {displayStatus === "open"
                          ? t("loggedInToday")
                          : t(`attStatus.${displayStatus}`, { defaultValue: displayStatus })}
                      </span>
                      <strong>{formatHours(row.workedMinutes)}</strong>
                    </div>
                    <div className="att-time-row">
                      <div>
                        <div className="label">{t("loginTime")}</div>
                        <div>{formatTime(row.loginAt)}</div>
                      </div>
                      <div>
                        <div className="label">{t("logoutTime")}</div>
                        <div>{formatTime(row.logoutAt)}</div>
                      </div>
                    </div>
                    {openSession && String(row.date).slice(0, 10) < todayKey ? (
                      <p className="muted att-missing-logout">{t("missingLogoutAbsent")}</p>
                    ) : null}
                    {isEmployer ? (
                      <div className="att-status-edit">
                        <label className="label">{t("changeAttendanceStatus")}</label>
                        <select
                          className="select"
                          value={row.status}
                          disabled={loading}
                          onChange={(e) => void updateStatus(row, e.target.value)}
                        >
                          <option value="present">{t("attStatus.present")}</option>
                          <option value="half_day">{t("attStatus.half_day")}</option>
                          <option value="absent">{t("attStatus.absent")}</option>
                          <option value="on_leave">{t("attStatus.on_leave")}</option>
                        </select>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {isEmployer && employeeId === "all" && selectedDay && selectedRows.length > 0 ? (
            <p className="muted" style={{ marginTop: 12, fontSize: "0.82rem" }}>
              {t("filterEmployeeHint")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
