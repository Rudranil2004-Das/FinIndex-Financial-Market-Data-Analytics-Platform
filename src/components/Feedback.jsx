import { Link } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

export function Loader({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="card flex flex-wrap items-center gap-3 border-down/50 p-4" role="alert">
      <AlertTriangle className="h-5 w-5 text-down" />
      <p className="flex-1 text-sm">{message}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, actionTo, actionLabel }) {
  return (
    <div className="card p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>
      {actionTo && (
        <Link to={actionTo} className="btn btn-primary mt-4">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
