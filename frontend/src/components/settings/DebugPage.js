import React, { useState, useEffect } from "react";
import {
  Button,
  Grid,
  Autocomplete,
  Typography,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Box,
  Select,
} from "@mui/material";
import { TaskAlt, UploadFile } from "@mui/icons-material";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { Alerts, getAuthHeader, useIsMobile, getToken } from "../Utils";
import { RatingAndLabel } from "../ratings/RatingDialog";

function CreateBallkid(props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [preferredPosition, setPreferredPosition] = useState("");
  const [numYearsExperience, setNumYearsExperience] = useState("");
  const [image, setImage] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Create Ballkid
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          value={firstName}
          label="First Name"
          variant="standard"
          required
          onChange={(e) => setFirstName(e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          value={lastName}
          label="Last Name"
          variant="standard"
          required
          onChange={(e) => setLastName(e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          value={age}
          label="Age"
          variant="standard"
          type="number"
          required
          onChange={(e) => setAge(parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          value={numYearsExperience}
          label="# Years Experience"
          variant="standard"
          type="number"
          onChange={(e) => setNumYearsExperience(parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          label="Preferred Position"
          value={preferredPosition}
          variant="standard"
          style={{ minWidth: 250 }}
          required
          onChange={(e) => setPreferredPosition(e.target.value)}
        >
          <MenuItem value={"Back"}>Back</MenuItem>
          <MenuItem value={"Net"}>Net</MenuItem>
          <MenuItem value={"Back/Net"}>Back/Net</MenuItem>
          <MenuItem value={"Net/Back"}>Net/Back</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          label="Is Captain"
          value={isCaptain}
          variant="standard"
          style={{ minWidth: 200 }}
          required
          onChange={(e) => setIsCaptain(e.target.value)}
        >
          <MenuItem value={true}>Yes</MenuItem>
          <MenuItem value={false}>No</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <TextField
          value={image}
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

function CreateUser(props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [group, setGroup] = useState("ballkid");
  const [email, setEmail] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Create User
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="First Name"
          variant="standard"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Last Name"
          variant="standard"
          value={lastName}
          required
          onChange={(e) => setLastName(e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          label="Permissions Group"
          value={group}
          variant="standard"
          style={{ minWidth: 250 }}
          required
          onChange={(e) => setGroup(e.target.value)}
        >
          <MenuItem value={"ballkid"}>Ballkid</MenuItem>
          <MenuItem value={"captain"}>Captain</MenuItem>
          <MenuItem value={"chairperson"}>Chairperson</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Email"
          variant="standard"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            fetch("/accounts/register", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                group: group,
                email: email,
                password: "password",
                password2: "password",
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("User created!");
              } else {
                setErrorMsg("Error creating user.");
              }
              setFirstName("");
              setLastName("");
              setGroup("ballkid");
              setEmail("");
            });
          }}
        >
          Create User
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
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Create Check-in History
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
              <TextField variant="standard" required {...props} />
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
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => <TextField variant="standard" {...props} />}
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
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Create Team History
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
              <TextField variant="standard" required {...props} />
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
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => <TextField variant="standard" {...props} />}
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
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Create Captain History
        </Typography>
      </Grid>

      <Grid item xs={12} className="sxs">
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
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300 }}
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
              <TextField variant="standard" required {...props} />
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
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => <TextField variant="standard" {...props} />}
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

function CreateFinalsHistory({ ballkidsList }) {
  const [ballkid, setBallkid] = useState(null);
  const [year, setYear] = useState("");
  const [matchType, setMatchType] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Create Finals History
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
        <TextField
          variant="standard"
          value={year}
          required
          label="Year"
          onChange={(e) => setYear(e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          select
          label="Match Type"
          value={matchType}
          variant="standard"
          style={{ minWidth: 200 }}
          required
          onChange={(e) => setMatchType(e.target.value)}
        >
          <MenuItem value={"Men's Singles"}>Men's Singles</MenuItem>
          <MenuItem value={"Men's Doubles"}>Men's Doubles</MenuItem>
          <MenuItem value={"Women's Singles"}>Women's Singles</MenuItem>
          <MenuItem value={"Women's Doubles"}>Women's Doubles</MenuItem>
        </TextField>
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
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Create Cut History
        </Typography>
      </Grid>

      <Grid item xs={12} className="sxs">
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
        <TextField
          select
          label="Self-Cut"
          value={selfCut}
          variant="standard"
          style={{ minWidth: 150 }}
          required
          onChange={(e) => setSelfCut(e.target.value)}
        >
          <MenuItem value={true}>Yes</MenuItem>
          <MenuItem value={false}>No</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <TextField
          variant="standard"
          required
          value={year}
          label="Year"
          onChange={(e) => setYear(e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DatePicker
            renderInput={(props) => (
              <TextField variant="standard" required {...props} />
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
                setSuccessMsg("Cut history created!");
                setBallkid(null);
                setYear("");
                setFurthestDay(null);
                setSelfCut(false);
              } else {
                setErrorMsg("Error creating cut history.");
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

  const isMobile = useIsMobile();

  return (
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Create Rating
        </Typography>
      </Grid>

      <Grid item xs={12} className="sxs">
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300 }}
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
      </Grid>

      <Grid item xs={12}>
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300 }}
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
              <TextField variant="standard" required {...props} />
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

      <Grid container sx={{ mt: 3 }}>
        <Grid item xs={12}>
          <RatingAndLabel
            label={"Overall*"}
            rating={rating}
            setRating={setRating}
          />
        </Grid>
        <Grid item xs={12}>
          <RatingAndLabel
            label={"Athleticism"}
            rating={athleticismRating}
            setRating={setAthleticismRating}
          />
        </Grid>
        <Grid item xs={12}>
          <RatingAndLabel
            label={"Rolling"}
            rating={rollingRating}
            setRating={setRollingRating}
          />
        </Grid>
        <Grid item xs={12}>
          <RatingAndLabel
            label={"Awareness"}
            rating={awarenessRating}
            setRating={setAwarenessRating}
          />
        </Grid>
        <Grid item xs={12}>
          <RatingAndLabel
            label={"Effort"}
            rating={effortRating}
            setRating={setEffortRating}
          />
        </Grid>
        <Grid item xs={12}>
          <RatingAndLabel
            label={"Decision-making"}
            rating={decisionRating}
            setRating={setDecisionRating}
          />
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <TextField
          label="Comments"
          variant="standard"
          sx={{ width: isMobile ? 250 : 400 }}
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

function UpdateShift() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [court, setCourt] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const courtsList = [
    "Stadium",
    "Harris",
    "Grandstand",
    "Court 4",
    "Court 5",
  ].map((court, index) => ({
    label: court,
    id: index,
  }));

  return (
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Update Shift
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300 }}
          options={courtsList}
          value={court}
          onChange={(e, newVal) => {
            setCourt(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField {...params} variant="standard" label="Court" required />
          )}
        />
      </Grid>
      <Grid item xs={12} className="sxs">
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => (
              <TextField variant="standard" required {...props} />
            )}
            label="Shift Start Time"
            value={start}
            // disableMaskedInput
            mask={"__/__/____ __:__:__"}
            onChange={(newValue) => {
              setStart(newValue);
            }}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DateTimePicker
            renderInput={(props) => (
              <TextField variant="standard" required {...props} />
            )}
            label="Shift End Time"
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
            fetch("/api/update-shift", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                start: start,
                end: end,
                court: court.label,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Shift updated!");
                setStart(null);
                setEnd(null);
                setCourt(null);
              } else {
                setErrorMsg("Error updating shift.");
              }
            });
          }}
        >
          Update Shift
        </Button>
      </Grid>
    </Grid>
  );
}

