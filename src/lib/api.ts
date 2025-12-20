export type CameraFeature = {
  id: string;
  geometry?: { coordinates?: number[] };
  properties: {
    name: string;
    municipality?: string;
    presets?: any[];
  };
};

export type WeatherData = {
  temperatureC?: number;
  windSpeedMs?: number;
  observationTime?: string;
  source?: "yr" | "open-meteo";
};

type Preset = {
  id: string;
  imageUrl?: string;
};

type HistoryEntry = {
  lastModified: string;
};

export type StationDetail = {
  id: string;
  presets?: Preset[];
  properties?: {
    name?: string;
    municipality?: string;
  };
};

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE = "https://tie.digitraffic.fi/api/weathercam/v1";
const DIGITRAFFIC_USER = "krugou/TieliikenneVideoWall 1.0";
const CACHE_PREFIX = "tieliikenne_cache_v2";
const DEFAULT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const YR_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const isDev =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;

const getLocalCache = <T>(key: string) => {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}:${key}`);
    if (!raw) {
      if (isDev) console.debug(`[api/cache] miss: ${key}`);
      return null;
    }
    const parsed = JSON.parse(raw) as { ts: number; ttl: number; value: T };
    const age = Date.now() - parsed.ts;
    if (age > (parsed.ttl ?? DEFAULT_CACHE_TTL_MS)) {
      if (isDev)
        console.debug(
          `[api/cache] expired: ${key} age=${age}ms ttl=${parsed.ttl}`,
        );
      localStorage.removeItem(`${CACHE_PREFIX}:${key}`);
      return null;
    }
    if (isDev) console.debug(`[api/cache] hit: ${key} age=${age}ms`);
    return parsed.value;
  } catch (ex) {
    if (isDev) console.warn("[api/cache] read error", key, ex);
    return null;
  }
};

const setLocalCache = <T>(
  key: string,
  value: T,
  ttl = DEFAULT_CACHE_TTL_MS,
) => {
  try {
    const str = JSON.stringify({ ts: Date.now(), ttl, value });
    localStorage.setItem(`${CACHE_PREFIX}:${key}`, str);
    if (isDev)
      console.debug(`[api/cache] set: ${key} size=${str.length} ttl=${ttl}`);
  } catch (ex) {
    if (isDev) console.warn("[api/cache] write error", key, ex);
    // ignore quota errors
  }
};

const safeJson = async <T>(res: Response) => {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

const fetchWithSignal = async (url: string, opts: RequestInit = {}) => {
  const start = Date.now();
  if (isDev) console.debug("[api/fetch] start", url, opts.method ?? "GET");
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      Accept: "application/json",
      "Digitraffic-User": DIGITRAFFIC_USER,
    },
  });
  const time = Date.now() - start;
  if (!res.ok) {
    if (isDev)
      console.warn(
        `[api/fetch] ${res.status} ${res.statusText} ${url} (${time}ms)`,
      );
    if (res.status === 429) throw new ApiError("Rate limited", 429);
    throw new ApiError(`HTTP ${res.status}`, res.status);
  }
  if (isDev) console.debug(`[api/fetch] ok ${res.status} ${url} (${time}ms)`);
  return res;
};

// ---- Yr.no (MET Norway) Locationforecast ----

type YrCompactResponse = {
  properties?: {
    timeseries?: Array<{
      time?: string;
      data?: {
        instant?: {
          details?: {
            air_temperature?: number;
            wind_speed?: number;
          };
        };
      };
    }>;
  };
};

const YR_BASE = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const yrInFlight = new Map<string, Promise<WeatherData | null>>();

export const fetchYrWeatherForCamera = async (args: {
  coordinates?: number[]; // Digitraffic cameras: [lon, lat]
  signal?: AbortSignal;
}): Promise<WeatherData | null> => {
  const { coordinates, signal } = args;
  if (!coordinates || coordinates.length < 2) return null;

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  // Quantize to reduce cache fragmentation.
  const keyLat = lat.toFixed(3);
  const keyLon = lon.toFixed(3);
  const cacheKey = `yr:compact:${keyLat},${keyLon}`;
  const cached = getLocalCache<WeatherData>(cacheKey);
  if (cached) return cached;

  const inflight = yrInFlight.get(cacheKey);
  if (inflight) return inflight;

  const p = (async () => {
    const url = `${YR_BASE}?lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(String(lon))}`;
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: "application/json",
        // Note: browsers do not allow setting the User-Agent header.
      },
    });
    if (!res.ok) return null;

    const data = (await safeJson<YrCompactResponse>(res)) ?? undefined;
    const series = data?.properties?.timeseries ?? [];
    const ts = series.find((x) => {
      const d = x?.data?.instant?.details;
      return typeof d?.air_temperature === "number";
    });
    const details = ts?.data?.instant?.details;

    const temp = details?.air_temperature;
    if (typeof temp !== "number" || !Number.isFinite(temp)) return null;

    const out: WeatherData = {
      source: "yr",
      observationTime: ts?.time,
      temperatureC: temp,
      windSpeedMs: details?.wind_speed,
    };

    setLocalCache(cacheKey, out, YR_CACHE_TTL_MS);
    return out;
  })().finally(() => {
    yrInFlight.delete(cacheKey);
  });

  yrInFlight.set(cacheKey, p);
  return p;
};

// ---- Open-Meteo fallback (CORS-friendly) ----

type OpenMeteoCurrentResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    wind_speed_10m?: number;
  };
};

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const openMeteoInFlight = new Map<string, Promise<WeatherData | null>>();

export const fetchOpenMeteoWeatherForCamera = async (args: {
  coordinates?: number[]; // [lon, lat]
  signal?: AbortSignal;
}): Promise<WeatherData | null> => {
  const { coordinates, signal } = args;
  if (!coordinates || coordinates.length < 2) return null;

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const keyLat = lat.toFixed(3);
  const keyLon = lon.toFixed(3);
  const cacheKey = `open-meteo:current:${keyLat},${keyLon}`;
  const cached = getLocalCache<WeatherData>(cacheKey);
  if (cached) return cached;

  const inflight = openMeteoInFlight.get(cacheKey);
  if (inflight) return inflight;

  const p = (async () => {
    const url =
      `${OPEN_METEO_BASE}` +
      `?latitude=${encodeURIComponent(String(lat))}` +
      `&longitude=${encodeURIComponent(String(lon))}` +
      `&current=temperature_2m,wind_speed_10m` +
      `&wind_speed_unit=ms` +
      `&timezone=UTC`;

    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await safeJson<OpenMeteoCurrentResponse>(res)) ?? undefined;
    const temp = data?.current?.temperature_2m;
    if (typeof temp !== "number" || !Number.isFinite(temp)) return null;

    const out: WeatherData = {
      source: "open-meteo",
      observationTime: data?.current?.time,
      temperatureC: temp,
      windSpeedMs: data?.current?.wind_speed_10m,
    };

    setLocalCache(cacheKey, out, YR_CACHE_TTL_MS);
    return out;
  })().finally(() => {
    openMeteoInFlight.delete(cacheKey);
  });

  openMeteoInFlight.set(cacheKey, p);
  return p;
};

// Preferred weather fetch: try Yr first, then fall back.
export const fetchWeatherForCamera = async (args: {
  coordinates?: number[];
  signal?: AbortSignal;
}): Promise<WeatherData | null> => {
  const yr = await fetchYrWeatherForCamera(args);
  if (yr?.temperatureC !== undefined) return yr;
  return fetchOpenMeteoWeatherForCamera(args);
};

// simple concurrency pool to avoid spamming the API with many parallel requests
const promisePool = async <T, R>(
  items: T[],
  worker: (i: T) => Promise<R>,
  concurrency = 6,
) => {
  if (isDev)
    console.debug(
      `[api/pool] start workers=${concurrency} items=${items.length}`,
    );
  const out: R[] = [];
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      if (isDev) console.debug(`[api/pool] worker start item=${idx}`);

      out[idx] = await worker(items[idx]!);
      if (isDev) console.debug(`[api/pool] worker done item=${idx}`);
    }
  };
  const workers = Array.from({
    length: Math.min(concurrency, items.length),
  }).map(() => run());
  await Promise.all(workers);
  if (isDev) console.debug(`[api/pool] complete`);
  return out;
};

const fetchLatestHistory = async (stationId: string, signal?: AbortSignal) => {
  const start = Date.now();
  try {
    if (isDev) console.debug(`[api/history] fetch ${stationId}`);
    const res = await fetch(`${API_BASE}/stations/${stationId}/history`, {
      signal,
      headers: {
        Accept: "application/json",
        "Digitraffic-User": DIGITRAFFIC_USER,
      },
    });
    const elapsed = Date.now() - start;
    if (!res.ok) {
      if (isDev)
        console.warn(`[api/history] ${stationId} ${res.status} (${elapsed}ms)`);
      if (res.status === 429) throw new ApiError("Rate limited", 429);
      return { latestModified: null };
    }
    const data = await safeJson<{ presets?: { history?: HistoryEntry[] }[] }>(
      res,
    );
    const history = data?.presets?.[0]?.history || [];
    if (history.length === 0) {
      if (isDev)
        console.debug(`[api/history] ${stationId} no history (${elapsed}ms)`);
      return { latestModified: null };
    }

    const latest = history.reduce((prev, curr) =>
      new Date(curr.lastModified) > new Date(prev.lastModified) ? curr : prev,
    );
    if (isDev)
      console.debug(
        `[api/history] ${stationId} latest=${latest.lastModified} (${elapsed}ms)`,
      );
    return { latestModified: latest.lastModified as string };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isDev) console.warn(`[api/history] ${stationId} error`, err);
    return { latestModified: null };
  }
};

export const defaultCities = ["vantaa", "espoo", "helsinki"];

// Available Finnish cities with traffic cameras
export const availableCities = [
  "helsinki",
  "espoo",
  "vantaa",
  "tampere",
  "turku",
  "oulu",
  "jyväskylä",
  "lahti",
  "kuopio",
  "pori",
  "kouvola",
  "joensuu",
  "lappeenranta",
  "hämeenlinna",
  "vaasa",
  "seinäjoki",
  "rovaniemi",
  "mikkeli",
  "kotka",
  "salo",
  "porvoo",
  "kokkola",
  "hyvinkää",
  "nurmijärvi",
  "järvenpää",
  "rauma",
  "tuusula",
  "kirkkonummi",
  "kajaani",
  "kerava",
  "nokia",
  "ylöjärvi",
  "kangasala",
];

export const fetchStations = async (
  cityOrCities?: string | string[],
  opts?: {
    signal?: AbortSignal;
    refreshTick?: number; // used to bust the local cache between forced refreshes
    concurrency?: number;
    cacheTtlMs?: number;
  },
) => {
  const start = Date.now();
  const { signal, refreshTick = 0, concurrency = 6, cacheTtlMs } = opts ?? {};
  if (isDev)
    console.info(
      `[api/stations] start (cities=${
        cityOrCities ?? "all"
      }) tick=${refreshTick}`,
    );

  const cities =
    typeof cityOrCities === "string"
      ? cityOrCities
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : Array.isArray(cityOrCities)
        ? cityOrCities.map((s) => s.trim().toLowerCase()).filter(Boolean)
        : [];

  // cache key takes into account selected cities and refresh tick
  const cacheKey = `stations:${cities.join(",") || "all"}:tick:${refreshTick}`;
  const cached = getLocalCache<any[]>(cacheKey);
  if (cached) {
    if (isDev)
      console.info(
        `[api/stations] cache hit key=${cacheKey} items=${cached.length}`,
      );
    return cached;
  }
  if (isDev) console.info(`[api/stations] cache miss key=${cacheKey}`);

  try {
    const res = await fetchWithSignal(`${API_BASE}/stations`, { signal });
    const data = await safeJson<{ features?: CameraFeature[] }>(res);
    const features: CameraFeature[] = data?.features || [];
    if (isDev) console.info(`[api/stations] total features=${features.length}`);

    const filtered = cities.length
      ? features.filter((cam) =>
          cities.some(
            (city) =>
              cam.properties.municipality?.toLowerCase().includes(city) ||
              cam.properties.name.toLowerCase().includes(city),
          ),
        )
      : features;
    if (isDev) console.info(`[api/stations] filtered=${filtered.length}`);

    // counters to report the detailed fetch run
    let detailsSuccess = 0;
    let detailsFail = 0;
    let historySuccess = 0;
    let historyFail = 0;

    // fetch details and history with a concurrency limit
    const detailed = await promisePool(
      filtered,
      async (cam) => {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
          if (isDev)
            console.debug(
              `[api/stations] fetching details for ${cam.id} "${cam.properties.name}"`,
            );
          const detailsRes = await fetchWithSignal(
            `${API_BASE}/stations/${cam.id}`,
            {
              signal,
            },
          );
          const details = await safeJson<StationDetail>(detailsRes);

          const { latestModified } = await fetchLatestHistory(cam.id, signal);
          if (latestModified) historySuccess += 1;
          else historyFail += 1;

          // derive preset id from details first, then from feature properties as fallback
          const presetId =
            details?.presets?.[0]?.id ?? cam.properties?.presets?.[0]?.id;
          const imageUrl =
            presetId !== undefined && presetId !== null
              ? `https://weathercam.digitraffic.fi/${presetId}.jpg`
              : details?.presets?.[0]?.imageUrl || undefined;

          if (isDev)
            console.debug(
              `[api/stations] ${cam.id} details=${
                details ? "ok" : "null"
              } imageUrl=${!!imageUrl} latestModified=${latestModified}`,
            );

          detailsSuccess += 1;
          return { cam, details, latestModified, imageUrl };
        } catch (err) {
          detailsFail += 1;
          if (err instanceof ApiError) {
            if (isDev)
              console.error(
                `[api/stations] ${cam.id} ApiError`,
                err.status,
                err.message,
              );
            throw err;
          }
          if (isDev) console.warn(`[api/stations] ${cam.id} fetch error`, err);
          return {
            cam,
            details: null,
            latestModified: null,
            imageUrl: undefined,
          };
        }
      },
      concurrency,
    );

    const elapsed = Date.now() - start;
    if (isDev) {
      console.info(
        `[api/stations] completed features=${features.length} filtered=${filtered.length} detailsSuccess=${detailsSuccess} detailsFail=${detailsFail} historySuccess=${historySuccess} historyFail=${historyFail} elapsed=${elapsed}ms`,
      );
    }

    setLocalCache(cacheKey, detailed, cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
    return detailed;
  } catch (err) {
    if (err instanceof ApiError) {
      if (isDev)
        console.error("[api/stations] ApiError", err.status, err.message);
      throw err;
    }
    if (isDev) console.error("[api/stations] unexpected error", err);
    console.error("fetchStations error", err);
    return [];
  }
};

export const isRecent = (latestModified?: string | null) => {
  if (!latestModified) return false;
  const ts = new Date(latestModified).getTime();
  if (Number.isNaN(ts)) return false;
  const now = Date.now();
  const diffMs = now - ts;
  return diffMs <= 60 * 60 * 1000; // <= 1 hour
};
