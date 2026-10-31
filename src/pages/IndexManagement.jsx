import { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, Plus } from "lucide-react";
import { calculateIndex, createIndex, getIndices } from "../api/indices";
import { errorMessage } from "../api/api";
import { getStocks } from "../api/stocks";
import useFetch from "../hooks/useFetch";
import { useNotify } from "../components/Notification";
import { EmptyState, ErrorMessage, Loader, PageHeader } from "../components/Feedback";
import { fmtNum, fmtPct, pctClass } from "../utils/format";

function CreateForm({ stocks, onCreated, onCancel }) {
  const notify = useNotify();
  const [form, setForm] = useState({ index_code: "", index_name: "", base_value: 1000, base_date: "" });
  const [picked, setPicked] = useState(() => new Set(stocks.map((s) => s.symbol)));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (sym) => setPicked((p) => { const n = new Set(p); n.has(sym) ? n.delete(sym) : n.add(sym); return n; });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await createIndex({ ...form, base_value: Number(form.base_value), base_date: form.base_date || undefined, symbols: [...picked] });
      notify("success", `Index ${form.index_code.toUpperCase()} created and calculated.`);
      onCreated();
    } catch (err) {
      notify("error", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mb-4 p-4">
      <h2 className="mb-3 font-semibold">New index</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-muted">Code<input className="input mt-1" required placeholder="FIN12" value={form.index_code} onChange={set("index_code")} /></label>
        <label className="text-sm text-muted">Name<input className="input mt-1" required placeholder="FinIndex Sample 12" value={form.index_name} onChange={set("index_name")} /></label>
        <label className="text-sm text-muted">Base value<input className="input mt-1" type="number" min="1" step="any" value={form.base_value} onChange={set("base_value")} /></label>
        <label className="text-sm text-muted">Base date (optional)<input className="input mt-1" type="date" value={form.base_date} onChange={set("base_date")} /></label>
      </div>
      <fieldset className="mt-4">
        <legend className="mb-2 flex w-full items-center justify-between text-sm text-muted">
          <span>Constituents ({picked.size} selected)</span>
          <span className="flex gap-3">
            <button type="button" className="text-accent hover:underline" onClick={() => setPicked(new Set(stocks.map((s) => s.symbol)))}>All</button>
            <button type="button" className="text-accent hover:underline" onClick={() => setPicked(new Set())}>None</button>
          </span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {stocks.map((s) => (
            <label key={s.symbol} className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-sm">
              <input type="checkbox" checked={picked.has(s.symbol)} onChange={() => toggle(s.symbol)} /> {s.symbol}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 flex gap-2">
        <button className="btn btn-primary" disabled={busy || picked.size === 0}>{busy ? "Creating…" : "Create index"}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Educational model: Index Value = Base Value × (Current Market Cap ÷ Base Market Cap). No float or corporate-action adjustments.
      </p>
    </form>
  );
}

export default function IndexManagement() {
  const notify = useNotify();
  const indices = useFetch(getIndices, []);
  const stocks = useFetch(() => getStocks({ per_page: 200 }), []);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function recalc(id) {
    setBusyId(id);
    try { await calculateIndex(id); notify("success", "Index recalculated."); indices.reload(); }
    catch (err) { notify("error", errorMessage(err)); }
    finally { setBusyId(null); }
  }

  if (indices.error) return <ErrorMessage message={indices.error} onRetry={indices.reload} />;
  if (!indices.data) return <Loader />;
  const noStocks = stocks.data && stocks.data.items.length === 0;

  return (
    <>
      <PageHeader title="Index Management" subtitle="Simplified market-cap-weighted indices built from your imported stocks.">
        {!creating && <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={!stocks.data || noStocks}><Plus className="h-4 w-4" /> New index</button>}
      </PageHeader>

      {creating && stocks.data && <CreateForm stocks={stocks.data.items} onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); indices.reload(); }} />}

      {indices.data.length === 0 ? (
        <EmptyState title="No indices yet" actionTo={noStocks ? "/import" : undefined} actionLabel="Import data first">
          {noStocks ? "Import stock data, then create your first index." : "Create an index to track a basket of stocks from a base value."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {indices.data.map((i) => (
            <article key={i.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{i.index_name}</h2>
                  <p className="text-sm text-muted">{i.index_code} · {i.constituent_count} stocks</p>
                </div>
                <span className={`text-lg font-semibold ${pctClass(i.performance_pct)}`}>{fmtPct(i.performance_pct)}</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-muted">Base</dt><dd>{fmtNum(i.base_value, 0)}</dd></div>
                <div><dt className="text-muted">Latest</dt><dd className="font-medium">{fmtNum(i.latest_value)}</dd></div>
                <div><dt className="text-muted">Base date</dt><dd>{i.base_date}</dd></div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Link to={`/indices/${i.id}`} className="btn flex-1">View details</Link>
                <button className="btn" onClick={() => recalc(i.id)} disabled={busyId === i.id}><Calculator className="h-4 w-4" /> {busyId === i.id ? "Working…" : "Calculate"}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
