export type AccountType = "employer" | "office_employee";

export interface AuthUser {
  id: string;
  accountType: AccountType;
  mobile?: string;
  status: string;
  preferredLocale?: "en" | "hi";
  isMpinSet?: boolean;
  registrationPending?: boolean;
}

export interface CompanyProfile {
  _id?: string;
  companyName: string;
  companyNameHi?: string;
  logoUrl?: string;
  city?: string;
}

export interface Membership {
  _id: string;
  employerId: string;
  employerProfileId?: CompanyProfile;
  fullName: string;
  designation?: string;
  locationTrackingEnabled?: boolean;
  canManageExpenditure?: boolean;
  primarySiteId?: string;
  baseSalary?: number;
  status: string;
}

export function companyProfileLabel(
  profile: CompanyProfile | null | undefined,
  locale: string,
  fallback = "Company",
): string {
  if (!profile?.companyName) return fallback;
  return locale === "hi" && profile.companyNameHi ? profile.companyNameHi : profile.companyName;
}

export function companyInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export interface CompanySite {
  _id: string;
  name: string;
  nameHi?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  geofenceRadiusMeters: number;
  loginTime?: string;
  logoutTime?: string;
  isPrimary: boolean;
  isActive?: boolean;
  location: { type: "Point"; coordinates: [number, number] };
}

export interface OfficeEmployee {
  _id: string;
  mobile: string;
  fullName: string;
  fullNameHi?: string;
  employeeCode?: string;
  email?: string;
  alternateMobile?: string;
  aadhaarNumber?: string;
  dob?: string;
  gender?: "male" | "female" | "other";
  maritalStatus?: "single" | "married" | "other";
  designation?: string;
  department?: string;
  qualification?: string;
  joiningDate?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyContactName?: string;
  emergencyContactMobile?: string;
  baseSalary: number;
  salaryCycle?: "monthly" | "daily" | "weekly";
  locationTrackingEnabled: boolean;
  canManageExpenditure: boolean;
  primarySiteId?: string;
  status: string;
}

export interface Task {
  _id: string;
  title: string;
  titleHi?: string;
  description?: string;
  assignedToEmployeeIds: string[];
  priority: string;
  status: string;
  dueDate?: string;
  employerId: string;
}

export interface Expenditure {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  category: string;
  description?: string;
  employeeId?: string;
  transactionDate: string;
  paymentMode?: string;
  referenceNo?: string;
  attachmentUrl?: string;
}

export interface Attendance {
  _id: string;
  date: string;
  loginAt?: string;
  logoutAt?: string;
  status: string;
  workedMinutes?: number;
  employeeId:
    | string
    | {
        _id: string;
        fullName?: string;
        mobile?: string;
        designation?: string;
      };
  siteId: string;
}

export interface SalaryRecord {
  _id: string;
  year: number;
  month: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays?: number;
  workingDaysInMonth?: number;
  baseSalary: number;
  calculatedAmount: number;
  deductions: number;
  bonuses: number;
  netAmount: number;
  status: string;
  employeeId:
    | string
    | {
        _id: string;
        fullName?: string;
        mobile?: string;
        designation?: string;
        department?: string;
        baseSalary?: number;
      };
}

export function companyLabel(
  membership: Membership | undefined,
  locale: string,
): string {
  return companyProfileLabel(membership?.employerProfileId, locale);
}
