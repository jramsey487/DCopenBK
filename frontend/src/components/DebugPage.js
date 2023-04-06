import React, { useState, useEffect } from "react";
import {
  Button,
  Grid,
  Autocomplete,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { Alerts, getAuthHeader, RatingAndLabel } from "./Utils";

function CreateBallkid(props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState(0);
  const [preferredPosition, setPreferredPosition] = useState("Back");
  const [numYearsExperience, setNumYearsExperience] = useState(0);
  const [image, setImage] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid
      container
      spacing={2}
      alignItems="center"
      direction="column"
      justifyContent="center"
    >
      <Grid item xs={12}>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography component="h4" variant="h4">
          Add Ballkid
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          id="first-name"
          label="First Name"
          variant="standard"
          sx={{ mx: 2 }}
          required={true}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <TextField
          id="last-name"
          label="Last Name"
          variant="standard"
          sx={{ mx: 2 }}
          required={true}
          onChange={(e) => setLastName(e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          id="age"
          label="Age"
          variant="standard"
          sx={{ mx: 2 }}
          type="number"
          required={true}
          onChange={(e) => setAge(parseInt(e.target.value))}
        />
        <TextField
          id="num-years-experience"
          label="# Years Experience"
          variant="standard"
          sx={{ mx: 2 }}
          type="number"
          onChange={(e) => setNumYearsExperience(parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl
          component="fieldset"
          style={{ minWidth: 200 }}
          required={true}
        >
          <InputLabel>Preferred Position</InputLabel>
          <Select
            label="Preferred Position"
            defaultValue=""
            variant="standard"
            sx={{ mx: 2 }}
            onChange={(e) => setPreferredPosition(e.target.value)}
          >
            <MenuItem value={"Back"}>Back</MenuItem>
            <MenuItem value={"Net"}>Net</MenuItem>
            <MenuItem value={"Back/Net"}>Back/Net</MenuItem>
            <MenuItem value={"Net/Back"}>Net/Back</MenuItem>
          </Select>
        </FormControl>

        <FormControl component="fieldset" style={{ minWidth: 200 }}>
          <InputLabel>Is Captain?</InputLabel>
          <Select
            label="Is Captain"
            defaultValue=""
            variant="standard"
            sx={{ mx: 2 }}
            onChange={(e) => setIsCaptain(e.target.value)}
          >
            <MenuItem value={true}>Yes</MenuItem>
            <MenuItem value={false}>No</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <TextField
          id="image"
          label="Image Link"
          variant="standard"
          onChange={(e) => setImage(e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            fetch("/api/create-ballkid", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                age: age,
                image: image,
                preferred_position: preferredPosition,
                num_years_experience: numYearsExperience,
                is_captain: isCaptain,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Ballkid created!");
              } else {
                setErrorMsg("Error creating ballkid.");
              }
              setFirstName("");
              setLastName("");
              setAge("");
              setNumYearsExperience("");
              setPreferredPosition("");
              setIsCaptain("");
              setImage("");
            });
          }}
        >
          Create Ballkid
        </Button>
      </Grid>
    </Grid>
  );
}

function CreateCheckinHistory({ ballkidsList }) {
  const [ballkid, setBallkid] = useState(null);
  const [checkin, setCheckin] = useState(null);
  const [checkout, setCheckout] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid
      container
      sx={{ mt: 7 }}
      spacing={2}
      alignItems="center"
      direction="column"
      justifyContent="center"
    >
      <Grid item xs={12}>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography component="h4" variant="h4">
          Add Check-in History
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300 }}
          options={ballkidsList}
          value={ballkid}
          onChange={(e, newVal) => {
            setBallkid(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label="Ballkid"
              required
            />
          )}
        />
      </Grid>
      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => (
              <TextField
                sx={{ mx: 2 }}
                variant="standard"
                required={true}
                {...props}
              />
            )}
            label="Check-in Time"
            value={checkin}
            // disableMaskedInput
            mask={"__/__/____ __:__:__"}
            onChange={(newValue) => {
              setCheckin(newValue);
            }}
          />
        </LocalizationProvider>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => (
              <TextField sx={{ mx: 2 }} variant="standard" {...props} />
            )}
            label="Check-out Time"
            value={checkout}
            // disableMaskedInput
            mask={"__/__/____ __:__:__"}
            onChange={(newValue) => {
              setCheckout(newValue);
            }}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            fetch("/api/create-checkin-history", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                ballkid_id: ballkid.id,
                checkin: checkin,
                checkout: checkout,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Check-in history created!");
              } else {
                setErrorMsg("Error creating check-in history.");
              }
              setBallkid(null);
              setCheckin(null);
              setCheckout(null);
            });
          }}
        >
          Create Check-in History
        </Button>
      </Grid>
    </Grid>
  );
}

