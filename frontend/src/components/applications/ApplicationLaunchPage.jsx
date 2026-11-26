import React from "react";
import { Alert, Box, Paper, Step, StepLabel, Stepper, Typography } from "@mui/material";

/**
 * Chairperson workflow for preparing and launching a new application season.
 * Data and send actions will be connected in the next implementation slice.
 */
export default function ApplicationLaunchPage() {
  const steps = [
    "Review previous-year veterans",
    "Set invitation / tryout decisions",
    "Preview and send messages",
    "Open applications and notify the interest list",
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Application Launch
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Prepare the returning-veteran invitations and application-opening
        messages together, then launch when everything is ready.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This workflow is being set up. No invitations or emails are sent from
        this page yet.
      </Alert>

      <Stepper orientation="vertical" activeStep={0}>
        {steps.map((label, index) => (
          <Step key={label} completed={false}>
            <StepLabel>
              <Box>
                <Typography fontWeight={600}>{label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {[
                    "Load the prior season's roster and identify who was a veteran.",
                    "Choose who is invited back and who must attend a tryout.",
                    "Review the recipient groups and email wording before sending.",
                    "Open the public application and send the application-ready notice.",
                  ][index]}
                </Typography>
              </Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
}
