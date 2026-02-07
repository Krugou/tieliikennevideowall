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
            className={`px-3 py-1 font-bold text-xs uppercase min-w-[64px] border-2 border-black shadow-neo-sm transition-all hover:-translate-y-0.5 ${
              active
                ? "bg-neo-blue text-white shadow-neo"
                : "bg-white text-black hover:bg-neo-blue hover:text-white"
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
    <div className="flex items-center gap-2 w-full">
      <div className="city-selector flex gap-2 overflow-x-auto whitespace-nowrap max-w-full -mx-1 px-1 py-1">
        {buttons}
        <button
          onClick={() => setShowAllCities(!showAllCities)}
          className="px-3 py-1 font-bold text-xs bg-white text-black border-2 border-black shadow-neo-sm hover:shadow-neo hover:bg-neo-offwhite transition-all uppercase min-w-[64px]"
          title={showAllCities ? t("city.showLess") : t("city.showMore")}
        >
          {showAllCities ? t("city.showLess") : t("city.showMore")}
        </button>
      </div>

      <input
        className="ml-2 px-3 py-1 bg-white text-black border-2 border-black shadow-neo-sm font-bold text-sm outline-none min-w-[160px] placeholder:text-neutral-500 focus:shadow-neo focus:bg-neo-offwhite transition-all"
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