function CreateTeamHistory({ ballkidsList }) {
  const [ballkid, setBallkid] = useState(null);
  const [team, setTeam] = useState("");
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid
      container
      sx={{ mt: 7 }}
      spacing={2}
      alignItems="center"
      direction="column"
      justifyContent="center"
    >
      <Grid item xs={12}>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography component="h4" variant="h4">
          Add Team History
        </Typography>
      </Grid>

      <Grid item xs={12} className="sxs">
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300, mx: 2 }}
          options={ballkidsList}
          value={ballkid}
          onChange={(e, newVal) => {
            setBallkid(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label="Ballkid"
              required
            />
          )}
        />
        <TextField
          id="team"
          label="Team"
          variant="standard"
          type="number"
          value={team}
          required
          onChange={(e) => setTeam(e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => (
              <TextField
                sx={{ mx: 2 }}
                variant="standard"
                required={true}
                {...props}
              />
            )}
            label="Start Time"
            value={start}
            // disableMaskedInput
            mask={"__/__/____ __:__:__"}
            onChange={(newValue) => {
              setStart(newValue);
            }}
          />
        </LocalizationProvider>

        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => (
              <TextField sx={{ mx: 2 }} variant="standard" {...props} />
            )}
            label="End Time"
            value={end}
            // disableMaskedInput
            mask={"__/__/____ __:__:__"}
            onChange={(newValue) => {
              setEnd(newValue);
            }}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            fetch("/api/create-team-history", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                ballkid_id: ballkid.id,
                team: team,
                start: start,
                end: end,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Team history created!");
              } else {
                setErrorMsg("Error creating team history.");
              }
              setBallkid(null);
              setTeam("");
              setStart(null);
              setEnd(null);
            });
          }}
        >
          Create Team History
        </Button>
      </Grid>
    </Grid>
  );
}

function CreateCaptainHistory({ ballkidsList, captainsList }) {
  const [ballkid, setBallkid] = useState(null);
  const [captain, setCaptain] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid
      container
      sx={{ mt: 7 }}
      spacing={2}
      alignItems="center"
      direction="column"
      justifyContent="center"
    >
      <Grid item xs={12}>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography component="h4" variant="h4">
          Add Captain History
        </Typography>
      </Grid>

      <Grid item xs={12} className="sxs">
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300, mx: 2 }}
          options={ballkidsList}
          value={ballkid}
          onChange={(e, newVal) => {
            setBallkid(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label="Ballkid"
              required
            />
          )}
        />
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300, mx: 2 }}
          options={captainsList}
          value={captain}
          onChange={(e, newVal) => {
            setCaptain(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label="Captain"
              required
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => (
              <TextField
                sx={{ mx: 2 }}
                variant="standard"
                required={true}
                {...props}
              />
            )}
            label="Start Time"
            value={start}
            // disableMaskedInput
            mask={"__/__/____ __:__:__"}
            onChange={(newValue) => {
              setStart(newValue);
            }}
          />
        </LocalizationProvider>

        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => (
              <TextField sx={{ mx: 2 }} variant="standard" {...props} />
            )}
            label="End Time"
            value={end}
            // disableMaskedInput
            mask={"__/__/____ __:__:__"}
            onChange={(newValue) => {
              setEnd(newValue);
            }}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            fetch("/api/create-captain-history", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                ballkid_id: ballkid.id,
                captain_id: captain.id,
                start: start,
                end: end,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Team history created!");
              } else {
                setErrorMsg("Error creating team history.");
              }
              setBallkid(null);
              setCaptain(null);
              setStart(null);
              setEnd(null);
            });
          }}
        >
          Create Captain History
        </Button>
      </Grid>
    </Grid>
  );
}

