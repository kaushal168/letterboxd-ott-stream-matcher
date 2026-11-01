export const normalizeProvider = (name: string): string => {
  const lower = name.toLowerCase().trim();
  
  // 1. Highly specific platform variants (USA / UK)
  if (lower.includes("hbo") || lower.includes("max")) return "Max (HBO)";
  if (lower.includes("paramount")) return "Paramount+";
  if (lower.includes("amc")) return "AMC+";
  if (lower.includes("peacock")) return "Peacock";
  if (lower.includes("mgm")) return "MGM+";
  if (lower.includes("shudder")) return "Shudder";
  if (lower.includes("bfi player")) return "BFI Player";
  if (lower.includes("now tv")) return "Now TV";
  
  // 2. Global / Broad Platforms
  if (lower.includes("prime video")) return "Amazon Prime Video";
  if (lower.includes("apple tv")) return "Apple TV";
  if (lower.includes("netflix")) return "Netflix";
  if (lower.includes("hulu")) return "Hulu";
  if (lower.includes("fubo") || lower.includes("fubotv")) return "fuboTV";
  if (lower.includes("roku")) return "The Roku Channel";
  if (lower.includes("mubi")) return "MUBI";
  if (lower.includes("crunchyroll")) return "Crunchyroll";
  
  // 3. India Specific
  if (lower.includes("lionsgate")) return "Lionsgate Play";
  if (lower.includes("sony pictures") || lower.includes("sonypictures") || lower.includes("sony liv")) return "Sony LIV";
  if (lower.includes("hotstar") || lower.includes("jio")) return "JioHotstar";

  return name;
};

export const LANGUAGE_MAP: Record<string, string> = {
  en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", ml: "Malayalam", 
  kn: "Kannada", mr: "Marathi", gu: "Gujarati", bn: "Bengali", pa: "Punjabi",
  ja: "Japanese", ko: "Korean", zh: "Chinese", ca: "Cantonese", cn: "Cantonese",
  fr: "French", es: "Spanish", it: "Italian", de: "German", ru: "Russian",
  pt: "Portuguese", ar: "Arabic", fa: "Farsi", ur: "Urdu", th: "Thai",
  id: "Indonesian", tr: "Turkish", nl: "Dutch", sv: "Swedish", no: "Norwegian",
  da: "Danish", fi: "Finnish", pl: "Polish", hu: "Hungarian", cs: "Czech",
  ro: "Romanian", uk: "Ukrainian", vi: "Vietnamese", tl: "Tagalog"
};

export const getLanguageName = (code: string) => {
  return LANGUAGE_MAP[code.toLowerCase()] || code.toUpperCase();
};