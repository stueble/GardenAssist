import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AiPanel tests.
 *
 * Verifies:
 * - AC #1: Toggle strip visible, panel hidden on load
 * - AC #2: Click opens panel, toggle disappears
 * - AC #3: Panel shows message area and input
 * - AC #6: Close button hides panel, toggle reappears
 * - AC #7: Not-configured hint shown when ai_provider/ai_api_key are null
 * - TASK-057: Context change markers injected into conversation history
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { AiPanel } from "../components/AiPanel";
import { resetAiPanelState, useAiPanelState } from "../hooks/useAiPanelState";
const MOCK_SETTINGS_UNCONFIGURED = {
    language: "de", location_city: null, location_zip: null,
    irrigation_zones: [], plant_categories: [], color_presets: [],
    task_lookback_weeks: 2, task_lookahead_weeks: 4,
    attachment_size_limit_mb: 10,
    ai_provider: null, ai_model: null, ai_api_key: null,
    gardener_profile: null,
};
const MOCK_SETTINGS_CONFIGURED = {
    ...MOCK_SETTINGS_UNCONFIGURED,
    ai_provider: "anthropic",
    ai_api_key: "sk-ant-test",
    ai_model: "claude-sonnet-4-6",
};
vi.mock("../api/client", () => ({
    apiClient: {
        getSettings: vi.fn(),
    },
    chatWithAi: vi.fn(),
}));
beforeEach(async () => {
    await i18n.changeLanguage("de");
    vi.clearAllMocks();
    resetAiPanelState(); // ensure panel starts closed in every test
});
async function setup(configured = false, assistantContext) {
    const { apiClient } = await import("../api/client");
    apiClient.getSettings.mockResolvedValue(configured ? MOCK_SETTINGS_CONFIGURED : MOCK_SETTINGS_UNCONFIGURED);
    render(_jsx(I18nextProvider, { i18n: i18n, children: _jsx(AiPanel, { assistantContext: assistantContext }) }));
}
const MOCK_GARDEN = {
    plan_url: null, plan_name: null,
    plants: [], attachments: [], journal_entries: [], warnings: [],
};
const MOCK_PLANT = {
    id: "p1", name_common: "Rose", name_botanical: "Rosa", icon: "🌹",
    origin_type: "native", category: "Strauch", lifecycle: "perennial",
    description: null, care_notes: null, sun_demand: "sunny",
    water_demand: "medium", soil_type: "loamy",
    frost_tolerance_min_c: -15, temperature_protected: false,
    health_status: "good", location: "Westbeet", watering_zone: "Beet West",
    purchase_date: null, purchase_price: null,
    positions: [], attachments: [], journal_entries: [], schedules: [], tasks: [],
    created_at: "", updated_at: "",
};
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
        const panel = screen.getByTestId("ai-chat-panel");
        expect(panel.style.width).toBe("0px");
    });
});
describe("AiPanel — opening (AC #2)", () => {
    it("toggle is always visible — never hidden (doc-011 § 5.2)", async () => {
        await setup();
        fireEvent.click(screen.getByTestId("ai-toggle"));
        // Strip is never hidden — panel slides over it via z-index (doc-011 § 5.3)
        const toggle = screen.getByTestId("ai-toggle");
        expect(toggle.style.display).not.toBe("none");
    });
    it("panel width changes to 310px when open (doc-011 § 5.3)", async () => {
        await setup();
        fireEvent.click(screen.getByTestId("ai-toggle"));
        const panel = screen.getByTestId("ai-chat-panel");
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
    it("no context pill — context bar removed (TASK-057 AC #6)", async () => {
        await setup();
        fireEvent.click(screen.getByTestId("ai-toggle"));
        // The old context pill should not exist; context is now in-chat as a marker
        expect(screen.queryByText("⚙️ Einstellungen")).not.toBeInTheDocument();
    });
});
describe("AiPanel — closing (AC #6)", () => {
    it("panel width returns to 0 after closing via › chevron", async () => {
        await setup();
        fireEvent.click(screen.getByTestId("ai-toggle"));
        fireEvent.click(screen.getByTestId("ai-panel-close"));
        const panel = screen.getByTestId("ai-chat-panel");
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
        const toggle = screen.getByTestId("ai-toggle");
        expect(toggle.style.display).not.toBe("none");
    });
});
describe("AiPanel — not configured hint (AC #7)", () => {
    it("shows configure hint when AI is not set up", async () => {
        await setup(false);
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => expect(screen.getByText(/API-Schlüssel/i)).toBeInTheDocument());
        // "KI-Assistent" text in the hint message
        expect(screen.getByText(/KI-Assistent ist noch nicht/i)).toBeInTheDocument();
    });
    it("input is disabled when AI is not configured", async () => {
        await setup(false);
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => expect(screen.getByTestId("ai-input")).toBeDisabled());
    });
    it("shows welcome message when AI is configured", async () => {
        await setup(true);
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => expect(screen.getByText(/Wie kann ich dir/i)).toBeInTheDocument());
    });
});
// ── Chat interaction (STORY-042) ──────────────────────────────────────────────
describe("AiPanel — sending a message (AC #1)", () => {
    it("user message appears immediately as a bubble", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockResolvedValue({ content: "Antwort" });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Hallo Assistent" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        expect(screen.getByTestId("user-message")).toHaveTextContent("Hallo Assistent");
    });
    it("assistant reply appears after the call resolves", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockResolvedValue({ content: "Hallo! Ich helfe gern." });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Test" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => expect(screen.getByText("Hallo! Ich helfe gern.")).toBeInTheDocument());
    });
    it("input is cleared after sending", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockResolvedValue({ content: "OK" });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        const input = screen.getByTestId("ai-input");
        fireEvent.change(input, { target: { value: "Nachricht" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        expect(input.value).toBe("");
    });
});
describe("AiPanel — loading state (AC #4)", () => {
    it("shows loading dots while waiting for the response", async () => {
        await setup(true);
        let resolve = () => { };
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockReturnValue(new Promise((r) => { resolve = r; }));
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Frage" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        expect(screen.getByTestId("ai-loading-dots")).toBeInTheDocument();
        // Resolve to clean up
        resolve({ content: "Antwort" });
        await waitFor(() => expect(screen.queryByTestId("ai-loading-dots")).not.toBeInTheDocument());
    });
    it("input is disabled while loading", async () => {
        await setup(true);
        let resolve = () => { };
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockReturnValue(new Promise((r) => { resolve = r; }));
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Frage" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        expect(screen.getByTestId("ai-input")).toBeDisabled();
        resolve({ content: "Antwort" });
        await waitFor(() => expect(screen.getByTestId("ai-input")).not.toBeDisabled());
    });
});
describe("AiPanel — error handling (AC #5)", () => {
    it("shows error banner when the API call fails", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockRejectedValue(new Error("Network error"));
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Test" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => expect(screen.getByTestId("ai-error")).toBeInTheDocument());
    });
    it("loading dots are gone after an error", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockRejectedValue(new Error("fail"));
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Test" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => expect(screen.queryByTestId("ai-loading-dots")).not.toBeInTheDocument());
    });
});
// ── TASK-057: Context change markers ─────────────────────────────────────────
describe("AiPanel — context markers (TASK-057)", () => {
    it("injects a context marker when the panel opens (AC #1)", async () => {
        const ctx = {
            view: "plants",
            garden: MOCK_GARDEN,
            selectedPlant: MOCK_PLANT,
        };
        await setup(true, ctx);
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => {
            expect(screen.getByTestId("context-marker")).toBeInTheDocument();
        });
        expect(screen.getByTestId("context-marker").textContent).toContain("Rose");
    });
    it("marker includes plant icon and location (AC #3)", async () => {
        const ctx = {
            view: "plants",
            garden: MOCK_GARDEN,
            selectedPlant: MOCK_PLANT,
        };
        await setup(true, ctx);
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => {
            const marker = screen.getByTestId("context-marker");
            expect(marker.textContent).toContain("🌹");
            expect(marker.textContent).toContain("Rose");
            expect(marker.textContent).toContain("Westbeet");
        });
    });
    it("marker is sent as 'assistant' role (not 'context') to the API (AC #5)", async () => {
        const ctx = {
            view: "plants",
            garden: MOCK_GARDEN,
            selectedPlant: MOCK_PLANT,
        };
        const { apiClient, chatWithAi } = await import("../api/client");
        apiClient.getSettings.mockResolvedValue(MOCK_SETTINGS_CONFIGURED);
        chatWithAi.mockResolvedValue({ content: "Antwort" });
        render(_jsx(I18nextProvider, { i18n: i18n, children: _jsx(AiPanel, { assistantContext: ctx }) }));
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Test" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => {
            const calls = chatWithAi.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
            const sentMessages = calls[0][0];
            // No "context" role reaches the API
            expect(sentMessages.every((m) => m.role !== "context")).toBe(true);
            // The marker is present as an "assistant" message containing the plant_id
            const markerMsg = sentMessages.find((m) => m.role === "assistant" && m.content.includes("plant_id:"));
            expect(markerMsg).toBeDefined();
            expect(markerMsg.content).toContain("p1");
        });
    });
    it("injects a new marker when selectedPlant changes (AC #2)", async () => {
        const PLANT_2 = {
            ...MOCK_PLANT,
            id: "p2",
            name_common: "Bambus",
            icon: "🎋",
            location: "Rasen",
        };
        function Wrapper() {
            const [plant, setPlant] = React.useState(MOCK_PLANT);
            const { setOpen } = useAiPanelState();
            const ctx = {
                view: "plants",
                garden: MOCK_GARDEN,
                selectedPlant: plant,
            };
            return (_jsxs(I18nextProvider, { i18n: i18n, children: [_jsx("button", { "data-testid": "switch-plant", onClick: () => setPlant(PLANT_2) }), _jsx("button", { "data-testid": "open-panel", onClick: () => setOpen(true) }), _jsx(AiPanel, { assistantContext: ctx })] }));
        }
        const { apiClient } = await import("../api/client");
        apiClient.getSettings.mockResolvedValue(MOCK_SETTINGS_CONFIGURED);
        render(_jsx(Wrapper, {}));
        fireEvent.click(screen.getByTestId("open-panel"));
        // First marker: Rose
        await waitFor(() => {
            const markers = screen.getAllByTestId("context-marker");
            expect(markers[0].textContent).toContain("Rose");
        });
        // Switch plant
        act(() => { fireEvent.click(screen.getByTestId("switch-plant")); });
        // Second marker: Bambus
        await waitFor(() => {
            const markers = screen.getAllByTestId("context-marker");
            expect(markers.length).toBe(2);
            expect(markers[1].textContent).toContain("Bambus");
        });
    });
});
describe("AiPanel — multi-turn history (AC #3)", () => {
    it("second call includes the full prior conversation", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi
            .mockResolvedValueOnce({ content: "Erste Antwort" })
            .mockResolvedValueOnce({ content: "Zweite Antwort" });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        // First message
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Erste Frage" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => screen.getByText("Erste Antwort"));
        // Second message
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Zweite Frage" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => screen.getByText("Zweite Antwort"));
        // Second call: user, assistant-reply, user — context markers sent as assistant
        const secondCallMessages = chatWithAi.mock.calls[1][0];
        // No "context" role should reach the API
        expect(secondCallMessages.every((m) => m.role !== "context")).toBe(true);
        // Filter out the context-marker (assistant message containing plant_id) to check the real turns
        const conversationMsgs = secondCallMessages.filter((m) => !m.content.includes("plant_id:"));
        expect(conversationMsgs).toHaveLength(3);
        expect(conversationMsgs[0]).toEqual({ role: "user", content: "Erste Frage" });
        expect(conversationMsgs[1]).toEqual({ role: "assistant", content: "Erste Antwort" });
        expect(conversationMsgs[2]).toEqual({ role: "user", content: "Zweite Frage" });
    });
});
// ── Markdown rendering (TASK-061 AC #2, #3, #7, #8) ──────────────────────────
describe("AiPanel — markdown rendering in bot messages (TASK-061)", () => {
    it("renders bold text as <strong> (AC #8)", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockResolvedValue({
            content: "Das ist **fett** formatiert.",
        });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Test" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => screen.getByTestId("bot-message-markdown"));
        const bubble = screen.getByTestId("bot-message-markdown");
        expect(bubble.querySelector("strong")).not.toBeNull();
        expect(bubble.querySelector("strong").textContent).toBe("fett");
    });
    it("renders an unordered list as <ul><li> (AC #8)", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockResolvedValue({
            content: "- Punkt 1\n- Punkt 2\n- Punkt 3",
        });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Liste" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => screen.getByTestId("bot-message-markdown"));
        const bubble = screen.getByTestId("bot-message-markdown");
        expect(bubble.querySelector("ul")).not.toBeNull();
        expect(bubble.querySelectorAll("li")).toHaveLength(3);
    });
    it("renders inline code as <code> (AC #4, #8)", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockResolvedValue({
            content: "Verwende `npm install` zum Installieren.",
        });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Code" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => screen.getByTestId("bot-message-markdown"));
        const bubble = screen.getByTestId("bot-message-markdown");
        expect(bubble.querySelector("code")).not.toBeNull();
        expect(bubble.querySelector("code").textContent).toBe("npm install");
    });
    it("plain text renders unchanged without wrapping markdown elements (AC #7)", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockResolvedValue({
            content: "Einfacher Text ohne Markdown.",
        });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Frage" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => screen.getByTestId("bot-message-markdown"));
        const bubble = screen.getByTestId("bot-message-markdown");
        expect(bubble.textContent).toContain("Einfacher Text ohne Markdown.");
        expect(bubble.querySelector("strong")).toBeNull();
        expect(bubble.querySelector("ul")).toBeNull();
    });
    it("renders a GFM table as <table> (AC #3)", async () => {
        await setup(true);
        const { chatWithAi } = await import("../api/client");
        chatWithAi.mockResolvedValue({
            content: "| Pflanze | Typ |\n|---|---|\n| Rose | Strauch |",
        });
        fireEvent.click(screen.getByTestId("ai-toggle"));
        await waitFor(() => screen.getByTestId("ai-input"));
        fireEvent.change(screen.getByTestId("ai-input"), { target: { value: "Tabelle" } });
        fireEvent.click(screen.getByTestId("ai-send"));
        await waitFor(() => screen.getByTestId("bot-message-markdown"));
        const bubble = screen.getByTestId("bot-message-markdown");
        expect(bubble.querySelector("table")).not.toBeNull();
    });
});