function CreateRating({ ballkidsList, captainsList }) {
  const [ratee, setRatee] = useState(null);
  const [rater, setRater] = useState(null);
  const [date, setDate] = useState(null);
  const [rating, setRating] = useState(null);
  const [athleticismRating, setAthleticismRating] = useState(null);
  const [rollingRating, setRollingRating] = useState(null);
  const [awarenessRating, setAwarenessRating] = useState(null);
  const [decisionRating, setDecisionRating] = useState(null);
  const [effortRating, setEffortRating] = useState(null);
  const [comments, setComments] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid
      container
      sx={{ mt: 7 }}
      spacing={2}
      alignItems="center"
      direction="column"
      justifyContent="center"
    >
      <Grid item xs={12}>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography component="h4" variant="h4">
          Add Rating
        </Typography>
      </Grid>

      <Grid item xs={12} className="sxs">
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300, mx: 2 }}
          options={ballkidsList}
          value={ratee}
          onChange={(e, newVal) => {
            setRatee(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField {...params} variant="standard" label="Ratee" required />
          )}
        />
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300, mx: 2 }}
          options={captainsList}
          value={rater}
          onChange={(e, newVal) => {
            setRater(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField {...params} variant="standard" label="Rater" required />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DatePicker
            renderInput={(props) => (
              <TextField
                sx={{ mx: 2 }}
                variant="standard"
                required={true}
                {...props}
              />
            )}
            label="Date"
            value={date}
            mask={"__/__/____"}
            onChange={(newValue) => {
              setDate(newValue.toLocaleString());
            }}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={12}>
        <div className="sxs">
          <RatingAndLabel
            label={"Overall"}
            rating={rating}
            setRating={setRating}
          />
          <RatingAndLabel
            label={"Athleticism"}
            rating={athleticismRating}
            setRating={setAthleticismRating}
          />
        </div>
        <div className="sxs">
          <RatingAndLabel
            label={"Rolling"}
            rating={rollingRating}
            setRating={setRollingRating}
          />
          <RatingAndLabel
            label={"Awareness"}
            rating={awarenessRating}
            setRating={setAwarenessRating}
          />
        </div>
        <div className="sxs">
          <RatingAndLabel
            label={"Decision-making"}
            rating={decisionRating}
            setRating={setDecisionRating}
          />
          <RatingAndLabel
            label={"Effort"}
            rating={effortRating}
            setRating={setEffortRating}
          />
        </div>
      </Grid>

      <Grid item xs={12}>
        <TextField
          label="Comments"
          variant="standard"
          sx={{ width: 400 }}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          multiline
        />
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            fetch("/api/create-rating", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                rater: rater.id,
                ratee: ratee.id,
                date: date,
                rating: rating,
                athleticism_rating: athleticismRating,
                rolling_rating: rollingRating,
                awareness_rating: awarenessRating,
                decision_rating: decisionRating,
                effort_rating: effortRating,
                comments: comments,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Rating submitted!");
                setRater(null);
                setRatee(null);
                setComments("");
                setRating(null);
                setDate(null);
                setAthleticismRating(null);
                setRollingRating(null);
                setAwarenessRating(null);
                setDecisionRating(null);
                setEffortRating(null);
              } else {
                setErrorMsg("Error submitting rating.");
              }
            });
          }}
        >
          Create Rating
        </Button>
      </Grid>
    </Grid>
  );
}

function CreateFinalsHistory({ ballkidsList }) {
  const [ballkid, setBallkid] = useState(null);
  const [year, setYear] = useState("");
  const [matchType, setMatchType] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid
      container
      sx={{ mt: 7 }}
      spacing={2}
      alignItems="center"
      direction="column"
      justifyContent="center"
    >
      <Grid item xs={12}>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography component="h4" variant="h4">
          Add Finals History
        </Typography>
      </Grid>

      <Grid item xs={12} className="sxs">
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300, mx: 2 }}
          options={ballkidsList}
          value={ballkid}
          onChange={(e, newVal) => {
            setBallkid(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label="Ballkid"
              required
            />
          )}
        />
      </Grid>

      <Grid item xs={12} className="sxs">
        <TextField
          sx={{ mx: 2 }}
          variant="standard"
          value={year}
          required={true}
          label="Year"
          onChange={(e) => setYear(e.target.value)}
        />

        <FormControl
          component="fieldset"
          style={{ minWidth: 200 }}
          required={true}
        >
          <InputLabel>Match Type</InputLabel>
          <Select
            label="Match Type"
            variant="standard"
            value={matchType}
            sx={{ mx: 2 }}
            onChange={(e) => setMatchType(e.target.value)}
          >
            <MenuItem value={"Men's Singles"}>Men's Singles</MenuItem>
            <MenuItem value={"Men's Doubles"}>Men's Doubles</MenuItem>
            <MenuItem value={"Women's Singles"}>Women's Singles</MenuItem>
            <MenuItem value={"Women's Doubles"}>Women's Doubles</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            fetch("/api/create-finals-history", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                ballkid_id: ballkid.id,
                year: year,
                match_type: matchType,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Rating submitted!");
                setBallkid(null);
                setYear("");
                setMatchType("");
              } else {
                setErrorMsg("Error submitting rating.");
              }
            });
          }}
        >
          Create Finals History
        </Button>
      </Grid>
    </Grid>
  );
}

