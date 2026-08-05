import React, { useState, useEffect } from "react";

import { getAuthHeader, getLocalStorage } from "../Utils";
import RatingsGrid from "./RatingsGrid";
import { viewMyRatings, viewMyRatingsNonchairperson } from "../HelpMessages";
import { RatingsPageShell, RatingsGridPanel } from "./RatingsPageShared";

export default function MyRatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [updated, setUpdated] = useState(false);

  const ballkidId = getLocalStorage("ballkid_id");
  const group = getLocalStorage("group");

  useEffect(() => {
    fetch(`/api/my-ratings/${ballkidId}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setRatings(data))
      .then(() => setUpdated(false));
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
