import React from "react";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function NavIconRoster({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="7" r="3.5" {...stroke} />
      <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" {...stroke} />
    </svg>
  );
}

export function NavIconTeams({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <rect x="3" y="3" width="6" height="6" rx="1.5" {...stroke} />
      <rect x="11" y="3" width="6" height="6" rx="1.5" {...stroke} />
      <rect x="3" y="11" width="6" height="6" rx="1.5" {...stroke} />
      <rect x="11" y="11" width="6" height="6" rx="1.5" {...stroke} />
    </svg>
  );
}

export function NavIconSchedule({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <rect x="3" y="2" width="14" height="16" rx="2" {...stroke} />
      <path d="M7 7h6M7 11h6M7 15h4" {...stroke} />
    </svg>
  );
}

export function NavIconRatings({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path
        d="M10 2l2.4 4.8 5.6.8-4 3.9.9 5.5L10 14.3 5.1 17l.9-5.5-4-3.9 5.6-.8z"
        {...stroke}
      />
    </svg>
  );
}

export function NavIconProfile({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="7" r="3.5" {...stroke} />
      <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" {...stroke} />
    </svg>
  );
}

export function NavIconSettings({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        {...stroke}
      />
      <circle cx="12" cy="12" r="3" {...stroke} />
    </svg>
  );
}

export function NavIconLogout({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3" {...stroke} />
      <path d="M11 14l4-4-4-4M15 10H7" {...stroke} />
    </svg>
  );
}
