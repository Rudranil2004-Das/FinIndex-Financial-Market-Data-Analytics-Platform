import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { errorMessage, getImportHistory, getValidationErrors, getValidationSummary, runValidation } from "../api/api";
import useFetch from "../hooks/useFetch";
import { useNotify } from "../components/Notification";
import MetricCard from "../components/MetricCard";
import { EmptyState, ErrorMessage, Loader, PageHeader } from "../components/Feedback";

export default function DataValidation() {
  const notify = useNotify();
  const [batchId, setBatchId] = useState("");
  const [audit, setAudit] = useState(null);
  const [running, setRunning] = useState(false);
  const summary = useFetch(getValidationSummary, []);
  const batches = useFetch(getImportHistory, []);
  const errors = useFetch(() => getValidationErrors({ batch_id: batchId || undefined, limit: 200 }), [batchId]);

  async function audit_() {
    setRunning(true);
    try { setAudit(await runValidation()); } catch (err) { notify("error", errorMessage(err)); } finally { setRunning(false); }
  }

  if (summary.error) return <ErrorMessage message={summary.error} onRetry={summary.reload} />;
  if (!summary.data) return <Loader />;
  const s = summary.data;

  return (
    <>
      <PageHeader title="Data Validation Center" subtitle="Data quality across every imported file.">
        <button className="btn btn-primary" onClick={audit_} disabled={running}>
          <ShieldCheck className="h-4 w-4" /> {running ? "Checking…" : "Re-check stored data"}
        </button>
      </PageHeader>

      {s.batches === 0 ? (
        <EmptyState title="Nothing to validate yet" actionTo="/import" actionLabel="Import a CSV">
          Validation results appear here after you import a file.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Records checked" value={s.total_checked.toLocaleString()} sub={`${s.batches} import(s)`} />
            <MetricCard label="Valid records" value={s.valid_records.toLocaleString()} tone="text-up" />
            <MetricCard label="Invalid records" value={s.invalid_records.toLocaleString()} tone={s.invalid_records ? "text-down" : ""} />
            <MetricCard label="Quality score" value={`${s.quality_score}%`} />
            <MetricCard label="Missing values" value={s.missing_values} />
            <MetricCard label="Duplicate records" value={s.duplicate_records} />
            <MetricCard label="Unusual price moves" value={s.unusual_movements} sub="Warning only, still imported" tone={s.unusual_movements ? "text-warn" : ""} />
          </div>

          {audit && (
            <section className="card mt-4 p-4">
              <h2 className="font-semibold">Stored-data check</h2>
              {audit.stats ? (
                <p className="mt-1 text-sm text-muted">
                  {audit.stats.total_records.toLocaleString()} stored records checked: {audit.stats.invalid_records} invalid,{" "}
                  {audit.stats.unusual_movements} unusual price movement(s). Quality score {audit.stats.quality_score}%.
                </p>
              ) : <p className="mt-1 text-sm text-muted">{audit.message}</p>}
            </section>
          )}

          <section className="card mt-4 p-4">
            <h2 className="mb-2 font-semibold">Issues by type</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Issue</th><th>Column</th><th className="text-right">Count</th></tr></thead>
                <tbody>
                  {s.by_type.map((k, i) => <tr key={i}><td>{k.error_message}</td><td>{k.column_name}</td><td className="text-right">{k.count}</td></tr>)}
                  {s.by_type.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted">No issues found. All records passed.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card mt-4 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Validation errors</h2>
              <label>
                <span className="sr-only">Filter by import</span>
                <select className="input w-auto" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                  <option value="">All imports</option>
                  {(batches.data || []).map((b) => <option key={b.id} value={b.id}>#{b.id} · {b.filename}</option>)}
                </select>
              </label>
            </div>
            {errors.error ? <ErrorMessage message={errors.error} onRetry={errors.reload} /> : (
              <div className="table-wrap max-h-96 overflow-y-auto">
                <table className="table">
                  <thead><tr><th>Import</th><th>Row</th><th>Column</th><th>Issue</th></tr></thead>
                  <tbody>
                    {(errors.data || []).map((e) => (
                      <tr key={e.id}><td>#{e.batch_id}</td><td>{e.row_number}</td><td>{e.column_name}</td>
                        <td className={e.error_message.startsWith("Warning") ? "text-warn" : ""}>{e.error_message}</td></tr>
                    ))}
                    {errors.data?.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted">No errors recorded.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
