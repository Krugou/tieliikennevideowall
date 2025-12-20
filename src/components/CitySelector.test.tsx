import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CitySelector from "./CitySelector";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";

describe("CitySelector", () => {
  const mockOnChange = vi.fn();

  const renderComponent = (selectedCities: string[] = []) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <CitySelector selectedCities={selectedCities} onChange={mockOnChange} />
      </I18nextProvider>,
    );
  };

  it("renders city buttons", () => {
    renderComponent();

    // Check if at least some default cities are rendered
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("highlights selected cities", () => {
    renderComponent(["helsinki"]);

    const helsinkiButton = screen.getByText("Helsinki");
    expect(helsinkiButton).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange when city is toggled", () => {
    renderComponent([]);

    const buttons = screen.getAllByRole("button");
    const firstCityButton = buttons[0];

    if (firstCityButton) {
      fireEvent.click(firstCityButton);
    }

    expect(mockOnChange).toHaveBeenCalled();
  });

  it("renders input field for adding cities", () => {
    renderComponent();

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });
});
