/**
 * GardenPlanSection tests.
 *
 * Verifies that:
 * - The dropzone is shown when no plan exists (AC #1)
 * - The preview row is shown when a plan exists (AC #2)
 * - uploadGardenPlan() is called when a file is dropped (AC #4)
 * - deleteGardenPlan() is called when the remove button is clicked (AC #3, #4)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { GardenPlanSection } from "../components/settings/GardenPlanSection";
import type { Garden } from "@api/garden";

const MOCK_GARDEN_NO_PLAN: Garden = {
  plan_url: null,
  plan_name: null,
  plants: [],
  journal_entries: [],
  attachments: [],
};

const MOCK_GARDEN_WITH_PLAN: Garden = {
  plan_url: "/static/garden/plan.png",
  plan_name: "gartenplan.png",
  plants: [],
  journal_entries: [],
  attachments: [],
};

// Mock the API client
vi.mock("../api/client", () => ({
  apiClient: {
    getGarden: vi.fn(),
    uploadGardenPlan: vi.fn(),
    deleteGardenPlan: vi.fn(),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
});

async function setup(initialGarden: Garden = MOCK_GARDEN_NO_PLAN) {
  const { apiClient } = await import("../api/client");
  (apiClient.getGarden as ReturnType<typeof vi.fn>).mockResolvedValue(initialGarden);
  (apiClient.uploadGardenPlan as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_GARDEN_WITH_PLAN);
  (apiClient.deleteGardenPlan as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_GARDEN_NO_PLAN);

  return render(
    <I18nextProvider i18n={i18n}>
      <GardenPlanSection />
    </I18nextProvider>
  );
}

describe("GardenPlanSection — no plan uploaded", () => {
  it("shows the dropzone when no plan exists (AC #1)", async () => {
    await setup(MOCK_GARDEN_NO_PLAN);
    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-dropzone")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("garden-plan-preview")).not.toBeInTheDocument();
  });

  it("renders dropzone title and subtitle text", async () => {
    await setup(MOCK_GARDEN_NO_PLAN);
    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-dropzone")).toBeInTheDocument()
    );
    expect(screen.getByText(/Bild hierher ziehen oder klicken/i)).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPG oder SVG/i)).toBeInTheDocument();
  });
});

describe("GardenPlanSection — plan already uploaded", () => {
  it("shows the preview row when a plan exists (AC #2)", async () => {
    await setup(MOCK_GARDEN_WITH_PLAN);
    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-preview")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("garden-plan-dropzone")).not.toBeInTheDocument();
  });

  it("displays the filename in the preview row (AC #2)", async () => {
    await setup(MOCK_GARDEN_WITH_PLAN);
    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-preview")).toBeInTheDocument()
    );
    expect(screen.getByText("gartenplan.png")).toBeInTheDocument();
  });

  it("calls deleteGardenPlan when remove button is clicked (AC #3, #4)", async () => {
    const { apiClient } = await import("../api/client");
    await setup(MOCK_GARDEN_WITH_PLAN);

    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-remove")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("garden-plan-remove"));

    await waitFor(() =>
      expect(apiClient.deleteGardenPlan).toHaveBeenCalledOnce()
    );
  });

  it("switches back to dropzone after removal (AC #3)", async () => {
    await setup(MOCK_GARDEN_WITH_PLAN);

    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-remove")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("garden-plan-remove"));

    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-dropzone")).toBeInTheDocument()
    );
  });
});

describe("GardenPlanSection — file upload via input", () => {
  it("calls uploadGardenPlan when a file is selected (AC #1, #4)", async () => {
    const { apiClient } = await import("../api/client");
    await setup(MOCK_GARDEN_NO_PLAN);

    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-dropzone")).toBeInTheDocument()
    );

    const input = screen.getByTestId("garden-plan-input");
    const file = new File(["png-data"], "gartenplan.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(apiClient.uploadGardenPlan).toHaveBeenCalledWith(file)
    );
  });

  it("shows preview row after successful upload (AC #2)", async () => {
    await setup(MOCK_GARDEN_NO_PLAN);

    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-dropzone")).toBeInTheDocument()
    );

    const input = screen.getByTestId("garden-plan-input");
    const file = new File(["png-data"], "gartenplan.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-preview")).toBeInTheDocument()
    );
  });
});
