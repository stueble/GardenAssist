/**
 * NavBar tests.
 *
 * Verifies that the navigation bar renders all four main tabs plus the
 * settings icon, and that routing links point to the correct paths.
 * Tests run with German locale (default).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { NavBar } from "../components/NavBar";

beforeEach(async () => {
  await i18n.changeLanguage("de");
});

function renderNavBar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <I18nextProvider i18n={i18n}>
        <NavBar />
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe("NavBar", () => {
  it("renders the app name", () => {
    renderNavBar();
    expect(screen.getByText(/GardenAssist/i)).toBeInTheDocument();
  });

  it("renders all four main tabs in German", () => {
    renderNavBar();
    expect(screen.getByRole("tab", { name: "Dashboard"  })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pflanzen"   })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Kalender"   })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tagebuch"   })).toBeInTheDocument();
  });

  it("renders the settings icon link", () => {
    renderNavBar();
    expect(screen.getByRole("link", { name: /Einstellungen/i })).toBeInTheDocument();
  });

  it("Dashboard tab links to /", () => {
    renderNavBar();
    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("href", "/");
  });

  it("Pflanzen tab links to /plants", () => {
    renderNavBar();
    expect(screen.getByRole("tab", { name: "Pflanzen" })).toHaveAttribute("href", "/plants");
  });

  it("Kalender tab links to /calendar", () => {
    renderNavBar();
    expect(screen.getByRole("tab", { name: "Kalender" })).toHaveAttribute("href", "/calendar");
  });

  it("Tagebuch tab links to /journal", () => {
    renderNavBar();
    expect(screen.getByRole("tab", { name: "Tagebuch" })).toHaveAttribute("href", "/journal");
  });
});
