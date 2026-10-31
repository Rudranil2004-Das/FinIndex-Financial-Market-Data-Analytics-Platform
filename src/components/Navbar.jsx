import { Menu } from "lucide-react";
import { getHealth } from "../api/api";
import useFetch from "../hooks/useFetch";

export default function Navbar({ onMenu }) {
  const { data, error } = useFetch(getHealth, []);
  const online = data?.status === "ok" && !error;
  return (
    <header className="flex h-16 items-center gap-3 border-b border-line bg-panel/80 px-4 backdrop-blur">
      <button className="btn px-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <p className="hidden text-sm text-muted sm:block">Historical and sample data only. Not real-time market data.</p>
      <div className="ml-auto flex items-center gap-2 text-sm text-muted" title={online ? "Backend connected" : "Backend unreachable"}>
        <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-up" : "bg-down"}`} />
        {online ? "API online" : "API offline"}
      </div>
    </header>
  );
}
