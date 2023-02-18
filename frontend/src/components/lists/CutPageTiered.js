import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActionArea,
  Grid,
  Box,
  Button,
} from "@mui/material";
import { AspectRatio } from "@mui/joy";
import {
  Icons,
  LayoutButtons,
  getAuthHeader,
  getSessionStorage,
} from "../Utils";
import { MARGINS } from "../Consts";

function renderButton(firstName, lastName, newCutStatus, setUpdated) {
  var cutString = "";
  var color = "";

  switch (newCutStatus) {
    case "true":
      cutString = "Cut";
      color = "error";
      break;
    case "false":
      cutString = "Un-cut";
      color = "success";
      break;
    case "pending":
      cutString = "Pending";
      color = "warning";
      break;
    default:
      console.log("Unrecognized cut status: " + newCutStatus);
  }

  return (
    <Button
      key={firstName + lastName + newCutStatus}
      variant="outlined"
      color={color}
      size="small"
      sx={{ mx: 0.2 }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            cut_status: newCutStatus,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      {cutString}
    </Button>
  );
}

function renderCutAllButton(setUpdated) {
  return (
    <Button
      variant="contained"
      color="error"
      onClick={() => {
        fetch("/api/cut-all", {
          method: "PATCH",
          headers: getAuthHeader(),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      Cut All
    </Button>
  );
}

function renderBallkid(ballkid, section, gridLayout, setUpdated) {
  const buttons = {
    active: ["pending", "true"],
    pending: ["false", "true"],
    cut: ["false"],
  };

  return (
    <Card>
      <CardActionArea href={`ballkid/${ballkid.id}`}>
        {!gridLayout ? (
          ""
        ) : (
          <AspectRatio ratio="1/1">
            <CardMedia component="img" image={ballkid.image} />
          </AspectRatio>
        )}
        <CardContent>
          <div className={gridLayout ? "" : "justify"}>
            <div className={gridLayout ? "justify" : "sxs"}>
              <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                {ballkid.first_name} {ballkid.last_name}
              </Typography>
              &thinsp;
              <Icons ballkid={ballkid} margin={0} />
            </div>
            <Box textAlign="center" sx={{ mt: gridLayout ? 1 : 0 }}>
              <div className="sxs-center">
                {buttons[section].map((newCutStatus) =>
                  renderButton(
                    ballkid.first_name,
                    ballkid.last_name,
                    newCutStatus,
                    setUpdated
                  )
                )}
              </div>
            </Box>
          </div>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function renderBallkids(ballkids, section, gridLayout, setUpdated) {
  const emptyString = {
    active: "There are currently no active ballkids.",
    pending: "There are currently no pending cut ballkids.",
    cut: "There are currently no cut ballkids.",
  };

  return ballkids.length === 0 ? (
    <Typography variant="body1">{emptyString[section]}</Typography>
  ) : (
    <Grid container spacing={gridLayout ? 2 : 1}>
      {ballkids.map((ballkid) => (
        <Grid
          item
          key={ballkid.id}
          xs={gridLayout ? 4 : 12}
          sm={gridLayout ? 3 : 12}
          md={gridLayout ? 2 : 12}
          lg={gridLayout ? 2 : 12}
          xl={gridLayout ? 1 : 12}
        >
          {renderBallkid(ballkid, section, gridLayout, setUpdated)}
        </Grid>
      ))}
    </Grid>
  );
}

export default function CutPageTiered(props) {
  const [active, setActive] = useState([]);
  const [cut, setCut] = useState([]);
  const [pending, setPending] = useState([]);
  const [gridLayout, setGridLayout] = useState(
    getSessionStorage("gridLayout") ?? true
  );
  const [updated, setUpdated] = useState(false);

  const sections = [
    ["active", active, "Active"],
    ["pending", pending, "Definitely Keep"],
    ["pending", pending, "Possibly Keep"],
    ["pending", pending, "Possibly Cut"],
    ["pending", pending, "Definitely Cut"],
    ["cut", cut, "Cut"],
  ];

  useEffect(() => {
    fetch("/api/all-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setActive(data.filter((ballkid) => ballkid.is_cut === "false"));
        setCut(data.filter((ballkid) => ballkid.is_cut === "true"));
        setPending(data.filter((ballkid) => ballkid.is_cut === "pending"));
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <div className="justify">
        <Typography variant="h4" sx={{ mb: 1 }}>
          Cut
        </Typography>
        <LayoutButtons gridLayout={gridLayout} setGridLayout={setGridLayout} />
      </div>

      {sections.map((section) => (
        <div key={section[0]}>
          <div className="justify">
            <div className="sxs" key={section[1]}>
              <Typography variant="h5" sx={MARGINS}>
                {section[2]} Ballkids
              </Typography>
              <Typography variant="h6" sx={MARGINS}>
                &emsp; ({section[1].length})
              </Typography>
            </div>
            {section[0] === "pending" &&
              section[1].length > 0 &&
              renderCutAllButton(setUpdated)}
          </div>
          {renderBallkids(section[1], section[0], gridLayout, setUpdated)}
        </div>
      ))}
    </div>
  );
}
