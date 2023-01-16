import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Typography } from "@mui/material";
// import BallkidList from "./BallkidList";
// import BallkidPage from "./BallkidPage";
// import TeamsPage from "./TeamsPage";
// import TeamsPageEditable from "./TeamsPageEditable";
// import CreateBallkid from "./CreateBallkid";
// import CutPage from "./CutPage";
// import Navbar from "./Navbar";
// import CheckinPage from "./CheckinPage";
// import ArchivedBallkidList from "./ArchivedBallkidList";
// import SchedulePage from "./SchedulePage";
// import DebugPage from "./DebugPage";
// import LoginPage from "./LoginPage";
// import BallkidPageChairperson from "./BallkidPageChairperson";
// import FinalsTeamsPageEditable from "./FinalsTeamsPageEditable";
// import FinalsTeamsPage from "./FinalsTeamsPage";
// import RatingsPage from "./RatingsPage";
// import MyRatingsPage from "./MyRatingsPage";
// import SchedulePageEditable from "./SchedulePageEditable";
// import RateByNamePage from "./RateByNamePage";
// import RateByTeamPage from "./RateByTeamPage";
// import RateByPastTeamPage from "./RateByPastTeamPage";
// import RouteNotFound from "./RouteNotFound";

// import { useToken, getSessionStorage } from "./Utils";

// function chairpersonRoutes(setToken) {
//   return (
//     <Routes>
//       <Route exact path="/" element={<BallkidList />} />
//       <Route path="/archive" element={<ArchivedBallkidList />} />
//       <Route path="/checkin" element={<CheckinPage />} />
//       <Route path="/rate" element={<RateByNamePage />} />
//       <Route path="/rate-by-team" element={<RateByTeamPage />} />
//       <Route path="/rate-by-past-team" element={<RateByPastTeamPage />} />
//       <Route path="/ratings" element={<RatingsPage />} />
//       <Route path="/my-ratings" element={<MyRatingsPage />} />
//       <Route path="/cut" element={<CutPage />} />
//       <Route path="/create-ballkid" element={<CreateBallkid />} />
//       <Route path="/debug" element={<DebugPage />} />
//       <Route path="/ballkid/:pk" element={<BallkidPageChairperson />} />
//       <Route path="/schedule" element={<SchedulePageEditable />} />
//       <Route path="/teams" element={<TeamsPageEditable />} />
//       <Route path="/finals-teams" element={<FinalsTeamsPageEditable />} />
//       <Route path="/login" element={<LoginPage setToken={setToken} />} />
//       <Route path="*" element={<RouteNotFound />} />
//     </Routes>
//   );
// }

// function captainRoutes(setToken) {
//   return (
//     <Routes>
//       <Route exact path="/" element={<BallkidList />} />
//       <Route path="/rate" element={<RateByNamePage />} />
//       <Route path="/rate-by-team" element={<RateByTeamPage />} />
//       <Route path="/rate-by-past-team" element={<RateByPastTeamPage />} />
//       <Route path="/my-ratings" element={<MyRatingsPage />} />
//       <Route path="/ballkid/:pk" element={<BallkidPage />} />
//       <Route path="/schedule" element={<SchedulePage />} />
//       <Route path="/teams" element={<TeamsPage />} />
//       <Route path="/finals-teams" element={<FinalsTeamsPage />} />
//       <Route path="/login" element={<LoginPage setToken={setToken} />} />
//       <Route path="*" element={<RouteNotFound />} />
//     </Routes>
//   );
// }

// function ballkidRoutes(setToken) {
//   return (
//     <Routes>
//       <Route exact path="/" element={<BallkidList />} />
//       <Route path="/ballkid/:pk" element={<BallkidPage />} />
//       <Route path="/schedule" element={<SchedulePage />} />
//       <Route path="/teams" element={<TeamsPage />} />
//       <Route path="/finals-teams" element={<FinalsTeamsPage />} />
//       <Route path="/login" element={<LoginPage setToken={setToken} />} />
//       <Route path="*" element={<RouteNotFound />} />
//     </Routes>
//   );
// }
export default function HomePage(props) {
  //   const { token, setToken } = useToken();
  //   const group = getSessionStorage("group");

  //   return !token ? (
  //     <Router>
  //       <Navbar isLoggedIn={false} setToken={setToken} />
  //       <LoginPage setToken={setToken} />
  //     </Router>
  //   ) : (
  //     <Router>
  //       <Navbar isLoggedIn={true} setToken={setToken} />
  //       {group == "chairperson"
  //         ? chairpersonRoutes(setToken)
  //         : group == "captain"
  //         ? captainRoutes(setToken)
  //         : ballkidRoutes(setToken)}
  //     </Router>
  //   );

  return <Typography variant="h3">i am an h3 heading!</Typography>;
}
