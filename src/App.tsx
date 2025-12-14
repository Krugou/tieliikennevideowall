import React, { useCallback, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import CameraTile from "./components/CameraTile";
import CitySelector from "./components/CitySelector";
import Modal from "./components/Modal";
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

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const searchParams = new URL(window.location.href).searchParams;
  const queryCities =
    searchParams.get("cities") || searchParams.get("city") || "";
  const initialCities =
    queryCities.trim().length > 0
      ? queryCities
          .split(",")
          .map((c) => c.trim().toLowerCase())
          .filter(Boolean)
      : defaultCities;

  const [selectedCities, setSelectedCities] = useState<string[]>(initialCities);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StationItem[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  // new: state for forced 30 minute refresh
  const [refreshTick, setRefreshTick] = useState(0);
  const [nextForceRefreshAt, setNextForceRefreshAt] = useState<number | null>(
    null
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
          60000 * 2 ** (rateLimitAttemptsRef.current - 1)
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
      interval = setInterval(() => load(), 5 * 60 * 1000);
    };
    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      clearAbort();
    };
  }, [load]);

  // schedule 30 minute forced refresh after a successful load, reset when refreshTick changes
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const refreshMs = 30 * 60 * 1000;
      setNextForceRefreshAt(Date.now() + refreshMs);
      timer = setTimeout(() => {
        setRefreshTick((t) => t + 1); // force cache bust
      }, refreshMs);
    };

    // skip scheduling while loading or no cameras found
    if (!loading && items.length > 0) schedule();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [items, loading, refreshTick]);

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

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white">
      <header className="p-3 bg-transparent flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
          <h1 className="text-lg font-semibold">{t("app.title")}</h1>
          <div className="text-xs opacity-80 md:ml-2">
            {new Date(now).toLocaleString(locale)}
          </div>
          <div className="ml-0 sm:ml-2 text-xs bg-white/5 px-2 py-1 rounded">
            {t("app.cameras", { count: cameraCount })}
          </div>
          {nextRefreshRemaining !== null && (
            <div className="ml-2 text-xs bg-blue-600/10 px-2 py-1 rounded text-blue-200">
              {t("app.nextReload", { time: formatMs(nextRefreshRemaining) })}
            </div>
          )}
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2 justify-between">
          <div className="flex-1 sm:flex-none">
            <CitySelector
              selectedCities={selectedCities}
              onChange={(c) => setSelectedCities(c)}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <select
              className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/10"
              value={i18n.language}
              aria-label="Language"
              onChange={(e) => {
                setAppLanguage(e.target.value as "fi" | "sv" | "en");
              }}
            >
              <option value="fi">FI</option>
              <option value="sv">SV</option>
              <option value="en">EN</option>
            </select>

            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              <span className="hidden sm:inline">{t("app.showLabels")}</span>
            </label>

            <button
              title={t("app.refreshNow")}
              aria-label={t("app.refreshNow")}
              className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/10"
              onClick={manualRefresh}
              disabled={loading}
            >
              {t("app.refresh")}
            </button>
          </div>
        </div>
      </header>

      {rateLimited && (
        <div className="m-2 p-2 bg-yellow-600/20 border border-yellow-500 text-yellow-100 text-sm rounded flex items-center justify-between">
          <div>
            {t("rateLimit.banner", {
              time: retryAt
                ? formatMs(Math.max(0, retryAt - Date.now()))
                : "...",
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                rateLimitAttemptsRef.current = 0;
                manualRefresh();
              }}
              className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20"
            >
              {t("rateLimit.retryNow")}
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto p-2">
        {loading && (
          <div className="p-2 text-neutral-300 text-sm">
            {t("app.loadingCameras")}
          </div>
        )}

        {/* grid: 1..5 columns responsive; use group to allow hover effects that shrink other tiles */}
        <div className="group grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 p-2">
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
          <div className="w-full max-w-[1200px] max-h-[90vh] overflow-auto rounded-md bg-neutral-900 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {selectedItem.imageUrl ? (
                  <div className="w-full aspect-[16/10] bg-neutral-950 rounded overflow-hidden">
                    <img
                      src={`${selectedItem.imageUrl}${
                        selectedItem.imageUrl.includes("?") ? "&" : "?"
                      }_cb=${refreshTick}`}
                      alt={selectedItem.cam.properties?.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-[60vh] flex items-center justify-center bg-neutral-800 text-neutral-400 rounded">
                    {t("camera.noImage")}
                  </div>
                )}
              </div>
              <div className="w-64 flex-none text-sm">
                <div className="font-semibold text-lg mb-2">
                  {selectedItem.cam.properties?.name}
                </div>
                {selectedItem.cam.properties?.municipality && (
                  <div className="opacity-80 mb-2">
                    {selectedItem.cam.properties.municipality}
                  </div>
                )}
                {selectedItem.latestModified && (
                  <div className="opacity-70 text-xs">
                    {t("modal.lastUpdated", {
                      time: new Date(
                        selectedItem.latestModified
                      ).toLocaleString(locale),
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default App;
