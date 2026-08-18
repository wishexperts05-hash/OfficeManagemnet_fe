import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { OfficeEmployee } from "../lib/types";

type Mode = "list" | "create" | "edit";

type EmployeeForm = {
  mobile: string;
  fullName: string;
  fullNameHi: string;
  employeeCode: string;
  email: string;
  alternateMobile: string;
  aadhaarNumber: string;
  dob: string;
  gender: "" | "male" | "female" | "other";
  maritalStatus: "" | "single" | "married" | "other";
  designation: string;
  department: string;
  qualification: string;
  joiningDate: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  emergencyContactName: string;
  emergencyContactMobile: string;
  baseSalary: string;
  salaryCycle: "monthly" | "daily" | "weekly";
  locationTrackingEnabled: boolean;
  canManageExpenditure: boolean;
};

const emptyForm = (): EmployeeForm => ({
  mobile: "",
  fullName: "",
  fullNameHi: "",
  employeeCode: "",
  email: "",
  alternateMobile: "",
  aadhaarNumber: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  designation: "",
  department: "",
  qualification: "",
  joiningDate: "",
  addressLine1: "",
  city: "",
  state: "",
  pincode: "",
  emergencyContactName: "",
  emergencyContactMobile: "",
  baseSalary: "0",
  salaryCycle: "monthly",
  locationTrackingEnabled: false,
  canManageExpenditure: false,
});

function employeeToForm(emp: OfficeEmployee): EmployeeForm {
  return {
    mobile: emp.mobile || "",
    fullName: emp.fullName || "",
    fullNameHi: emp.fullNameHi || "",
    employeeCode: emp.employeeCode || "",
    email: emp.email || "",
    alternateMobile: emp.alternateMobile || "",
    aadhaarNumber: emp.aadhaarNumber || "",
    dob: emp.dob?.slice(0, 10) || "",
    gender: (emp.gender || "") as EmployeeForm["gender"],
    maritalStatus: (emp.maritalStatus || "") as EmployeeForm["maritalStatus"],
    designation: emp.designation || "",
    department: emp.department || "",
    qualification: emp.qualification || "",
    joiningDate: emp.joiningDate?.slice(0, 10) || "",
    addressLine1: emp.addressLine1 || "",
    city: emp.city || "",
    state: emp.state || "",
    pincode: emp.pincode || "",
    emergencyContactName: emp.emergencyContactName || "",
    emergencyContactMobile: emp.emergencyContactMobile || "",
    baseSalary: String(emp.baseSalary || 0),
    salaryCycle: emp.salaryCycle || "monthly",
    locationTrackingEnabled: !!emp.locationTrackingEnabled,
    canManageExpenditure: !!emp.canManageExpenditure,
  };
}

