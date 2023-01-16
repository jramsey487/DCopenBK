import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BallkidList from "./lists/BallkidList";
import BallkidPage from "./BallkidPage";
import TeamsPage from "./teams/TeamsPage";
import TeamsPageChairperson from "./teams/TeamsPageChairperson";
import CutPage from "./lists/CutPage";
import Navbar from "./Navbar";
import CheckinPage from "./lists/CheckinPage";
import ArchivedBallkidList from "./lists/ArchivedBallkidList";
import SchedulePage from "./schedule/SchedulePage";
import DebugPage from "./DebugPage";
import LoginPage from "./LoginPage";
import BallkidPageChairperson from "./BallkidPageChairperson";
import FinalsTeamsPageChairperson from "./teams/FinalsTeamsPageChairperson";
import FinalsTeamsPage from "./teams/FinalsTeamsPage";
import RatingsPage from "./ratings/RatingsPage";
import MyRatingsPage from "./ratings/MyRatingsPage";
import SchedulePageChairperson from "./schedule/SchedulePageChairperson";
import RateByNamePage from "./ratings/RateByNamePage";
import RateByTeamPage from "./ratings/RateByTeamPage";
import RateByPastTeamPage from "./ratings/RateByPastTeamPage";
import RouteNotFound from "./RouteNotFound";

import { useToken, getSessionStorage } from "./Utils";

function chairpersonRoutes(setToken) {
  return (
    <Routes>
      <Route exact path="/" element={<BallkidList />} />
      <Route path="/archive" element={<ArchivedBallkidList />} />
      <Route path="/checkin" element={<CheckinPage />} />
      <Route path="/rate" element={<RateByNamePage />} />
      <Route path="/rate-by-team" element={<RateByTeamPage />} />
      <Route path="/rate-by-past-team" element={<RateByPastTeamPage />} />
      <Route path="/ratings" element={<RatingsPage />} />
      <Route path="/my-ratings" element={<MyRatingsPage />} />
      <Route path="/cut" element={<CutPage />} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/ballkid/:pk" element={<BallkidPageChairperson />} />
      <Route path="/schedule" element={<SchedulePageChairperson />} />
      <Route path="/teams" element={<TeamsPageChairperson />} />
      <Route path="/finals-teams" element={<FinalsTeamsPageChairperson />} />
      <Route path="/login" element={<LoginPage setToken={setToken} />} />
      <Route path="*" element={<RouteNotFound />} />
    </Routes>
  );
}

function captainRoutes(setToken) {
  return (
    <Routes>
      <Route exact path="/" element={<BallkidList />} />
      <Route path="/rate" element={<RateByNamePage />} />
      <Route path="/rate-by-team" element={<RateByTeamPage />} />
      <Route path="/rate-by-past-team" element={<RateByPastTeamPage />} />
      <Route path="/my-ratings" element={<MyRatingsPage />} />
      <Route path="/ballkid/:pk" element={<BallkidPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/finals-teams" element={<FinalsTeamsPage />} />
      <Route path="/login" element={<LoginPage setToken={setToken} />} />
      <Route path="*" element={<RouteNotFound />} />
    </Routes>
  );
}

function ballkidRoutes(setToken) {
  return (
    <Routes>
      <Route exact path="/" element={<BallkidList />} />
      <Route path="/ballkid/:pk" element={<BallkidPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/finals-teams" element={<FinalsTeamsPage />} />
      <Route path="/login" element={<LoginPage setToken={setToken} />} />
      <Route path="*" element={<RouteNotFound />} />
    </Routes>
  );
}
export default function HomePage(props) {
  const { token, setToken } = useToken();
  const group = getSessionStorage("group");

  return !token ? (
    <Router>
      <Navbar isLoggedIn={false} setToken={setToken} />
      <LoginPage setToken={setToken} />
    </Router>
  ) : (
    <Router>
      <Navbar isLoggedIn={true} setToken={setToken} />
      {group == "chairperson"
        ? chairpersonRoutes(setToken)
        : group == "captain"
        ? captainRoutes(setToken)
        : ballkidRoutes(setToken)}
    </Router>
  );
}
