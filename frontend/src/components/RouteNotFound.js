import React from "react";
import Typography from "@mui/material/Typography";

export default function RouteNotFound(props) {
  return (
    <div className="page">
      <div className="center" style={{ textAlign: "center", top: "50%" }}>
        <Typography variant="h2">404</Typography>
        <Typography variant="h4" sx={{ my: 1 }}>
          Page Not Found
        </Typography>
      </div>
    </div>
  );
}
