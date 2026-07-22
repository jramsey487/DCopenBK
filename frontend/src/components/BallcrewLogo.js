import React from "react";

import crestSrc from "../assets/mubadala-dc-open-crest.png";
import lockupSrc from "../assets/mubadala-dc-open-logo.png";

/** Tournament mark: circular crest (login) or horizontal lockup. */
export default function BallcrewLogo({ variant = "lockup", height = 32 }) {
  const crest = variant === "crest";
  const src = crest ? crestSrc : lockupSrc;

  return (
    <img
      src={src}
      alt="Mubadala DC Open"
      height={height}
      width={crest ? height : undefined}
      className={
        crest ? "ballcrew-logo-img ballcrew-logo-img--crest" : "ballcrew-logo-img"
      }
      draggable={false}
    />
  );
}
