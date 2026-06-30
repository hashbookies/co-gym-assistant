// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock Next.js client hooks/components so page modules render in isolation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={typeof href === "string" ? href : "#"}>{children}</a>,
}));

import DashboardPage from "@/app/page";
import GeneratorPage from "@/app/generator/page";
import LibraryPage from "@/app/library/page";

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("smoke: core routes render without crashing", () => {
  it("renders the dashboard", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  });

  it("renders the generator", () => {
    render(<GeneratorPage />);
    expect(screen.getByRole("heading", { name: /Workout Generator/i })).toBeInTheDocument();
  });

  it("renders the library route with data", () => {
    render(<LibraryPage />);
    expect(screen.getByRole("heading", { name: /Exercise Library/i })).toBeInTheDocument();
    // The slim library list loaded (>= one result line rendered).
    expect(screen.getByText(/results/i)).toBeInTheDocument();
  });
});
