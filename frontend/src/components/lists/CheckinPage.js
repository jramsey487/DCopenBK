import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import Done from "@mui/icons-material/Done";

import {
  LayoutButtons,
  getAuthHeader,
  getLocalStorage,
  SearchAndFilter,
  filterBallkids,
  ConfirmDialog,
  BallkidCard,
  BallkidAndIcon,
  HelpIcon,
  useIsMobile,
  Banners,
  CommentsText,
} from "../Utils";
import { CHECKOUT_OPTIONS, LAST_DAY_OPTIONS } from "../Consts";
import { checkin } from "../HelpMessages";
import { IconButton, TextField } from "@mui/material";
import "./ballkid-list-by-name.css";
import "./checkin-page.css";

function CheckinButton({ ballkid, isCheckedIn, setUpdated }) {
  const checkinString = isCheckedIn ? "Check Out" : "Check In";
  const color = isCheckedIn ? "error" : "success";
  const newCheckinStatus = isCheckedIn ? false : true;

  const [loading, setLoading] = useState(false);

  return (
    <LoadingButton
      className="checkin-action-btn"
      variant="outlined"
      loading={loading}
      color={color}
      size="small"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        setLoading(true);
        e.stopPropagation();
        e.preventDefault();
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: ballkid.first_name,
            last_name: ballkid.last_name,
            is_checked_in: newCheckinStatus,
          }),
        })
          .then((response) => response.json())
          .then(() => {
            setUpdated(true);
            setLoading(false);
          });
      }}
    >
      {checkinString}
    </LoadingButton>
  );
}

function CheckoutComments({ ballkid, layout, setUpdated }) {
  const [comments, setComments] = useState(ballkid.checkout_comments ?? "End");
  const [disabled, setDisabled] = useState(
    ballkid.checkout_comments !== "" && ballkid.checkout_comments !== null
  );

  return useIsMobile() ? (
    ""
  ) : ballkid.is_checked_in ? (
    <CommentsText ballkid={ballkid} commentType="checkout" layout={layout} />
  ) : layout === "grid" ? (
    <Box className="checkin-card-field" sx={{ mt: 1 }}>
      <Typography variant="caption" className="checkin-card-field__label">
        Check-out time
      </Typography>
      <Box className="checkin-card-field__controls">
        <TextField
          select
          fullWidth
          size="small"
          value={comments}
          disabled={disabled}
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onChange={(e) => setComments(e.target.value)}
          onDoubleClick={() => setDisabled(false)}
        >
          {CHECKOUT_OPTIONS.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <IconButton
          size="small"
          color="primary"
          disabled={disabled}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            setDisabled(true);
            e.stopPropagation();
            e.preventDefault();
            fetch("/api/update-ballkid", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: ballkid.first_name,
                last_name: ballkid.last_name,
                checkout_comments: comments,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true));
          }}
        >
          <Done />
        </IconButton>
      </Box>
    </Box>
  ) : (
    <Box
      className="checkin-list-field"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Typography component="span" className="checkin-list-field__label">
        Check-out time
      </Typography>
      <Box className="checkin-list-field__controls">
        <TextField
          select
          size="small"
          variant="outlined"
          value={comments}
          disabled={disabled}
          onChange={(e) => setComments(e.target.value)}
          onDoubleClick={() => setDisabled(false)}
        >
          {CHECKOUT_OPTIONS.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <IconButton
          size="small"
          color="primary"
          disabled={disabled}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            setDisabled(true);
            e.stopPropagation();
            e.preventDefault();
            fetch("/api/update-ballkid", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: ballkid.first_name,
                last_name: ballkid.last_name,
                checkout_comments: comments,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true));
          }}
        >
          <Done />
        </IconButton>
      </Box>
    </Box>
  );
}

function LastDayComments({ ballkid, layout, setUpdated }) {
  const [comments, setComments] = useState(ballkid.last_day ?? "End");
  const [disabled, setDisabled] = useState(
    ballkid.last_day !== "" && ballkid.last_day !== null
  );

  return useIsMobile() || ballkid.is_checked_in ? (
    ""
  ) : layout === "grid" ? (
    <Box className="checkin-card-field" sx={{ mt: 1 }}>
      <Typography variant="caption" className="checkin-card-field__label">
        Last day
      </Typography>
      <Box className="checkin-card-field__controls">
        <TextField
          select
          fullWidth
          size="small"
          value={comments}
          disabled={disabled}
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onChange={(e) => setComments(e.target.value)}
          onDoubleClick={() => setDisabled(false)}
        >
          {LAST_DAY_OPTIONS.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <IconButton
          size="small"
          color="primary"
          disabled={disabled}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            setDisabled(true);
            e.stopPropagation();
            e.preventDefault();
            fetch("/api/update-ballkid", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: ballkid.first_name,
                last_name: ballkid.last_name,
                last_day: comments,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true));
          }}
        >
          <Done />
        </IconButton>
      </Box>
    </Box>
  ) : (
    <Box
      className="checkin-list-field"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Typography component="span" className="checkin-list-field__label">
        Last day
      </Typography>
      <Box className="checkin-list-field__controls">
        <TextField
          select
          size="small"
          variant="outlined"
          value={comments}
          disabled={disabled}
          onChange={(e) => setComments(e.target.value)}
          onDoubleClick={() => setDisabled(false)}
        >
          {LAST_DAY_OPTIONS.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <IconButton
          size="small"
          color="primary"
          disabled={disabled}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            setDisabled(true);
            e.stopPropagation();
            e.preventDefault();
            fetch("/api/update-ballkid", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: ballkid.first_name,
                last_name: ballkid.last_name,
                last_day: comments,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true));
          }}
        >
          <Done />
        </IconButton>
      </Box>
    </Box>
  );
}

