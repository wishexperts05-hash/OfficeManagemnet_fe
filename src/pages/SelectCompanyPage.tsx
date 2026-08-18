import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import {
  companyInitials,
  companyLabel,
  companyProfileLabel,
  type Membership,
} from "../lib/types";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setActiveEmployer, setMemberships } from "../store/authSlice";

export default function SelectCompanyPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, memberships, membershipsLoaded, activeEmployerId, mpinVerified } = useAppSelector(
    (s) => s.auth,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!membershipsLoaded);

  useEffect(() => {
    if (!user || user.accountType !== "office_employee" || !mpinVerified) return;
    if (membershipsLoaded) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void api
      .get<ApiSuccess<Membership[]>>("/office/employees/my-companies")
      .then(({ data }) => dispatch(setMemberships(data.data)))
      .catch((err) => setError(getErrorMessage(err, t("error"))))
      .finally(() => setLoading(false));
  }, [user, mpinVerified, membershipsLoaded, dispatch, t]);

  useEffect(() => {
    if (!membershipsLoaded) return;
    // One company (or none): never stay on this screen.
    if (memberships.length <= 1) {
      navigate("/app", { replace: true });
      return;
    }
    // Already selected: go to dashboard.
    if (activeEmployerId) {
      navigate("/app", { replace: true });
    }
  }, [membershipsLoaded, memberships.length, activeEmployerId, navigate]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.accountType !== "office_employee") return <Navigate to="/app" replace />;
  if (!mpinVerified) return <Navigate to="/mpin" replace />;
  if (membershipsLoaded && (memberships.length <= 1 || activeEmployerId)) {
    return <Navigate to="/app" replace />;
  }

  const pick = (employerId: string) => {
    dispatch(setActiveEmployer(String(employerId)));
    navigate("/app", { replace: true });
  };

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="muted">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card company-pick-card">
        <p className="eyebrow">{t("roleEmployee")}</p>
        <h1 className="display" style={{ fontSize: "1.7rem", margin: "0.25rem 0 0.4rem" }}>
          {t("selectCompanyTitle")}
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("selectCompanySub")}
        </p>

        <div className="company-pick-list">
          {memberships.map((m) => {
            const name = companyLabel(m, i18n.language);
            const logo = m.employerProfileId?.logoUrl;
            const city = m.employerProfileId?.city;
            return (
              <button
                key={m._id}
                type="button"
                className="company-pick-item"
                onClick={() => pick(String(m.employerId))}
              >
                {logo ? (
                  <img src={logo} alt="" className="company-pick-logo" />
                ) : (
                  <div className="company-pick-fallback">{companyInitials(name)}</div>
                )}
                <div className="company-pick-meta">
                  <div className="company-pick-name">{name}</div>
                  <div className="muted company-pick-sub">
                    {[m.designation, city].filter(Boolean).join(" · ") ||
                      companyProfileLabel(m.employerProfileId, i18n.language)}
                  </div>
                </div>
                <span className="company-pick-arrow">→</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
