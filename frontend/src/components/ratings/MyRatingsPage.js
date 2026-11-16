import React, { useState, useEffect } from "react";

import { getLocalStorage } from "../Utils";
import { api } from "../api";
import RatingsGrid from "./RatingsGrid";
import { viewMyRatings, viewMyRatingsNonchairperson } from "../HelpMessages";
import { RatingsPageShell, RatingsGridPanel } from "./RatingsPageShared";

export default function MyRatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [updated, setUpdated] = useState(false);

  const ballkidId = getLocalStorage("ballkid_id");
  const group = getLocalStorage("group");

  useEffect(() => {
    api(`/api/my-ratings/${ballkidId}`)
      .then((data) => setRatings(data))
      .then(() => setUpdated(false))
      .catch((error) => window.alert(error.message));
  }, [ballkidId, updated]);

  return (
    <RatingsPageShell
      title="View My Ratings"
      helpPage="View My Ratings"
      helpMessage={
        group === "chairperson" ? viewMyRatings : viewMyRatingsNonchairperson
      }
    >
      <RatingsGridPanel>
        <RatingsGrid ratings={ratings} setUpdated={setUpdated} />
      </RatingsGridPanel>
    </RatingsPageShell>
  );
}
