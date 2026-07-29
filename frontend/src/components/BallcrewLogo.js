import React from "react";

import crestSrc from "../assets/mubadala-dc-open-crest.png";

/** Tournament crest mark (navbar, login, etc.). */
export default function BallcrewLogo({ height = 32, size }) {
  const px = size ?? height;

  return (
    <img
      src={crestSrc}
      alt="Mubadala DC Open"
      height={px}
      width={px}
      className="ballcrew-logo-img ballcrew-logo-img--crest"
      draggable={false}
    />
  );
}
