import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearActiveEmployer,
  logout,
  setActiveEmployer,
  setLocale,
} from "../store/authSlice";
import { api } from "../lib/api";
import {
  companyInitials,
  companyLabel,
  companyProfileLabel,
} from "../lib/types";
import i18n from "../i18n";
import { PushRegistrar } from "./PushRegistrar";

type NavItem = { to: string; end?: boolean; key: string; icon: string };
type NavGroup = { labelKey: string; items: NavItem[] };

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a3 3 0 0 1 0 5.74" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M16 15h2" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      );
    case "salary":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M7 10v4M17 10v4" />
        </svg>
      );
    case "track":
      return (
        <svg {...common}>
          <circle cx="12" cy="10" r="3" />
          <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="3" />
        </svg>
      );
    default:
      return null;
  }
}

export function AppLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, memberships, activeEmployerId, locale, employerProfile } = useAppSelector(
    (s) => s.auth,
  );
  const isEmployer = user?.accountType === "employer";
  const jobPortal = import.meta.env.VITE_JOB_PORTAL_URL || "http://localhost:3000/en";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const activeMembership = memberships.find((m) => String(m.employerId) === activeEmployerId);
  const brandName = isEmployer
    ? companyProfileLabel(employerProfile, locale, t("brand"))
    : companyLabel(activeMembership, locale);
  const brandLogo = isEmployer
    ? employerProfile?.logoUrl
    : activeMembership?.employerProfileId?.logoUrl;
  const brandCity = isEmployer ? employerProfile?.city : activeMembership?.employerProfileId?.city;

  const employerGroups: NavGroup[] = [
    {
      labelKey: "navGroupOverview",
      items: [
        { to: "/app", end: true, key: "dashboard", icon: "dashboard" },
        { to: "/app/profile", key: "profile", icon: "user" },
      ],
    },
    {
      labelKey: "navGroupTeam",
      items: [
        { to: "/app/employees", key: "employees", icon: "users" },
        { to: "/app/sites", key: "sites", icon: "map" },
        { to: "/app/tasks", key: "tasks", icon: "tasks" },
      ],
    },
    {
      labelKey: "navGroupFinance",
      items: [
        { to: "/app/expenditure", key: "expenditure", icon: "wallet" },
        { to: "/app/salary", key: "salary", icon: "salary" },
      ],
    },
    {
      labelKey: "navGroupOps",
      items: [
        { to: "/app/attendance", key: "attendance", icon: "clock" },
        { to: "/app/tracking", key: "tracking", icon: "track" },
      ],
    },
  ];

  const employeeGroups: NavGroup[] = [
    {
      labelKey: "navGroupOverview",
      items: [
        { to: "/app", end: true, key: "dashboard", icon: "dashboard" },
        { to: "/app/profile", key: "profile", icon: "user" },
      ],
    },
    {
      labelKey: "navGroupWork",
      items: [
        { to: "/app/tasks", key: "tasks", icon: "tasks" },
        { to: "/app/attendance", key: "attendance", icon: "clock" },
      ],
    },
    {
      labelKey: "navGroupFinance",
      items: [
        { to: "/app/expenditure", key: "expenditure", icon: "wallet" },
        { to: "/app/salary", key: "salary", icon: "salary" },
      ],
    },
  ];

  const groups = isEmployer ? employerGroups : employeeGroups;

  const onLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    dispatch(logout());
    navigate("/login");
  };

  const switchLang = (lng: "en" | "hi") => {
    dispatch(setLocale(lng));
    void i18n.changeLanguage(lng);
  };

  const changeCompany = () => {
    dispatch(clearActiveEmployer());
    navigate("/select-company");
  };

  const sidebar = (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sidebar-brand">
        {brandLogo ? (
          <img src={brandLogo} alt="" className="brand-logo" />
        ) : (
          <div className="brand-mark">{companyInitials(brandName)}</div>
        )}
        <div className="brand-text">
          <div className="brand-title">{brandName}</div>
          <div className="brand-sub">
            {brandCity ? `${brandCity} · ` : ""}
            {isEmployer ? t("roleEmployer") : t("roleEmployee")}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div key={group.labelKey} className="nav-group">
            <div className="nav-group-label">{t(group.labelKey)}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} />
                </span>
                <span>{t(item.key)}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!isEmployer && memberships.length > 1 && (
          <button type="button" className="nav-link" onClick={changeCompany}>
            <span className="nav-icon">⇄</span>
            <span>{t("changeCompany")}</span>
          </button>
        )}
        <a className="nav-link" href={jobPortal} target="_blank" rel="noreferrer">
          <span className="nav-icon">↗</span>
          <span>{t("backToJobs")}</span>
        </a>
        <button type="button" className="nav-link logout-link" onClick={() => void onLogout()}>
          <span className="nav-icon">⎋</span>
          <span>{t("logout")}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`app-shell${open ? " sidebar-open" : ""}`}>
      <PushRegistrar />
      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      {sidebar}
      <div className="content">
        <div className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-btn"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <div className="display topbar-title">{brandName}</div>
              <div className="muted topbar-sub">{user?.mobile}</div>
            </div>
          </div>
          <div className="row">
            {!isEmployer && memberships.length > 1 && (
              <select
                className="select"
                style={{ width: "auto", minWidth: 180 }}
                value={activeEmployerId ?? ""}
                onChange={(e) => dispatch(setActiveEmployer(e.target.value))}
              >
                {memberships.map((m) => (
                  <option key={m._id} value={String(m.employerId)}>
                    {companyLabel(m, locale)}
                  </option>
                ))}
              </select>
            )}
            <div className="lang-switch">
              <button
                type="button"
                className={`lang-btn${i18n.language === "en" ? " active" : ""}`}
                onClick={() => switchLang("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={`lang-btn${i18n.language?.startsWith("hi") ? " active" : ""}`}
                onClick={() => switchLang("hi")}
              >
                हिं
              </button>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
