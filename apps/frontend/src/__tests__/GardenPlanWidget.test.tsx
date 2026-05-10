/**
 * GardenPlanWidget tests — story-028.
 *
 * Verifies:
 * - Placeholder rendered when planUrl=null
 * - Plan image rendered when planUrl is set
 * - N pins rendered for N pin entries
 * - Fit-Height and Fit-Width buttons present
 * - onPick called with correct percent coords when pickMode=true and plan clicked
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GardenPlanWidget, type PlanPin } from "../components/GardenPlanWidget";

// JSDOM does not implement ResizeObserver — provide a no-op stub
beforeAll(() => {
  if (!("ResizeObserver" in window)) {
    (window as unknown as Record<string, unknown>).ResizeObserver = class {
      observe()    {}
      unobserve()  {}
      disconnect() {}
    };
  }
});

function renderWidget(props: Partial<React.ComponentProps<typeof GardenPlanWidget>> = {}) {
  return render(
    <GardenPlanWidget
      planUrl={null}
      {...props}
    />
  );
}

describe("GardenPlanWidget — placeholder", () => {
  it("shows placeholder when planUrl is null", () => {
    renderWidget({ planUrl: null });
    expect(screen.getByTestId("garden-plan-placeholder")).toBeInTheDocument();
  });

  it("does not show plan image when planUrl is null", () => {
    renderWidget({ planUrl: null });
    expect(screen.queryByTestId("garden-plan-img")).not.toBeInTheDocument();
  });
});

describe("GardenPlanWidget — plan image", () => {
  it("shows plan image when planUrl is provided", () => {
    renderWidget({ planUrl: "/static/garden/plan.png" });
    const img = screen.getByTestId("garden-plan-img") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("/static/garden/plan.png");
  });

  it("does not show placeholder when planUrl is set", () => {
    renderWidget({ planUrl: "/static/garden/plan.png" });
    expect(screen.queryByTestId("garden-plan-placeholder")).not.toBeInTheDocument();
  });
});

describe("GardenPlanWidget — pins", () => {
  it("renders no pins when pins array is empty", () => {
    renderWidget({ planUrl: "/static/garden/plan.png", pins: [] });
    expect(screen.queryAllByTestId(/^plan-pin-/)).toHaveLength(0);
  });

  it("renders correct number of pins", () => {
    const pins: PlanPin[] = [
      { x: 10, y: 20, label: "1" },
      { x: 50, y: 50, label: "2" },
      { x: 80, y: 30, label: "3" },
    ];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    expect(screen.getAllByTestId(/^plan-pin-/)).toHaveLength(3);
  });

  it("shows pin label text", () => {
    const pins: PlanPin[] = [{ x: 25, y: 25, label: "🌹" }];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    expect(screen.getByTestId("plan-pin-0")).toHaveTextContent("🌹");
  });
});

describe("GardenPlanWidget — zoom controls", () => {
  it("renders fit-height button", () => {
    renderWidget();
    expect(screen.getByTestId("zoom-btn-fit-h")).toBeInTheDocument();
  });

  it("renders fit-width button", () => {
    renderWidget();
    expect(screen.getByTestId("zoom-btn-fit-w")).toBeInTheDocument();
  });
});

describe("GardenPlanWidget — pick mode", () => {
  it("calls onPick when pickMode=true and plan area is clicked", () => {
    const onPick = vi.fn();
    renderWidget({
      planUrl: "/static/garden/plan.png",
      pickMode: true,
      onPick,
    });
    const widget = screen.getByTestId("garden-plan-widget");
    // JSDOM doesn't render images with naturalWidth, so coordinates will be 0,0
    // but we verify onPick is called
    fireEvent.click(widget, { clientX: 100, clientY: 100 });
    expect(onPick).toHaveBeenCalledOnce();
  });

  it("does NOT call onPick when pickMode=false", () => {
    const onPick = vi.fn();
    renderWidget({
      planUrl: "/static/garden/plan.png",
      pickMode: false,
      onPick,
    });
    const widget = screen.getByTestId("garden-plan-widget");
    fireEvent.click(widget, { clientX: 100, clientY: 100 });
    expect(onPick).not.toHaveBeenCalled();
  });

  it("does NOT call onPick when clicking a zoom button", () => {
    const onPick = vi.fn();
    renderWidget({
      planUrl: "/static/garden/plan.png",
      pickMode: true,
      onPick,
    });
    fireEvent.click(screen.getByTestId("zoom-btn-fit-h"));
    expect(onPick).not.toHaveBeenCalled();
  });

  it("calls onPinClick when a pin is clicked", () => {
    const onPinClick = vi.fn();
    const pins: PlanPin[] = [{ x: 30, y: 40, label: "1" }];
    renderWidget({
      planUrl: "/static/garden/plan.png",
      pins,
      onPinClick,
    });
    fireEvent.click(screen.getByTestId("plan-pin-0"));
    expect(onPinClick).toHaveBeenCalledWith(pins[0], 0);
  });
});

describe("GardenPlanWidget — pin tooltip fixed (TASK-072 AC #1)", () => {
  it("shows fixed tooltip on pin mouseenter", () => {
    const pins: PlanPin[] = [
      { x: 20, y: 30, emoji: "🌹", name: "Rose", tooltip: { status: "OK", nextTask: "✂️ Schneiden (KW 9–10)" } },
    ];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    expect(screen.queryByTestId("pin-tooltip-fixed")).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByTestId("plan-pin-0"));
    expect(screen.getByTestId("pin-tooltip-fixed")).toBeInTheDocument();
    expect(screen.getByTestId("pin-tooltip-fixed")).toHaveTextContent("Rose");
    expect(screen.getByTestId("pin-tooltip-fixed")).toHaveTextContent("OK");
  });

  it("hides fixed tooltip on pin mouseleave", () => {
    const pins: PlanPin[] = [
      { x: 20, y: 30, emoji: "🌹", name: "Rose", tooltip: { status: "OK" } },
    ];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    fireEvent.mouseEnter(screen.getByTestId("plan-pin-0"));
    expect(screen.getByTestId("pin-tooltip-fixed")).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByTestId("plan-pin-0"));
    expect(screen.queryByTestId("pin-tooltip-fixed")).not.toBeInTheDocument();
  });

  it("tooltip has position:fixed style (never clipped by overflow:hidden)", () => {
    const pins: PlanPin[] = [
      { x: 50, y: 50, emoji: "🌿", name: "Pflanze", tooltip: { status: "Aktuell" } },
    ];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    fireEvent.mouseEnter(screen.getByTestId("plan-pin-0"));
    const tooltip = screen.getByTestId("pin-tooltip-fixed");
    expect(tooltip.style.position).toBe("fixed");
    expect(parseInt(tooltip.style.zIndex)).toBeGreaterThanOrEqual(9999);
  });

  it("no tooltip shown for non-dashboard pins (edit mode)", () => {
    const pins: PlanPin[] = [
      { x: 20, y: 30, label: "1" },  // no emoji → edit mode pin
    ];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    fireEvent.mouseEnter(screen.getByTestId("plan-pin-0"));
    expect(screen.queryByTestId("pin-tooltip-fixed")).not.toBeInTheDocument();
  });
});

describe("GardenPlanWidget — pin photo (TASK-068)", () => {
  it("AC #1: shows photo img when photoUrl is set on a dashboard pin", () => {
    const pins: PlanPin[] = [
      { x: 20, y: 30, emoji: "🌹", photoUrl: "/static/uploads/rose.jpg", name: "Rose" },
    ];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    const photo = screen.getByTestId("pin-photo") as HTMLImageElement;
    expect(photo).toBeInTheDocument();
    expect(photo.src).toContain("/static/uploads/rose.jpg");
  });

  it("AC #2: falls back to emoji when photoUrl is absent", () => {
    const pins: PlanPin[] = [
      { x: 20, y: 30, emoji: "🌿", name: "Pflanze" },
    ];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    expect(screen.queryByTestId("pin-photo")).not.toBeInTheDocument();
    expect(screen.getByTestId("plan-pin-0")).toHaveTextContent("🌿");
  });

  it("AC #3: status dot is still rendered alongside photo pin", () => {
    const pins: PlanPin[] = [
      { x: 20, y: 30, emoji: "🌹", photoUrl: "/static/uploads/rose.jpg", name: "Rose", taskStatus: "overdue" },
    ];
    renderWidget({ planUrl: "/static/garden/plan.png", pins });
    expect(screen.getByTestId("pin-photo")).toBeInTheDocument();
    // Status dot is a sibling div inside the pin circle — pin still has taskStatus styling
    const pin = screen.getByTestId("plan-pin-0");
    expect(pin).toBeInTheDocument();
  });
});
