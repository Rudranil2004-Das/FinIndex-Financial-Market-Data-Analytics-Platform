export default function DateFilter({ start, end, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2 text-muted">
        From
        <input type="date" className="input w-auto" value={start} onChange={(e) => onChange({ start: e.target.value, end })} />
      </label>
      <label className="flex items-center gap-2 text-muted">
        To
        <input type="date" className="input w-auto" value={end} onChange={(e) => onChange({ start, end: e.target.value })} />
      </label>
      {(start || end) && (
        <button className="btn" onClick={() => onChange({ start: "", end: "" })}>
          Clear
        </button>
      )}
    </div>
  );
}
