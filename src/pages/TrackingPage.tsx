import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { OfficeEmployee } from "../lib/types";
import { useAppSelector } from "../store/hooks";
import { startLocationWatch } from "../lib/geo";

interface TrackPoint {
  coordinates: [number, number];
  recordedAt: string;
}

interface TrackDoc {
  points: TrackPoint[];
}

export default function TrackingPage() {
  const { t } = useTranslation();
  const { user, activeEmployerId, memberships } = useAppSelector((s) => s.auth);
  const isEmployer = user?.accountType === "employer";
  const [employees, setEmployees] = useState<OfficeEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [error, setError] = useState("");
  const [watching, setWatching] = useState(false);

  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded } = useJsApiLoader({
    id: "loomhire-maps",
    googleMapsApiKey: mapsKey || " ",
  });

  const activeMembership = memberships.find(
    (m) => String(m.employerId) === String(activeEmployerId),
  );

  useEffect(() => {
    if (!isEmployer) return;
    void api.get<ApiSuccess<OfficeEmployee[]>>("/office/employees", { params: { limit: 100 } }).then(({ data }) => {
      const tracked = data.data.filter((e) => e.locationTrackingEnabled);
      setEmployees(tracked);
      if (tracked[0]) setEmployeeId(tracked[0]._id);
    });
  }, [isEmployer]);

  const loadRoute = async () => {
    if (!employeeId) return;
    try {
      const { data } = await api.get<ApiSuccess<TrackDoc>>("/office/tracking/route", {
        params: { employeeId, date },
      });
      setPoints(data.data.points || []);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
  };

  useEffect(() => {
    if (isEmployer && employeeId) void loadRoute();
  }, [isEmployer, employeeId, date]);

  // Employee: push location pings when tracking enabled
  useEffect(() => {
    if (isEmployer || !activeEmployerId || !activeMembership?.locationTrackingEnabled) return;
    setWatching(true);
    let lastSent = 0;
    const watchId = startLocationWatch((lat, lng, accuracy, speed) => {
      const now = Date.now();
      if (now - lastSent < 30000) return; // throttle 30s
      lastSent = now;
      void api.post("/office/tracking/ping", {
        employerId: activeEmployerId,
        lat,
        lng,
        accuracy,
        speed: speed ?? undefined,
      });
    });
    return () => {
      if (watchId >= 0) navigator.geolocation.clearWatch(watchId);
      setWatching(false);
    };
  }, [isEmployer, activeEmployerId, activeMembership?.locationTrackingEnabled]);

  const path = useMemo(
    () => points.map((p) => ({ lat: p.coordinates[1], lng: p.coordinates[0] })),
    [points],
  );
  const center = path[0] || { lat: 28.6139, lng: 77.209 };

  if (!isEmployer) {
    return (
      <div className="panel">
        <h2 className="display" style={{ marginTop: 0 }}>
          {t("tracking")}
        </h2>
        <p className="muted">
          {activeMembership?.locationTrackingEnabled
            ? watching
              ? "Location sharing is active for outdoor work."
              : "Waiting for GPS…"
            : "Location tracking is not enabled by your employer."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="display" style={{ marginTop: 0 }}>
        {t("tracking")}
      </h2>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="grid-3">
          <div className="field">
            <label className="label">{t("employees")}</label>
            <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ display: "flex", alignItems: "end" }}>
            <button type="button" className="btn" onClick={() => void loadRoute()}>
              {t("route")}
            </button>
          </div>
        </div>
        {!mapsKey && (
          <p className="muted">Add VITE_GOOGLE_MAPS_API_KEY to enable the map. Route points still load.</p>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="panel">
        {mapsKey && isLoaded ? (
          <div className="map-box">
            <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={center} zoom={13}>
              {path.length > 0 && (
                <>
                  <Polyline path={path} options={{ strokeColor: "#0f766e", strokeWeight: 4 }} />
                  <Marker position={path[0]} label="S" />
                  <Marker position={path[path.length - 1]} label="E" />
                </>
              )}
            </GoogleMap>
          </div>
        ) : (
          <div>
            <p className="muted">{points.length} points loaded for selected day.</p>
            <ul>
              {points.slice(0, 20).map((p, i) => (
                <li key={`${p.recordedAt}-${i}`}>
                  {p.coordinates[1].toFixed(5)}, {p.coordinates[0].toFixed(5)} ·{" "}
                  {new Date(p.recordedAt).toLocaleTimeString()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
