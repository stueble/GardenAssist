/**
 * LanguageSwitcher tests.
 *
 * Verifies that the switcher renders both language options, marks the active
 * one as pressed, and calls i18n.changeLanguage when clicked.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

function renderSwitcher() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LanguageSwitcher />
    </I18nextProvider>
  );
}

describe("LanguageSwitcher", () => {
  it("renders DE and EN buttons", () => {
    renderSwitcher();
    expect(screen.getByRole("button", { name: /deutsch/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /english/i })).toBeInTheDocument();
  });

  it("marks the current language as pressed", async () => {
    await i18n.changeLanguage("de");
    renderSwitcher();
    expect(screen.getByRole("button", { name: /deutsch/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /english/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to English when EN is clicked", async () => {
    await i18n.changeLanguage("de");
    renderSwitcher();
    fireEvent.click(screen.getByRole("button", { name: /english/i }));
    expect(i18n.language).toBe("en");
    // reset
    await i18n.changeLanguage("de");
  });

  it("switches back to German when DE is clicked", async () => {
    await i18n.changeLanguage("en");
    renderSwitcher();
    fireEvent.click(screen.getByRole("button", { name: /deutsch/i }));
    expect(i18n.language).toBe("de");
  });
});
