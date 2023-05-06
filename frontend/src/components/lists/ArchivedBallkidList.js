import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActionArea,
  Grid,
  Button,
  Box,
} from "@mui/material";
import { AspectRatio } from "@mui/joy";
import { Icons, LayoutButtons, getAuthHeader, getLocalStorage } from "../Utils";

function renderUnarchiveButton(firstName, lastName, setUpdated) {
  return (
    <Button
      variant="outlined"
      color="success"
      size="small"
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
            is_active: true,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      Un-Archive
    </Button>
  );
}

export default function ArchivedBallkidList(props) {
  const [archived, setArchived] = useState([]);
  const [gridLayout, setGridLayout] = useState(
    getLocalStorage("gridLayout") ?? true
  );
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/archived-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setArchived(data.filter((ballkid) => ballkid.is_active === false));
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <div className="justify">
        <Typography variant="h4" sx={{ mb: 1 }}>
          Archived Ballkids
        </Typography>
        <LayoutButtons gridLayout={gridLayout} setGridLayout={setGridLayout} />
      </div>

      {archived.length === 0 ? (
        <Typography variant="body1">There are no ballkids to show.</Typography>
      ) : (
        <Grid container spacing={gridLayout ? 2 : 1}>
          {archived.map((ballkid) => (
            <Grid
              item
              key={ballkid.id}
              xs={gridLayout ? 6 : 12}
              sm={gridLayout ? 4 : 12}
              md={gridLayout ? 3 : 12}
              lg={gridLayout ? 2 : 12}
              xl={gridLayout ? 1 : 12}
            >
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
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: "medium" }}
                        >
                          {ballkid.first_name} {ballkid.last_name}
                        </Typography>
                        &thinsp;
                        <Icons ballkid={ballkid} margin={0} />
                      </div>
                      <Box textAlign="center" sx={{ mt: gridLayout ? 1 : 0 }}>
                        {renderUnarchiveButton(
                          ballkid.first_name,
                          ballkid.last_name,
                          setUpdated
                        )}
                      </Box>
                    </div>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
}
