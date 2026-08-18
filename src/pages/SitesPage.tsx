import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { CompanySite } from "../lib/types";
import { getCurrentPosition } from "../lib/geo";

type Mode = "list" | "create" | "edit" | "view";

type SiteForm = {
  name: string;
  nameHi: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: string;
  lng: string;
  geofenceRadiusMeters: string;
  loginTime: string;
  logoutTime: string;
  isPrimary: boolean;
};

const emptyForm = (): SiteForm => ({
  name: "",
  nameHi: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  lat: "",
  lng: "",
  geofenceRadiusMeters: "150",
  loginTime: "09:30",
  logoutTime: "18:00",
  isPrimary: false,
});

function siteToForm(site: CompanySite): SiteForm {
  return {
    name: site.name || "",
    nameHi: site.nameHi || "",
    address: site.address || "",
    city: site.city || "",
    state: site.state || "",
    pincode: site.pincode || "",
    lat: String(site.location.coordinates[1] ?? ""),
    lng: String(site.location.coordinates[0] ?? ""),
    geofenceRadiusMeters: String(site.geofenceRadiusMeters ?? 150),
    loginTime: site.loginTime || "",
    logoutTime: site.logoutTime || "",
    isPrimary: Boolean(site.isPrimary),
  };
}

function formatShift(login?: string, logout?: string) {
  if (!login && !logout) return "—";
  return `${login || "—"} → ${logout || "—"}`;
}

