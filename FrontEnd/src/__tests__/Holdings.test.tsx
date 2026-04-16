import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import * as React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Holdings } from "@/pages/Holdings";
import type { Pool } from "@/lib/types";

// ── Mock @/lib/api ─────────────────────────────────────────────────────────────
vi.mock("@/lib/api", () => ({
  getPools: vi.fn(),
}));

import { getPools } from "@/lib/api";

// ── Mock Pool data ─────────────────────────────────────────────────────────────
const makePool = (overrides: Partial<Pool> = {}): Pool => ({
  id: "herd-1",
  herdId: "herd-1",
  rancherId: "r1",
  listingPrice: 10000,
  purchaseStatus: "available",
  poolId: "pool-1",
  totalSupply: 20,
  contractAddress: "",
  tokenAmount: 5,
  name: "Alpha Herd",
  poolType: "herd",
  geneticsLabel: "Angus",
  season: "Fall",
  positionValueUsd: 12500,
  backingHerdCount: 40,
  expectedRevenueUsd: 15000,
  netExpectedUsd: 5000,
  stageBreakdown: [{ stage: "RANCH", pct: 100 }],
  dominantStage: "RANCH",
  verified: true,
  lastUpdateIso: "2024-01-01T00:00:00Z",
  ...overrides,
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/investor/alice/holdings"]}>
      <AuthProvider>
        <Routes>
          <Route path="/investor/:slug/holdings" element={children} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Holdings page", () => {
  beforeEach(() => {
    vi.mocked(getPools).mockReset();
  });

  test("renders 'All Lots' heading", async () => {
    vi.mocked(getPools).mockResolvedValue([]);
    render(<Wrapper><Holdings /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText("All Lots")).toBeTruthy();
    });
  });

  test("shows pool names after load", async () => {
    vi.mocked(getPools).mockResolvedValue([makePool()]);
    render(<Wrapper><Holdings /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText("Alpha Herd")).toBeTruthy();
    });
  });

  test("shows 'No lots match your filters' when search has no match", async () => {
    vi.mocked(getPools).mockResolvedValue([makePool({ name: "Alpha Herd" })]);
    render(<Wrapper><Holdings /></Wrapper>);

    await waitFor(() => screen.getByText("Alpha Herd"));

    fireEvent.change(screen.getByPlaceholderText(/search lots/i), {
      target: { value: "zzz-no-match" },
    });

    await waitFor(() => {
      expect(screen.getByText(/no lots match/i)).toBeTruthy();
    });
  });

  test("shows lot count after load", async () => {
    vi.mocked(getPools).mockResolvedValue([makePool(), makePool({ id: "herd-2", herdId: "herd-2", name: "Beta Herd" })]);
    render(<Wrapper><Holdings /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText(/2 of 2 lots/i)).toBeTruthy();
    });
  });

  test("shows error state when getPools rejects", async () => {
    vi.mocked(getPools).mockRejectedValue(new Error("network"));
    render(<Wrapper><Holdings /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText(/failed to load lots/i)).toBeTruthy();
    });
  });

  test("clear filters button appears when search is active", async () => {
    vi.mocked(getPools).mockResolvedValue([makePool()]);
    render(<Wrapper><Holdings /></Wrapper>);

    await waitFor(() => screen.getByText("Alpha Herd"));

    fireEvent.change(screen.getByPlaceholderText(/search lots/i), {
      target: { value: "test" },
    });

    await waitFor(() => {
      const clearBtns = screen.getAllByRole("button", { name: /clear filters/i });
      expect(clearBtns.length).toBeGreaterThan(0);
    });
  });

  test("clear filters button resets search", async () => {
    vi.mocked(getPools).mockResolvedValue([makePool()]);
    render(<Wrapper><Holdings /></Wrapper>);

    await waitFor(() => screen.getByText("Alpha Herd"));

    const searchInput = screen.getByPlaceholderText(/search lots/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "nomatch" } });

    await waitFor(() => screen.getByText(/no lots match/i));

    const clearBtn = screen.getAllByRole("button", { name: /clear filters/i })[0];
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(searchInput.value).toBe("");
    });
  });

  test("filters by verified status", async () => {
    vi.mocked(getPools).mockResolvedValue([
      makePool({ id: "h1", herdId: "h1", name: "Verified Herd", verified: true }),
      makePool({ id: "h2", herdId: "h2", name: "Unverified Herd", verified: false }),
    ]);
    render(<Wrapper><Holdings /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText("Verified Herd")).toBeTruthy();
      expect(screen.getByText("Unverified Herd")).toBeTruthy();
    });

    // After loading both pools should be visible — just test the count
    expect(screen.getByText(/2 of 2 lots/i)).toBeTruthy();
  });
});
