import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import type { AuthUser, CompanyProfile, Membership } from "../lib/types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  mpinVerified: boolean;
  hydrated: boolean;
  memberships: Membership[];
  membershipsLoaded: boolean;
  activeEmployerId: string | null;
  employerProfile: CompanyProfile | null;
  locale: "en" | "hi";
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  mpinVerified: false,
  hydrated: false,
  memberships: [],
  membershipsLoaded: false,
  activeEmployerId: null,
  employerProfile: null,
  locale: "en",
};

/** Clear employee MPIN once per page load — not again when AuthGate remounts after verify. */
let employeeMpinClearedThisLoad = false;

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrate(state) {
      state.accessToken = Cookies.get("officeAccessToken") || null;
      const refreshToken = Cookies.get("officeRefreshToken") || null;
      const raw = localStorage.getItem("officeUser");
      const isEmployee = (() => {
        try {
          return raw ? (JSON.parse(raw) as AuthUser).accountType === "office_employee" : false;
        } catch {
          return false;
        }
      })();

      if (!state.accessToken && !refreshToken) {
        state.user = null;
        state.mpinVerified = false;
        localStorage.removeItem("officeUser");
        localStorage.removeItem("officeMpinVerified");
      } else {
        state.user = raw ? (JSON.parse(raw) as AuthUser) : null;
        if (isEmployee) {
          if (!employeeMpinClearedThisLoad) {
            state.mpinVerified = false;
            localStorage.removeItem("officeMpinVerified");
            employeeMpinClearedThisLoad = true;
          }
        } else {
          state.mpinVerified = localStorage.getItem("officeMpinVerified") === "1";
        }
      }
      state.activeEmployerId = localStorage.getItem("officeActiveEmployerId");
      state.locale = (localStorage.getItem("officeLocale") as "en" | "hi") || "en";
      const profileRaw = localStorage.getItem("officeEmployerProfile");
      state.employerProfile = profileRaw ? (JSON.parse(profileRaw) as CompanyProfile) : null;
      state.hydrated = true;
    },
    setCredentials(
      state,
      action: PayloadAction<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
        mpinVerified?: boolean;
      }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.mpinVerified = action.payload.mpinVerified ?? false;
      Cookies.set("officeAccessToken", action.payload.accessToken, { expires: 1 });
      Cookies.set("officeRefreshToken", action.payload.refreshToken, { expires: 30 });
      localStorage.setItem("officeUser", JSON.stringify(action.payload.user));
      if (action.payload.user.accountType === "office_employee") {
        localStorage.removeItem("officeMpinVerified");
        employeeMpinClearedThisLoad = true;
      } else {
        localStorage.setItem("officeMpinVerified", state.mpinVerified ? "1" : "0");
      }

      // Reload memberships after login; keep saved company if still valid.
      state.memberships = [];
      state.membershipsLoaded = false;
      state.employerProfile = null;
      localStorage.removeItem("officeEmployerProfile");
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      Cookies.set("officeAccessToken", action.payload, { expires: 1 });
    },
    setMpinVerified(state, action: PayloadAction<boolean>) {
      state.mpinVerified = action.payload;
      // Employees: memory only for this page load (re-ask MPIN on next app open/refresh).
      if (state.user?.accountType === "office_employee") {
        localStorage.removeItem("officeMpinVerified");
        employeeMpinClearedThisLoad = true;
      } else {
        localStorage.setItem("officeMpinVerified", action.payload ? "1" : "0");
      }
    },
    setMemberships(state, action: PayloadAction<Membership[]>) {
      state.memberships = action.payload;
      state.membershipsLoaded = true;

      if (action.payload.length === 1) {
        state.activeEmployerId = String(action.payload[0].employerId);
        localStorage.setItem("officeActiveEmployerId", state.activeEmployerId);
        return;
      }

      if (state.activeEmployerId) {
        const stillValid = action.payload.some(
          (m) => String(m.employerId) === state.activeEmployerId,
        );
        if (!stillValid) {
          state.activeEmployerId = null;
          localStorage.removeItem("officeActiveEmployerId");
        }
      }
    },
    setActiveEmployer(state, action: PayloadAction<string>) {
      state.activeEmployerId = action.payload;
      localStorage.setItem("officeActiveEmployerId", action.payload);
    },
    clearActiveEmployer(state) {
      state.activeEmployerId = null;
      localStorage.removeItem("officeActiveEmployerId");
    },
    setEmployerProfile(state, action: PayloadAction<CompanyProfile | null>) {
      state.employerProfile = action.payload;
      if (action.payload) {
        localStorage.setItem("officeEmployerProfile", JSON.stringify(action.payload));
      } else {
        localStorage.removeItem("officeEmployerProfile");
      }
    },
    setLocale(state, action: PayloadAction<"en" | "hi">) {
      state.locale = action.payload;
      localStorage.setItem("officeLocale", action.payload);
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.mpinVerified = false;
      state.memberships = [];
      state.membershipsLoaded = false;
      state.activeEmployerId = null;
      state.employerProfile = null;
      Cookies.remove("officeAccessToken");
      Cookies.remove("officeRefreshToken");
      localStorage.removeItem("officeUser");
      localStorage.removeItem("officeMpinVerified");
      localStorage.removeItem("officeActiveEmployerId");
      localStorage.removeItem("officeEmployerProfile");
      employeeMpinClearedThisLoad = false;
    },
  },
});

export const {
  hydrate,
  setCredentials,
  setAccessToken,
  setMpinVerified,
  setMemberships,
  setActiveEmployer,
  clearActiveEmployer,
  setEmployerProfile,
  setLocale,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
