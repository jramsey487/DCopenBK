import React, { useEffect, useState } from "react";

import "./offline-banner.css";

export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      Offline — showing saved data. Changes need a connection.
    </div>
  );
}