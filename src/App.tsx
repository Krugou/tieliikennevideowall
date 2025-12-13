import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CameraTile from './components/CameraTile';
import CitySelector from './components/CitySelector';
import { fetchStations, defaultCities, CameraFeature, ApiError } from './lib/api';

type StationItem = {
  cam: CameraFeature;
  details: unknown;
  latestModified: string | null;
  imageUrl?: string;
};

const App: React.FC = () => {
  const searchParams = new URL(window.location.href).searchParams;
  const queryCities = searchParams.get('cities') || searchParams.get('city') || '';
  const initialCities =
    queryCities.trim().length > 0
      ? queryCities
          .split(',')
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
  const [nextForceRefreshAt, setNextForceRefreshAt] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const rateLimitAttemptsRef = useRef(0);

  const clearAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const load = useCallback(
    async ({ force = false } = {}) => {
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
          const backoffMs = Math.min(10 * 60 * 1000, 60000 * 2 ** (rateLimitAttemptsRef.current - 1));
          setRateLimited(true);
          setRetryAt(Date.now() + backoffMs);
          // schedule retry
          setTimeout(() => {
            if (!abort.signal.aborted) load({ force: true });
          }, backoffMs);
        } else if ((err as DOMException)?.name === 'AbortError') {
          // ignore user-initiated abort
        } else {
          console.error('Error loading stations', err);
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedCities, refreshTick]
  );

  // keep URL in sync
  useEffect(() => {
    // keep URL query param in sync
    const params = new URL(window.location.href);
    if (selectedCities.length) {
      params.searchParams.set('cities', selectedCities.join(','));
    } else {
      params.searchParams.delete('cities');
    }
    const newUrl = params.toString();
    window.history.replaceState(null, '', newUrl);
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
    load({ force: true });
  };

  const gridCols = useMemo(() => {
    // Simple heuristic: more items -> more columns
    const count = items.length;
    if (count >= 24) return 'grid-cols-6';
    if (count >= 16) return 'grid-cols-5';
    if (count >= 12) return 'grid-cols-4';
    if (count >= 8) return 'grid-cols-3';
    return 'grid-cols-2';
  }, [items.length]);

  // time display for header
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // small helper to format mm:ss
  const formatMs = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const cameraCount = items.length;

  const nextRefreshRemaining = nextForceRefreshAt ? Math.max(0, nextForceRefreshAt - now) : null;

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white">
      <header className="p-3 bg-transparent flex items-center gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Tieliikenne Video Wall</h1>
          <div className="text-xs opacity-80">{new Date(now).toLocaleString()}</div>
          <div className="ml-2 text-xs bg-white/5 px-2 py-1 rounded">{cameraCount} cameras</div>
          {nextRefreshRemaining !== null && (
            <div className="ml-2 text-xs bg-blue-600/10 px-2 py-1 rounded text-blue-200">
              Next reload: {formatMs(nextRefreshRemaining)}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <CitySelector selectedCities={selectedCities} onChange={(c) => setSelectedCities(c)} />
          <label className="inline-flex items-center gap-2 ml-2 text-xs">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Show labels
          </label>

          <button
            title="Refresh now"
            aria-label="Refresh now"
            className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/10"
            onClick={manualRefresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </header>

      {rateLimited && (
        <div className="m-2 p-2 bg-yellow-600/20 border border-yellow-500 text-yellow-100 text-sm rounded flex items-center justify-between">
          <div>
            API rate-limited. Retrying in {retryAt ? formatMs(Math.max(0, retryAt - Date.now())) : '...'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                rateLimitAttemptsRef.current = 0;
                manualRefresh();
              }}
              className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20"
            >
              Retry now
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto p-2">
        {loading && (
          <div className="p-2 text-neutral-300 text-sm">Loading cameras...</div>
        )}

        <div className={`grid ${gridCols} gap-2 p-2 auto-rows-[220px] md:auto-rows-[260px] lg:auto-rows-[320px]`}>
          {items.map(({ cam, latestModified, imageUrl }) => (
            <CameraTile
              key={cam.id}
              name={cam.properties?.name || `Camera ${cam.id}`}
              municipality={cam.properties?.municipality}
              imageUrl={imageUrl}
              latestModified={latestModified}
              showLabels={showLabels}
              cacheBuster={refreshTick}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
