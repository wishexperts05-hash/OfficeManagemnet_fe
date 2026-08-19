import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { useAppSelector } from "../store/hooks";
import {
  companyLabel,
  companyProfileLabel,
  type CompanyProfile,
} from "../lib/types";

type ProfileUser = {
  _id?: string;
  id?: string;
  mobile?: string;
  email?: string;
  accountType?: string;
  status?: string;
  preferredLocale?: string;
  lastLoginAt?: string;
  createdAt?: string;
  isMpinSet?: boolean;
};

type EmployerProfileFull = CompanyProfile & {
  ownerName?: string;
  contactMobile?: string;
  contactEmail?: string;
  gstNumber?: string;
  panNumber?: string;
  industryType?: string;
  website?: string;
  address?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  employeeCount?: string;
};

type EmployeeProfile = {
  _id: string;
  fullName?: string;
  fullNameHi?: string;
  mobile?: string;
  email?: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  baseSalary?: number;
  salaryCycle?: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  status?: string;
  locationTrackingEnabled?: boolean;
  canManageExpenditure?: boolean;
  employerId?: string;
  employerProfileId?: CompanyProfile;
};

function Detail({
  label,
  value,
  yesLabel = "Yes",
  noLabel = "No",
}: {
  label: string;
  value?: string | number | boolean | null;
  yesLabel?: string;
  noLabel?: string;
}) {
  let text: string | number = "—";
  if (typeof value === "boolean") text = value ? yesLabel : noLabel;
  else if (value != null && value !== "") text = value;
  return (
    <div className="detail-item">
      <div className="label">{label}</div>
      <div>{text}</div>
    </div>
  );
}

function fmtDate(value?: string) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function fmtDateTime(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value).slice(0, 19);
  }
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user: authUser, memberships, activeEmployerId, employerProfile, locale } =
    useAppSelector((s) => s.auth);
  const isEmployer = authUser?.accountType === "employer";

  const [account, setAccount] = useState<ProfileUser | null>(null);
  const [company, setCompany] = useState<EmployerProfileFull | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const membership = useMemo(
    () =>
      memberships.find((m) => String(m.employerId) === String(activeEmployerId)) as
        | (typeof memberships[number] & EmployeeProfile)
        | undefined,
    [memberships, activeEmployerId],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api
      .get<ApiSuccess<{ user: ProfileUser; profile: EmployerProfileFull | null }>>("/profile/me")
      .then(({ data: res }) => {
        if (!alive) return;
        setAccount(res.data.user);
        if (isEmployer) setCompany(res.data.profile);
      })
      .catch((err) => {
        if (!alive) return;
        setError(getErrorMessage(err, t("error")));
        setAccount(authUser as ProfileUser | null);
        if (isEmployer && employerProfile) setCompany(employerProfile as EmployerProfileFull);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authUser, employerProfile, isEmployer, t]);

  if (loading) return <p className="muted">{t("loading")}</p>;

  const display = account || authUser;
  const titleName = isEmployer
    ? companyProfileLabel(company || employerProfile, locale, t("profile"))
    : membership?.fullName || display?.mobile || t("profile");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("profile")}</p>
          <h2 className="display page-title">{titleName}</h2>
          <p className="muted page-sub">{t("profileSub")}</p>
        </div>
        <span className={`badge ${display?.status === "active" ? "ok" : "warn"}`}>
          {isEmployer ? t("roleEmployer") : t("roleEmployee")}
        </span>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="grid-2" style={{ gap: "1rem" }}>
        <div className="panel">
          <h3 className="chart-card-title">{t("accountDetails")}</h3>
          <div className="detail-grid">
            <Detail label={t("mobile")} value={display?.mobile} />
            <Detail label={t("email")} value={display?.email} />
            <Detail
              label={t("accountType")}
              value={isEmployer ? t("roleEmployer") : t("roleEmployee")}
            />
            <Detail label={t("status")} value={display?.status} />
            <Detail
              label={t("language")}
              value={
                display?.preferredLocale === "hi"
                  ? "हिन्दी"
                  : display?.preferredLocale === "en"
                    ? "English"
                    : display?.preferredLocale
              }
            />
            <Detail label={t("mpinSet")} value={display?.isMpinSet} yesLabel={t("yes")} noLabel={t("no")} />
            <Detail label={t("lastLogin")} value={fmtDateTime(display?.lastLoginAt)} />
            <Detail label={t("createdAt")} value={fmtDateTime(display?.createdAt)} />
          </div>
        </div>

        {isEmployer ? (
          <div className="panel">
            <h3 className="chart-card-title">{t("companyDetails")}</h3>
            <div className="detail-grid">
              <Detail
                label={t("company")}
                value={companyProfileLabel(company || employerProfile, locale)}
              />
              <Detail label={t("ownerName")} value={company?.ownerName} />
              <Detail label={t("contactMobile")} value={company?.contactMobile} />
              <Detail label={t("contactEmail")} value={company?.contactEmail} />
              <Detail label="GST" value={company?.gstNumber} />
              <Detail label="PAN" value={company?.panNumber} />
              <Detail label={t("industryType")} value={company?.industryType} />
              <Detail label={t("website")} value={company?.website} />
              <Detail label={t("city")} value={company?.city} />
              <Detail label={t("state")} value={company?.state} />
              <Detail label={t("pincode")} value={company?.pincode} />
              <Detail
                label={t("address")}
                value={company?.address || company?.addressLine1}
              />
            </div>
          </div>
        ) : (
          <div className="panel">
            <h3 className="chart-card-title">{t("employeeDetails")}</h3>
            <div className="detail-grid">
              <Detail label={t("fullName")} value={membership?.fullName} />
              <Detail label={t("employeeCode")} value={membership?.employeeCode} />
              <Detail label={t("designation")} value={membership?.designation} />
              <Detail label={t("department")} value={membership?.department} />
              <Detail label={t("joiningDate")} value={fmtDate(membership?.joiningDate)} />
              <Detail
                label={t("baseSalary")}
                value={
                  membership?.baseSalary != null
                    ? `₹${Number(membership.baseSalary).toLocaleString("en-IN")}`
                    : undefined
                }
              />
              <Detail label={t("salaryCycle")} value={membership?.salaryCycle} />
              <Detail label={t("city")} value={membership?.city} />
              <Detail label={t("address")} value={membership?.addressLine1} />
              <Detail
                label={t("company")}
                value={companyLabel(membership, locale)}
              />
              <Detail
                label={t("enableTracking")}
                value={membership?.locationTrackingEnabled}
                yesLabel={t("yes")}
                noLabel={t("no")}
              />
              <Detail
                label={t("canExpense")}
                value={membership?.canManageExpenditure}
                yesLabel={t("yes")}
                noLabel={t("no")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
