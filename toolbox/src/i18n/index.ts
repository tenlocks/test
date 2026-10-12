import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

// `?lang=zh` in the URL wins, then the browser language; English is the fallback.
const fromUrl = new URLSearchParams(window.location.search).get("lang");
const fromBrowser = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh } },
  lng: fromUrl === "zh" || fromUrl === "en" ? fromUrl : fromBrowser,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
