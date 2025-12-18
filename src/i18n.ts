import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "tieliikenne_lang";

const supportedLanguages = ["fi", "sv", "en"] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

const normalizeLanguage = (value: string | null | undefined): AppLanguage => {
  const v = (value ?? "").toLowerCase();
  if (v.startsWith("fi")) return "fi";
  if (v.startsWith("sv")) return "sv";
  if (v.startsWith("en")) return "en";
  return "en";
};

export const getAppLanguage = (): AppLanguage => {
  const storedRaw =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (storedRaw) return normalizeLanguage(storedRaw);
  const nav = normalizeLanguage(
    typeof navigator !== "undefined" ? navigator.language : ""
  );
  return nav;
};

export const setAppLanguage = async (lng: AppLanguage) => {
  localStorage.setItem(STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
};

export const getLocale = (lng: string): string => {
  const n = normalizeLanguage(lng);
  if (n === "fi") return "fi-FI";
  if (n === "sv") return "sv-SE";
  return "en-GB";
};

const resources = {
  en: {
    translation: {
      app: {
        title: "Traffic Camera Video Wall",
        cameras: "{{count}} cameras",
        nextReload: "Next reload: {{time}}",
        showLabels: "Show labels",
        refresh: "Refresh",
        refreshNow: "Refresh now",
        loadingCameras: "Loading cameras...",
        settings: "Settings",
        map: "Map",
        showMap: "Show camera locations on map",
      },
      city: {
        addPlaceholder: "Add cities (comma separated)",
        addAria: "Add cities",
        toggleTitle: "Toggle {{city}}",
        showMore: "+ More",
        showLess: "− Less",
      },
      settings: {
        title: "My cities",
        intro:
          "Choose which cities you want to follow. You can change this later from Settings.",
        save: "Save",
        open: "Open settings",
      },
      camera: {
        updatedRecentTitle: "Updated < 1h",
        lastLabel: "Last: {{time}}",
        noImage: "No image",
      },
      modal: {
        lastUpdated: "Last updated: {{time}}",
        close: "Close",
      },
      map: {
        title: "Camera Locations",
        cameraCount: "Showing {{count}} cameras",
      },
      rateLimit: {
        banner: "API rate-limited. Retrying in {{time}}",
        retryNow: "Retry now",
      },
      weather: {
        compactTemp: "{{temp}}°C",
        compactTempWind: "{{temp}}°C · {{wind}} m/s",
        title: "Weather observation {{time}} ({{distance}} km)",
        titleSimple: "Weather forecast {{time}}",
      },
    },
  },
  fi: {
    translation: {
      app: {
        title: "Tieliikennevideoseinä",
        cameras: "{{count}} kameraa",
        nextReload: "Seuraava päivitys: {{time}}",
        showLabels: "Näytä tekstit",
        refresh: "Päivitä",
        refreshNow: "Päivitä nyt",
        loadingCameras: "Ladataan kameroita...",
        settings: "Asetukset",
        map: "Kartta",
        showMap: "Näytä kamerasijainnit kartalla",
      },
      city: {
        addPlaceholder: "Lisää kaupunkeja (pilkuilla eroteltuna)",
        addAria: "Lisää kaupunkeja",
        toggleTitle: "Vaihda {{city}}",
        showMore: "+ Lisää",
        showLess: "− Vähemmän",
      },
      settings: {
        title: "Omat kaupungit",
        intro:
          "Valitse kaupungit, joiden kameroita haluat seurata. Voit muuttaa valintaa myöhemmin asetuksista.",
        save: "Tallenna",
        open: "Avaa asetukset",
      },
      camera: {
        updatedRecentTitle: "Päivitetty < 1 h",
        lastLabel: "Viimeisin: {{time}}",
        noImage: "Ei kuvaa",
      },
      modal: {
        lastUpdated: "Viimeksi päivitetty: {{time}}",
        close: "Sulje",
      },
      map: {
        title: "Kamerasijainnit",
        cameraCount: "Näytetään {{count}} kameraa",
      },
      rateLimit: {
        banner:
          "API-rajapinta rajoittaa. Yritetään uudelleen {{time}} kuluttua",
        retryNow: "Yritä nyt",
      },
      weather: {
        compactTemp: "{{temp}}°C",
        compactTempWind: "{{temp}}°C · {{wind}} m/s",
        title: "Säähavainto {{time}} ({{distance}} km)",
        titleSimple: "Sääennuste {{time}}",
      },
    },
  },
  sv: {
    translation: {
      app: {
        title: "Trafikkamera-videovägg",
        cameras: "{{count}} kameror",
        nextReload: "Nästa omladdning: {{time}}",
        showLabels: "Visa etiketter",
        refresh: "Uppdatera",
        refreshNow: "Uppdatera nu",
        loadingCameras: "Laddar kameror...",
        settings: "Inställningar",
        map: "Karta",
        showMap: "Visa kamerapositioner på kartan",
      },
      city: {
        addPlaceholder: "Lägg till städer (komma-separerat)",
        addAria: "Lägg till städer",
        toggleTitle: "Växla {{city}}",
        showMore: "+ Mer",
        showLess: "− Mindre",
      },
      settings: {
        title: "Mina städer",
        intro:
          "Välj vilka städer du vill följa. Du kan ändra detta senare i Inställningar.",
        save: "Spara",
        open: "Öppna inställningar",
      },
      camera: {
        updatedRecentTitle: "Uppdaterad < 1 h",
        lastLabel: "Senast: {{time}}",
        noImage: "Ingen bild",
      },
      modal: {
        lastUpdated: "Senast uppdaterad: {{time}}",
        close: "Stäng",
      },
      map: {
        title: "Kamerapositioner",
        cameraCount: "Visar {{count}} kameror",
      },
      rateLimit: {
        banner: "API hastighetsbegränsad. Försöker igen om {{time}}",
        retryNow: "Försök nu",
      },
      weather: {
        compactTemp: "{{temp}}°C",
        compactTempWind: "{{temp}}°C · {{wind}} m/s",
        title: "Väderobservation {{time}} ({{distance}} km)",
        titleSimple: "Väderprognos {{time}}",
      },
    },
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: getAppLanguage(),
  fallbackLng: "en",
  supportedLngs: supportedLanguages as unknown as string[],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
