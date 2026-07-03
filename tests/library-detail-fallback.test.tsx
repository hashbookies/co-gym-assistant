// @vitest-environment jsdom
// Phase 3E, item 7: the library detail page for an exercise with no media must
// still render — instructions intact, a graceful "Demo unavailable" media
// frame, no crash, no broken image icon.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { LibraryExercise } from "@/lib/types";

const NO_MEDIA_EXERCISE: LibraryExercise = {
  slug: "obscure-move", displayName: "Obscure Move", equipment: "bodyweight",
  movementPattern: "squat", splitTag: "legs", bodyRegion: "lower",
  primaryMuscle: "quads", difficulty: "beginner", homeSuitable: true,
  lowEnergyFriendly: true, inGeneratorPool: false,
  thumb: "", requiresAnchor: false, requiresBench: false, requiresPullupBar: false,
  requiresDoorSetup: false, requiresSpecialEquipment: false,
  sourceId: "x", bodyPart: "upper legs", equipmentRaw: "body weight",
  secondaryMuscles: ["glutes"],
  instructionsEn: "Stand tall. Lower down. Drive up.",
  instructionStepsEn: ["Stand tall with feet hip-width.", "Lower under control.", "Drive back up to standing."],
  image: "", // no media at all
  gifUrl: "",
};

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={typeof href === "string" ? href : "#"}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/lib/data/library", () => ({ getExerciseBySlug: () => NO_MEDIA_EXERCISE }));
vi.mock("@/lib/data/pool", () => ({ getPoolExercise: () => undefined }));

import ExerciseDetailPage from "@/app/library/[slug]/page";

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("Library detail page with no media", () => {
  it("renders the exercise, its instructions, and a graceful media frame — no img", () => {
    const { container } = render(<ExerciseDetailPage params={{ slug: "obscure-move" }} />);

    // Title + instructions still render.
    expect(screen.getByText("Obscure Move")).toBeInTheDocument();
    expect(screen.getByText("Stand tall with feet hip-width.")).toBeInTheDocument();
    expect(screen.getByText("Drive back up to standing.")).toBeInTheDocument();

    // Media frame degrades gracefully — "Demo unavailable", no broken img icon.
    expect(screen.getByText(/demo unavailable/i)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
