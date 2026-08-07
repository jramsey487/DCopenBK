import { useState } from "react";
import { useMediaQuery } from "react-responsive";

export function getLocalStorage(key) {
  const valString = localStorage.getItem(key);
  return JSON.parse(valString);
}

export function setLocalStorage(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function getToken() {
  return getLocalStorage("token");
}

export function getAuthHeader() {
  return new Headers({
    Authorization: "Token " + getToken(),
    "Content-Type": "application/json",
  });
}

/** Logged-in user's ballkid primary key, or null if missing / invalid. */
export function getBallkidId() {
  const raw = getLocalStorage("ballkid_id");
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const id = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(id) ? id : null;
}

/** Persist login response before navigation so /me and API calls see ballkid_id. */
export function setSessionFromLogin(setToken, username, data) {
  setToken(data?.token ?? "");
  const rawId = data?.ballkid_id;
  const ballkidId =
    rawId !== null && rawId !== undefined && rawId !== ""
      ? Number(rawId)
      : null;
  setLocalStorage("username", (username ?? "").toLowerCase());
  setLocalStorage("ballkid_id", Number.isFinite(ballkidId) ? ballkidId : null);
  setLocalStorage("group", data?.group ?? "");
}

/** Resolve ballkid image for CRA dev (proxied to Django static). */
export function ballkidImageSrc(image) {
  if (!image) {
    return "";
  }
  if (String(image).startsWith("http")) {
    return image;
  }
  const normalized = String(image).replace(/^\.\.\//, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function useToken() {
  const readToken = () => {
    const tokenString = localStorage.getItem("token");
    return JSON.parse(tokenString);
  };
  const [token, setToken] = useState(readToken());

  const saveToken = (userToken) => {
    localStorage.setItem("token", JSON.stringify(userToken));
    setToken(userToken);
  };

  return { setToken: saveToken, token };
}

export function handleChange(e, state, setState) {
  setState({ ...state, [e.target.name]: e.target.value });
}

export function useIsMobile() {
  return useMediaQuery({ query: "(max-width: 750px)" });
}
