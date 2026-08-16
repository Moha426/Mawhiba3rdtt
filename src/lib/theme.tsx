import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

export type ColorTheme =
  | "purple" | "blue" | "indigo" | "green" | "teal"
  | "gold" | "orange" | "rose" | "crimson";

export const COLOR_THEMES: { id: ColorTheme; label: string; primary: string }[] = [
  { id: "purple",  label: "بنفسجي",  primary: "hsl(256 72% 52%)" },
  { id: "blue",    label: "أزرق",    primary: "hsl(217 91% 52%)" },
  { id: "indigo",  label: "نيلي",    primary: "hsl(243 70% 50%)" },
  { id: "green",   label: "أخضر",   primary: "hsl(152 60% 38%)" },
  { id: "teal",    label: "فيروزي", primary: "hsl(180 65% 36%)" },
  { id: "gold",    label: "ذهبي",   primary: "hsl(38 90% 44%)"  },
  { id: "orange",  label: "برتقالي", primary: "hsl(22 88% 48%)"  },
  { id: "rose",    label: "وردي",   primary: "hsl(336 80% 50%)" },
  { id: "crimson", label: "قرمزي",  primary: "hsl(4 82% 50%)"   },
];

const ALL_COLOR_IDS = COLOR_THEMES.map(c => c.id) as ColorTheme[];

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: (pos?: { x: number; y: number }) => void;
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme, pos?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  colorTheme: "purple",
  setColorTheme: () => {},
});

type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

function runReveal(
  cb: () => void,
  pos: { x: number; y: number } | undefined,
  pseudoEl: string,
  duration = 400,
) {
  // Removing heavy View Transition clipPath animation as requested for better performance
  cb();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem("colorTheme") as ColorTheme | null;
    return stored && ALL_COLOR_IDS.includes(stored) ? stored : "purple";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-color-theme", colorTheme);
    localStorage.setItem("colorTheme", colorTheme);
  }, [colorTheme]);

  const toggleTheme = (pos?: { x: number; y: number }) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    runReveal(
      () => setTheme(next),
      pos,
      next === "dark" ? "::view-transition-old(root)" : "::view-transition-new(root)",
      420,
    );
  };

  const setColorTheme = (c: ColorTheme, pos?: { x: number; y: number }) => {
    runReveal(
      () => setColorThemeState(c),
      pos,
      "::view-transition-new(root)",
      360,
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
