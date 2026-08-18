import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { hydrate, setEmployerProfile, setMemberships } from "../store/authSlice";
import { api, restoreOfficeSession, type ApiSuccess } from "../lib/api";
import type { CompanyProfile, Membership } from "../lib/types";

export function AuthGate() {
  const dispatch = useAppDispatch();
  const {
    user,
    hydrated,
    mpinVerified,
    accessToken,
    memberships,
    membershipsLoaded,
    activeEmployerId,
  } = useAppSelector((s) => s.auth);
  const location = useLocation();
  const onSelectCompany = location.pathname.startsWith("/select-company");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    dispatch(hydrate());
    void restoreOfficeSession().finally(() => setBooting(false));
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated || booting || !user || !accessToken) return;

    if (user.accountType === "office_employee" && mpinVerified) {
      void api
        .get<ApiSuccess<Membership[]>>("/office/employees/my-companies")
        .then(({ data }) => dispatch(setMemberships(data.data)))
        .catch(() => dispatch(setMemberships([])));
      return;
    }

    if (user.accountType === "employer") {
      void api
        .get<ApiSuccess<{ profile: CompanyProfile | null }>>("/profile/me")
        .then(({ data }) => {
          const p = data.data.profile;
          if (p && "companyName" in p && p.companyName) {
            dispatch(
              setEmployerProfile({
                _id: p._id,
                companyName: p.companyName,
                companyNameHi: p.companyNameHi,
                logoUrl: p.logoUrl,
                city: p.city,
              }),
            );
          } else {
            dispatch(setEmployerProfile(null));
          }
        })
        .catch(() => dispatch(setEmployerProfile(null)));
    }
  }, [hydrated, booting, user, accessToken, mpinVerified, dispatch]);

  if (!hydrated || booting) {
    return <div className="auth-wrap">Loading…</div>;
  }

  if (!user || !accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.accountType === "office_employee" && !mpinVerified) {
    return <Navigate to="/mpin" replace />;
  }

  if (user.accountType === "office_employee" && mpinVerified && !membershipsLoaded) {
    return <div className="auth-wrap">Loading…</div>;
  }

  const needsCompanyPick =
    user.accountType === "office_employee" &&
    mpinVerified &&
    membershipsLoaded &&
    memberships.length > 1 &&
    !activeEmployerId;

  if (needsCompanyPick && !onSelectCompany) {
    return <Navigate to="/select-company" replace />;
  }

  if (onSelectCompany && !needsCompanyPick && activeEmployerId) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