export default function EmployeesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<OfficeEmployee[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiSuccess<OfficeEmployee[]>>("/office/employees", {
        params: { limit: 100 },
      });
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
  }, [t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(q) ||
        emp.mobile.includes(q) ||
        (emp.designation || "").toLowerCase().includes(q) ||
        (emp.department || "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const selected = useMemo(
    () => items.find((emp) => emp._id === editingId) || null,
    [items, editingId],
  );

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
  };

  const openEdit = (emp: OfficeEmployee) => {
    setMode("edit");
    setEditingId(emp._id);
    setForm(employeeToForm(emp));
    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    setMode("list");
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const submit = async () => {
    setError("");
    setSuccess("");
    if (!form.fullName.trim()) {
      setError(t("fullNameRequired"));
      return;
    }
    if (mode === "create" && form.mobile.length !== 10) {
      setError(t("mobileInvalid"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        mobile: form.mobile.replace(/\D/g, "").slice(0, 10),
        alternateMobile: form.alternateMobile.replace(/\D/g, "").slice(0, 10) || undefined,
        emergencyContactMobile:
          form.emergencyContactMobile.replace(/\D/g, "").slice(0, 10) || undefined,
        aadhaarNumber: form.aadhaarNumber.replace(/\D/g, "").slice(0, 12) || undefined,
        dob: form.dob || undefined,
        joiningDate: form.joiningDate || undefined,
        gender: form.gender || undefined,
        maritalStatus: form.maritalStatus || undefined,
        fullNameHi: form.fullNameHi || undefined,
        employeeCode: form.employeeCode || undefined,
        email: form.email || undefined,
        designation: form.designation || undefined,
        department: form.department || undefined,
        qualification: form.qualification || undefined,
        addressLine1: form.addressLine1 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        pincode: form.pincode || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        baseSalary: Number(form.baseSalary) || 0,
      };

      if (mode === "edit" && editingId) {
        await api.patch(`/office/employees/${editingId}`, payload);
        setSuccess(t("employeeUpdated"));
      } else {
        await api.post("/office/employees", payload);
        setSuccess(t("employeeAdded"));
      }
      await load();
      closeForm();
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    await api.patch(`/office/employees/${id}`, { status: "inactive" });
    await load();
  };

  const toggleTracking = async (emp: OfficeEmployee) => {
    await api.patch(`/office/employees/${emp._id}`, {
      locationTrackingEnabled: !emp.locationTrackingEnabled,
    });
    await load();
  };

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const copyAppUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setSuccess(t("appLinkCopied"));
      setError("");
    } catch {
      setError(t("error"));
    }
  };

  const shareAppUrl = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: t("shareAppTitle"),
          text: t("shareAppText"),
          url: appUrl,
        });
        return;
      }
      await copyAppUrl();
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="employees-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("navGroupTeam")}</p>
          <h2 className="display page-title">{t("employees")}</h2>
          <p className="muted page-sub">{t("employeesSub")}</p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          {t("addEmployee")}
        </button>
      </div>

      <div className="panel emp-share-panel">
        <div className="emp-share-copy">
          <p className="label" style={{ margin: 0 }}>
            {t("officeAppLink")}
          </p>
          <p className="muted emp-share-url">{appUrl}</p>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
            {t("officeAppLinkHint")}
          </p>
        </div>
        <div className="emp-share-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copyAppUrl()}>
            {t("copyLink")}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void shareAppUrl()}>
            {t("shareLink")}
          </button>
        </div>
      </div>

      {(error || success) && mode === "list" ? (
        <p className={error ? "error" : "success"}>{error || success}</p>
      ) : null}

      <div className={`employees-layout${mode !== "list" ? " with-panel" : ""}`}>
        <div className="panel employees-list-panel">
          <div className="employees-toolbar">
            <input
              className="input"
              value={query}
              placeholder={t("searchEmployees")}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="muted sites-count">
              {filtered.length} {t("employees").toLowerCase()}
            </span>
          </div>

          {loading ? (
            <p className="muted">{t("loading")}</p>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p className="display" style={{ margin: 0, fontSize: "1.2rem" }}>
                {t("noEmployeesYet")}
              </p>
              <p className="muted">{t("noEmployeesHint")}</p>
            </div>
          ) : (
            <div className="employee-cards">
              {filtered.map((emp) => (
                <article key={emp._id} className={`site-card${editingId === emp._id ? " active" : ""}`}>
                  <div className="site-card-top">
                    <div>
                      <h3 className="site-card-title">
                        {emp.fullName}
                        <span className={`badge ${emp.status === "active" ? "ok" : "warn"}`}>
                          {emp.status}
                        </span>
                      </h3>
                      <p className="muted site-card-meta">
                        {[emp.designation, emp.department].filter(Boolean).join(" • ") || t("noData")}
                      </p>
                    </div>
                    <div className="site-card-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(emp)}>
                        {t("edit")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void toggleTracking(emp)}
                      >
                        {emp.locationTrackingEnabled ? t("trackingOn") : t("trackingOff")}
                      </button>
                      {emp.status === "active" ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void deactivate(emp._id)}
                        >
                          {t("deactivate")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="site-card-stats">
                    <div>
                      <div className="label">{t("mobile")}</div>
                      <div className="site-stat-value">{emp.mobile}</div>
                    </div>
                    <div>
                      <div className="label">{t("baseSalary")}</div>
                      <div className="site-stat-value">₹{emp.baseSalary || 0}</div>
                    </div>
                    <div>
                      <div className="label">{t("aadhaarNumber")}</div>
                      <div className="site-stat-value">{emp.aadhaarNumber || "—"}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {mode !== "list" ? (
          <div className="panel sites-form-panel">
            <div className="sites-form-head">
              <div>
                <h3 className="chart-card-title">
                  {mode === "create" ? t("addEmployee") : t("editEmployee")}
                </h3>
                <p className="muted chart-card-sub">
                  {mode === "create" ? t("employeeFormSub") : selected?.fullName || ""}
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeForm}>
                {t("close")}
              </button>
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">{t("mobile")}</label>
                <input
                  className="input"
                  maxLength={10}
                  value={form.mobile}
                  disabled={mode === "edit"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                  }
                />
              </div>
              <div className="field">
                <label className="label">{t("fullName")}</label>
                <input
                  className="input"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="field">
                <label className="label">{t("employeeCode")}</label>
                <input
                  className="input"
                  value={form.employeeCode}
                  onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("designation")}</label>
                <input
                  className="input"
                  value={form.designation}
                  onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("department")}</label>
                <input
                  className="input"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="field">
                <label className="label">{t("dob")}</label>
                <input
                  className="input"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("joiningDate")}</label>
                <input
                  className="input"
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("qualification")}</label>
                <input
                  className="input"
                  value={form.qualification}
                  onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="field">
                <label className="label">{t("gender")}</label>
                <select
                  className="select"
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as EmployeeForm["gender"] }))}
                >
                  <option value="">{t("select")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                  <option value="other">{t("other")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("maritalStatus")}</label>
                <select
                  className="select"
                  value={form.maritalStatus}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maritalStatus: e.target.value as EmployeeForm["maritalStatus"] }))
                  }
                >
                  <option value="">{t("select")}</option>
                  <option value="single">{t("single")}</option>
                  <option value="married">{t("married")}</option>
                  <option value="other">{t("other")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("aadhaarNumber")}</label>
                <input
                  className="input"
                  maxLength={12}
                  value={form.aadhaarNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))
                  }
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="field">
                <label className="label">{t("email")}</label>
                <input
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("alternateMobile")}</label>
                <input
                  className="input"
                  maxLength={10}
                  value={form.alternateMobile}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, alternateMobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                  }
                />
              </div>
              <div className="field">
                <label className="label">{t("emergencyContactMobile")}</label>
                <input
                  className="input"
                  maxLength={10}
                  value={form.emergencyContactMobile}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      emergencyContactMobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">{t("emergencyContactName")}</label>
                <input
                  className="input"
                  value={form.emergencyContactName}
                  onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("address")}</label>
                <input
                  className="input"
                  value={form.addressLine1}
                  onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="field">
                <label className="label">{t("city")}</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("state")}</label>
                <input
                  className="input"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("pincode")}</label>
                <input
                  className="input"
                  value={form.pincode}
                  onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="field">
                <label className="label">{t("baseSalary")}</label>
                <input
                  className="input"
                  value={form.baseSalary}
                  onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">{t("salaryCycle")}</label>
                <select
                  className="select"
                  value={form.salaryCycle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, salaryCycle: e.target.value as EmployeeForm["salaryCycle"] }))
                  }
                >
                  <option value="monthly">{t("monthly")}</option>
                  <option value="weekly">{t("weekly")}</option>
                  <option value="daily">{t("daily")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("fullNameHi")}</label>
                <input
                  className="input"
                  value={form.fullNameHi}
                  onChange={(e) => setForm((f) => ({ ...f, fullNameHi: e.target.value }))}
                />
              </div>
            </div>

            <div className="row" style={{ marginBottom: "0.85rem" }}>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.locationTrackingEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, locationTrackingEnabled: e.target.checked }))}
                />
                {t("enableTracking")}
              </label>
              {/* <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.canManageExpenditure}
                  onChange={(e) => setForm((f) => ({ ...f, canManageExpenditure: e.target.checked }))}
                />
                {t("canExpense")}
              </label> */}
            </div>

            {error || success ? <p className={error ? "error" : "success"}>{error || success}</p> : null}

            <div className="row">
              <button type="button" className="btn" disabled={saving} onClick={() => void submit()}>
                {saving ? t("loading") : t("save")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
