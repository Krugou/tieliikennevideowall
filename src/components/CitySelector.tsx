import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { defaultCities as defaults } from "../lib/api";

type Props = {
  selectedCities: string[];
  onChange: (cities: string[]) => void;
};

const CitySelectorInner: React.FC<Props> = ({ selectedCities, onChange }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState(selectedCities.join(", "));

  const normalizedSelectedCities = useMemo(
    () => selectedCities.map((s) => s.toLowerCase()),
    [selectedCities],
  );

  const availableCities = useMemo(() => {
    const set = new Set<string>([...defaults, ...normalizedSelectedCities]);
    return Array.from(set);
  }, [normalizedSelectedCities]);

  const toggleCity = useCallback(
    (c: string) => {
      const lower = c.toLowerCase();
      const set = new Set(selectedCities.map((s) => s.toLowerCase()));
      if (set.has(lower)) set.delete(lower);
      else set.add(lower);
      const arr = Array.from(set);
      onChange(arr);
      setInput(arr.join(", "));
    },
    [onChange, selectedCities],
  );

  const applyInput = useCallback(
    (raw: string) => {
      const arr = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.toLowerCase());
      onChange(arr);
      setInput(arr.join(", "));
    },
    [onChange],
  );

  const [showAllCities, setShowAllCities] = useState(false);

  const citiesToShow = showAllCities ? availableCities : defaults;

  const buttons = useMemo(
    () =>
      citiesToShow.map((c) => {
        const active = selectedCities.some((s) => s.toLowerCase() === c);
        return (
          <button
            key={c}
            aria-pressed={active}
            onClick={() => toggleCity(c)}
            className={`shrink-0 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded transition-colors border ${
              active
                ? "bg-finn-blue text-white border-finn-blue"
                : "bg-white text-finn-text border-finn-border hover:border-finn-sky hover:text-finn-sky"
            }`}
            title={t("city.toggleTitle", { city: c })}
          >
            {c}
          </button>
        );
      }),
    [citiesToShow, selectedCities, t, toggleCity],
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full">
      {/* City pills: horizontal scroll */}
      <div className="city-selector flex gap-1 sm:gap-1.5 overflow-x-auto whitespace-nowrap py-0.5 shrink-0">
        {buttons}
        <button
          onClick={() => setShowAllCities(!showAllCities)}
          className="shrink-0 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-finn-muted border border-finn-border rounded hover:border-finn-sky hover:text-finn-sky transition-colors"
          title={showAllCities ? t("city.showLess") : t("city.showMore")}
        >
          {showAllCities ? t("city.showLess") : t("city.showMore")}
        </button>
      </div>

      {/* Text input: full width on mobile, auto on larger */}
      <input
        className="w-full sm:w-auto sm:min-w-[140px] px-2 sm:px-3 py-1 sm:py-1.5 bg-white text-finn-text border border-finn-border rounded text-xs sm:text-sm font-sans outline-none placeholder:text-finn-muted focus:border-finn-blue focus:ring-1 focus:ring-finn-blue/30 transition-all"
        placeholder={t("city.addPlaceholder")}
        value={input}
        aria-label={t("city.addAria")}
        onChange={(e) => setInput(e.target.value)}
        onBlur={(e) => applyInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter")
            applyInput((e.target as HTMLInputElement).value);
        }}
      />
    </div>
  );
};

export default React.memo(CitySelectorInner);
