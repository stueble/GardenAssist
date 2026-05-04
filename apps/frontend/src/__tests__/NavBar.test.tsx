/**
 * NavBar tests.
 *
 * Verifies that the navigation bar renders all four main tabs plus the
 * settings icon, and that routing links point to the correct paths.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavBar } from "../components/NavBar";

function renderNavBar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavBar />
    </MemoryRouter>
  );
}

describe("NavBar", () => {
  it("renders the app name", () => {
    renderNavBar();
    expect(screen.getByText(/GardenAssist/i)).toBeInTheDocument();
  });

  it("renders all four main tabs", () => {
    renderNavBar();
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pflanzen"  })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Kalender"  })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tagebuch"  })).toBeInTheDocument();
  });

  it("renders the settings icon link", () => {
    renderNavBar();
    expect(screen.getByRole("link", { name: /Einstellungen/i })).toBeInTheDocument();
  });

  it("Dashboard tab links to /", () => {
    renderNavBar();
    const link = screen.getByRole("tab", { name: "Dashboard" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("Pflanzen tab links to /plants", () => {
    renderNavBar();
    const link = screen.getByRole("tab", { name: "Pflanzen" });
    expect(link).toHaveAttribute("href", "/plants");
  });

  it("Kalender tab links to /calendar", () => {
    renderNavBar();
    const link = screen.getByRole("tab", { name: "Kalender" });
    expect(link).toHaveAttribute("href", "/calendar");
  });

  it("Tagebuch tab links to /journal", () => {
    renderNavBar();
    const link = screen.getByRole("tab", { name: "Tagebuch" });
    expect(link).toHaveAttribute("href", "/journal");
  });
});
