// @vitest-environment jsdom
// Phase 3E: loading skeleton smoke tests and library thumbnail fallback.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SkeletonCard, SkeletonList, SkeletonStack } from "@/components/Skeleton";
import LibraryBrowser from "@/app/library/LibraryBrowser";
import type { LibraryCard } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={typeof href === "string" ? href : "#"}>{children}</a>,
}));

beforeEach(() => cleanup());
afterEach(() => cleanup());

// ---- Skeleton component smoke tests ----------------------------------------

describe("Skeleton components", () => {
  it("SkeletonCard renders a pulsing card without crashing", () => {
    const { container } = render(<SkeletonCard />);
    // aria-hidden keeps it out of the accessible tree — use container query
    expect(container.firstChild).toBeTruthy();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("SkeletonList renders the requested number of rows", () => {
    const { container } = render(<SkeletonList rows={4} />);
    expect(container.querySelectorAll("li")).toHaveLength(4);
  });

  it("SkeletonList defaults to 3 rows", () => {
    const { container } = render(<SkeletonList />);
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });

  it("SkeletonStack renders two pulsing cards", () => {
    const { container } = render(<SkeletonStack />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });
});

// ---- Library thumbnail fallback --------------------------------------------

function card(slug: string, thumb: string): LibraryCard {
  return {
    slug, displayName: slug, equipment: "bodyweight", movementPattern: "squat",
    splitTag: "legs", bodyRegion: "lower", primaryMuscle: "quads",
    difficulty: "beginner", homeSuitable: true, lowEnergyFriendly: true,
    inGeneratorPool: true, thumb,
    requiresAnchor: false, requiresBench: false, requiresPullupBar: false,
    requiresDoorSetup: false, requiresSpecialEquipment: false,
  };
}

describe("Library thumbnail fallback", () => {
  it("renders the img when the src is valid", () => {
    const exercises = [card("squat", "/runtime-media/images/0001-abc.jpg")];
    const { container } = render(<LibraryBrowser exercises={exercises} />);
    // alt="" makes it presentational (not in accessible tree) — query via DOM
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("replaces the broken img with a neutral placeholder div after all candidates error", () => {
    const exercises = [card("squat", "/runtime-media/images/missing.jpg")];
    const { container } = render(<LibraryBrowser exercises={exercises} />);

    // getMediaCandidates for a /runtime-media path produces two candidates
    // (runtimePath and localPath both resolve to the same path), so we need
    // two onError events to exhaust the list.
    let img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    fireEvent.error(img!);

    img = container.querySelector("img");
    if (img) fireEvent.error(img);

    // After exhausting all candidates, only the neutral fallback div remains
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".h-12.w-12.rounded-xl")).toBeTruthy();
  });
});
