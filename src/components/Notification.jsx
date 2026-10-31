import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

const Ctx = createContext(() => {});
export const useNotify = () => useContext(Ctx);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = (id) => setItems((list) => list.filter((n) => n.id !== id));
  const notify = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, type, message }]);
    setTimeout(() => setItems((list) => list.filter((n) => n.id !== id)), 5000);
  }, []);

  return (
    <Ctx.Provider value={notify}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" role="status">
        {items.map((n) => (
          <div key={n.id} className="card flex items-start gap-3 p-3 shadow-lg">
            {n.type === "error" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-down" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-up" />
            )}
            <p className="flex-1 text-sm">{n.message}</p>
            <button onClick={() => dismiss(n.id)} aria-label="Dismiss" className="text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
