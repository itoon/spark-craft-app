import { ref } from "vue";

/**
 * Editor look (CodeCraft default or CodeVenture). The choice is stored per
 * browser and applied as <html data-theme>; main.css swaps the colour tokens.
 * Only the editor chrome changes — the phone screen keeps the app's own colours.
 */
export type UiTheme = "codecraft" | "codeventure";

export const UI_THEMES: { key: UiTheme; label: string; description: string }[] = [
  { key: "codecraft", label: "CodeCraft", description: "ธีมเริ่มต้น สีเทาเข้ม" },
  { key: "codeventure", label: "CodeVenture", description: "สีน้ำเงินกรมท่า แบบ codeventure.app" },
];

const THEME_KEY = "codecraft-ui-theme";
const theme = ref<UiTheme>("codecraft");
let loaded = false;

function readTheme(): UiTheme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return UI_THEMES.some((t) => t.key === saved) ? (saved as UiTheme) : "codecraft";
  } catch {
    return "codecraft";
  }
}

export function useUiTheme() {
  if (import.meta.client && !loaded) {
    theme.value = readTheme();
    loaded = true;
  }

  function setTheme(next: UiTheme) {
    theme.value = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // storage blocked — the theme still applies until the page reloads
    }
  }

  return { theme, setTheme };
}
