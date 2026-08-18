import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { AuthUser } from "../lib/types";
import { useAppDispatch } from "../store/hooks";
import { setCredentials, setMpinVerified } from "../store/authSlice";

type Role = "employer" | "office_employee";

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("employer");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const jobPortal = import.meta.env.VITE_JOB_PORTAL_URL || "http://localhost:3000/en";

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<ApiSuccess<{ mockOtp?: string }>>("/auth/otp/request", {
        accountType: role,
        mobile,
      });
      setMockOtp(data.data.mockOtp ?? null);
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<
        ApiSuccess<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>
      >("/auth/otp/verify", { accountType: role, mobile, otp });

      dispatch(
        setCredentials({
          user: data.data.user,
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          mpinVerified: false,
        }),
      );

      if (role === "office_employee") {
        dispatch(setMpinVerified(false));
        navigate("/mpin");
      } else {
        dispatch(setMpinVerified(true));
        navigate("/app");
      }
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="display" style={{ fontSize: "1.9rem" }}>
          {t("brand")}
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          {t("mockOtp")}
        </p>

        <div className="row" style={{ marginTop: 18 }}>
          <button
            type="button"
            className={`btn ${role === "employer" ? "" : "btn-ghost"}`}
            onClick={() => {
              setRole("employer");
              setStep("mobile");
            }}
          >
            {t("employerLogin")}
          </button>
          <button
            type="button"
            className={`btn ${role === "office_employee" ? "" : "btn-ghost"}`}
            onClick={() => {
              setRole("office_employee");
              setStep("mobile");
            }}
          >
            {t("employeeLogin")}
          </button>
        </div>

        {step === "mobile" ? (
          <div style={{ marginTop: 18 }}>
            <div className="field">
              <label className="label">{t("mobile")}</label>
              <input
                className="input"
                value={mobile}
                maxLength={10}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button
              type="button"
              className="btn"
              style={{ width: "100%" }}
              disabled={loading || mobile.length !== 10}
              onClick={() => void sendOtp()}
            >
              {loading ? t("loading") : t("sendOtp")}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <div className="field">
              <label className="label">{t("otp")}</label>
              <input
                className="input"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              {mockOtp && (
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Mock OTP: <strong>{mockOtp}</strong>
                </p>
              )}
            </div>
            {error && <p className="error">{error}</p>}
            <button
              type="button"
              className="btn"
              style={{ width: "100%" }}
              disabled={loading || otp.length < 4}
              onClick={() => void verify()}
            >
              {loading ? t("loading") : t("verify")}
            </button>
          </div>
        )}

        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          Employers register on the{" "}
          <a href={jobPortal} style={{ color: "var(--accent)", fontWeight: 700 }}>
            job portal
          </a>
          . Employees must be added by an employer first.
        </p>
      </div>
    </div>
  );
}
