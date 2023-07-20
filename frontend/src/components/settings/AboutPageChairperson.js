import React from "react";

import Typography from "@mui/material/Typography";

import { TabbedSections } from "../Utils";

function AboutSchedule() {
  return "";
}

export default function AboutPageChairperson() {
  const sections = {
    Schedule: <AboutSchedule />,
  };

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 1 }}>
        About this Website
      </Typography>

      <TabbedSections sections={sections} />
    </div>
  );
}
