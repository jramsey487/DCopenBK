import { useEffect, useState } from "react";

import { getAuthHeader } from "./authStorage";

const POLL_MS = 15000;

let state = { configured: null, matches: [] };
const listeners = new Set();
let timer = null;
let inFlight = false;
let visibilityBound = false;

function emit() {
  listeners.forEach((listener) => listener(state));
}

/** "Court 4", "Stadium Court", "4" -> "4", "stadium", "4". */
export function normalizeCourt(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/court/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function poll() {
  if (inFlight || document.hidden || navigator.onLine === false) {
    schedule();
    return;
  }
  inFlight = true;
  try {
    const response = await fetch("/api/live-scores", { headers: getAuthHeader() });
    if (response.ok) {
      const data = await response.json();
      state = {
        configured: Boolean(data.configured),
        matches: Array.isArray(data.matches) ? data.matches : [],
      };
      emit();
    }
  } catch {
    // Keep showing the last known scores if a refresh fails.
  } finally {
    inFlight = false;
    schedule();
  }
}

function schedule() {
  clearTimeout(timer);
  timer = null;
  // The server says the feed isn't set up: stop asking.
  if (listeners.size === 0 || state.configured === false || document.hidden) {
    return;
  }
  timer = setTimeout(poll, POLL_MS);
}

function onVisibilityChange() {
  if (!document.hidden && listeners.size > 0 && state.configured !== false) {
    clearTimeout(timer);
    poll();
  }
}

function start() {
  if (!visibilityBound) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    visibilityBound = true;
  }
  poll();
}

function stop() {
  clearTimeout(timer);
  timer = null;
  if (visibilityBound) {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    visibilityBound = false;
  }
}

/** Shared live-score state; every caller reuses one polling loop. */
export function useLiveScores() {
  const [value, setValue] = useState(state);

  useEffect(() => {
    listeners.add(setValue);
    if (listeners.size === 1) {
      start();
    } else {
      setValue(state);
    }
    return () => {
      listeners.delete(setValue);
      if (listeners.size === 0) {
        stop();
      }
    };
  }, []);

  return value;
}

export function liveMatchForCourt(scores, court) {
  const wanted = normalizeCourt(court);
  if (!wanted) {
    return null;
  }
  return (
    scores.matches.find(
      (match) =>
        normalizeCourt(match.court) === wanted ||
        normalizeCourt(match.court_id) === wanted
    ) || null
  );
}