function mapUrl(site: CompanySite) {
  const lat = site.location.coordinates[1];
  const lng = site.location.coordinates[0];
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function SitesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CompanySite[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<SiteForm>(emptyForm);

  const selected = useMemo(
    () => items.find((s) => s._id === selectedId) || null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.city || "").toLowerCase().includes(q) ||
        (s.address || "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const metrics = useMemo(() => {
    const total = items.length;
    const primary = items.find((s) => s.isPrimary);
    const avgRadius = total
      ? Math.round(items.reduce((sum, s) => sum + (s.geofenceRadiusMeters || 0), 0) / total)
      : 0;
    return { total, primary: primary?.name || "—", avgRadius };
  }, [items]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiSuccess<CompanySite[]>>("/office/sites");
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

  const openCreate = () => {
    setForm(emptyForm());
    setSelectedId(null);
    setMode("create");
    setError("");
    setSuccess("");
  };

  const openView = (site: CompanySite) => {
    setSelectedId(site._id);
    setForm(siteToForm(site));
    setMode("view");
    setError("");
    setSuccess("");
  };

  const openEdit = (site: CompanySite) => {
    setSelectedId(site._id);
    setForm(siteToForm(site));
    setMode("edit");
    setError("");
    setSuccess("");
  };

  const closePanel = () => {
    setMode("list");
    setSelectedId(null);
    setForm(emptyForm());
    setError("");
  };

  const useLocation = async () => {
    try {
      const pos = await getCurrentPosition();
      setForm((f) => ({
        ...f,
        lat: String(pos.coords.latitude),
        lng: String(pos.coords.longitude),
      }));
    } catch (err) {
      setError(getErrorMessage(err, t("locationRequired")));
    }
  };

  const payload = () => ({
    name: form.name.trim(),
    nameHi: form.nameHi.trim() || undefined,
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    pincode: form.pincode.trim() || undefined,
    lat: Number(form.lat),
    lng: Number(form.lng),
    geofenceRadiusMeters: Number(form.geofenceRadiusMeters) || 150,
    loginTime: form.loginTime || undefined,
    logoutTime: form.logoutTime || undefined,
    isPrimary: form.isPrimary,
  });

  const save = async () => {
    setError("");
    setSuccess("");
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError(t("siteNameRequired"));
      return;
    }
    if (Number.isNaN(Number(form.lat)) || Number.isNaN(Number(form.lng))) {
      setError(t("coordsRequired"));
      return;
    }
    setSaving(true);
    try {
      if (mode === "edit" && selectedId) {
        await api.patch(`/office/sites/${selectedId}`, payload());
        setSuccess(t("siteUpdated"));
      } else {
        await api.post("/office/sites", payload());
        setSuccess(t("siteCreated"));
      }
      await load();
      setMode("list");
      setSelectedId(null);
      setForm(emptyForm());
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (site: CompanySite) => {
    if (!window.confirm(t("siteDeactivateConfirm", { name: site.name }))) return;
    try {
      await api.patch(`/office/sites/${site._id}`, { isActive: false });
      if (selectedId === site._id) closePanel();
      await load();
      setSuccess(t("siteDeactivated"));
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
  };

  const showForm = mode === "create" || mode === "edit";
  const readOnly = mode === "view";

  return (
    <div className="sites-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("navGroupTeam")}</p>
          <h2 className="display page-title">{t("sites")}</h2>
          <p className="muted page-sub">{t("sitesSub")}</p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          {t("addSite")}
        </button>
      </div>

      <div className="sites-metrics">
        <div className="panel sites-metric-card">
          <div className="label">{t("sites")}</div>
          <div className="display sites-metric-value">{metrics.total}</div>
        </div>
        <div className="panel sites-metric-card">
          <div className="label">{t("primarySite")}</div>
          <div className="sites-metric-name">{metrics.primary}</div>
        </div>
        <div className="panel sites-metric-card">
          <div className="label">{t("radius")}</div>
          <div className="sites-metric-name">{metrics.avgRadius}m</div>
        </div>
      </div>

      {(error || success) && mode === "list" && (
        <p className={error ? "error" : "success"} style={{ marginTop: 0 }}>
          {error || success}
        </p>
      )}

      <div className={`sites-layout${showForm || readOnly ? " with-panel" : ""}`}>
        <div className="panel sites-list-panel">
          <div className="sites-toolbar">
            <input
              className="input"
              placeholder={t("searchSites")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery("")}>
                {t("clear")}
              </button>
            ) : null}
            <span className="muted sites-count">
              {filtered.length} {t("sites").toLowerCase()}
            </span>
          </div>

          {loading ? (
            <p className="muted">{t("loading")}</p>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p className="display" style={{ fontSize: "1.2rem", margin: 0 }}>
                {t("noSitesYet")}
              </p>
              <p className="muted">{t("noSitesHint")}</p>
              <button type="button" className="btn" onClick={openCreate}>
                {t("addSite")}
              </button>
            </div>
          ) : (
            <div className="site-cards">
              {filtered.map((site) => (
                <article
                  key={site._id}
                  className={`site-card${selectedId === site._id ? " active" : ""}`}
                >
                  <div className="site-card-top">
                    <div>
                      <h3 className="site-card-title">
                        {site.name}
                        {site.isPrimary && <span className="badge ok">{t("primary")}</span>}
                      </h3>
                      <p className="muted site-card-meta">
                        {[site.address, site.city].filter(Boolean).join(", ") || t("noAddress")}
                      </p>
                    </div>
                    <div className="site-card-actions">
                      <a
                        href={mapUrl(site)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-sm"
                      >
                        {t("openMap")}
                      </a>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openView(site)}>
                        {t("view")}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(site)}>
                        {t("edit")}
                      </button>
                    </div>
                  </div>
                  <div className="site-card-stats">
                    <div>
                      <div className="label">{t("shiftHours")}</div>
                      <div className="site-stat-value">{formatShift(site.loginTime, site.logoutTime)}</div>
                    </div>
                    <div>
                      <div className="label">{t("radius")}</div>
                      <div className="site-stat-value">{site.geofenceRadiusMeters}m</div>
                    </div>
                    <div>
                      <div className="label">{t("coords")}</div>
                      <div className="site-stat-value mono">
                        {site.location.coordinates[1].toFixed(4)}, {site.location.coordinates[0].toFixed(4)}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {(showForm || readOnly) && (
          <div className="panel sites-form-panel">
            <div className="sites-form-head">
              <div>
                <h3 className="chart-card-title">
                  {mode === "create" ? t("addSite") : mode === "edit" ? t("editSite") : t("viewSite")}
                </h3>
                <p className="muted chart-card-sub">
                  {mode === "view" ? t("viewSiteSub") : t("editSiteSub")}
                </p>
                {selected ? <p className="muted chart-card-sub">{selected.name}</p> : null}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closePanel}>
                {t("close")}
              </button>
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">{t("siteName")}</label>
                <input
                  className="input"
                  value={form.name}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">{t("siteNameHi")}</label>
                <input
                  className="input"
                  value={form.nameHi}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label className="label">{t("address")}</label>
              <input
                className="input"
                value={form.address}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="grid-3">
              <div className="field">
                <label className="label">{t("city")}</label>
                <input
                  className="input"
                  value={form.city}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">{t("state")}</label>
                <input
                  className="input"
                  value={form.state}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">{t("pincode")}</label>
                <input
                  className="input"
                  value={form.pincode}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
              </div>
            </div>

            <div className="shift-box">
              <div className="label" style={{ marginBottom: "0.65rem" }}>
                {t("shiftHours")}
              </div>
              <div className="grid-2">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">{t("loginTime")}</label>
                  <input
                    className="input"
                    type="time"
                    value={form.loginTime}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, loginTime: e.target.value })}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">{t("logoutTime")}</label>
                  <input
                    className="input"
                    type="time"
                    value={form.logoutTime}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, logoutTime: e.target.value })}
                  />
                </div>
              </div>
              <p className="muted" style={{ margin: "0.55rem 0 0", fontSize: "0.8rem" }}>
                {t("shiftHoursHint")}
              </p>
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">{t("lat")}</label>
                <input
                  className="input"
                  value={form.lat}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">{t("lng")}</label>
                <input
                  className="input"
                  value={form.lng}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label className="label">{t("radius")}</label>
              <input
                className="input"
                value={form.geofenceRadiusMeters}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, geofenceRadiusMeters: e.target.value })}
              />
            </div>

            {!readOnly && (
              <div className="row" style={{ marginBottom: "0.85rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => void useLocation()}>
                  {t("useMyLocation")}
                </button>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                  />
                  {t("primarySite")}
                </label>
              </div>
            )}

            {readOnly && selected?.isPrimary && (
              <p className="badge ok" style={{ marginBottom: "0.85rem" }}>
                {t("primarySite")}
              </p>
            )}

            {(error || success) && (
              <p className={error ? "error" : "success"}>{error || success}</p>
            )}

            <div className="row">
              {readOnly ? (
                <>
                  <button type="button" className="btn" onClick={() => selected && openEdit(selected)}>
                    {t("edit")}
                  </button>
                  {selected && (
                    <button type="button" className="btn btn-danger" onClick={() => void deactivate(selected)}>
                      {t("deactivate")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button type="button" className="btn" disabled={saving} onClick={() => void save()}>
                    {saving ? t("loading") : t("save")}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={closePanel}>
                    {t("cancel")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
