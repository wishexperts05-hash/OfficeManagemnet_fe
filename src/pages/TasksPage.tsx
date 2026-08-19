import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { OfficeEmployee, Task } from "../lib/types";
import { useAppSelector } from "../store/hooks";

type Mode = "list" | "create" | "edit";

type TaskForm = {
  title: string;
  description: string;
  assignedToEmployeeIds: string[];
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
};

const emptyForm = (): TaskForm => ({
  title: "",
  description: "",
  assignedToEmployeeIds: [],
  priority: "medium",
  dueDate: "",
  status: "todo",
});

function taskToForm(task: Task): TaskForm {
  return {
    title: task.title || "",
    description: task.description || "",
    assignedToEmployeeIds: task.assignedToEmployeeIds || [],
    priority: (task.priority as TaskForm["priority"]) || "medium",
    dueDate: task.dueDate?.slice(0, 10) || "",
    status: (task.status as TaskForm["status"]) || "todo",
  };
}

function fmtDate(v?: string) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN");
}

export default function TasksPage() {
  const { t } = useTranslation();
  const { user, activeEmployerId, locale } = useAppSelector((s) => s.auth);
  const isEmployer = user?.accountType === "employer";
  const [items, setItems] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<OfficeEmployee[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const empPickerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = { limit: "100" };
    if (!isEmployer && activeEmployerId) params.employerId = activeEmployerId;
    try {
      const { data } = await api.get<ApiSuccess<Task[]>>("/office/tasks", { params });
      setItems(data.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (isEmployer) {
      void api
        .get<ApiSuccess<OfficeEmployee[]>>("/office/employees", { params: { limit: 100 } })
        .then(({ data }) => setEmployees(data.data.filter((e) => e.status === "active")));
    }
  }, [isEmployer, activeEmployerId, t]);

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

  const selectedTask = useMemo(
    () => items.find((task) => task._id === editingId) || null,
    [editingId, items],
  );

  const assigneeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e._id, e.fullName));
    return map;
  }, [employees]);

  const filterEmployeeList = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.mobile.includes(q) ||
        (e.designation || "").toLowerCase().includes(q),
    );
  }, [employeeQuery, employees]);

  const selectedEmployeeLabel = useMemo(() => {
    if (employeeFilter === "all") return t("allEmployees");
    return employees.find((e) => e._id === employeeFilter)?.fullName || t("employees");
  }, [employeeFilter, employees, t]);

  const assigneeFiltered = useMemo(() => {
    const q = assigneeQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.mobile.includes(q) ||
        (e.designation || "").toLowerCase().includes(q),
    );
  }, [assigneeQuery, employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((task) => {
      const matchesQ =
        !q ||
        task.title.toLowerCase().includes(q) ||
        (task.description || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesEmployee =
        employeeFilter === "all" ||
        (task.assignedToEmployeeIds || []).includes(employeeFilter);
      const due = task.dueDate?.slice(0, 10) || "";
      const matchesDate = !dateFilter || due === dateFilter;
      return matchesQ && matchesStatus && matchesPriority && matchesEmployee && matchesDate;
    });
  }, [dateFilter, employeeFilter, items, priorityFilter, query, statusFilter]);

  const pickEmployeeFilter = (id: string) => {
    setEmployeeFilter(id);
    setEmpPickerOpen(false);
    setEmployeeQuery("");
  };

  const metrics = useMemo(() => {
    const todo = items.filter((t) => t.status === "todo").length;
    const progress = items.filter((t) => t.status === "in_progress").length;
    const done = items.filter((t) => t.status === "done").length;
    return { total: items.length, todo, progress, done };
  }, [items]);

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
  };

  const openEdit = (task: Task) => {
    setMode("edit");
    setEditingId(task._id);
    setForm(taskToForm(task));
    setError("");
    setSuccess("");
  };

  const closeEditor = () => {
    setMode("list");
    setEditingId(null);
    setForm(emptyForm());
    setAssigneeQuery("");
    setError("");
  };

  const toggleAssignee = (id: string) => {
    setForm((f) => {
      const exists = f.assignedToEmployeeIds.includes(id);
      return {
        ...f,
        assignedToEmployeeIds: exists
          ? f.assignedToEmployeeIds.filter((x) => x !== id)
          : [...f.assignedToEmployeeIds, id],
      };
    });
  };

  const submitTask = async () => {
    setError("");
    setSuccess("");
    if (!form.title.trim()) {
      setError(t("taskTitleRequired"));
      return;
    }
    if (isEmployer && form.assignedToEmployeeIds.length === 0) {
      setError(t("taskAssignRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        assignedToEmployeeIds: form.assignedToEmployeeIds,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || undefined,
      };
      if (mode === "edit" && editingId) {
        await api.patch(`/office/tasks/${editingId}`, payload);
        setSuccess(t("taskUpdated"));
      } else {
        await api.post("/office/tasks", payload);
        setSuccess(t("taskCreated"));
      }
      await load();
      closeEditor();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/office/tasks/${id}`, { status });
    await load();
  };

  return (
    <div className="tasks-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("navGroupWork")}</p>
          <h2 className="display page-title">{t("tasks")}</h2>
          <p className="muted page-sub">{t("tasksSub")}</p>
        </div>
        {isEmployer ? (
          <button type="button" className="btn" onClick={openCreate}>
            {t("addTask")}
          </button>
        ) : null}
      </div>

      <div className="sites-metrics">
        <div className="panel sites-metric-card">
          <div className="label">{t("tasks")}</div>
          <div className="display sites-metric-value">{metrics.total}</div>
        </div>
        <div className="panel sites-metric-card">
          <div className="label">{t("taskStatus.todo")}</div>
          <div className="sites-metric-name">{metrics.todo}</div>
        </div>
        <div className="panel sites-metric-card">
          <div className="label">{t("taskStatus.in_progress")}</div>
          <div className="sites-metric-name">{metrics.progress}</div>
        </div>
      </div>

      {(error || success) && mode === "list" ? (
        <p className={error ? "error" : "success"}>{error || success}</p>
      ) : null}

      <div className={`tasks-layout${mode !== "list" ? " with-panel" : ""}`}>
        <div className="panel tasks-list-panel">
          <div className="tasks-toolbar">
            <input
              className="input"
              value={query}
              placeholder={t("searchTasks")}
              onChange={(e) => setQuery(e.target.value)}
            />
            {isEmployer ? (
              <div className="field" style={{ marginBottom: 0 }} ref={empPickerRef}>
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
                            className={`att-emp-option${employeeFilter === "all" ? " active" : ""}`}
                            onClick={() => pickEmployeeFilter("all")}
                          >
                            {t("allEmployees")}
                          </button>
                        ) : null}
                        {filterEmployeeList.map((emp) => (
                          <button
                            key={emp._id}
                            type="button"
                            className={`att-emp-option${employeeFilter === emp._id ? " active" : ""}`}
                            onClick={() => pickEmployeeFilter(emp._id)}
                          >
                            <span className="att-emp-option-name">{emp.fullName}</span>
                            <span className="muted att-emp-option-sub">
                              {[emp.designation, emp.mobile].filter(Boolean).join(" · ")}
                            </span>
                          </button>
                        ))}
                        {filterEmployeeList.length === 0 ? (
                          <p className="muted att-emp-empty">{t("noData")}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <input
              className="input"
              type="date"
              value={dateFilter}
              title={t("dueDate")}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">{t("allStatus")}</option>
              <option value="todo">{t("taskStatus.todo")}</option>
              <option value="in_progress">{t("taskStatus.in_progress")}</option>
              <option value="done">{t("taskStatus.done")}</option>
              <option value="cancelled">{t("taskStatus.cancelled")}</option>
            </select>
            <select className="select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">{t("allPriority")}</option>
              <option value="low">{t("priorityLow")}</option>
              <option value="medium">{t("priorityMedium")}</option>
              <option value="high">{t("priorityHigh")}</option>
              <option value="urgent">{t("priorityUrgent")}</option>
            </select>
            {dateFilter || employeeFilter !== "all" ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDateFilter("");
                  setEmployeeFilter("all");
                }}
              >
                {t("clear")}
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="muted">{t("loading")}</p>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p className="display" style={{ margin: 0, fontSize: "1.2rem" }}>
                {t("noTasksYet")}
              </p>
              <p className="muted">{t("noTasksHint")}</p>
            </div>
          ) : (
            <div className="task-cards">
              {filtered.map((task) => (
                <article key={task._id} className={`site-card${editingId === task._id ? " active" : ""}`}>
                  <div className="site-card-top">
                    <div>
                      <h3 className="site-card-title">
                        {locale === "hi" && task.titleHi ? task.titleHi : task.title}
                        <span className={`badge ${task.status === "done" ? "ok" : "warn"}`}>
                          {t(`taskStatus.${task.status}`)}
                        </span>
                      </h3>
                      {task.description ? <p className="muted site-card-meta">{task.description}</p> : null}
                    </div>
                    <div className="site-card-actions">
                      {isEmployer ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>
                          {t("edit")}
                        </button>
                      ) : null}
                      {task.status !== "done" ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void updateStatus(task._id, "done")}
                        >
                          {t("markDone")}
                        </button>
                      ) : null}
                      {isEmployer && task.status === "todo" ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void updateStatus(task._id, "in_progress")}
                        >
                          {t("startTask")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="site-card-stats">
                    <div>
                      <div className="label">{t("priority")}</div>
                      <div className="site-stat-value">{t(`priority${task.priority[0].toUpperCase()}${task.priority.slice(1)}`)}</div>
                    </div>
                    <div>
                      <div className="label">{t("dueDate")}</div>
                      <div className="site-stat-value">{fmtDate(task.dueDate)}</div>
                    </div>
                    <div>
                      <div className="label">{t("assigned")}</div>
                      <div className="site-stat-value">
                        {task.assignedToEmployeeIds?.length || 0} {t("employees").toLowerCase()}
                      </div>
                    </div>
                  </div>
                  {isEmployer ? (
                    <div className="row" style={{ marginTop: "0.65rem" }}>
                      {(task.assignedToEmployeeIds || []).slice(0, 4).map((id) => (
                        <span key={id} className="badge">
                          {assigneeNameMap.get(id) || t("employee")}
                        </span>
                      ))}
                      {(task.assignedToEmployeeIds?.length || 0) > 4 ? (
                        <span className="badge">+{(task.assignedToEmployeeIds?.length || 0) - 4}</span>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        {isEmployer && mode !== "list" ? (
          <div className="panel sites-form-panel">
            <div className="sites-form-head">
              <div>
                <h3 className="chart-card-title">{mode === "create" ? t("addTask") : t("editTask")}</h3>
                <p className="muted chart-card-sub">
                  {mode === "create" ? t("taskFormSub") : selectedTask?.title || ""}
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeEditor}>
                {t("close")}
              </button>
            </div>

            <div className="field">
              <label className="label">{t("taskTitle")}</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">{t("description")}</label>
              <textarea
                className="textarea"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid-3">
              <div className="field">
                <label className="label">{t("priority")}</label>
                <select
                  className="select"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskForm["priority"] }))}
                >
                  <option value="low">{t("priorityLow")}</option>
                  <option value="medium">{t("priorityMedium")}</option>
                  <option value="high">{t("priorityHigh")}</option>
                  <option value="urgent">{t("priorityUrgent")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("status")}</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskForm["status"] }))}
                >
                  <option value="todo">{t("taskStatus.todo")}</option>
                  <option value="in_progress">{t("taskStatus.in_progress")}</option>
                  <option value="done">{t("taskStatus.done")}</option>
                  <option value="cancelled">{t("taskStatus.cancelled")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("dueDate")}</label>
                <input
                  className="input"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="label">{t("assignTo")}</label>
              <div className="employees-toolbar" style={{ marginBottom: "0.5rem" }}>
                <input
                  className="input"
                  value={assigneeQuery}
                  placeholder={t("searchEmployees")}
                  onChange={(e) => setAssigneeQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setForm((f) => ({ ...f, assignedToEmployeeIds: assigneeFiltered.map((e) => e._id) }))
                  }
                >
                  {t("selectAll")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setForm((f) => ({ ...f, assignedToEmployeeIds: [] }))}
                >
                  {t("clear")}
                </button>
              </div>
              <div className="assignee-pick-list">
                {assigneeFiltered.map((emp) => {
                  const checked = form.assignedToEmployeeIds.includes(emp._id);
                  return (
                    <label key={emp._id} className={`assignee-item${checked ? " checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssignee(emp._id)}
                      />
                      <span className="assignee-name">{emp.fullName}</span>
                      <span className="muted assignee-sub">
                        {emp.designation || t("employee")} · {emp.mobile}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="muted" style={{ marginTop: "0.45rem", fontSize: "0.8rem" }}>
                {t("taskAssignHint")}
              </p>
            </div>

            {error || success ? <p className={error ? "error" : "success"}>{error || success}</p> : null}

            <div className="row">
              <button type="button" className="btn" disabled={saving} onClick={() => void submitTask()}>
                {saving ? t("loading") : t("save")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeEditor}>
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
