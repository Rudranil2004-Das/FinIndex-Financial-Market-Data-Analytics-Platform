import { API_BASE, getHealth } from "../api/api";
import useFetch from "../hooks/useFetch";
import { useSettings } from "../hooks/useSettings";
import { ErrorMessage, PageHeader } from "../components/Feedback";

const THEMES = [
  { id: "navy", label: "Navy", swatch: "#0a1020" },
  { id: "midnight", label: "Midnight", swatch: "#040814" },
  { id: "graphite", label: "Graphite", swatch: "#121418" },
];

function Option({ active, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`rounded-md border px-3 py-2 text-sm ${active ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-ink"}`}>
      {children}
    </button>
  );
}

export default function Settings() {
  const { settings, update, reset } = useSettings();
  const health = useFetch(getHealth, []);
  const info = health.data;

  return (
    <>
      <PageHeader title="Settings" subtitle="Preferences are saved in this browser." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Application information</h2>
          {health.error ? <ErrorMessage message={health.error} onRetry={health.reload} /> : info && (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Version</dt><dd>{info.version}</dd>
              <dt className="text-muted">Backend status</dt><dd>{info.status}</dd>
              <dt className="text-muted">Database</dt><dd>{info.engine} · {info.db_file}</dd>
              <dt className="text-muted">Stocks / prices</dt><dd>{info.counts.stocks} / {info.counts.price_records?.toLocaleString()}</dd>
              <dt className="text-muted">Data range</dt><dd>{info.counts.first_trade_date || "–"} to {info.counts.latest_trade_date || "–"}</dd>
              <dt className="text-muted">API base URL</dt><dd>{API_BASE}</dd>
            </dl>
          )}
          <p className="mt-3 text-xs text-muted">Sample data is generated and clearly labelled. FinIndex never presents it as real-time market data.</p>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Theme</h2>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <Option key={t.id} active={settings.theme === t.id} onClick={() => update({ theme: t.id })}>
                <span className="mr-2 inline-block h-3 w-3 rounded-full border border-line align-middle" style={{ background: t.swatch }} />
                {t.label}
              </Option>
            ))}
          </div>

          <h2 className="mb-3 mt-6 font-semibold">Data configuration</h2>
          <p className="mb-2 text-sm text-muted">Rows per page in Market Watch</p>
          <div className="flex gap-2">{[10, 20, 50].map((n) => <Option key={n} active={settings.rowsPerPage === n} onClick={() => update({ rowsPerPage: n })}>{n}</Option>)}</div>

          <h2 className="mb-3 mt-6 font-semibold">Dashboard preferences</h2>
          <p className="mb-2 text-sm text-muted">Stocks shown in top and worst performer lists</p>
          <div className="flex gap-2">{[3, 5].map((n) => <Option key={n} active={settings.topN === n} onClick={() => update({ topN: n })}>{n}</Option>)}</div>

          <button className="btn mt-6" onClick={reset}>Reset to defaults</button>
        </section>
      </div>
    </>
  );
}