function CheckinListRow({ ballkid, isCheckedIn, setUpdated }) {
  const navigate = useNavigate();
  const myId = Number(getLocalStorage("ballkid_id"));
  const profileTo =
    ballkid.id === myId ? "/me" : `/ballkid/${ballkid.id}`;

  const goToProfile = () => navigate(profileTo);

  return (
    <article
      className="checkin-list-row"
      role="link"
      tabIndex={0}
      onClick={goToProfile}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToProfile();
        }
      }}
    >
      <div className="checkin-list-row__identity">
        <BallkidAndIcon ballkid={ballkid} plainName showIcons />
      </div>
      <div
        className="checkin-list-row__fields"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <LastDayComments
          ballkid={ballkid}
          layout="list"
          setUpdated={setUpdated}
        />
        <CheckoutComments
          ballkid={ballkid}
          layout="list"
          setUpdated={setUpdated}
        />
      </div>
      <div
        className="checkin-list-row__action"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <CheckinButton
          ballkid={ballkid}
          isCheckedIn={isCheckedIn}
          setUpdated={setUpdated}
        />
      </div>
    </article>
  );
}

function renderBallkids(ballkids, isCheckedIn, layout, setUpdated) {
  if (ballkids.length === 0) {
    return (
      <div className="ballkid-list-empty">
        {isCheckedIn
          ? "There are currently no ballkids checked in."
          : "There are currently no ballkids checked out."}
      </div>
    );
  }

  return (
    <div
      className={
        layout === "grid" ? "ballkid-list-grid" : "ballkid-list-stack"
      }
    >
      {ballkids.map((ballkid) =>
        layout === "grid" ? (
          <div className="ballkid-list-card-wrap" key={ballkid.id}>
            <BallkidCard
              ballkid={ballkid}
              renderAdditional={
                <Box className="checkin-card-actions checkin-card-actions--grid">
                  <CheckinButton
                    ballkid={ballkid}
                    isCheckedIn={isCheckedIn}
                    setUpdated={setUpdated}
                  />
                  <LastDayComments
                    ballkid={ballkid}
                    layout={layout}
                    setUpdated={setUpdated}
                  />
                  <CheckoutComments
                    ballkid={ballkid}
                    layout={layout}
                    setUpdated={setUpdated}
                  />
                </Box>
              }
            />
          </div>
        ) : (
          <CheckinListRow
            key={ballkid.id}
            ballkid={ballkid}
            isCheckedIn={isCheckedIn}
            setUpdated={setUpdated}
          />
        )
      )}
    </div>
  );
}

export default function CheckinPage(props) {
  const [checkedIn, setCheckedIn] = useState([]);
  const [checkedOut, setCheckedOut] = useState([]);
  const [open, setOpen] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setCheckedIn(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.is_cut === false
          )
        );
        setCheckedOut(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === false && ballkid.is_cut === false
          )
        );
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page ballkid-list-page checkin-page">
      <Banners />

      <ConfirmDialog
        message={`You are about to check out all ${
          checkedIn.length
        } checked in ballkid${checkedIn.length > 1 ? "s" : ""}.`}
        url={"/api/checkout-all"}
        body={{
          checkout_group: "all",
        }}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <Box className="ballkid-list-title-row" sx={{ mb: 2 }}>
        <Typography className="ballkid-list-title" variant="h4">
          Check-in
        </Typography>
        <HelpIcon page="Check-in" message={checkin} />
        <Box sx={{ ml: "auto" }}>
          <LayoutButtons layout={layout} setLayout={setLayout} />
        </Box>
      </Box>

      <div className="ballkid-list-toolbar">
        <div className="ballkid-list-toolbar-search">
          <SearchAndFilter
            setSearchKeyword={setSearchKeyword}
            filterGroup={filterGroup}
            setFilterGroup={setFilterGroup}
          />
        </div>
      </div>

      <section className="checkin-section">
        <div className="checkin-section-head">
          <div className="checkin-section-title-row">
            <Typography className="checkin-section-title" variant="h5">
              Checked in
            </Typography>
            <Typography className="checkin-section-count" variant="h6">
              ({filterBallkids(checkedIn, searchKeyword, filterGroup).length})
            </Typography>
          </div>
          {checkedIn.length > 0 ? (
            <Button
              className="checkin-checkout-all-btn"
              variant="contained"
              color="error"
              onClick={() => setOpen(true)}
            >
              Check out all
            </Button>
          ) : null}
        </div>

        {renderBallkids(
          filterBallkids(checkedIn, searchKeyword, filterGroup),
          true,
          layout,
          setUpdated
        )}
      </section>

      <section className="checkin-section">
        <div className="checkin-section-head">
          <div className="checkin-section-title-row">
            <Typography className="checkin-section-title" variant="h5">
              Checked out
            </Typography>
            <Typography className="checkin-section-count" variant="h6">
              ({filterBallkids(checkedOut, searchKeyword, filterGroup).length})
            </Typography>
          </div>
        </div>

        {renderBallkids(
          filterBallkids(checkedOut, searchKeyword, filterGroup),
          false,
          layout,
          setUpdated
        )}
      </section>
    </div>
  );
}
