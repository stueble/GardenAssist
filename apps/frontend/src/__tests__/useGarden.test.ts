/**
 * useGarden singleton hook tests (TASK-060).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGarden, invalidateGarden, getGardenSnapshot, _resetGardenForTest } from "../hooks/useGarden";
import type { Garden } from "@api/garden";

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null,
  plants: [], attachments: [], journal_entries: [], warnings: [],
};

vi.mock("../api/client", () => ({
  apiClient: {
    getGarden: vi.fn().mockResolvedValue({
      plan_url: null, plan_name: null,
      plants: [], attachments: [], journal_entries: [], warnings: [],
    }),
  },
}));

beforeEach(() => {
  _resetGardenForTest();
  vi.clearAllMocks();
});

describe("useGarden — initial fetch", () => {
  it("starts with loading: true, garden: null", () => {
    const { result } = renderHook(() => useGarden());
    expect(result.current.loading).toBe(true);
    expect(result.current.garden).toBeNull();
  });

  it("resolves to garden data after fetch", async () => {
    const { result } = renderHook(() => useGarden());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.garden).toEqual(MOCK_GARDEN);
  });

  it("calls getGarden exactly once even with multiple subscribers", async () => {
    const { apiClient } = await import("../api/client");
    renderHook(() => useGarden());
    renderHook(() => useGarden());
    await waitFor(() => expect((apiClient.getGarden as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1));
  });
});

describe("useGarden — invalidateGarden", () => {
  it("triggers a re-fetch and updates garden state", async () => {
    const { apiClient } = await import("../api/client");
    const freshGarden: Garden = { ...MOCK_GARDEN, plan_name: "Updated" };
    (apiClient.getGarden as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(MOCK_GARDEN)
      .mockResolvedValueOnce(freshGarden);

    const { result } = renderHook(() => useGarden());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.garden?.plan_name).toBeNull();

    act(() => { invalidateGarden(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.garden?.plan_name).toBe("Updated");
    expect((apiClient.getGarden as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });
});

describe("getGardenSnapshot", () => {
  it("returns null before fetch completes", () => {
    expect(getGardenSnapshot()).toBeNull();
  });

  it("returns garden after fetch completes", async () => {
    const { result } = renderHook(() => useGarden());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getGardenSnapshot()).toEqual(MOCK_GARDEN);
  });
});
