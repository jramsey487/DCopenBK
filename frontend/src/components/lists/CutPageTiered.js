import React, { useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  IconButton,
  Button,
  Link,
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Clear, Dangerous, ReportOff } from "@mui/icons-material";
import { getAuthHeader, Icons } from "../Utils";
import { CUT_STATUSES } from "../Consts";

function getColor(section) {}

function DraggableBallkidAndIcon({ ballkid }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ballkid",
    item: { ...ballkid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="sxs">
        <Link variant="body2" href={`ballkid/${ballkid.id}`}>
          {ballkid.first_name} {ballkid.last_name}
        </Link>
        &thinsp;
        <Icons ballkid={ballkid} margin={0} />
      </div>
    </div>
  );
}

function CutStatusSection({ section, active, setUpdated }) {
  const cutAll = section.includes("Cut") ? true : false;
  const cutAllStr = section.includes("Cut") ? "Cut All" : "Keep All";
  const cutAllColor = section.includes("Cut") ? "error" : "success";
  const cutAllVariant = section.includes("Cut") ? "contained" : "outlined";

  const positions = ["Back", "Net"];

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          cut_status: section,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid item xs={6} sm={6} md={4} lg={3} xl={2} ref={dropRef}>
      <Card sx={{ mb: 2 }} elevation={isOver ? 10 : 1}>
        <CardContent>
          <div className="justify">
            <Typography variant="h6">{section}</Typography>
            <Button
              size="small"
              color={cutAllColor}
              variant={cutAllVariant}
              onClick={(e) => {
                fetch("/api/cut-all", {
                  method: "PATCH",
                  headers: getAuthHeader(),
                  body: JSON.stringify({
                    cut_status: section,
                    cut_all: cutAll,
                  }),
                })
                  .then((response) => response.json())
                  .then(() => setUpdated(true));
              }}
            >
              {cutAllStr}
            </Button>
          </div>
          {positions.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <Typography variant="subtitle1">{position}s:</Typography>
              {renderBallkidsInSection(active, section, position, setUpdated)}
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

function renderBallkidsInSection(active, section, position, setUpdated) {
  return (
    <div>
      {active.map((ballkid) =>
        ballkid.cut_status === section && ballkid.position === position ? (
          <div key={`ballkid${ballkid.id}`} className="justify">
            {<DraggableBallkidAndIcon ballkid={ballkid} />}
            <div className="sxs">
              {!section.includes("Cut") ? (
                ""
              ) : (
                <IconButton
                  variant="outlined"
                  label="Cut"
                  color="error"
                  size="small"
                  onClick={(e) => {
                    fetch("/api/update-ballkid", {
                      method: "PATCH",
                      headers: getAuthHeader(),
                      body: JSON.stringify({
                        first_name: ballkid.first_name,
                        last_name: ballkid.last_name,
                        is_cut: true,
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => setUpdated(true));
                  }}
                >
                  <Dangerous />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={(e) => {
                  fetch("/api/update-ballkid", {
                    method: "PATCH",
                    headers: getAuthHeader(),
                    body: JSON.stringify({
                      first_name: ballkid.first_name,
                      last_name: ballkid.last_name,
                      cut_status: "",
                    }),
                  })
                    .then((response) => response.json())
                    .then(() => setUpdated(true));
                }}
              >
                <Clear />
              </IconButton>
            </div>
          </div>
        ) : (
          ""
        )
      )}
    </div>
  );
}

function renderAssignCutButton(ballkid, section, setUpdated) {
  var color;
  switch (section) {
    case "Definitely Keep":
      color = "success";
      break;
    case "Possibly Keep":
      color = "primary";
      break;
    case "Possibly Cut":
      color = "warning";
      break;
    case "Definitely Cut":
      color = "error";
      break;
    default:
      console.log("Unrecognized cut status: " + section);
  }

  return (
    <Button
      key={section}
      sx={{ m: 0.2 }}
      size="small"
      color={color}
      variant="outlined"
      onClick={(e) => {
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: ballkid.first_name,
            last_name: ballkid.last_name,
            cut_status: section,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      {section}
    </Button>
  );
}

function ActiveSection({ active, sections, setUpdated }) {
  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          cut_status: "",
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div>
      <Typography variant="h5" sx={{ mt: 2, mb: 2 }}>
        Active Ballkids
      </Typography>
      {active.length === 0 ? (
        <Typography>
          There are currently no active ballkids left to categorize.
        </Typography>
      ) : (
        <TableContainer
          component={Paper}
          ref={dropRef}
          elevation={isOver ? 10 : 1}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Preferred Position</TableCell>
                <TableCell align="right">Mark As</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {active.map((ballkid) =>
                ballkid.cut_status !== "" ? (
                  ""
                ) : (
                  <TableRow key={ballkid.id}>
                    <TableCell component="th" scope="row">
                      {<DraggableBallkidAndIcon ballkid={ballkid} />}
                    </TableCell>
                    <TableCell>{ballkid.preferred_position}</TableCell>
                    <TableCell align="right">
                      {sections.map((section) =>
                        renderAssignCutButton(ballkid, section, setUpdated)
                      )}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

function CutSection({ cut, setUpdated }) {
  return (
    <div>
      <Typography variant="h5" sx={{ mt: 2, mb: 2 }}>
        Cut Ballkids
      </Typography>
      {cut.length === 0 ? (
        <Typography>There are currently no cut ballkids.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Preferred Position</TableCell>
                <TableCell align="right">Un-Cut?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cut.map((ballkid) => (
                <TableRow key={ballkid.id}>
                  <TableCell component="th" scope="row">
                    {<DraggableBallkidAndIcon ballkid={ballkid} />}
                  </TableCell>
                  <TableCell>{ballkid.preferred_position}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      variant="outlined"
                      label="Cut"
                      color="success"
                      size="small"
                      onClick={(e) => {
                        fetch("/api/update-ballkid", {
                          method: "PATCH",
                          headers: getAuthHeader(),
                          body: JSON.stringify({
                            first_name: ballkid.first_name,
                            last_name: ballkid.last_name,
                            is_cut: false,
                          }),
                        })
                          .then((response) => response.json())
                          .then(() => setUpdated(true));
                      }}
                    >
                      <ReportOff />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

export default function CutPageTiered(props) {
  const [active, setActive] = useState([]);
  const [cut, setCut] = useState([]);
  const [updated, setUpdated] = useState(false);

  const sections = Object.keys(CUT_STATUSES).map((key) => CUT_STATUSES[key]);

  useEffect(() => {
    fetch("/api/all-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setActive(data.filter((ballkid) => !ballkid.is_cut));
        setCut(data.filter((ballkid) => ballkid.is_cut));
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 1 }}>
        Cut Page
      </Typography>

      <Grid container spacing={2}>
        {sections.map((section) => (
          <CutStatusSection
            key={section}
            section={section}
            active={active}
            setUpdated={setUpdated}
          />
        ))}
      </Grid>

      <ActiveSection
        active={active}
        sections={sections}
        setUpdated={setUpdated}
      />

      <CutSection cut={cut} setUpdated={setUpdated} />
    </div>
  );
}

// import React, { useState, useEffect } from "react";
// import {
//   Card,
//   CardContent,
//   CardMedia,
//   Typography,
//   CardActionArea,
//   Grid,
//   Box,
//   Button,
// } from "@mui/material";
// import { AspectRatio } from "@mui/joy";
// import {
//   Icons,
//   LayoutButtons,
//   getAuthHeader,
//   getSessionStorage,
// } from "../Utils";
// import { MARGINS } from "../Consts";

// function renderButton(firstName, lastName, newCutStatus, setUpdated) {
//   var cutString = "";
//   var color = "";

//   switch (newCutStatus) {
//     case "true":
//       cutString = "Cut";
//       color = "error";
//       break;
//     case "false":
//       cutString = "Un-cut";
//       color = "success";
//       break;
//     case "pending":
//       cutString = "Pending";
//       color = "warning";
//       break;
//     default:
//       console.log("Unrecognized cut status: " + newCutStatus);
//   }

//   return (
//     <Button
//       key={firstName + lastName + newCutStatus}
//       variant="outlined"
//       color={color}
//       size="small"
//       sx={{ mx: 0.2 }}
//       onMouseDown={(e) => e.stopPropagation()}
//       onClick={(e) => {
//         e.stopPropagation();
//         e.preventDefault();
//         fetch("/api/update-ballkid", {
//           method: "PATCH",
//           headers: getAuthHeader(),
//           body: JSON.stringify({
//             first_name: firstName,
//             last_name: lastName,
//             cut_status: newCutStatus,
//           }),
//         })
//           .then((response) => response.json())
//           .then(() => setUpdated(true));
//       }}
//     >
//       {cutString}
//     </Button>
//   );
// }

// function renderCutAllButton(setUpdated) {
//   return (
//     <Button
//       variant="contained"
//       color="error"
//       onClick={() => {
//         fetch("/api/cut-all", {
//           method: "PATCH",
//           headers: getAuthHeader(),
//         })
//           .then((response) => response.json())
//           .then(() => setUpdated(true));
//       }}
//     >
//       Cut All
//     </Button>
//   );
// }

// function renderBallkid(ballkid, section, gridLayout, setUpdated) {
//   const buttons = {
//     active: ["pending", "true"],
//     pending: ["false", "true"],
//     cut: ["false"],
//   };

//   return (
//     <Card>
//       <CardActionArea href={`ballkid/${ballkid.id}`}>
//         {!gridLayout ? (
//           ""
//         ) : (
//           <AspectRatio ratio="1/1">
//             <CardMedia component="img" image={ballkid.image} />
//           </AspectRatio>
//         )}
//         <CardContent>
//           <div className={gridLayout ? "" : "justify"}>
//             <div className={gridLayout ? "justify" : "sxs"}>
//               <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
//                 {ballkid.first_name} {ballkid.last_name}
//               </Typography>
//               &thinsp;
//               <Icons ballkid={ballkid} margin={0} />
//             </div>
//             <Box textAlign="center" sx={{ mt: gridLayout ? 1 : 0 }}>
//               <div className="sxs-center">
//                 {/* {buttons[section].map((newCutStatus) =>
//                   renderButton(
//                     ballkid.first_name,
//                     ballkid.last_name,
//                     newCutStatus,
//                     setUpdated
//                   )
//                 )} */}
//               </div>
//             </Box>
//           </div>
//         </CardContent>
//       </CardActionArea>
//     </Card>
//   );
// }

// function renderBallkids(ballkids, section, gridLayout, setUpdated) {
//   const emptyString = {
//     active: "There are currently no active ballkids.",
//     pending: "There are currently no pending cut ballkids.",
//     cut: "There are currently no cut ballkids.",
//   };

//   return ballkids.length === 0 ? (
//     <Typography variant="body1">{emptyString[section]}</Typography>
//   ) : (
//     <Grid container spacing={gridLayout ? 2 : 1}>
//       {ballkids.map((ballkid) => (
//         <Grid
//           item
//           key={ballkid.id}
//           xs={gridLayout ? 4 : 12}
//           sm={gridLayout ? 3 : 12}
//           md={gridLayout ? 2 : 12}
//           lg={gridLayout ? 2 : 12}
//           xl={gridLayout ? 1 : 12}
//         >
//           {renderBallkid(ballkid, section, gridLayout, setUpdated)}
//         </Grid>
//       ))}
//     </Grid>
//   );
// }

// export default function CutPageTiered(props) {
//   const [active, setActive] = useState([]);
//   const [cut, setCut] = useState([]);

//   const [none, setNone] = useState([]);
//   const [definitelyKeep, setDefinitelyKeep] = useState([]);
//   const [possiblyKeep, setPossiblyKeep] = useState([]);
//   const [possiblyCut, setPossiblyCut] = useState([]);
//   const [definitelyCut, setDefinitelyCut] = useState([]);

//   const [gridLayout, setGridLayout] = useState(
//     getSessionStorage("gridLayout") ?? true
//   );
//   const [updated, setUpdated] = useState(false);

//   // List of sections formatted as
//   // (cut_status string, array of ballkids, header string)
//   const sections = [
//     ["none", none, "Active"],
//     ["definitely_keep", definitelyKeep, "Definitely Keep"],
//     ["possibly_keep", possiblyKeep, "Possibly Keep"],
//     ["possibly_cut", possiblyCut, "Possibly Cut"],
//     ["definitely_cut", definitelyCut, "Definitely Cut"],
//     ["cut", cut, "Cut"],
//   ];

//   useEffect(() => {
//     fetch("/api/all-list", { headers: getAuthHeader() })
//       .then((response) => response.json())
//       .then((data) => {
//         setActive(data.filter((ballkid) => !ballkid.is_cut));
//         setCut(data.filter((ballkid) => ballkid.is_cut));

//         setNone(
//           data.filter(
//             (ballkid) => ballkid.cut_status === "none" && !ballkid.is_cut
//           )
//         );
//         setDefinitelyKeep(
//           data.filter(
//             (ballkid) =>
//               ballkid.cut_status === "definitely_keep" && !ballkid.is_cut
//           )
//         );
//         setPossiblyKeep(
//           data.filter(
//             (ballkid) =>
//               ballkid.cut_status === "possibly_keep" && !ballkid.is_cut
//           )
//         );
//         setPossiblyCut(
//           data.filter(
//             (ballkid) =>
//               ballkid.cut_status === "possibly_cut" && !ballkid.is_cut
//           )
//         );
//         setDefinitelyCut(
//           data.filter(
//             (ballkid) =>
//               ballkid.cut_status === "definitely_cut" && !ballkid.is_cut
//           )
//         );
//       })
//       .then(() => setUpdated(false));
//   }, [updated]);

//   return (
//     <div className="page">
//       <div className="justify">
//         <Typography variant="h4" sx={{ mb: 1 }}>
//           Cut
//         </Typography>
//         <LayoutButtons gridLayout={gridLayout} setGridLayout={setGridLayout} />
//       </div>

//       {sections.map((section) => (
//         <div key={section[0]}>
//           <div className="justify">
//             <div className="sxs" key={section[1]}>
//               <Typography variant="h5" sx={MARGINS}>
//                 {section[2]} Ballkids
//               </Typography>
//               <Typography variant="h6" sx={MARGINS}>
//                 &emsp; ({section[1].length})
//               </Typography>
//             </div>
//             {section[0] === "pending" &&
//               section[1].length > 0 &&
//               renderCutAllButton(setUpdated)}
//           </div>
//           {renderBallkids(section[1], section[0], gridLayout, setUpdated)}
//         </div>
//       ))}
//     </div>
//   );
// }
