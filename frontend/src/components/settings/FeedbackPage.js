import React from "react";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import { TournamentBanner } from "../Utils";

export default function FeedbackPage() {
  return (
    <div className="page">
      <TournamentBanner />

      <Typography variant="h4" sx={{ mb: 1 }}>
        Got Feedback?
      </Typography>

      <Typography>
        Got any feedback on the tournament, captains, website, etc.? We would
        love to hear it!
        <br /> <br />
        Submit anonymous feedback{" "}
        <Link target="_blank" href="https://forms.gle/J9BH4jC94RxWzMm79">
          here
        </Link>{" "}
        or feel free to email{" "}
        <Link target="_blank" href="mailto:mubadalacitiopenballcrew@gmail.com">
          mubadalacitiopenballcrew@gmail.com
        </Link>
        .
      </Typography>
    </div>
  );
}
