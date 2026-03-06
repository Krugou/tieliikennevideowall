import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchWeatherForCamera, isRecent, WeatherData } from "../lib/api";
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
    [imageUrl, cacheBuster],
  );

  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!recent) {
      setWeather(null);
      return;
    }
    if (!coordinates) {
      setWeather(null);
      return;
    }
    const abort = new AbortController();
    fetchWeatherForCamera({ coordinates, signal: abort.signal })
      .then((w) => {
        if (!abort.signal.aborted) setWeather(w);
      })
      .catch(() => {
        if (!abort.signal.aborted) setWeather(null);
      });
    return () => abort.abort();
  }, [recent, coordinates]);

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
      className="group relative border border-finn-border bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-100 cursor-pointer overflow-hidden z-10 hover:z-20 aspect-[16/10]"
    >
      {/* Live / Status Indicator - Brutalist Tag */}
      {recent && (
        <div className="absolute top-0 left-0 z-20 flex flex-col gap-1 p-1.5">
          <div className="bg-finn-green text-white px-1.5 py-0.5 text-[9px] font-semibold tracking-wide rounded-sm">
            LIVE
          </div>
          {weather?.temperatureC !== undefined && (
            <div className="bg-white/90 text-finn-text px-1.5 py-0.5 text-[9px] font-medium rounded-sm shadow-sm">
              {weather.windSpeedMs !== undefined
                ? t("weather.compactTempWind", {
                    temp: formatNumber(weather.temperatureC, 0),
                    wind: formatNumber(weather.windSpeedMs, 0),
                  })
                : t("weather.compactTemp", {
                    temp: formatNumber(weather.temperatureC, 0),
                  })}
            </div>
          )}
        </div>
      )}

      {/* Image Container - Grayscale to Color */}
      <div className="w-full h-full relative bg-neutral-200">
        {src ? (
          <img
            src={src}
            alt={name}
            className={`w-full h-full object-cover transition-all duration-100 ${recent ? "" : "opacity-60 grayscale"}`}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = "0.6";
            }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-finn-bg p-2">
            <div className="text-center">
              <div className="font-sans text-xs font-medium text-finn-muted">
                {t("camera.noImage")}
              </div>
              <div className="mt-1 text-xs text-finn-muted truncate max-w-[150px]">
                {name}
              </div>
            </div>
          </div>
        )}

        {/* Very subtle scanline for visual depth */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] z-10 pointer-events-none bg-size-[100%_2px] opacity-30" />
      </div>

      {/* Labels - Rotated Badges */}
      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-2 py-1.5 bg-linear-to-t from-black/60 to-transparent">
          <div className="font-sans font-semibold text-[10px] text-white truncate leading-tight">
            {name}
          </div>
          <div className="flex gap-1.5 mt-0.5">
            {municipality && (
              <div className="text-white/70 text-[9px] font-medium">
                {municipality}
              </div>
            )}
            {latestModified && (
              <div className="text-white/60 text-[9px]">
                {new Date(latestModified).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default React.memo(CameraTileInner);
