"use client";

import { useState } from "react";

/**
 * Safe exercise media. Plain <img> on purpose: next/image does not optimize
 * animated gifs, and these are local static assets served from /public.
 *
 * mode:
 *  - "eager"    (default): show the gif immediately, falling back to the static
 *    image, then a neutral placeholder. Used on the Exercise Detail page.
 *  - "lazyDemo": show a static thumbnail by default with a "Play demo" toggle;
 *    the gif is only loaded when the user taps it (the /videos folder is large,
 *    so gifs must never auto-load). Used on workout cards.
 */
export default function ExerciseMedia({
  gif,
  image,
  alt,
  mode = "eager",
}: {
  gif?: string;
  image?: string;
  alt: string;
  mode?: "eager" | "lazyDemo";
}) {
  const [imgFailed, setImgFailed] = useState(!image);
  const [gifFailed, setGifFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  const Placeholder = () => (
    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-slate-100 text-4xl">
      🏋️
    </div>
  );

  // ---- Eager (detail page): gif first, fallback image, fallback placeholder ----
  if (mode === "eager") {
    const primary = gif || image || "";
    if (!primary) return <Placeholder />;
    return <EagerImg primary={primary} image={image} alt={alt} />;
  }

  // ---- Lazy demo (workout cards) ----
  const hasGif = !!gif && !gifFailed;
  const showGif = playing && hasGif;

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        {showGif ? (
          <img
            src={gif}
            alt={alt}
            className="aspect-[4/3] w-full object-contain"
            onError={() => { setGifFailed(true); setPlaying(false); }}
          />
        ) : imgFailed ? (
          <Placeholder />
        ) : (
          <img
            src={image}
            alt={alt}
            loading="lazy"
            className="aspect-[4/3] w-full object-contain"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      {hasGif && (
        <button
          onClick={() => setPlaying((p) => !p)}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-600"
        >
          {playing ? "■ Hide demo" : "▶ Play demo"}
        </button>
      )}
    </div>
  );
}

// Eager variant kept separate so detail-page behavior is unchanged.
function EagerImg({ primary, image, alt }: { primary: string; image?: string; alt: string }) {
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-100 text-4xl">🏋️</div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="aspect-square w-full rounded-xl bg-slate-100 object-cover"
      onError={() => {
        if (image && src !== image) setSrc(image);
        else setFailed(true);
      }}
    />
  );
}
