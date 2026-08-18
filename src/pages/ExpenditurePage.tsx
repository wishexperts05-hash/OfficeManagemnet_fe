import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { Expenditure } from "../lib/types";
import { useAppSelector } from "../store/hooks";
import {
  ChartCard,
  ExpenditureTrendChart,
  formatINR,
  SpendBarChart,
  StatCard,
} from "../components/charts";

const monthStartEnd = (monthValue: string) => {
  if (!monthValue) return { from: "", to: "" };
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return { from: "", to: "" };
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};

const nowMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const fmtDate = (value: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("en-IN");
};

const totalsFromList = (list: Expenditure[]) => {
  const credit = list.filter((tx) => tx.type === "credit").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const debit = list.filter((tx) => tx.type === "debit").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  return { credit, debit, balance: credit - debit };
};

export default function ExpenditurePage() {
  const { t } = useTranslation();
  const { user, activeEmployerId } = useAppSelector((s) => s.auth);
  const isEmployer = user?.accountType === "employer";
  const [items, setItems] = useState<Expenditure[]>([]);
  const [summary, setSummary] = useState<{ credit: number; debit: number; balance: number } | null>(
    null,
  );
  const [month, setMonth] = useState(nowMonth());
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    type: "debit" as "credit" | "debit",
    amount: "",
    category: "general",
    description: "",
    transactionDate: new Date().toISOString().slice(0, 10),
    paymentMode: "cash",
  });

  const load = async () => {
    const { from, to } = monthStartEnd(month);
    setLoading(true);
    const params: Record<string, string> = {
      limit: "500",
      sortBy: "transactionDate",
      sortOrder: "desc",
    };
    if (!isEmployer && activeEmployerId) params.employerId = activeEmployerId;
    if (from) params.from = from;
    if (to) params.to = to;
    try {
      const { data } = await api.get<ApiSuccess<Expenditure[]>>("/office/expenditure", { params });
      const list = data.data || [];
      setItems(list);

      const fromList = totalsFromList(list);
      try {
        const sumParams: Record<string, string> = {};
        if (!isEmployer && activeEmployerId) sumParams.employerId = activeEmployerId;
        if (from) sumParams.from = from;
        if (to) sumParams.to = to;
        const sum = await api.get<ApiSuccess<{ credit: number; debit: number; balance: number }>>(
          "/office/expenditure/summary",
          { params: sumParams },
        );
        const apiTotals = sum.data.data;
        const apiEmpty = (apiTotals?.credit || 0) === 0 && (apiTotals?.debit || 0) === 0;
        setSummary(apiEmpty && (fromList.credit > 0 || fromList.debit > 0) ? fromList : apiTotals);
      } catch {
        setSummary(fromList);
      }
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [isEmployer, activeEmployerId, t, month]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((tx) => {
      const okType = typeFilter === "all" || tx.type === typeFilter;
      const okQ =
        !q ||
        tx.category.toLowerCase().includes(q) ||
        (tx.description || "").toLowerCase().includes(q);
      return okType && okQ;
    });
  }, [items, query, typeFilter]);

  const trend = useMemo(() => {
    const grouped = new Map<string, { label: string; credit: number; debit: number }>();
    for (const tx of items) {
      const day = tx.transactionDate.slice(8, 10);
      const label = day;
      if (!grouped.has(day)) grouped.set(day, { label, credit: 0, debit: 0 });
      const row = grouped.get(day)!;
      if (tx.type === "credit") row.credit += tx.amount;
      else row.debit += tx.amount;
    }
    return [...grouped.values()].sort((a, b) => Number(a.label) - Number(b.label));
  }, [items]);

  const save = async () => {
    setError("");
    setSuccess("");
    if (!form.amount || Number(form.amount) <= 0) {
      setError(t("amountRequired"));
      return;
    }
    if (!isEmployer && !activeEmployerId) {
      setError(t("selectCompanyFirst"));
      return;
    }
    setSaving(true);
    try {
      let attachmentUrl: string | undefined;
      if (attachmentFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", attachmentFile);
        fd.append("folder", "expenditure");
        const uploadRes = await api.post<ApiSuccess<{ url: string }>>("/uploads", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        attachmentUrl = uploadRes.data.data.url;
      }

      await api.post("/office/expenditure", {
        ...form,
        amount: Number(form.amount),
        attachmentUrl,
        employerId: !isEmployer ? activeEmployerId : undefined,
      });
      setForm({
        type: "debit",
        amount: "",
        category: "general",
        description: "",
        transactionDate: new Date().toISOString().slice(0, 10),
        paymentMode: "cash",
      });
      setAttachmentFile(null);
      await load();
      setSuccess(t("transactionSaved"));
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  return (
    <div className="exp-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("navGroupFinance")}</p>
          <h2 className="display page-title">{t("expenditure")}</h2>
          <p className="muted page-sub">{isEmployer ? t("expOwnCompanyHint") : t("expOwnEmployeeHint")}</p>
        </div>
        <div className="row">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">{t("monthFilter")}</label>
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonth(nowMonth())}>
            {t("thisMonth")}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonth("")}>
            {t("allTime")}
          </button>
        </div>
      </div>

      {summary ? (
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <StatCard label={t("credit")} value={formatINR(summary.credit)} tone="ok" />
          <StatCard label={t("debit")} value={formatINR(summary.debit)} tone="warn" />
          <StatCard label={t("balance")} value={formatINR(summary.balance)} tone="accent" />
        </div>
      ) : null}

      <div className="grid-2">
        <ChartCard title={t("chartSpend")} subtitle={t("chartSpendSub")}>
          <SpendBarChart credit={summary?.credit || 0} debit={summary?.debit || 0} />
        </ChartCard>
        <ChartCard title={t("expTrend")} subtitle={t("expTrendSub")}>
          <ExpenditureTrendChart data={trend} />
        </ChartCard>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="panel exp-form-panel">
          <h3 className="chart-card-title">{t("addTransaction")}</h3>
          <div className="grid-3">
            <div className="field">
              <label className="label">{t("status")}</label>
              <select
                className="select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "credit" | "debit" })}
              >
                <option value="credit">{t("credit")}</option>
                <option value="debit">{t("debit")}</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{t("amount")}</label>
              <input
                className="input"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">{t("category")}</label>
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("date")}</label>
              <input
                className="input"
                type="date"
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">{t("paymentMode")}</label>
              <select
                className="select"
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              >
                <option value="cash">{t("cash")}</option>
                <option value="upi">{t("upi")}</option>
                <option value="bank">{t("bank")}</option>
                <option value="cheque">{t("cheque")}</option>
                <option value="other">{t("other")}</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label">{t("description")}</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">{t("attachment")}</label>
            <input
              className="input"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
            />
            {attachmentFile ? (
              <div className="row" style={{ marginTop: 8 }}>
                <span className="muted">{attachmentFile.name}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttachmentFile(null)}>
                  {t("removeFile")}
                </button>
              </div>
            ) : null}
          </div>
          {error || success ? <p className={error ? "error" : "success"}>{error || success}</p> : null}
          <button type="button" className="btn" disabled={saving || uploading} onClick={() => void save()}>
            {saving || uploading ? t("loading") : t("save")}
          </button>
        </div>

        <div className="panel exp-list-panel">
          <div className="tasks-toolbar">
            <input
              className="input"
              value={query}
              placeholder={t("searchTransactions")}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "credit" | "debit")}
            >
              <option value="all">{t("allType")}</option>
              <option value="credit">{t("credit")}</option>
              <option value="debit">{t("debit")}</option>
            </select>
            <div className="muted sites-count">{filtered.length} {t("transactions")}</div>
          </div>
          {loading ? (
            <p className="muted">{t("loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="muted">{t("noData")}</p>
          ) : (
            <div className="tx-list">
              {filtered.map((tx) => (
                <article key={tx._id} className="tx-item">
                  <div className="tx-top">
                    <div>
                      <p className="tx-cat">{tx.category}</p>
                      <p className="muted tx-date">{fmtDate(tx.transactionDate)}</p>
                    </div>
                    <div className="tx-amount-wrap">
                      <span className={`badge ${tx.type === "credit" ? "ok" : "warn"}`}>{tx.type}</span>
                      <p className={`tx-amount ${tx.type}`}>{formatINR(tx.amount)}</p>
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 6 }}>
                    {tx.description ? <p className="muted tx-desc">{tx.description}</p> : null}
                    {tx.attachmentUrl ? (
                      <a href={tx.attachmentUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        {t("viewAttachment")}
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
