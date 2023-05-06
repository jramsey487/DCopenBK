import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActionArea,
  Grid,
} from "@mui/material";
import { AspectRatio } from "@mui/joy";
import { Icons, LayoutButtons, getAuthHeader, getLocalStorage } from "../Utils";

export default function BallkidList(props) {
  const [ballkids, setBallkids] = useState([]);
  const [gridLayout, setGridLayout] = useState(
    getLocalStorage("gridLayout") ?? true
  );

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data));
  }, []);

  return (
    <div className="page">
      <div className="justify">
        <Typography variant="h4" sx={{ mb: 1 }}>
          List by Name
        </Typography>
        <LayoutButtons gridLayout={gridLayout} setGridLayout={setGridLayout} />
      </div>
      <Typography>
        {ballkids.length > 0 ? "" : "There are no ballkids to show."}
      </Typography>
      <Grid container spacing={gridLayout ? 2 : 1}>
        {ballkids.map((ballkid) => (
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
                    <Typography variant="body2" color="text.secondary">
                      {ballkid.preferred_position}
                    </Typography>
                  </div>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
}
