import { createContext, useContext, useEffect, useState } from "react";

const DEFAULTS = { theme: "navy", rowsPerPage: 10, topN: 5 };
const Ctx = createContext(null);

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("finindex.settings") || "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    try {
      localStorage.setItem("finindex.settings", JSON.stringify(settings));
    } catch { /* storage unavailable: settings last for this session only */ }
  }, [settings]);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  return <Ctx.Provider value={{ settings, update, reset: () => setSettings(DEFAULTS) }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
