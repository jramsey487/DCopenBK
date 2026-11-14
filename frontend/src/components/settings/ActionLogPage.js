import React, { useCallback, useEffect, useState } from "react";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

import { Banners, getAuthHeader } from "../Utils";
import "./action-log.css";

const PAGE_SIZE = 50;

function formatWhen(iso) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function LogRow({ row }) {
  const bulk = row.count > 1;

  return (
    <li className="actionlog-row">
      <div className="actionlog-row__when">{formatWhen(row.created_at)}</div>
      <div className="actionlog-row__main">
        <div className="actionlog-row__line">
          <span className={`actionlog-tag actionlog-tag--${row.category}`}>
            {row.label}
          </span>
          {bulk ? (
            <strong>{row.count} people</strong>
          ) : row.target_name ? (
            <strong>{row.target_name}</strong>
          ) : null}
          {!bulk && row.detail ? (
            <span className="actionlog-row__detail">{row.detail}</span>
          ) : null}
        </div>
        <div className="actionlog-row__by">by {row.actor}</div>
        {bulk && row.items ? (
          <details className="actionlog-row__items">
            <summary>Show everyone</summary>
            <ul>
              {row.items.map((item, index) => (
                <li key={`${item.id}-${index}`}>
                  {item.name}
                  {item.detail ? (
                    <span className="actionlog-row__detail"> · {item.detail}</span>
                  ) : null}
                </li>
              ))}
              {row.items.length < row.count ? (
                <li className="actionlog-row__detail">
                  …and {row.count - row.items.length} more not listed
                </li>
              ) : null}
            </ul>
          </details>
        ) : null}
      </div>
    </li>
  );
}

export default function ActionLogPage() {
  const [category, setCategory] = useState("");
  const [actor, setActor] = useState("");
  const [days, setDays] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    (offset, replace) => {
      setLoading(true);
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (category) params.set("category", category);
      if (actor) params.set("actor", actor);
      if (days) params.set("days", days);
      if (debouncedQuery) params.set("q", debouncedQuery);

      return fetch(`/api/action-log?${params.toString()}`, {
        headers: getAuthHeader(),
      })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data) => {
          setRows((prev) => (replace ? data.results : [...prev, ...data.results]));
          setTotal(data.count);
          setCategories(data.categories || []);
          setActors(data.actors || []);
          setError("");
        })
        .catch(() => setError("Could not load the audit log."))
        .finally(() => setLoading(false));
    },
    [category, actor, days, debouncedQuery]
  );

  useEffect(() => {
    load(0, true);
  }, [load]);

  return (
    <div className="page actionlog-shell">
      <Banners />

      <div className="actionlog-page">
        <header className="actionlog-header">
          <h1 className="actionlog-title">Audit log</h1>
          <p className="actionlog-subtitle">
            Who cut, moved, checked out or deleted what. Bulk actions (like
            Check out all) show as one entry; open it to see everyone. Entries
            made by scripts or the Django admin show as "system".
          </p>
        </header>

        <div className="actionlog-filters">
          <input
            className="actionlog-search"
            type="search"
            placeholder="Search a name, detail or person…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the audit log"
          />
          <select
            className="actionlog-select"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            aria-label="Filter by person"
          >
            <option value="">Anyone</option>
            {actors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="actionlog-select"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            aria-label="Filter by time"
          >
            <option value="">All time</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>

        <div className="actionlog-chips" role="tablist" aria-label="Category">
          <button
            type="button"
            className={`actionlog-chip${category === "" ? " is-active" : ""}`}
            onClick={() => setCategory("")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`actionlog-chip${category === c.value ? " is-active" : ""}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {error ? <div className="actionlog-error">{error}</div> : null}

        {rows.length === 0 && !loading && !error ? (
          <div className="actionlog-empty">Nothing recorded for these filters.</div>
        ) : (
          <ul className="actionlog-list">
            {rows.map((row) => (
              <LogRow key={row.id} row={row} />
            ))}
          </ul>
        )}

        <div className="actionlog-footer">
          {loading ? <CircularProgress size={22} /> : null}
          {!loading && rows.length < total ? (
            <Button
              variant="outlined"
              size="small"
              onClick={() => load(rows.length, false)}
            >
              Load more ({total - rows.length} left)
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
