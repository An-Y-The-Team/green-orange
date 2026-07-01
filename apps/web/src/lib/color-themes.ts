/**
 * CMS-driven color theme registry.
 *
 * Each theme defines a full 50–950 oklch shade scale for two brand roles:
 *   primary   (was: emerald) — headings, accents, active states
 *   secondary (was: orange)  — CTA buttons, warm highlights
 *
 * The `green-orange` theme reproduces Tailwind's emerald + orange scales
 * byte-for-byte (values copied from node_modules/tailwindcss/theme.css) so
 * the default look is identical to the pre-theme site.
 *
 * At runtime, page.tsx reads settings.colorTheme.theme, looks up the registry
 * via themeCssVars(), and emits --brand-primary-* / --brand-secondary-* CSS
 * variables in an inline style on the root div — the same pattern used for
 * typography font variables.
 */

export type ColorThemeSlug =
  | "green-orange"
  | "ocean"
  | "royal"
  | "crimson"
  | "forest";

/** Tailwind-compatible shade steps. */
export type Shade =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | 950;

export type ShadeScale = Record<Shade, string>;

export interface ColorTheme {
  primary: ShadeScale;
  secondary: ShadeScale;
}

export const COLOR_THEMES: Record<ColorThemeSlug, ColorTheme> = {
  "green-orange": {
    primary: {
      50: "oklch(97.9% 0.021 166.113)",
      100: "oklch(95% 0.052 163.051)",
      200: "oklch(90.5% 0.093 164.15)",
      300: "oklch(84.5% 0.143 164.978)",
      400: "oklch(76.5% 0.177 163.223)",
      500: "oklch(69.6% 0.17 162.48)",
      600: "oklch(59.6% 0.145 163.225)",
      700: "oklch(50.8% 0.118 165.612)",
      800: "oklch(43.2% 0.095 166.913)",
      900: "oklch(37.8% 0.077 168.94)",
      950: "oklch(26.2% 0.051 172.552)",
    },
    secondary: {
      50: "oklch(98% 0.016 73.684)",
      100: "oklch(95.4% 0.038 75.164)",
      200: "oklch(90.1% 0.076 70.697)",
      300: "oklch(83.7% 0.128 66.29)",
      400: "oklch(75% 0.183 55.934)",
      500: "oklch(70.5% 0.213 47.604)",
      600: "oklch(64.6% 0.222 41.116)",
      700: "oklch(55.3% 0.195 38.402)",
      800: "oklch(47% 0.157 37.304)",
      900: "oklch(40.8% 0.123 38.172)",
      950: "oklch(26.6% 0.079 36.259)",
    },
  },
  ocean: {
    primary: {
      50: "oklch(97% 0.014 254.604)",
      100: "oklch(93.2% 0.032 255.585)",
      200: "oklch(88.2% 0.059 254.128)",
      300: "oklch(80.9% 0.105 251.813)",
      400: "oklch(70.7% 0.165 254.624)",
      500: "oklch(62.3% 0.214 259.815)",
      600: "oklch(54.6% 0.245 262.881)",
      700: "oklch(48.8% 0.243 264.376)",
      800: "oklch(42.4% 0.199 265.638)",
      900: "oklch(37.9% 0.146 265.522)",
      950: "oklch(28.2% 0.091 267.935)",
    },
    secondary: {
      50: "oklch(97.7% 0.013 236.62)",
      100: "oklch(95.1% 0.026 236.824)",
      200: "oklch(90.1% 0.058 230.902)",
      300: "oklch(82.8% 0.111 230.318)",
      400: "oklch(74.6% 0.16 232.661)",
      500: "oklch(68.5% 0.169 237.323)",
      600: "oklch(58.8% 0.158 241.966)",
      700: "oklch(50% 0.134 242.749)",
      800: "oklch(44.3% 0.11 240.79)",
      900: "oklch(39.1% 0.09 240.876)",
      950: "oklch(29.3% 0.066 243.157)",
    },
  },
  royal: {
    primary: {
      50: "oklch(96.9% 0.016 293.756)",
      100: "oklch(94.3% 0.029 294.588)",
      200: "oklch(89.4% 0.057 293.283)",
      300: "oklch(81.1% 0.111 293.571)",
      400: "oklch(70.2% 0.183 293.541)",
      500: "oklch(60.6% 0.25 292.717)",
      600: "oklch(54.1% 0.281 293.009)",
      700: "oklch(49.1% 0.27 292.581)",
      800: "oklch(43.2% 0.232 292.759)",
      900: "oklch(38% 0.189 293.745)",
      950: "oklch(28.3% 0.141 291.089)",
    },
    secondary: {
      50: "oklch(97.7% 0.017 320.058)",
      100: "oklch(95.2% 0.037 318.852)",
      200: "oklch(90.3% 0.076 319.62)",
      300: "oklch(83.3% 0.145 321.434)",
      400: "oklch(74% 0.238 322.16)",
      500: "oklch(66.7% 0.295 322.15)",
      600: "oklch(59.1% 0.293 322.896)",
      700: "oklch(51.8% 0.253 323.949)",
      800: "oklch(45.2% 0.211 324.591)",
      900: "oklch(40.1% 0.17 325.612)",
      950: "oklch(29.3% 0.136 325.661)",
    },
  },
  crimson: {
    primary: {
      50: "oklch(96.9% 0.015 12.422)",
      100: "oklch(94.1% 0.03 12.58)",
      200: "oklch(89.2% 0.058 10.001)",
      300: "oklch(81% 0.117 11.638)",
      400: "oklch(71.2% 0.194 13.428)",
      500: "oklch(64.5% 0.246 16.439)",
      600: "oklch(58.6% 0.253 17.585)",
      700: "oklch(51.4% 0.222 16.935)",
      800: "oklch(45.5% 0.188 13.697)",
      900: "oklch(41% 0.159 10.272)",
      950: "oklch(27.1% 0.105 12.094)",
    },
    secondary: {
      50: "oklch(97.1% 0.013 17.38)",
      100: "oklch(93.6% 0.032 17.717)",
      200: "oklch(88.5% 0.062 18.334)",
      300: "oklch(80.8% 0.114 19.571)",
      400: "oklch(70.4% 0.191 22.216)",
      500: "oklch(63.7% 0.237 25.331)",
      600: "oklch(57.7% 0.245 27.325)",
      700: "oklch(50.5% 0.213 27.518)",
      800: "oklch(44.4% 0.177 26.899)",
      900: "oklch(39.6% 0.141 25.723)",
      950: "oklch(25.8% 0.092 26.042)",
    },
  },
  forest: {
    primary: {
      50: "oklch(98.4% 0.014 180.72)",
      100: "oklch(95.3% 0.051 180.801)",
      200: "oklch(91% 0.096 180.426)",
      300: "oklch(85.5% 0.138 181.071)",
      400: "oklch(77.7% 0.152 181.912)",
      500: "oklch(70.4% 0.14 182.503)",
      600: "oklch(60% 0.118 184.704)",
      700: "oklch(51.1% 0.096 186.391)",
      800: "oklch(43.7% 0.078 188.216)",
      900: "oklch(38.6% 0.063 188.416)",
      950: "oklch(27.7% 0.046 192.524)",
    },
    secondary: {
      50: "oklch(96.2% 0.018 272.314)",
      100: "oklch(93% 0.034 272.788)",
      200: "oklch(87% 0.065 274.039)",
      300: "oklch(78.5% 0.115 274.713)",
      400: "oklch(67.3% 0.182 276.935)",
      500: "oklch(58.5% 0.233 277.117)",
      600: "oklch(51.1% 0.262 276.966)",
      700: "oklch(45.7% 0.24 277.023)",
      800: "oklch(39.8% 0.195 277.366)",
      900: "oklch(35.9% 0.144 278.697)",
      950: "oklch(25.7% 0.09 281.288)",
    },
  },
};

/** Set of valid theme slugs — used by data.ts pickColorTheme() for validation. */
export const COLOR_THEME_SLUGS = new Set<string>(Object.keys(COLOR_THEMES));

/**
 * Returns a flat record of `--brand-primary-*` / `--brand-secondary-*` CSS
 * variables for the given theme, ready to spread into an inline `style` prop.
 */
export const themeCssVars = (slug: ColorThemeSlug): Record<string, string> => {
  const theme = COLOR_THEMES[slug];
  const vars: Record<string, string> = {};
  (Object.keys(theme.primary) as unknown as Shade[]).forEach((shade) => {
    vars[`--brand-primary-${shade}`] = theme.primary[shade];
  });
  (Object.keys(theme.secondary) as unknown as Shade[]).forEach((shade) => {
    vars[`--brand-secondary-${shade}`] = theme.secondary[shade];
  });
  return vars;
};
