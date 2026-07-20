import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "mr" | "pa" | "ta";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "nav.overview": "Overview",
  "nav.assistant": "AI Assistant",
  "nav.complaints": "Complaints",
  "nav.tickets": "Tickets",
  "nav.appointments": "Service appointments",
  "nav.recommend": "Find a tractor",
  "nav.knowledge": "Knowledge base",
  "nav.users": "Users & roles",
  "nav.diagnose": "Photo diagnosis",
  "nav.analytics": "Analytics",
  "common.signout": "Sign out",
  "common.language": "Language",
  "chat.title": "AI Assistant",
  "chat.subtitle": "Ask by voice or text. Grounded in your product manuals and service knowledge base.",
  "chat.placeholder": "Ask by voice (🎤) or type your question…",
  "chat.voice_on": "Voice on",
  "chat.voice_off": "Voice off",
  "diagnose.title": "Photo-based diagnosis",
  "diagnose.subtitle": "Upload a picture of your tractor or a faulty part. Our AI vision model will identify possible issues.",
  "diagnose.upload": "Upload photo",
  "diagnose.describe": "Describe what's happening (optional)",
  "diagnose.analyze": "Analyze photo",
  "diagnose.result": "Analysis",
  "analytics.title": "Platform analytics",
  "analytics.subtitle": "Live operational KPIs across tickets, appointments, knowledge base and AI usage.",
};

const hi: Dict = {
  "nav.overview": "अवलोकन",
  "nav.assistant": "एआई सहायक",
  "nav.complaints": "शिकायतें",
  "nav.tickets": "टिकट",
  "nav.appointments": "सर्विस अपॉइंटमेंट",
  "nav.recommend": "ट्रैक्टर खोजें",
  "nav.knowledge": "ज्ञान आधार",
  "nav.users": "उपयोगकर्ता",
  "nav.diagnose": "फ़ोटो जांच",
  "nav.analytics": "एनालिटिक्स",
  "common.signout": "साइन आउट",
  "common.language": "भाषा",
  "chat.title": "एआई सहायक",
  "chat.subtitle": "आवाज़ या टेक्स्ट से पूछें। उत्तर आपके मैनुअल पर आधारित हैं।",
  "chat.placeholder": "बोलकर (🎤) या लिखकर पूछें…",
  "chat.voice_on": "आवाज़ चालू",
  "chat.voice_off": "आवाज़ बंद",
  "diagnose.title": "फ़ोटो द्वारा निदान",
  "diagnose.subtitle": "अपने ट्रैक्टर या ख़राब पुर्ज़े की तस्वीर अपलोड करें। एआई संभावित समस्याएँ बताएगा।",
  "diagnose.upload": "फ़ोटो अपलोड",
  "diagnose.describe": "समस्या का विवरण (वैकल्पिक)",
  "diagnose.analyze": "फ़ोटो जांचें",
  "diagnose.result": "विश्लेषण",
  "analytics.title": "प्लेटफ़ॉर्म एनालिटिक्स",
  "analytics.subtitle": "टिकट, अपॉइंटमेंट, ज्ञान आधार और एआई उपयोग के लाइव KPI।",
};

const mr: Dict = { ...hi, "common.language": "भाषा", "chat.title": "एआय सहाय्यक", "diagnose.title": "फोटो निदान", "analytics.title": "प्लॅटफॉर्म ॲनालिटिक्स" };
const pa: Dict = { ...en, "common.language": "ਭਾਸ਼ਾ", "chat.title": "ਏਆਈ ਸਹਾਇਕ", "nav.diagnose": "ਫੋਟੋ ਜਾਂਚ" };
const ta: Dict = { ...en, "common.language": "மொழி", "chat.title": "AI உதவியாளர்", "nav.diagnose": "புகைப்பட ஆய்வு" };

const DICTS: Record<Lang, Dict> = { en, hi, mr, pa, ta };

export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  mr: "मराठी (Marathi)",
  pa: "ਪੰਜਾਬੀ (Punjabi)",
  ta: "தமிழ் (Tamil)",
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ek_lang") as Lang | null;
      if (saved && DICTS[saved]) setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("ek_lang", l); } catch {}
  };

  const t = (key: string) => DICTS[lang][key] ?? DICTS.en[key] ?? key;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { lang: "en" as Lang, setLang: () => {}, t: (k: string) => (en[k] ?? k) };
  return ctx;
}
