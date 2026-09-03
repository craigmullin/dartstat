export const THEME_STORAGE_KEY = "dartstat-theme";

export const THEMES = [
  { id: "pink", name: "Pink", description: "Original DartStat", colors: ["#fff8fc", "#ff8fbc", "#f72585", "#c9184a", "#5a294f", "#241924"] },
  { id: "orange", name: "Orange", description: "Warm and energetic", colors: ["#FFF1E8", "#FFC49B", "#FF873D", "#FF681F", "#E94E0C", "#8F2900"] },
  { id: "green", name: "Green", description: "Fresh and focused", colors: ["#E8FFF1", "#99EDB8", "#38C96C", "#13A94C", "#07843A", "#075128"] },
  { id: "graphite", name: "Graphite", description: "Quiet and neutral", colors: ["#F4F4F3", "#D2D2D0", "#8B8B88", "#62625F", "#444441", "#20201E"] },
  { id: "violet", name: "Electric Violet", description: "Bright and expressive", colors: ["#F6ECFF", "#D8A8FF", "#AA55F5", "#8B2BE2", "#6C16BB", "#3C086D"] },
  { id: "cobalt", name: "Cobalt", description: "Clear and confident", colors: ["#EDF3FF", "#ABC5FF", "#5688F5", "#2864E8", "#1648B9", "#092B72"] },
  { id: "lime", name: "Acid Lime", description: "High-energy contrast", colors: ["#F7FFD9", "#DFFF7D", "#B9EB35", "#91C916", "#6E9E08", "#405D05"] },
  { id: "pink-dark", name: "Pink Dark", description: "Low-light DartStat", colors: ["#2A0A18", "#FFB3D1", "#FF66B2", "#FF3D9A", "#9E1F5C", "#3A0F24"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function readStoredTheme(storage: Pick<Storage, "getItem"> = localStorage): ThemeId {
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : "pink";
  } catch { return "pink"; }
}

export function storeTheme(theme: ThemeId, storage: Pick<Storage, "setItem"> = localStorage) {
  try { storage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Keep the in-memory theme when device storage is unavailable. */ }
}
