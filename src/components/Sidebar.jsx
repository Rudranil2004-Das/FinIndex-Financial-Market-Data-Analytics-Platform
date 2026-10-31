import { NavLink } from "react-router-dom";
import { BarChart3, FileUp, Layers, LayoutDashboard, LineChart, Settings, ShieldCheck, X } from "lucide-react";

const LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/market", label: "Market Watch", icon: LineChart },
  { to: "/import", label: "Data Import", icon: FileUp },
  { to: "/validation", label: "Data Validation", icon: ShieldCheck },
  { to: "/indices", label: "Indices", icon: Layers },
  { to: "/analytics", label: "Analytics & Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-line bg-panel transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-semibold text-white">Fi</span>
            <span className="text-lg font-semibold">FinIndex</span>
          </div>
          <button className="text-muted lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  isActive ? "bg-accent/15 font-medium text-accent" : "text-muted hover:bg-raised hover:text-ink"
                }`
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
