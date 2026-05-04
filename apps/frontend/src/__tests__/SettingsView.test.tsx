/**
 * SettingsView tests.
 *
 * Verifies that all 7 sections are rendered, the save bar is present,
 * the AI panel toggle is present, and sections can be collapsed/expanded.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { SettingsView } from "../views/SettingsView";

beforeEach(async () => {
  await i18n.changeLanguage("de");
});

function renderSettings() {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <SettingsView />
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe("SettingsView", () => {
  it("renders the page title", () => {
    renderSettings();
    expect(screen.getByText(/Einstellungen/i)).toBeInTheDocument();
  });

  it("renders all 7 sections", () => {
    renderSettings();
    const sections = screen.getAllByTestId("settings-section");
    expect(sections).toHaveLength(7);
  });

  it("renders Gartenplan section", () => {
    renderSettings();
    expect(screen.getByText("Gartenplan")).toBeInTheDocument();
  });

  it("renders Standort section", () => {
    renderSettings();
    expect(screen.getByText("Standort")).toBeInTheDocument();
  });

  it("renders Bewässerungszonen section", () => {
    renderSettings();
    expect(screen.getByText("Bewässerungszonen")).toBeInTheDocument();
  });

  it("renders Pflanzenkategorien section", () => {
    renderSettings();
    expect(screen.getByText("Pflanzenkategorien")).toBeInTheDocument();
  });

  it("renders Farb-Presets section", () => {
    renderSettings();
    expect(screen.getByText("Farb-Presets")).toBeInTheDocument();
  });

  it("renders KI-Assistent section", () => {
    renderSettings();
    expect(screen.getByText("KI-Assistent")).toBeInTheDocument();
  });

  it("renders Daten & Backup section", () => {
    renderSettings();
    expect(screen.getByText("Daten & Backup")).toBeInTheDocument();
  });

  it("renders the save bar", () => {
    renderSettings();
    expect(screen.getByTestId("save-bar")).toBeInTheDocument();
  });

  it("save and discard buttons are disabled when nothing changed", () => {
    renderSettings();
    expect(screen.getByTestId("save-bar-save")).toBeDisabled();
    expect(screen.getByTestId("save-bar-discard")).toBeDisabled();
  });

  it("renders the AI panel toggle button", () => {
    renderSettings();
    expect(screen.getByRole("button", { name: /Assistent öffnen/i })).toBeInTheDocument();
  });

  it("opens AI panel when toggle is clicked", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /Assistent öffnen/i }));
    expect(screen.getByTestId("ai-messages")).toBeInTheDocument();
  });

  it("all sections are open by default (matching mockup)", () => {
    renderSettings();
    expect(screen.getByText(/Gartenplan — Inhalt folgt/i)).toBeInTheDocument();
    expect(screen.getByText(/Standort — Inhalt folgt/i)).toBeInTheDocument();
  });

  it("clicking an open section header closes it", () => {
    renderSettings();
    // Gartenplan is open — click to close
    fireEvent.click(screen.getByText("Gartenplan"));
    expect(screen.queryByText(/Gartenplan — Inhalt folgt/i)).not.toBeInTheDocument();
  });

  it("clicking a closed section header opens it", () => {
    renderSettings();
    // Close Gartenplan first, then reopen
    fireEvent.click(screen.getByText("Gartenplan"));
    expect(screen.queryByText(/Gartenplan — Inhalt folgt/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Gartenplan"));
    expect(screen.getByText(/Gartenplan — Inhalt folgt/i)).toBeInTheDocument();
  });

  it("shows section subtitles", () => {
    renderSettings();
    expect(screen.getByText(/Grundriss-Bild hochladen/i)).toBeInTheDocument();
    expect(screen.getByText(/Für Wetterdaten/i)).toBeInTheDocument();
  });

  it("save bar shows hint text when not dirty", () => {
    renderSettings();
    expect(screen.getByText(/Keine ungespeicherten Änderungen/i)).toBeInTheDocument();
  });
});
