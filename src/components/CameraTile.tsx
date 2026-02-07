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
      className="group relative border-4 border-black bg-white shadow-neo hover:shadow-neo-xl hover:-translate-y-1 hover:-translate-x-1 active:translate-y-1 active:translate-x-1 transition-all duration-75 cursor-pointer overflow-hidden z-10 hover:z-20 aspect-[16/10]"
    >
      {/* Live / Status Indicator - Brutalist Tag */}
      {recent && (
        <div className="absolute top-0 left-0 z-20 flex flex-col gap-1 p-1">
          <div className="bg-neo-green border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter animate-blink shadow-neo-sm">
            LIVE
          </div>
          {weather?.temperatureC !== undefined && (
            <div className="bg-white border-2 border-black px-1 py-0.5 text-[10px] font-mono font-bold shadow-neo-sm">
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
            className={`w-full h-full object-cover transition-all duration-75 ${recent ? "" : "opacity-70 contrast-125"}`}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = "0.6";
            }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-neo-offwhite p-2 border-t-2 border-black">
            <div className="text-center">
              <div className="font-mono text-xs font-bold bg-neo-pink text-white px-2 py-1 transform -rotate-3 border-2 border-black shadow-neo-sm">
                NO SIGNAL
              </div>
              <div className="mt-2 text-xs font-mono font-bold truncate max-w-[150px]">
                {name}
              </div>
            </div>
          </div>
        )}

        {/* Scanline overlay for aesthetic */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%] opacity-20" />
      </div>

      {/* Labels - Rotated Badges */}
      {showLabels && (
        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1 z-20 max-w-[90%]">
          <div className="bg-neo-yellow border-2 border-black px-2 py-1 shadow-neo-sm transform -rotate-1 group-hover:rotate-0 transition-transform">
            <div className="font-sans font-black text-xs uppercase truncate leading-none text-black">
              {name}
            </div>
          </div>

          <div className="flex gap-1">
            {municipality && (
              <div className="bg-neo-blue border-2 border-black px-1 py-0.5 shadow-neo-sm transform rotate-1">
                <div className="font-mono font-bold text-[9px] uppercase text-white leading-none">
                  {municipality}
                </div>
              </div>
            )}
            {latestModified && (
              <div className="bg-white border-2 border-black px-1 py-0.5 shadow-neo-sm transform">
                <div className="font-mono font-bold text-[9px] text-black leading-none">
                  {new Date(latestModified).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default React.memo(CameraTileInner);
