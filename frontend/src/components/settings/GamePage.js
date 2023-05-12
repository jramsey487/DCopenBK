import React, { useEffect } from "react";

import Typography from "@mui/material/Typography";

export default function GamePage(props) {
  useEffect(() => {
    var gameScript = document.createElement("script");
    gameScript.src =
      "https://jtiosue.github.io/pages/computerscience/media/flappybird.js";
    gameScript.async = true;
    document.body.appendChild(gameScript);

    return () => {
      document.body.removeChild(gameScript);
    };
  }, []);

  return (
    <div className="page">
      <div className="center" style={{ textAlign: "center", top: "50%" }}>
        <Typography variant="h3" sx={{ my: 2 }}>
          Game
        </Typography>
        {/* <script src="https://jtiosue.github.io/pages/computerscience/media/flappybird.js"></script> */}
        <div align="center" id="game">
          <canvas id="canvas"></canvas>
        </div>
        <Typography variant="body1" sx={{ my: 1 }}>
          Click anywhere on the game to jump or restart. If you are on mobile,
          it is best to tilt the phone to landscape mode and then refresh the
          page.
        </Typography>
      </div>
    </div>
  );
}