function BulkCreation({ type }) {
  const [file, setFile] = useState();

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Bulk Create {type.charAt(0).toUpperCase() + type.slice(1)}
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <div className="sxs">
          <Button
            variant="outlined"
            component="label"
            startIcon={file ? <TaskAlt /> : <UploadFile />}
          >
            {file ? "File Uploaded" : "Upload File"}
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => setFile(e.target.files[0])}
            />
          </Button>
          &ensp;
          <Typography variant="body1">{file?.name}</Typography>
        </div>
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append("file", file);

            fetch(`/api/bulk-create-${type}`, {
              method: "POST",
              headers: { Authorization: "Token " + getToken() },
              body: formData,
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg(`Bulk created ${type}!`);
                setFile(null);
              } else {
                setErrorMsg(`Error bulk creating ${type}.`);
              }
            });
          }}
        >
          Bulk Create {type}
        </Button>
      </Grid>
    </Grid>
  );
}

export default function DebugPage(props) {
  const [ballkids, setBallkids] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [mobileSelection, setMobileSelection] = useState();

  const isMobile = useIsMobile();

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

  const mapped = {
    "Create Ballkid": <CreateBallkid />,
    "Create User": <CreateUser />,
    "Create Checkin History": (
      <CreateCheckinHistory ballkidsList={ballkidsList} />
    ),
    "Create Team History": <CreateTeamHistory ballkidsList={ballkidsList} />,
    "Create Captain History": (
      <CreateCaptainHistory
        ballkidsList={ballkidsList}
        captainsList={captainsList}
      />
    ),
    "Create Finals History": (
      <CreateFinalsHistory ballkidsList={ballkidsList} />
    ),
    "Create Cut History": <CreateCutHistory ballkidsList={ballkidsList} />,
    "Create Rating": (
      <CreateRating ballkidsList={ballkidsList} captainsList={captainsList} />
    ),
    "Update Shift": <UpdateShift />,
    "Bulk Create Ballkids": <BulkCreation type="ballkids" />,
    "Bulk Create Users": <BulkCreation type="users" />,
    "Bulk Create Ratings": <BulkCreation type="ratings" />,
  };

  return (
    <div className="page">
      {isMobile ? (
        <div>
          <Select
            native
            value={mobileSelection}
            sx={{ mb: 1 }}
            onChange={(e) => setMobileSelection(e.target.value)}
          >
            {Object.keys(mapped).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          {mapped[mobileSelection]}
        </div>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            bgcolor: "background.paper",
            display: "flex",
            height: 400,
            width: "95%",
          }}
        >
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={tabIndex}
            onChange={(e, newVal) => setTabIndex(newVal)}
            sx={{ borderRight: 1, borderColor: "divider", minWidth: 250 }}
          >
            {Object.keys(mapped).map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>

          {Object.keys(mapped).map((label, index) => (
            <div key={index} hidden={tabIndex !== index}>
              {tabIndex === index && mapped[label]}
            </div>
          ))}
        </Box>
      )}
    </div>
  );
}
