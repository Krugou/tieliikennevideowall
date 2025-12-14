import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchFmiWeatherForCamera, FmiWeather, isRecent } from "../lib/api";
import { getLocale } from "../i18n";

type Props = {
  name: string;
  municipality?: string;
  imageUrl?: string;
  latestModified?: string | null;
  coordinates?: number[];
  showLabels?: boolean;
  cacheBuster?: number;
  onClick?: () => void;
};

const buildSrc = (url?: string | undefined, cacheBuster?: number) => {
  if (!url) return undefined;
  if (typeof cacheBuster === "number" && Number.isFinite(cacheBuster)) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_cb=${cacheBuster}`;
  }
  return url;
};

const CameraTileInner: React.FC<Props> = ({
  name,
  municipality,
  imageUrl,
  latestModified,
  coordinates,
  showLabels = true,
  cacheBuster,
  onClick,
}: Props) => {
  const { t, i18n } = useTranslation();
  const recent = isRecent(latestModified);
  const src = useMemo(
    () => buildSrc(imageUrl, cacheBuster),
    [imageUrl, cacheBuster]
  );

  const [weather, setWeather] = useState<FmiWeather | null>(null);

  useEffect(() => {
    if (!recent) {
      setWeather(null);
      return;
    }
    if (!municipality || !coordinates) {
      setWeather(null);
      return;
    }
    const abort = new AbortController();
    fetchFmiWeatherForCamera({
      municipality,
      coordinates,
      signal: abort.signal,
    })
      .then((w) => {
        if (!abort.signal.aborted) setWeather(w);
      })
      .catch(() => {
        if (!abort.signal.aborted) setWeather(null);
      });
    return () => abort.abort();
  }, [recent, municipality, coordinates]);

  const locale = getLocale(i18n.language);
  const formatNumber = (n: number, digits = 0) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(n);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      aria-label={name}
      tabIndex={0}
      role={onClick ? "button" : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="tile relative rounded-md overflow-hidden bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transform transition-all duration-200 ease-out will-change-transform z-0 cursor-pointer
                 group-hover:scale-95 group-hover:opacity-90 hover:!scale-110 hover:z-30 hover:shadow-2xl hover:brightness-105 aspect-[16/10]"
    >
      {recent && (
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {weather?.temperatureC !== undefined && (
            <span
              title={
                weather.observationTime &&
                weather.stationDistanceKm !== undefined
                  ? t("weather.title", {
                      time: new Date(weather.observationTime).toLocaleString(
                        locale
                      ),
                      distance: formatNumber(weather.stationDistanceKm, 0),
                    })
                  : undefined
              }
              className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded bg-black/50 text-white backdrop-blur"
            >
              {weather.windSpeedMs !== undefined
                ? t("weather.compactTempWind", {
                    temp: formatNumber(weather.temperatureC, 0),
                    wind: formatNumber(weather.windSpeedMs, 0),
                  })
                : t("weather.compactTemp", {
                    temp: formatNumber(weather.temperatureC, 0),
                  })}
            </span>
          )}
          <span
            title={t("camera.updatedRecentTitle")}
            className="inline-block w-3 h-3 rounded-full bg-red-500 shadow animate-pulse ring-2 ring-red-400/50"
          />
        </div>
      )}

      <div
        className={`w-full h-full ${recent ? "ring-2 ring-red-400/10" : ""}`}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = "0.6";
            }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-neutral-400 bg-gradient-to-br from-neutral-800 to-neutral-900 p-2">
            <div className="text-center px-2">
              <div className="text-sm font-medium truncate">{name}</div>
              <div className="text-[11px] opacity-70 truncate">
                {municipality}
              </div>
            </div>
          </div>
        )}
      </div>

      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[11px] sm:text-xs p-2 sm:p-2 backdrop-blur-sm">
          <div className="font-medium truncate">{name}</div>
          {municipality && (
            <div className="opacity-80 text-[10px] truncate">
              {municipality}
            </div>
          )}
          {latestModified && (
            <div className="opacity-70 text-[10px]">
              {t("camera.lastLabel", {
                time: new Date(latestModified).toLocaleString(locale),
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default React.memo(CameraTileInner);
