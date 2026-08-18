import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { hydrate, setAccessToken, setMpinVerified } from "../store/authSlice";

export default function MpinPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, accessToken, mpinVerified, hydrated } = useAppSelector((s) => s.auth);
  const [mpin, setMpin] = useState("");
  const [mode, setMode] = useState<"set" | "verify">("verify");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dispatch(hydrate());
  }, [dispatch]);

  useEffect(() => {
    if (user) setMode(user.isMpinSet ? "verify" : "set");
  }, [user]);

  if (!hydrated) return <div className="auth-wrap">Loading…</div>;
  if (!user || !accessToken) return <Navigate to="/login" replace />;
  if (user.accountType !== "office_employee") return <Navigate to="/app" replace />;
  if (mpinVerified) return <Navigate to="/app" replace />;

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const path = mode === "set" ? "/auth/mpin/set" : "/auth/mpin/verify";
      const { data } = await api.post<ApiSuccess<{ accessToken: string }>>(path, { mpin });
      dispatch(setAccessToken(data.data.accessToken));
      dispatch(setMpinVerified(true));
      navigate("/app");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="display" style={{ fontSize: "1.8rem" }}>
          {mode === "set" ? t("setMpin") : t("enterMpin")}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          {t("mpinEveryOpenHint")}
        </p>
        <div className="field" style={{ marginTop: 18 }}>
          <label className="label">{t("mpin")}</label>
          <input
            className="input"
            inputMode="numeric"
            maxLength={4}
            value={mpin}
            onChange={(e) => setMpin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button
          type="button"
          className="btn"
          style={{ width: "100%" }}
          disabled={loading || mpin.length !== 4}
          onClick={() => void submit()}
        >
          {loading ? t("loading") : t("verify")}
        </button>
        {user.isMpinSet && mode === "verify" ? null : (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => setMode(mode === "set" ? "verify" : "set")}
          >
            {mode === "set" ? t("enterMpin") : t("setMpin")}
          </button>
        )}
      </div>
    </div>
  );
}