function CreateCutHistory({ ballkidsList }) {
  const [ballkid, setBallkid] = useState(null);
  const [year, setYear] = useState("");
  const [furthestDay, setFurthestDay] = useState(null);
  const [selfCut, setSelfCut] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid
      container
      sx={{ mt: 7 }}
      spacing={2}
      alignItems="center"
      direction="column"
      justifyContent="center"
    >
      <Grid item xs={12}>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography component="h4" variant="h4">
          Add Cut History
        </Typography>
      </Grid>

      <Grid item xs={12} className="sxs">
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300, mx: 2 }}
          options={ballkidsList}
          value={ballkid}
          onChange={(e, newVal) => {
            setBallkid(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label="Ballkid"
              required
            />
          )}
        />

        <FormControl component="fieldset" style={{ minWidth: 200 }} required>
          <InputLabel>Self-cut?</InputLabel>
          <Select
            label="Self-Cut"
            value={selfCut}
            variant="standard"
            sx={{ mx: 2 }}
            onChange={(e) => setSelfCut(e.target.value)}
          >
            <MenuItem value={true}>Yes</MenuItem>
            <MenuItem value={false}>No</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} className="sxs">
        <TextField
          sx={{ mx: 2 }}
          variant="standard"
          required={true}
          value={year}
          label="Year"
          onChange={(e) => setYear(e.target.value)}
        />

        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DatePicker
            renderInput={(props) => (
              <TextField
                sx={{ mx: 2 }}
                variant="standard"
                required={true}
                {...props}
              />
            )}
            label="Furthest Day"
            value={furthestDay}
            mask={"__/__/____"}
            onChange={(newValue) => setFurthestDay(newValue.toLocaleString())}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            fetch("/api/create-cut-history", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                ballkid_id: ballkid.id,
                year: year,
                furthest_day: furthestDay,
                self_cut: selfCut,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Rating submitted!");
                setBallkid(null);
                setYear("");
                setFurthestDay(null);
                setSelfCut(false);
              } else {
                setErrorMsg("Error submitting rating.");
              }
            });
          }}
        >
          Create Cut History
        </Button>
      </Grid>
    </Grid>
  );
}

export default function DebugPage(props) {
  const [ballkids, setBallkids] = useState([]);
  const [captains, setCaptains] = useState([]);

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setBallkids(data);
        setCaptains(
          data.filter(
            (ballkid) =>
              ballkid.is_captain === true || ballkid.is_chairperson === true
          )
        );
      });
  }, []);

  const ballkidsList = ballkids.map((ballkid) => ({
    label: ballkid.first_name + " " + ballkid.last_name,
    id: ballkid.id,
  }));

  const captainsList = captains.map((ballkid) => ({
    label: ballkid.first_name + " " + ballkid.last_name,
    id: ballkid.id,
  }));

  return (
    <div className="page">
      <div className="content">
        <CreateBallkid />
        <CreateCheckinHistory ballkidsList={ballkidsList} />
        <CreateTeamHistory ballkidsList={ballkidsList} />
        <CreateCaptainHistory
          ballkidsList={ballkidsList}
          captainsList={captainsList}
        />
        <CreateFinalsHistory ballkidsList={ballkidsList} />
        <CreateCutHistory ballkidsList={ballkidsList} />
        <CreateRating ballkidsList={ballkidsList} captainsList={captainsList} />
      </div>
    </div>
  );
}
