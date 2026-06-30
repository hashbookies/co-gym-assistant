"use client";

import { useState } from "react";

/**
 * Safe exercise media. Shows the animated gif (lazy), with the static jpg as a
 * poster/fallback and a neutral placeholder if a file is missing. Plain <img>
 * is used on purpose: next/image does not optimize animated gifs, and these are
 * local static assets served from /public.
 */
export default function ExerciseMedia({
  gif,
  image,
  alt,
}: {
  gif?: string;
  image?: string;
  alt: string;
}) {
  const primary = gif || image || "";
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(!primary);

  if (failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-100 text-4xl">
        🏋️
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="aspect-square w-full rounded-xl bg-slate-100 object-cover"
      onError={() => {
        // gif failed -> try the static image; if that fails too, show placeholder.
        if (image && src !== image) setSrc(image);
        else setFailed(true);
      }}
    />
  );
}
