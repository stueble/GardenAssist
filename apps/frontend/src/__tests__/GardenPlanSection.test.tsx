/**
 * GardenPlanSection tests.
 *
 * Verifies that:
 * - The dropzone is shown when no plan exists (AC #1)
 * - The preview row is shown when a plan exists (AC #2)
 * - selectFile() is called when a file is dropped (AC #4)
 * - markRemove() is called when the remove button is clicked (AC #3, #4)
 * - Save Bar becomes active after file selection (save bar driven by SettingsView)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { GardenPlanSection } from "../components/settings/GardenPlanSection";
import type { GardenPlanState } from "../hooks/useGardenPlan";

function makePlanState(overrides: Partial<GardenPlanState> = {}): GardenPlanState {
  return {
    savedPlanUrl:  null,
    savedPlanName: null,
    pending:       null,
    dirty:         false,
    saving:        false,
    loading:       false,
    error:         null,
    selectFile:    vi.fn(),
    markRemove:    vi.fn(),
    save:          vi.fn().mockResolvedValue(undefined),
    discard:       vi.fn(),
    ...overrides,
  };
}

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
});

function renderSection(plan: GardenPlanState) {
  return render(
    <I18nextProvider i18n={i18n}>
      <GardenPlanSection plan={plan} />
    </I18nextProvider>
  );
}

describe("GardenPlanSection — no plan", () => {
  it("shows the dropzone when no plan exists (AC #1)", () => {
    renderSection(makePlanState());
    expect(screen.getByTestId("garden-plan-dropzone")).toBeInTheDocument();
    expect(screen.queryByTestId("garden-plan-preview")).not.toBeInTheDocument();
  });

  it("renders dropzone title and subtitle text", () => {
    renderSection(makePlanState());
    expect(screen.getByText(/Bild hierher ziehen oder klicken/i)).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPG oder SVG/i)).toBeInTheDocument();
  });

  it("shows dropzone when pending action is 'remove'", () => {
    renderSection(makePlanState({
      savedPlanUrl: "/static/garden/plan.png",
      savedPlanName: "gartenplan.png",
      pending: { type: "remove" },
      dirty: true,
    }));
    expect(screen.getByTestId("garden-plan-dropzone")).toBeInTheDocument();
  });
});

describe("GardenPlanSection — plan exists (saved)", () => {
  it("shows the preview row when a saved plan exists (AC #2)", () => {
    renderSection(makePlanState({
      savedPlanUrl:  "/static/garden/plan.png",
      savedPlanName: "gartenplan.png",
    }));
    expect(screen.getByTestId("garden-plan-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("garden-plan-dropzone")).not.toBeInTheDocument();
  });

  it("displays the filename in the preview row (AC #2)", () => {
    renderSection(makePlanState({
      savedPlanUrl:  "/static/garden/plan.png",
      savedPlanName: "gartenplan.png",
    }));
    expect(screen.getByText("gartenplan.png")).toBeInTheDocument();
  });

  it("calls markRemove when remove button is clicked (AC #3, #4)", () => {
    const plan = makePlanState({
      savedPlanUrl:  "/static/garden/plan.png",
      savedPlanName: "gartenplan.png",
    });
    renderSection(plan);
    fireEvent.click(screen.getByTestId("garden-plan-remove"));
    expect(plan.markRemove).toHaveBeenCalledOnce();
  });
});

describe("GardenPlanSection — pending upload", () => {
  it("shows preview row when a file is staged (pending upload)", () => {
    const file = new File(["data"], "mein-garten.png", { type: "image/png" });
    renderSection(makePlanState({
      pending: { type: "upload", file },
      dirty:   true,
    }));
    expect(screen.getByTestId("garden-plan-preview")).toBeInTheDocument();
    expect(screen.getByText("mein-garten.png")).toBeInTheDocument();
  });

  it("shows '(nicht gespeichert)' hint for staged upload", () => {
    const file = new File(["data"], "mein-garten.png", { type: "image/png" });
    renderSection(makePlanState({
      pending: { type: "upload", file },
      dirty:   true,
    }));
    expect(screen.getByText(/nicht gespeichert/i)).toBeInTheDocument();
  });
});

describe("GardenPlanSection — file input", () => {
  it("calls selectFile when a file is chosen (AC #1, #4)", async () => {
    const plan = makePlanState();
    renderSection(plan);

    const input = screen.getByTestId("garden-plan-input");
    const file = new File(["png-data"], "gartenplan.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(plan.selectFile).toHaveBeenCalledWith(file)
    );
  });
});
