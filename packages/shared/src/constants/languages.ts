export interface Language {
  code: string;
  label: string;
  nativeName: string;
}

export const AVAILABLE_LANGUAGES: Language[] = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "es", label: "Spanish", nativeName: "Español" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "it", label: "Italian", nativeName: "Italiano" },
  { code: "pt", label: "Portuguese", nativeName: "Português" },
  { code: "ru", label: "Russian", nativeName: "Русский" },
  { code: "ja", label: "Japanese", nativeName: "日本語" },
  { code: "ko", label: "Korean", nativeName: "한국어" },
  { code: "zh", label: "Chinese (Mandarin)", nativeName: "中文" },
  { code: "ar", label: "Arabic", nativeName: "العربية" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { code: "nl", label: "Dutch", nativeName: "Nederlands" },
  { code: "pl", label: "Polish", nativeName: "Polski" },
  { code: "tr", label: "Turkish", nativeName: "Türkçe" },
  { code: "sv", label: "Swedish", nativeName: "Svenska" },
  { code: "da", label: "Danish", nativeName: "Dansk" },
  { code: "no", label: "Norwegian", nativeName: "Norsk" },
  { code: "fi", label: "Finnish", nativeName: "Suomi" },
  { code: "is", label: "Icelandic", nativeName: "Íslenska" },
  { code: "el", label: "Greek", nativeName: "Ελληνικά" },
  { code: "cs", label: "Czech", nativeName: "Čeština" },
  { code: "hu", label: "Hungarian", nativeName: "Magyar" },
  { code: "ro", label: "Romanian", nativeName: "Română" },
  { code: "bg", label: "Bulgarian", nativeName: "Български" },
  { code: "uk", label: "Ukrainian", nativeName: "Українська" },
  { code: "he", label: "Hebrew", nativeName: "עברית" },
  { code: "th", label: "Thai", nativeName: "ไทย" },
  { code: "vi", label: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "id", label: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ms", label: "Malay", nativeName: "Bahasa Melayu" },
  { code: "tl", label: "Tagalog", nativeName: "Tagalog" },
  { code: "sw", label: "Swahili", nativeName: "Kiswahili" },
  { code: "bn", label: "Bengali", nativeName: "বাংলা" },
  { code: "ta", label: "Tamil", nativeName: "தமிழ்" },
  { code: "te", label: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", label: "Marathi", nativeName: "मराठी" },
  { code: "gu", label: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", label: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", label: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "Urdu", nativeName: "اردو" },
  { code: "fa", label: "Persian (Farsi)", nativeName: "فارسی" },
  { code: "ca", label: "Catalan", nativeName: "Català" },
  { code: "eu", label: "Basque", nativeName: "Euskara" },
  { code: "ga", label: "Irish", nativeName: "Gaeilge" },
  { code: "cy", label: "Welsh", nativeName: "Cymraeg" },
  { code: "gd", label: "Scottish Gaelic", nativeName: "Gàidhlig" },
  { code: "af", label: "Afrikaans", nativeName: "Afrikaans" },
  { code: "zu", label: "Zulu", nativeName: "isiZulu" },
  { code: "xh", label: "Xhosa", nativeName: "isiXhosa" },
  { code: "yo", label: "Yoruba", nativeName: "Yorùbá" },
  { code: "am", label: "Amharic", nativeName: "አማርኛ" },
  { code: "other", label: "Other", nativeName: "Other" },
];

export const LANGUAGE_MAP = AVAILABLE_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.code] = lang;
    return acc;
  },
  {} as Record<string, Language>
);

export function getLanguageLabel(code: string): string {
  return LANGUAGE_MAP[code]?.label || code;
}

export function getLanguageNativeName(code: string): string {
  return LANGUAGE_MAP[code]?.nativeName || code;
}

export function getLanguageByCode(code: string): Language | undefined {
  return LANGUAGE_MAP[code];
}

export function isCustomLanguage(code: string): boolean {
  return code.startsWith("custom:");
}

export function parseCustomLanguage(code: string): string {
  if (isCustomLanguage(code)) {
    return code.substring(7); // Remove "custom:" prefix
  }
  return code;
}

export function formatCustomLanguage(language: string): string {
  return `custom:${language.trim()}`;
}

export function getLanguageDisplay(code: string, showNative = false): string {
  if (isCustomLanguage(code)) {
    return parseCustomLanguage(code);
  }

  const language = getLanguageByCode(code);
  if (!language) return code;

  if (showNative && language.nativeName !== language.label) {
    return `${language.label} (${language.nativeName})`;
  }

  return language.label;
}

// Helper to sort languages: predefined first (alphabetically), then custom (alphabetically)
export function sortLanguages(languages: string[]): string[] {
  const predefined = languages.filter((lang) => !isCustomLanguage(lang));
  const custom = languages.filter((lang) => isCustomLanguage(lang));

  predefined.sort((a, b) =>
    getLanguageLabel(a).localeCompare(getLanguageLabel(b))
  );
  custom.sort((a, b) =>
    parseCustomLanguage(a).localeCompare(parseCustomLanguage(b))
  );

  return [...predefined, ...custom];
}

// Default locale for the platform
export const DEFAULT_LOCALE = "en";

/**
 * Extracts the default locale code from a locales array.
 * Works with both EpisodeLocale and StoryLocale (same shape).
 * Falls back to DEFAULT_LOCALE ("en") if no default locale is found.
 */
export function getDefaultLocaleCode(
  locales?: { code: string; default: boolean }[]
): string {
  return locales?.find((l) => l.default)?.code || DEFAULT_LOCALE;
}

/**
 * Construct a locale-aware hashBlockId.
 * Default locale keeps the original hashBlockId.
 * Non-default locales append `_{locale}` suffix.
 */
export function constructLocaleHashBlockId(
  hashBlockId: string,
  locale: string,
  defaultLocale?: string
): string {
  if (defaultLocale && locale === defaultLocale) return hashBlockId;
  return `${hashBlockId}_${locale}`;
}

// Convert AVAILABLE_LANGUAGES to MultiSelect options format
export const LANGUAGE_OPTIONS = AVAILABLE_LANGUAGES.filter(
  (lang) => lang.code !== "other"
).map((lang) => ({
  value: lang.code,
  label: lang.label,
  description: lang.nativeName,
}));

export const SORTED_LANGUAGE_OPTIONS = [...LANGUAGE_OPTIONS].sort((a, b) =>
  a.label.localeCompare(b.label)
);
