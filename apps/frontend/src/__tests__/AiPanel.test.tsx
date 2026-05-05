/**
 * AiPanel tests.
 *
 * Verifies:
 * - AC #1: Toggle strip visible, panel hidden on load
 * - AC #2: Click opens panel, toggle disappears
 * - AC #3: Panel shows message area and input
 * - AC #6: Close button hides panel, toggle reappears
 * - AC #7: Not-configured hint shown when ai_provider/ai_api_key are null
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { AiPanel } from "../components/AiPanel";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Settings } from "@api/settings";

const MOCK_SETTINGS_UNCONFIGURED: Settings = {
  language: "de", location_city: null, location_zip: null,
  irrigation_zones: [], plant_categories: [], color_presets: [],
  task_lookback_weeks: 2, task_lookahead_weeks: 4,
  attachment_size_limit_mb: 10,
  ai_provider: null, ai_model: null, ai_api_key: null,
};

const MOCK_SETTINGS_CONFIGURED: Settings = {
  ...MOCK_SETTINGS_UNCONFIGURED,
  ai_provider: "anthropic",
  ai_api_key:  "sk-ant-test",
  ai_model:    "claude-sonnet-4-6",
};

vi.mock("../api/client", () => ({
  apiClient: {
    getSettings: vi.fn(),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
  resetAiPanelState(); // ensure panel starts closed in every test
});

async function setup(configured = false) {
  const { apiClient } = await import("../api/client");
  (apiClient.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue(
    configured ? MOCK_SETTINGS_CONFIGURED : MOCK_SETTINGS_UNCONFIGURED
  );
  render(
    <I18nextProvider i18n={i18n}>
      <AiPanel context="⚙️ Einstellungen" />
    </I18nextProvider>
  );
}

describe("AiPanel — collapsed state (AC #1)", () => {
  it("shows the toggle strip on load", async () => {
    await setup();
    expect(screen.getByTestId("ai-toggle")).toBeInTheDocument();
  });

  it("panel has width 0 on load (CSS-collapsed, toggle visible)", async () => {
    await setup();
    // Toggle is present
    expect(screen.getByTestId("ai-toggle")).toBeInTheDocument();
    // Panel element exists in DOM but has width:0 (CSS transition — jsdom doesn't hide it)
    const panel = screen.getByTestId("ai-chat-panel") as HTMLElement;
    expect(panel.style.width).toBe("0px");
  });
});

describe("AiPanel — opening (AC #2)", () => {
  it("toggle is always visible — never hidden (doc-011 § 5.2)", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("ai-toggle"));
    // Strip is never hidden — panel slides over it via z-index (doc-011 § 5.3)
    const toggle = screen.getByTestId("ai-toggle") as HTMLElement;
    expect(toggle.style.display).not.toBe("none");
  });

  it("panel width changes to 310px when open (doc-011 § 5.3)", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("ai-toggle"));
    const panel = screen.getByTestId("ai-chat-panel") as HTMLElement;
    expect(panel.style.width).toBe("310px");
  });

  it("close button appears after opening", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("ai-toggle"));
    expect(screen.getByTestId("ai-panel-close")).toBeInTheDocument();
  });
});

describe("AiPanel — panel content (AC #3)", () => {
  it("shows message area and input after opening", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("ai-toggle"));
    expect(screen.getByTestId("ai-messages")).toBeInTheDocument();
    expect(screen.getByTestId("ai-input")).toBeInTheDocument();
    expect(screen.getByTestId("ai-send")).toBeInTheDocument();
  });

  it("shows context pill when context prop is given", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("ai-toggle"));
    expect(screen.getByText("⚙️ Einstellungen")).toBeInTheDocument();
  });
});

describe("AiPanel — closing (AC #6)", () => {
  it("panel width returns to 0 after closing via › chevron", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("ai-toggle"));
    fireEvent.click(screen.getByTestId("ai-panel-close"));
    const panel = screen.getByTestId("ai-chat-panel") as HTMLElement;
    expect(panel.style.width).toBe("0px");
  });

  it("close button shows › chevron (doc-011 § 5.5)", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("ai-toggle"));
    expect(screen.getByTestId("ai-panel-close").textContent).toBe("›");
  });

  it("toggle remains in DOM and visible after closing", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("ai-toggle"));
    fireEvent.click(screen.getByTestId("ai-panel-close"));
    const toggle = screen.getByTestId("ai-toggle") as HTMLElement;
    expect(toggle.style.display).not.toBe("none");
  });
});

describe("AiPanel — not configured hint (AC #7)", () => {
  it("shows configure hint when AI is not set up", async () => {
    await setup(false);
    fireEvent.click(screen.getByTestId("ai-toggle"));
    await waitFor(() =>
      expect(screen.getByText(/API-Schlüssel/i)).toBeInTheDocument()
    );
    // "KI-Assistent" text in the hint message
    expect(screen.getByText(/KI-Assistent ist noch nicht/i)).toBeInTheDocument();
  });

  it("input is disabled when AI is not configured", async () => {
    await setup(false);
    fireEvent.click(screen.getByTestId("ai-toggle"));
    await waitFor(() =>
      expect(screen.getByTestId("ai-input")).toBeDisabled()
    );
  });

  it("shows welcome message when AI is configured", async () => {
    await setup(true);
    fireEvent.click(screen.getByTestId("ai-toggle"));
    await waitFor(() =>
      expect(screen.getByText(/Wie kann ich dir/i)).toBeInTheDocument()
    );
  });
});
