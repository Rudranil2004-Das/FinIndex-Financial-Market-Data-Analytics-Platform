import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { errorMessage, getImportBatch, getImportHistory, uploadCsv } from "../api/api";
import useFetch from "../hooks/useFetch";
import { useNotify } from "../components/Notification";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import { ErrorMessage, Loader, PageHeader } from "../components/Feedback";

function ErrorTable({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="table-wrap mt-3 max-h-72 overflow-y-auto">
      <table className="table">
        <thead><tr><th>Row</th><th>Column</th><th>Issue</th></tr></thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={i}><td>{e.row_number}</td><td>{e.column_name}</td><td>{e.error_message}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DataImport() {
  const notify = useNotify();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [batch, setBatch] = useState(null);
  const [drag, setDrag] = useState(false);
  const history = useFetch(getImportHistory, []);

  const pick = (f) => { if (f) { setFile(f); setResult(null); } };

  async function submit() {
    setBusy(true);
    try {
      const res = await uploadCsv(file);
      setResult(res);
      notify(res.status === "failed" ? "error" : "success", `${res.filename}: ${res.inserted_records} records imported.`);
      setFile(null);
      history.reload();
    } catch (err) {
      notify("error", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function openBatch(id) {
    try { setBatch(await getImportBatch(id)); } catch (err) { notify("error", errorMessage(err)); }
  }

  return (
    <>
      <PageHeader title="Data Import Center" subtitle="Upload a CSV of daily prices. Every row is validated before it is stored." />
      <section className="card p-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-accent bg-accent/10" : "border-line"}`}
        >
          <FileUp className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2">{file ? <strong>{file.name}</strong> : "Drag a CSV file here, or choose one"}</p>
          <p className="mt-1 text-xs text-muted">
            Required columns: symbol, date, open, high, low, close, volume. Optional: company_name, exchange, sector, shares_outstanding.
          </p>
          <input ref={inputRef} type="file" accept=".csv" className="sr-only" onChange={(e) => pick(e.target.files[0])} />
          <div className="mt-4 flex justify-center gap-2">
            <button className="btn" onClick={() => inputRef.current.click()}>Choose file</button>
            <button className="btn btn-primary" disabled={!file || busy} onClick={submit}>{busy ? "Importing…" : "Import file"}</button>
          </div>
        </div>
      </section>

      {result && (
        <section className="mt-4">
          <h2 className="mb-2 font-semibold">Import result · {result.filename}</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard label="Records in file" value={result.total_records} />
            <MetricCard label="Valid" value={result.valid_records} tone="text-up" />
            <MetricCard label="Invalid" value={result.invalid_records} tone={result.invalid_records ? "text-down" : ""} />
            <MetricCard label="Newly stored" value={result.inserted_records} sub={`${result.skipped_existing} already existed`} />
            <MetricCard label="Quality score" value={`${result.quality_score}%`} />
          </div>
          {result.errors_preview.length > 0 && (
            <div className="card mt-4 p-4">
              <h3 className="font-medium">First issues found</h3>
              <ErrorTable rows={result.errors_preview} />
            </div>
          )}
        </section>
      )}

      <section className="card mt-4 p-4">
        <h2 className="mb-2 font-semibold">Import history</h2>
        {history.error ? <ErrorMessage message={history.error} onRetry={history.reload} /> : !history.data ? <Loader /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>File</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Valid</th><th className="text-right">Invalid</th><th>Uploaded</th><th /></tr></thead>
              <tbody>
                {history.data.map((b) => (
                  <tr key={b.id}>
                    <td>{b.filename}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="text-right">{b.total_records}</td>
                    <td className="text-right">{b.valid_records}</td>
                    <td className="text-right">{b.invalid_records}</td>
                    <td className="text-muted">{b.uploaded_at}</td>
                    <td className="text-right"><button className="text-accent hover:underline" onClick={() => openBatch(b.id)}>Details</button></td>
                  </tr>
                ))}
                {history.data.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">Nothing imported yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {batch && (
          <div className="mt-4 border-t border-line pt-3">
            <h3 className="font-medium">Issues in {batch.batch.filename}</h3>
            {batch.errors.length === 0 ? <p className="mt-1 text-sm text-muted">No issues recorded for this batch.</p> : <ErrorTable rows={batch.errors} />}
          </div>
        )}
      </section>
    </>
  );
}
