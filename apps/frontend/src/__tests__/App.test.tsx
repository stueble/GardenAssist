/**
 * App routing tests.
 *
 * Verifies that navigating to each route renders the correct view.
 * Tests run with German locale (default).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { App } from "../App";

beforeEach(async () => {
  await i18n.changeLanguage("de");
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe("App routing", () => {
  it("/ renders the Dashboard view", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /Dashboard/i })).toBeInTheDocument();
  });

  it("/plants renders the Plants view", () => {
    renderAt("/plants");
    expect(screen.getByRole("heading", { name: /Pflanzen/i })).toBeInTheDocument();
  });

  it("/calendar renders the Calendar view", () => {
    renderAt("/calendar");
    expect(screen.getByRole("heading", { name: /Kalender/i })).toBeInTheDocument();
  });

  it("/journal renders the Journal view", () => {
    renderAt("/journal");
    expect(screen.getByRole("heading", { name: /Tagebuch/i })).toBeInTheDocument();
  });

  it("/settings renders the Settings view", () => {
    renderAt("/settings");
    expect(screen.getByRole("heading", { name: /Einstellungen/i })).toBeInTheDocument();
  });
});
