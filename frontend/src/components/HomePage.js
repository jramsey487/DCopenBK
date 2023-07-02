import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import BallkidList from "./lists/BallkidList";
import BallkidPage from "./ballkid/BallkidPage";
import TeamsPage from "./teams/TeamsPage";
import TeamsPageChairpersonDesktop from "./teams/TeamsPageChairpersonDesktop";
import TeamsPageChairpersonMobile from "./teams/TeamsPageChairpersonMobile";
import CutPageMobile from "./lists/CutPageMobile";
import CutPageDesktop from "./lists/CutPageDesktop";
import Navbar from "./Navbar";
import CheckinPage from "./lists/CheckinPage";
import SchedulePage from "./schedule/SchedulePage";
import DebugPage from "./settings/DebugPage";
import LoginPage from "./auth/LoginPage";
import ForgotPasswordPage from "./auth/ForgotPasswordPage";
import ResetPasswordComplete from "./auth/ResetPasswordComplete";
import ResetPassword from "./auth/ResetPassword";
import ResetEmailSent from "./auth/ResetEmailSent";
import BallkidPageChairperson from "./ballkid/BallkidPageChairperson";
import FinalsTeamsPage from "./teams/FinalsTeamsPage";
import RatingsPage from "./ratings/RatingsPage";
import MyRatingsPage from "./ratings/MyRatingsPage";
import SchedulePageChairperson from "./schedule/SchedulePageChairperson";
import RateByNamePage from "./ratings/RateByNamePage";
import RateByPastTeamPage from "./ratings/RateByPastTeamPage";
import RouteNotFound from "./RouteNotFound";
import BallkidPageCaptain from "./ballkid/BallkidPageCaptain";
import MyProfile from "./ballkid/MyProfile";
import Leaderboards from "./leaderboards/Leaderboards";
import CheckinLeaderboard from "./leaderboards/CheckinLeaderboard";
import CaptainLeaderboard from "./leaderboards/CaptainLeaderboard";
import CourtLeaderboard from "./leaderboards/CourtLeaderboard";
import BallkidLeaderboard from "./leaderboards/BallkidLeaderboard";
import TournamentSettings from "./settings/TournamentSettings";
import FinalsTeamsPageChairpersonMobile from "./teams/FinalsTeamsPageChairpersonMobile";
import FinalsTeamsPageChairpersonDesktop from "./teams/FinalsTeamsPageChairpersonDesktop";
import InactiveBallkidList from "./lists/InactiveBallkidList";
import RateByCurrentTeamsPage from "./ratings/RateByCurrentTeamsPage";

import { useToken, getLocalStorage, useIsMobile } from "./Utils";
import GamePage from "./settings/GamePage";

function chairpersonRoutes(isMobile, setToken) {
  return (
    <Routes>
      <Route exact path="/" element={<BallkidList />} />
      <Route path="/inactive" element={<InactiveBallkidList />} />
      <Route path="/ballkid/:pk" element={<BallkidPageChairperson />} />
      <Route path="/checkin" element={<CheckinPage />} />
      <Route
        path="/cut"
        element={isMobile ? <CutPageMobile /> : <CutPageDesktop />}
      />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/leaderboards" element={<Leaderboards />} />
      <Route path="/leaderboards/checkin" element={<CheckinLeaderboard />} />
      <Route path="/leaderboards/captain" element={<CaptainLeaderboard />} />
      <Route path="/leaderboards/ballkid" element={<BallkidLeaderboard />} />
      <Route path="/leaderboards/court" element={<CourtLeaderboard />} />
      <Route path="/login" element={<LoginPage setToken={setToken} />} />
      <Route path="/me" element={<MyProfile />} />
      <Route path="/my-ratings" element={<MyRatingsPage />} />
      <Route path="/rate-by-name" element={<RateByNamePage />} />
      <Route path="/rate-by-team" element={<RateByCurrentTeamsPage />} />
      <Route path="/rate-by-past-team" element={<RateByPastTeamPage />} />
      <Route path="/ratings" element={<RatingsPage />} />
      <Route path="/schedule" element={<SchedulePageChairperson />} />
      <Route
        path="/teams"
        element={
          isMobile ? (
            <TeamsPageChairpersonMobile />
          ) : (
            <TeamsPageChairpersonDesktop />
          )
        }
      />
      <Route
        path="/finals-teams"
        element={
          isMobile ? (
            <FinalsTeamsPageChairpersonMobile />
          ) : (
            <FinalsTeamsPageChairpersonDesktop />
          )
        }
      />
      <Route path="/tournament-settings" element={<TournamentSettings />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="*" element={<RouteNotFound />} />
    </Routes>
  );
}

function captainRoutes(setToken) {
  return (
    <Routes>
      <Route exact path="/" element={<BallkidList />} />
      <Route path="/ballkid/:pk" element={<BallkidPageCaptain />} />
      <Route path="/finals-teams" element={<FinalsTeamsPage />} />
      <Route path="/login" element={<LoginPage setToken={setToken} />} />
      <Route path="/me" element={<MyProfile />} />
      <Route path="/my-ratings" element={<MyRatingsPage />} />
      <Route path="/rate-by-name" element={<RateByNamePage />} />
      <Route path="/rate-by-team" element={<RateByCurrentTeamsPage />} />
      <Route path="/rate-by-past-team" element={<RateByPastTeamPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="*" element={<RouteNotFound />} />
    </Routes>
  );
}

function ballkidRoutes(setToken) {
  return (
    <Routes>
      <Route exact path="/" element={<BallkidList />} />
      <Route path="/ballkid/:pk" element={<BallkidPage />} />
      <Route path="/finals-teams" element={<FinalsTeamsPage />} />
      <Route path="/login" element={<LoginPage setToken={setToken} />} />
      <Route path="/me" element={<MyProfile />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="*" element={<RouteNotFound />} />
    </Routes>
  );
}

function loggedOutRoutes(setToken) {
  return (
    <Routes>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      <Route path="/reset-email-sent" element={<ResetEmailSent />} />
      <Route
        path="/reset-password-complete"
        element={<ResetPasswordComplete />}
      />
      <Route path="*" element={<LoginPage setToken={setToken} />} />
    </Routes>
  );
}

export default function HomePage(props) {
  const { token, setToken } = useToken();
  const isMobile = useIsMobile();

  const group = getLocalStorage("group");

  return !token ? (
    <Router>
      <Navbar isLoggedIn={false} setToken={setToken} />
      {loggedOutRoutes(setToken)}
    </Router>
  ) : (
    <Router>
      <Navbar isLoggedIn={true} setToken={setToken} />
      {group === "chairperson"
        ? chairpersonRoutes(isMobile, setToken)
        : group === "captain"
        ? captainRoutes(setToken)
        : ballkidRoutes(setToken)}
    </Router>
  );
}
