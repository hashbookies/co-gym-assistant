// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/generator",
}));

import GeneratorPage from "@/app/generator/page";

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  push.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GeneratorPage: save-current-workout failure is visible, not silent", () => {
  it("shows an inline error and does not navigate away when saveCurrentWorkout fails", () => {
    render(<GeneratorPage />);
    fireEvent.click(screen.getByRole("button", { name: /generate workout/i }));

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    fireEvent.click(screen.getByRole("button", { name: /set as today's workout/i }));
    setItemSpy.mockRestore();

    expect(screen.getByText(/could not save this workout\. your browser storage may be full\./i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    // The generated workout is still visible so the user can retry.
    expect(screen.getByRole("button", { name: /set as today's workout/i })).toBeInTheDocument();
  });

  it("navigates to /today on a successful save, with no error shown", () => {
    render(<GeneratorPage />);
    fireEvent.click(screen.getByRole("button", { name: /generate workout/i }));
    fireEvent.click(screen.getByRole("button", { name: /set as today's workout/i }));

    expect(push).toHaveBeenCalledWith("/today");
    expect(screen.queryByText(/could not save/i)).not.toBeInTheDocument();
  });
});
