import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

// Hosted in R2 (same bucket as headshots, different key) rather than as a
// frontend static asset, specifically so updating the handbook is just
// re-uploading a file to this key in the Cloudflare dashboard -- no code
// change, no rebuild, no redeploy. If you ever move the file, this is the
// one place to update.
const HANDBOOK_URL =
  "https://pub-3203050108b845799ef8019d6b3dd563.r2.dev/handbook/ballcrew-handbook.pdf";

// Public, reachable whether logged in or not -- tryoutees need this before
// they're anyone in the system at all, and current ballkids/captains use it
// as a reference.
export default function HandbookPage() {
  return (
    <Box className="page" sx={{ maxWidth: 900, mx: "auto", mt: 2, px: 2 }}>
      <Paper sx={{ p: 2, mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Ball Crew Handbook</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            component="a"
            href={HANDBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in New Tab
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            component="a"
            href={HANDBOOK_URL}
            download
          >
            Download
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 0, overflow: "hidden", height: "80vh" }}>
        <iframe
          src={HANDBOOK_URL}
          title="Ball Crew Handbook"
          width="100%"
          height="100%"
          style={{ border: "none" }}
        />
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
        Having trouble viewing it here? Use "Open in New Tab" above -- some mobile browsers
        don't support embedded PDFs.
      </Typography>
    </Box>
  );
}
