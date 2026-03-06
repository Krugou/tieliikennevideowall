import React, { useCallback, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import CameraTile from "./components/CameraTile";
import CitySelector from "./components/CitySelector";
import Modal from "./components/Modal";
import MapModal from "./components/MapModal";
import {
  fetchStations,
  defaultCities,
  CameraFeature,
  ApiError,
} from "./lib/api";
import { getLocale, setAppLanguage } from "./i18n";

type StationItem = {
  cam: CameraFeature;
  details: unknown;
  latestModified: string | null;
  imageUrl?: string;
};

const MY_CITIES_KEY = "tieliikenne_my_cities_v1";
const ONBOARDED_KEY = "tieliikenne_onboarded_v1";

const parseCitiesCsv = (raw: string) =>
  raw
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

const readStoredCities = (): string[] | null => {
  try {
    const raw = localStorage.getItem(MY_CITIES_KEY);
    if (!raw) return null;
    const arr = parseCitiesCsv(raw);
    return arr.length ? arr : null;
  } catch {
    return null;
  }
};

const hasCompletedOnboarding = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
};

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const searchParams = new URL(window.location.href).searchParams;
  const queryCities =
    searchParams.get("cities") || searchParams.get("city") || "";

  const storedCities =
    queryCities.trim().length > 0 ? null : readStoredCities();
  const initialCities =
    queryCities.trim().length > 0
      ? parseCitiesCsv(queryCities)
      : (storedCities ?? defaultCities);

  const shouldOnboard =
    queryCities.trim().length === 0 &&
    storedCities == null &&
    !hasCompletedOnboarding();

  // Parse reload intervals from URL params (in minutes)
  const reloadParam = searchParams.get("reload");
  const forceReloadParam = searchParams.get("forceReload");
  const parsedReload = reloadParam ? parseInt(reloadParam, 10) : null;
  const parsedForceReload = forceReloadParam
    ? parseInt(forceReloadParam, 10)
    : null;
  // Validate that parsed values are positive numbers, fallback to defaults
  const reloadIntervalMs =
    parsedReload && parsedReload > 0 ? parsedReload * 60 * 1000 : 5 * 60 * 1000;
  const forceReloadIntervalMs =
    parsedForceReload && parsedForceReload > 0
      ? parsedForceReload * 60 * 1000
      : 30 * 60 * 1000;

  // Parse showMenu param (default: true)
  const showMenuParam = searchParams.get("showMenu");
  const showMenu =
    showMenuParam === null || showMenuParam.toLowerCase() !== "false";

  const [selectedCities, setSelectedCities] = useState<string[]>(initialCities);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StationItem[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState<boolean>(shouldOnboard);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(shouldOnboard);
  const [mapOpen, setMapOpen] = useState<boolean>(false);

  // Persist user preference once onboarding is complete.
  useEffect(() => {
    if (isOnboarding) return;
    try {
      localStorage.setItem(MY_CITIES_KEY, selectedCities.join(","));
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // ignore
    }
  }, [isOnboarding, selectedCities]);

  // new: state for forced 30 minute refresh
  const [refreshTick, setRefreshTick] = useState(0);
  const [nextForceRefreshAt, setNextForceRefreshAt] = useState<number | null>(
    null,
  );

  const [selectedItem, setSelectedItem] = useState<StationItem | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const rateLimitAttemptsRef = useRef(0);

  const clearAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const load = useCallback(async () => {
    clearAbort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLoading(true);
    try {
      const data = await fetchStations(selectedCities, {
        signal: abort.signal,
        refreshTick: refreshTick,
        concurrency: 6,
      });
      setItems(data);
      setRateLimited(false);
      setRetryAt(null);
      rateLimitAttemptsRef.current = 0;
      // schedule next forced refresh (reset timer in effect below)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        // exponential backoff: 1m, 2m, 4m, up to 10m
        rateLimitAttemptsRef.current += 1;
        const backoffMs = Math.min(
          10 * 60 * 1000,
          60000 * 2 ** (rateLimitAttemptsRef.current - 1),
        );
        setRateLimited(true);
        setRetryAt(Date.now() + backoffMs);
        // schedule retry
        setTimeout(() => {
          if (!abort.signal.aborted) load();
        }, backoffMs);
      } else if ((err as DOMException)?.name === "AbortError") {
        // ignore user-initiated abort
      } else {
        console.error("Error loading stations", err);
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCities, refreshTick]);

  // keep URL in sync
  useEffect(() => {
    // keep URL query param in sync
    const params = new URL(window.location.href);
    if (selectedCities.length) {
      params.searchParams.set("cities", selectedCities.join(","));
    } else {
      params.searchParams.delete("cities");
    }
    const newUrl = params.toString();
    window.history.replaceState(null, "", newUrl);
  }, [selectedCities]);

  // initial load + interval load
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = async () => {
      if (cancelled) return;
      await load();
      if (cancelled) return;
      interval = setInterval(() => load(), reloadIntervalMs);
    };
    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      clearAbort();
    };
  }, [load, reloadIntervalMs]);

  // schedule forced refresh after a successful load, reset when refreshTick changes
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      setNextForceRefreshAt(Date.now() + forceReloadIntervalMs);
      timer = setTimeout(() => {
        setRefreshTick((t) => t + 1); // force cache bust
      }, forceReloadIntervalMs);
    };

    // skip scheduling while loading or no cameras found
    if (!loading && items.length > 0) schedule();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [items, loading, refreshTick, forceReloadIntervalMs]);

  const manualRefresh = () => {
    rateLimitAttemptsRef.current = 0;
    setRefreshTick((t) => t + 1);
    setRetryAt(null);
    setRateLimited(false);
    load();
  };

  // row heights for mobile -> desktop
  const locale = getLocale(i18n.language);

  // time display for header
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // small helper to format mm:ss
  const formatMs = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const cameraCount = items.length;

  const nextRefreshRemaining = nextForceRefreshAt
    ? Math.max(0, nextForceRefreshAt - now)
    : null;

  const openModal = (item: StationItem) => {
    setSelectedItem(item);
  };

  const closeModal = () => {
    setSelectedItem(null);
  };

  // close modal with Escape and prevent background scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (selectedItem) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [selectedItem]);

  const saveMyCities = () => {
    try {
      localStorage.setItem(MY_CITIES_KEY, selectedCities.join(","));
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // ignore
    }
    setIsOnboarding(false);
    setSettingsOpen(false);
  };

  const SettingsIcon = (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      className="opacity-90"
    >
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 7.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
      />
    </svg>
  );

  return (
    <div className="h-full w-full flex flex-col bg-finn-bg text-finn-text font-sans">
      {showMenu && (
        <header className="bg-finn-blue text-white shadow-md z-30">
          {/* Row 1: Title + stats — always visible */}
          <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight truncate">
              {t("app.title")}
            </h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-xs bg-white/15 px-1.5 py-0.5 rounded whitespace-nowrap">
                {new Date(now).toLocaleString(locale)}
              </span>
              <span className="text-[10px] sm:text-xs bg-white/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                {t("app.cameras", { count: cameraCount })}
              </span>
              {nextRefreshRemaining !== null && (
                <span className="text-[10px] sm:text-xs bg-white/15 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {t("app.nextReload", {
                    time: formatMs(nextRefreshRemaining),
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: City selector */}
          <div className="px-3 sm:px-4 pb-2">
            <CitySelector
              selectedCities={selectedCities}
              onChange={(c) => setSelectedCities(c)}
            />
          </div>

          {/* Row 3: Action buttons — horizontally scrollable on mobile */}
          <div className="px-3 sm:px-4 pb-2 flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              title={t("app.showMap")}
              aria-label={t("app.showMap")}
              className="shrink-0 px-2.5 py-1.5 text-[11px] sm:text-xs font-medium bg-white/15 hover:bg-white/25 rounded transition-colors inline-flex items-center gap-1"
              onClick={() => setMapOpen(true)}
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"
                />
              </svg>
              {t("app.map")}
            </button>

            <button
              type="button"
              title={t("app.settings")}
              aria-label={t("settings.open")}
              data-testid="settings-button"
              className="shrink-0 px-2.5 py-1.5 text-[11px] sm:text-xs font-medium bg-white/15 hover:bg-white/25 rounded transition-colors inline-flex items-center gap-1"
              onClick={() => setSettingsOpen(true)}
            >
              {SettingsIcon}
              {t("app.settings")}
            </button>

            <select
              className="shrink-0 px-2 py-1.5 text-[11px] sm:text-xs font-medium bg-white/15 border border-white/30 rounded focus:outline-none cursor-pointer"
              value={i18n.language}
              aria-label="Language"
              onChange={(e) =>
                setAppLanguage(e.target.value as "fi" | "sv" | "en")
              }
            >
              <option value="fi" className="text-finn-text bg-white">
                FI
              </option>
              <option value="sv" className="text-finn-text bg-white">
                SV
              </option>
              <option value="en" className="text-finn-text bg-white">
                EN
              </option>
            </select>

            <label className="shrink-0 inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium bg-white/15 px-2 py-1.5 rounded cursor-pointer hover:bg-white/25 transition-colors">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="w-3 h-3 accent-white"
              />
              {t("app.showLabels")}
            </label>

            <button
              title={t("app.refreshNow")}
              aria-label={t("app.refreshNow")}
              className="shrink-0 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold bg-white text-finn-blue rounded hover:bg-finn-bg transition-colors disabled:opacity-50"
              onClick={manualRefresh}
              disabled={loading}
            >
              {t("app.refresh")}
            </button>
          </div>
        </header>
      )}

      {rateLimited && (
        <div className="mx-2 sm:mx-4 mt-2 px-3 py-2 sm:py-3 bg-finn-red text-white rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="font-medium text-xs sm:text-sm">
            {t("rateLimit.banner", {
              time: retryAt
                ? formatMs(Math.max(0, retryAt - Date.now()))
                : "...",
            })}
          </div>
          <button
            onClick={() => manualRefresh()}
            className="text-xs font-semibold bg-white text-finn-red px-3 py-1.5 rounded hover:bg-finn-bg transition-colors shrink-0"
          >
            {t("rateLimit.retryNow")}
          </button>
        </div>
      )}

      <main className="flex-1 overflow-auto p-1.5 sm:p-2 md:p-4 bg-finn-bg">
        {!showMenu && (
          <button
            type="button"
            title={t("app.settings")}
            aria-label={t("settings.open")}
            className="fixed bottom-4 right-4 z-40 bg-finn-blue text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-finn-hover transition-colors"
            onClick={() => setSettingsOpen(true)}
          >
            {SettingsIcon}
          </button>
        )}

        {loading && (
          <div className="p-6 sm:p-8 text-center">
            <div className="inline-block text-sm sm:text-base font-medium text-finn-blue">
              {t("app.loadingCameras")}
            </div>
          </div>
        )}

        {/* Responsive grid: 1→2→3→4→5 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 sm:gap-1.5 md:gap-2">
          {items.map((it) => (
            <CameraTile
              key={it.cam.id}
              name={it.cam.properties?.name || `Camera ${it.cam.id}`}
              municipality={it.cam.properties?.municipality}
              coordinates={it.cam.geometry?.coordinates}
              imageUrl={it.imageUrl}
              latestModified={it.latestModified}
              showLabels={showLabels}
              cacheBuster={refreshTick}
              onClick={() => openModal(it)}
            />
          ))}
        </div>
      </main>

      {selectedItem && (
        <Modal isOpen={true} onClose={closeModal}>
          <div className="w-full max-w-[1200px] max-h-[90vh] overflow-auto bg-white p-3 sm:p-4 md:p-5">
            {/* Stack vertically on mobile, side-by-side on md+ */}
            <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
              <div className="flex-1 min-w-0">
                {selectedItem.imageUrl ? (
                  <div className="w-full aspect-[16/10] bg-finn-bg rounded-sm overflow-hidden">
                    <img
                      src={`${selectedItem.imageUrl}${
                        selectedItem.imageUrl.includes("?") ? "&" : "?"
                      }_cb=${refreshTick}`}
                      alt={selectedItem.cam.properties?.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-[40vh] md:h-[60vh] flex items-center justify-center bg-finn-bg text-finn-muted rounded-sm">
                    {t("camera.noImage")}
                  </div>
                )}
              </div>
              {/* Metadata: inline row on mobile, sidebar on md+ */}
              <div className="md:w-48 lg:w-56 md:flex-none text-sm text-finn-text">
                <div className="font-semibold text-sm sm:text-base mb-0.5">
                  {selectedItem.cam.properties?.name}
                </div>
                {selectedItem.cam.properties?.municipality && (
                  <div className="text-finn-muted text-xs sm:text-sm mb-1">
                    {selectedItem.cam.properties.municipality}
                  </div>
                )}
                {selectedItem.latestModified && (
                  <div className="text-finn-muted text-xs">
                    {t("modal.lastUpdated", {
                      time: new Date(
                        selectedItem.latestModified,
                      ).toLocaleString(locale),
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      <MapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        cameras={items.map((it) => ({
          id: it.cam.id,
          name: it.cam.properties?.name || `Camera ${it.cam.id}`,
          coordinates: it.cam.geometry?.coordinates || [],
          municipality: it.cam.properties?.municipality,
        }))}
      />

      <Modal
        isOpen={settingsOpen}
        onClose={() => {
          // Require a choice on first run.
          if (isOnboarding) return;
          setSettingsOpen(false);
        }}
      >
        <div className="w-full max-w-[900px] bg-white p-4 sm:p-5 md:p-6">
          <div className="mb-4">
            <div className="text-base sm:text-lg font-semibold text-finn-text">
              {t("settings.title")}
            </div>
            <div className="text-xs sm:text-sm text-finn-muted mt-1">
              {t("settings.intro")}
            </div>
          </div>

          <div className="mb-4">
            <CitySelector
              selectedCities={selectedCities}
              onChange={(c) => setSelectedCities(c)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-finn-border">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-finn-text cursor-pointer">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="accent-finn-blue w-4 h-4"
              />
              <span>{t("app.showLabels")}</span>
            </label>

            <div className="flex items-center gap-2">
              {!isOnboarding && (
                <button
                  type="button"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm text-finn-muted border border-finn-border hover:border-finn-sky hover:text-finn-sky transition-colors"
                  onClick={() => setSettingsOpen(false)}
                >
                  {t("modal.close")}
                </button>
              )}
              <button
                type="button"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm font-medium bg-finn-blue text-white hover:bg-finn-hover transition-colors disabled:opacity-50"
                disabled={selectedCities.length === 0}
                onClick={saveMyCities}
              >
                {t("settings.save")}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
