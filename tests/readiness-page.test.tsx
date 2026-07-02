// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/readiness",
}));

import ReadinessPage from "@/app/readiness/page";

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReadinessPage: save failure is visible, never a crash, result still shown", () => {
  it("shows an inline error and still displays the recommendation when saveReadiness fails", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    render(<ReadinessPage />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: /see recommendation/i }))).not.toThrow();
    setItemSpy.mockRestore();

    expect(screen.getByText(/could not save readiness check\. your browser storage may be full\./i)).toBeInTheDocument();
    // The result is still readable in memory even though the save failed.
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
  });

  it("shows no error and the recommendation on a successful save", () => {
    render(<ReadinessPage />);
    fireEvent.click(screen.getByRole("button", { name: /see recommendation/i }));

    expect(screen.queryByText(/could not save/i)).not.toBeInTheDocument();
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
  });
});
