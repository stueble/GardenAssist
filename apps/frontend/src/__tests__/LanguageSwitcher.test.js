import { jsx as _jsx } from "react/jsx-runtime";
/**
 * LanguageSwitcher tests.
 *
 * Verifies that the switcher renders both language options, marks the active
 * one as pressed, calls i18n.changeLanguage when clicked, and persists the
 * language to the backend via updateSettings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
vi.mock("../api/client", () => ({
    apiClient: {
        getSettings: vi.fn().mockResolvedValue({
            language: "de", location_city: null, location_zip: null,
            irrigation_zones: [], plant_categories: [], color_presets: [],
            task_lookback_weeks: 2, task_lookahead_weeks: 4,
            attachment_size_limit_mb: 10,
            ai_provider: null, ai_model: null, ai_api_key: null,
        }),
        updateSettings: vi.fn().mockImplementation((s) => Promise.resolve(s)),
    },
}));
beforeEach(() => {
    vi.clearAllMocks();
});
function renderSwitcher() {
    return render(_jsx(I18nextProvider, { i18n: i18n, children: _jsx(LanguageSwitcher, {}) }));
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
    it("persists language to DB via updateSettings when switched", async () => {
        const { apiClient } = await import("../api/client");
        await i18n.changeLanguage("de");
        renderSwitcher();
        fireEvent.click(screen.getByRole("button", { name: /english/i }));
        await waitFor(() => expect(apiClient.updateSettings).toHaveBeenCalledOnce());
        const call = apiClient.updateSettings.mock.calls[0][0];
        expect(call.language).toBe("en");
        // reset
        await i18n.changeLanguage("de");
    });
});
