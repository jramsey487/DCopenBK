import React, { useState, useEffect, Component } from "react";

import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Alert from "@mui/material/Alert";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";

import TaskAlt from "@mui/icons-material/TaskAlt";
import UploadFile from "@mui/icons-material/UploadFile";
import PersonAdd from "@mui/icons-material/PersonAdd";
import HistoryEdu from "@mui/icons-material/HistoryEdu";
import CloudUpload from "@mui/icons-material/CloudUpload";
import EventAvailable from "@mui/icons-material/EventAvailable";
import StarRate from "@mui/icons-material/StarRate";
import GroupAdd from "@mui/icons-material/GroupAdd";
import ContentCut from "@mui/icons-material/ContentCut";
import EmojiEvents from "@mui/icons-material/EmojiEvents";
import AccessTime from "@mui/icons-material/AccessTime";
import Groups from "@mui/icons-material/Groups";
import Badge from "@mui/icons-material/Badge";
import RefreshIcon from "@mui/icons-material/Refresh";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import { DateTime } from "luxon";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { RatingAndLabel } from "../ratings/RatingDialog";
import "../ratings/rating-dialog.css";
import {
  Alerts,
  getAuthHeader,
  getToken,
  Banners,
  getToday,
} from "../Utils";
import "./debug-page.css";

// Error Boundary Component
class FormErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Tab Render Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="debug-form-card" style={{ borderColor: "#fecdd3" }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Something went wrong while rendering this section.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {this.state.error?.toString() || "Unknown error occurred."}
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<RefreshIcon />}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Reset Form
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom MUI DatePickers compatible with renderInput
const CustomDatePicker = ({ label, value, onChange, required = false }) => (
  <DatePicker
    label={label}
    value={value || null}
    onChange={onChange}
    renderInput={(params) => (
      <TextField
        {...params}
        size="medium"
        fullWidth
        variant="outlined"
        required={required}
      />
    )}
  />
);

const CustomDateTimePicker = ({ label, value, onChange, required = false }) => (
  <DateTimePicker
    label={label}
    value={value || null}
    onChange={onChange}
    renderInput={(params) => (
      <TextField
        {...params}
        size="medium"
        fullWidth
        variant="outlined"
        required={required}
      />
    )}
  />
);

const toIsoString = (dt) => {
  if (!dt) return null;
  if (typeof dt === "string") return dt;
  if (typeof dt.toISO === "function") return dt.toISO();
  if (typeof dt.toISODate === "function") return dt.toISODate();
  if (dt instanceof Date) return dt.toISOString();
  return null;
};

/** API create-rating expects MM/DD/YYYY (not ISO). */
const toSlashMonthDayYear = (dt) => {
  if (!dt) {
    return null;
  }
  if (typeof dt === "string") {
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dt)) {
      return dt;
    }
    const parsed = DateTime.fromISO(dt);
    if (parsed.isValid) {
      return parsed.toFormat("MM/dd/yyyy");
    }
    return null;
  }
  if (typeof dt.toFormat === "function") {
    return dt.toFormat("MM/dd/yyyy");
  }
  if (dt instanceof Date) {
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${dt.getFullYear()}`;
  }
  return null;
};

const getSafeOptionLabel = (option) => {
  if (!option) return "";
  if (typeof option === "string") return option;
  return option.label || "";
};

const FormCard = ({ title, children, icon: Icon }) => (
  <div className="debug-form-card">
    <div className="debug-form-card__head">
      {Icon ? (
        <div className="debug-form-card__icon">
          <Icon fontSize="small" />
        </div>
      ) : null}
      <h2 className="debug-form-card__title">{title}</h2>
    </div>
    <hr className="debug-form-card__divider" />
    {children}
  </div>
);

function CreateBallkid() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [preferredPosition, setPreferredPosition] = useState("");
  const [numYearsExperience, setNumYearsExperience] = useState("");
  const [image, setImage] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch("/api/create-ballkid", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth || null,
        image: image,
        preferred_position: preferredPosition,
        num_years_experience: numYearsExperience ? parseInt(numYearsExperience, 10) : 0,
        is_captain: isCaptain,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("Ballkid created successfully!");
          setFirstName("");
          setLastName("");
          setDateOfBirth("");
          setNumYearsExperience("");
          setPreferredPosition("");
          setIsCaptain(false);
          setImage("");
        } else {
          setErrorMsg("Error creating ballkid.");
        }
      })
      .catch(() => setErrorMsg("Network error creating ballkid."));
  };

  return (
    <FormCard title="Create Ballkid" icon={PersonAdd}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            value={firstName}
            label="First Name"
            variant="outlined"
            required
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            value={lastName}
            label="Last Name"
            variant="outlined"
            required
            onChange={(e) => setLastName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            value={dateOfBirth}
            label="Date of birth"
            variant="outlined"
            type="date"
            required
            InputLabelProps={{ shrink: true }}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            value={numYearsExperience}
            label="Years of Experience"
            variant="outlined"
            type="number"
            onChange={(e) => setNumYearsExperience(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Preferred Position"
            value={preferredPosition}
            variant="outlined"
            required
            onChange={(e) => setPreferredPosition(e.target.value)}
          >
            <MenuItem value={"Back"}>Back</MenuItem>
            <MenuItem value={"Net"}>Net</MenuItem>
            <MenuItem value={"Back/Net"}>Back/Net</MenuItem>
            <MenuItem value={"Net/Back"}>Net/Back</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Is Captain"
            value={isCaptain ? "true" : "false"}
            variant="outlined"
            required
            onChange={(e) => setIsCaptain(e.target.value === "true")}
          >
            <MenuItem value={"true"}>Yes</MenuItem>
            <MenuItem value={"false"}>No</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            value={image}
            label="Image URL"
            variant="outlined"
            placeholder="https://example.com/photo.jpg"
            onChange={(e) => setImage(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Create Ballkid
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function CreateUser() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [group, setGroup] = useState("ballkid");
  const [email, setEmail] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
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
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("User created successfully!");
          setFirstName("");
          setLastName("");
          setGroup("ballkid");
          setEmail("");
        } else {
          setErrorMsg("Error creating user.");
        }
      })
      .catch(() => setErrorMsg("Network error creating user."));
  };

  return (
    <FormCard title="Create User" icon={Badge}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            variant="outlined"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            variant="outlined"
            value={lastName}
            required
            onChange={(e) => setLastName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Permissions Group"
            value={group}
            variant="outlined"
            required
            onChange={(e) => setGroup(e.target.value)}
          >
            <MenuItem value={"ballkid"}>Ballkid</MenuItem>
            <MenuItem value={"captain"}>Captain</MenuItem>
            <MenuItem value={"chairperson"}>Chairperson</MenuItem>
            <MenuItem value={"ticketing"}>Ticketing</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            variant="outlined"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Create User
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function CreateCheckinHistory({ ballkidsList = [] }) {
  const [ballkid, setBallkid] = useState(null);
  const [checkin, setCheckin] = useState(null);
  const [checkout, setCheckout] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = () => {
    fetch("/api/create-checkin-history", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        ballkid_id: ballkid?.id,
        checkin: toIsoString(checkin),
        checkout: toIsoString(checkout),
      }),
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("Check-in history created!");
          setBallkid(null);
          setCheckin(null);
          setCheckout(null);
        } else {
          setErrorMsg("Error creating check-in history.");
        }
      })
      .catch(() => setErrorMsg("Network error creating check-in history."));
  };

  return (
    <FormCard title="Create Check-in History" icon={AccessTime}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Autocomplete
            options={ballkidsList}
            value={ballkid || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setBallkid(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Ballkid" required />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDateTimePicker
            label="Check-in Time"
            value={checkin}
            onChange={(newValue) => setCheckin(newValue)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDateTimePicker
            label="Check-out Time"
            value={checkout}
            onChange={(newValue) => setCheckout(newValue)}
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Create Check-in History
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function CreateTeamHistory({ ballkidsList = [] }) {
  const [ballkid, setBallkid] = useState(null);
  const [team, setTeam] = useState("");
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = () => {
    fetch("/api/create-team-history", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        ballkid_id: ballkid?.id,
        team: team,
        start: toIsoString(start),
        end: toIsoString(end),
      }),
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("Team history created!");
          setBallkid(null);
          setTeam("");
          setStart(null);
          setEnd(null);
        } else {
          setErrorMsg("Error creating team history.");
        }
      })
      .catch(() => setErrorMsg("Network error creating team history."));
  };

  return (
    <FormCard title="Create Team History" icon={Groups}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12} sm={8}>
          <Autocomplete
            options={ballkidsList}
            value={ballkid || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setBallkid(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Ballkid" required />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Team #"
            variant="outlined"
            type="number"
            value={team}
            required
            onChange={(e) => setTeam(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDateTimePicker
            label="Start Time"
            value={start}
            onChange={(newValue) => setStart(newValue)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDateTimePicker
            label="End Time"
            value={end}
            onChange={(newValue) => setEnd(newValue)}
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Create Team History
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function CreateCaptainHistory({ ballkidsList = [], captainsList = [] }) {
  const [ballkid, setBallkid] = useState(null);
  const [captain, setCaptain] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = () => {
    fetch("/api/create-captain-history", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        ballkid_id: ballkid?.id,
        captain_id: captain?.id,
        start: toIsoString(start),
        end: toIsoString(end),
      }),
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("Captain history created!");
          setBallkid(null);
          setCaptain(null);
          setStart(null);
          setEnd(null);
        } else {
          setErrorMsg("Error creating captain history.");
        }
      })
      .catch(() => setErrorMsg("Network error creating captain history."));
  };

  return (
    <FormCard title="Create Captain History" icon={HistoryEdu}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={ballkidsList}
            value={ballkid || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setBallkid(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Ballkid" required />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={captainsList}
            value={captain || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setCaptain(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Captain" required />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDateTimePicker
            label="Start Time"
            value={start}
            onChange={(newValue) => setStart(newValue)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDateTimePicker
            label="End Time"
            value={end}
            onChange={(newValue) => setEnd(newValue)}
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Create Captain History
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function CreateFinalsHistory({ ballkidsList = [] }) {
  const [ballkid, setBallkid] = useState(null);
  const [year, setYear] = useState("");
  const [matchType, setMatchType] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = () => {
    fetch("/api/create-finals-history", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        ballkid_id: ballkid?.id,
        year: year,
        match_type: matchType,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("Finals history created!");
          setBallkid(null);
          setYear("");
          setMatchType("");
        } else {
          setErrorMsg("Error creating finals history.");
        }
      })
      .catch(() => setErrorMsg("Network error creating finals history."));
  };

  return (
    <FormCard title="Create Finals History" icon={EmojiEvents}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={ballkidsList}
            value={ballkid || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setBallkid(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Ballkid" required />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            value={year}
            required
            label="Year"
            onChange={(e) => setYear(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            select
            fullWidth
            label="Match Type"
            value={matchType}
            variant="outlined"
            required
            onChange={(e) => setMatchType(e.target.value)}
          >
            <MenuItem value={"Men's Singles"}>Men's Singles</MenuItem>
            <MenuItem value={"Men's Doubles"}>Men's Doubles</MenuItem>
            <MenuItem value={"Women's Singles"}>Women's Singles</MenuItem>
            <MenuItem value={"Women's Doubles"}>Women's Doubles</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Create Finals History
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function CreateCutHistory({ ballkidsList = [] }) {
  const [ballkid, setBallkid] = useState(null);
  const [year, setYear] = useState("");
  const [furthestDay, setFurthestDay] = useState(null);
  const [selfCut, setSelfCut] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = () => {
    fetch("/api/create-cut-history", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        ballkid_id: ballkid?.id,
        year: year,
        furthest_day: toIsoString(furthestDay),
        self_cut: selfCut,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("Cut history created/updated!");
          setBallkid(null);
          setYear("");
          setFurthestDay(null);
          setSelfCut(false);
        } else {
          setErrorMsg("Error creating/updating cut history.");
        }
      })
      .catch(() => setErrorMsg("Network error creating cut history."));
  };

  return (
    <FormCard title="Create/Update Cut History" icon={ContentCut}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={ballkidsList}
            value={ballkid || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setBallkid(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Ballkid" required />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Self-Cut"
            value={selfCut ? "true" : "false"}
            variant="outlined"
            required
            onChange={(e) => setSelfCut(e.target.value === "true")}
          >
            <MenuItem value={"true"}>Yes</MenuItem>
            <MenuItem value={"false"}>No</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            required
            value={year}
            label="Year"
            onChange={(e) => setYear(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDatePicker
            label="Furthest Day"
            value={furthestDay}
            onChange={(newValue) => setFurthestDay(newValue)}
            required
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Create / Update Cut History
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function CreateRating({ ballkidsList = [], captainsList = [] }) {
  const [ratee, setRatee] = useState(null);
  const [rater, setRater] = useState(null);
  const [date, setDate] = useState(() =>
    DateTime.fromFormat(getToday("slash", true), "MM/dd/yyyy")
  );
  const [rating, setRating] = useState(null);
  const [athleticismRating, setAthleticismRating] = useState(null);
  const [rollingRating, setRollingRating] = useState(null);
  const [awarenessRating, setAwarenessRating] = useState(null);
  const [decisionRating, setDecisionRating] = useState(null);
  const [effortRating, setEffortRating] = useState(null);
  const [comments, setComments] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = () => {
    if (!ratee?.id || !rater?.id) {
      setErrorMsg("Ratee and rater are required.");
      return;
    }
    if (!rating) {
      setErrorMsg("Overall rating is required (0.5–5 stars).");
      return;
    }
    const dateStr = toSlashMonthDayYear(date);
    if (!dateStr) {
      setErrorMsg("Date is required.");
      return;
    }

    fetch("/api/create-rating", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        rater: rater.id,
        ratee: ratee.id,
        date: dateStr,
        rating: rating,
        athleticism_rating: athleticismRating,
        rolling_rating: rollingRating,
        awareness_rating: awarenessRating,
        decision_rating: decisionRating,
        effort_rating: effortRating,
        comments: comments,
      }),
    })
      .then(async (response) => {
        if (response.ok) {
          setSuccessMsg("Rating submitted successfully!");
          setRater(null);
          setRatee(null);
          setComments("");
          setRating(null);
          setDate(DateTime.fromFormat(getToday("slash", true), "MM/dd/yyyy"));
          setAthleticismRating(null);
          setRollingRating(null);
          setAwarenessRating(null);
          setDecisionRating(null);
          setEffortRating(null);
          return;
        }
        let detail = "Error submitting rating.";
        try {
          const body = await response.json();
          if (body?.["Invalid serializer"]) {
            detail = String(body["Invalid serializer"]);
          }
        } catch {
          /* ignore */
        }
        setErrorMsg(detail);
      })
      .catch(() => setErrorMsg("Network error submitting rating."));
  };

  const ratingFields = [
    { label: "Overall*", value: rating, setter: setRating },
    { label: "Athleticism", value: athleticismRating, setter: setAthleticismRating },
    { label: "Rolling", value: rollingRating, setter: setRollingRating },
    { label: "Awareness", value: awarenessRating, setter: setAwarenessRating },
    { label: "Effort", value: effortRating, setter: setEffortRating },
    { label: "Decision-making", value: decisionRating, setter: setDecisionRating },
  ];

  return (
    <FormCard title="Create Rating" icon={StarRate}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        {/* Ratee & Rater */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={ballkidsList}
            value={ratee || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setRatee(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Ratee (Ballkid)" required />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={captainsList}
            value={rater || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setRater(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Rater (Captain)" required />}
          />
        </Grid>

        {/* Date Field */}
        <Grid item xs={12}>
          <CustomDatePicker
            label="Date"
            value={date}
            onChange={(newValue) => setDate(newValue)}
            required
          />
        </Grid>

        {/* Individual Card Styling per Rating Item */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {ratingFields.map((item, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <div className="debug-form-card" style={{ padding: 14, boxShadow: "none" }}>
                  <Box sx={{ width: "100%" }}>
                    <RatingAndLabel
                      label={item.label}
                      rating={item.value}
                      setRating={item.setter}
                    />
                  </Box>
                </div>
              </Grid>
            ))}
          </Grid>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, fontSize: "0.775rem", lineHeight: 1.55 }}
          >
            Overall rating is required. Sub-categories are optional. Empty (0)
            stars are treated as unset.
          </Typography>
        </Grid>

        {/* Comments Field */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comments"
            variant="outlined"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </Grid>

        {/* Submit Button */}
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Create Rating
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function UpdateShift() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [court, setCourt] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const courtsList = ["Stadium", "Harris", "Grandstand", "Court 4", "Court 5"].map((courtName, index) => ({
    label: courtName,
    id: index,
  }));

  const handleSubmit = () => {
    fetch("/api/update-shift", {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({
        start: toIsoString(start),
        end: toIsoString(end),
        court: court?.label,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("Shift updated successfully!");
          setStart(null);
          setEnd(null);
          setCourt(null);
        } else {
          setErrorMsg("Error updating shift.");
        }
      })
      .catch(() => setErrorMsg("Network error updating shift."));
  };

  return (
    <FormCard title="Update Shift" icon={EventAvailable}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Autocomplete
            options={courtsList}
            value={court || null}
            getOptionLabel={getSafeOptionLabel}
            onChange={(e, newVal) => setCourt(newVal)}
            isOptionEqualToValue={(option, value) => !value || option?.id === value?.id}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Court" required />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDateTimePicker
            label="Shift Start Time"
            value={start}
            onChange={(newValue) => setStart(newValue)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomDateTimePicker
            label="Shift End Time"
            value={end}
            onChange={(newValue) => setEnd(newValue)}
            required
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Update Shift
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

function BulkCreation({ type }) {
  const [file, setFile] = useState(null);
  const [showProgress, setShowProgress] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;

    setShowProgress(true);
    const formData = new FormData();
    formData.append("file", file);

    fetch(`/api/bulk-create-${type}`, {
      method: "POST",
      headers: { Authorization: "Token " + getToken() },
      body: formData,
    })
      .then((response) => {
        setShowProgress(false);
        if (response.ok) {
          setSuccessMsg(`Bulk created ${type} successfully!`);
          setFile(null);
        } else {
          setErrorMsg(`Error bulk creating ${type}.`);
        }
      })
      .catch(() => {
        setShowProgress(false);
        setErrorMsg(`Network error uploading bulk file.`);
      });
  };

  const titleType = type ? type.charAt(0).toUpperCase() + type.slice(1) : "";

  return (
    <FormCard title={`Bulk Create ${titleType}`} icon={CloudUpload}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center", my: 2 }}>
        <label className={`debug-upload-zone${file ? " is-ready" : ""}`}>
          <input type="file" accept=".csv" hidden onChange={(e) => setFile(e.target.files[0])} />
          {file ? (
            <TaskAlt sx={{ fontSize: 40, color: "var(--green)" }} />
          ) : (
            <UploadFile sx={{ fontSize: 40, color: "var(--text2)" }} />
          )}
          <p className="debug-upload-zone__title">
            {file ? file.name : "Click to select a CSV file"}
          </p>
          <p className="debug-upload-zone__hint">Only .csv files supported</p>
        </label>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            size="large"
            color="primary"
            variant="contained"
            disabled={!file || showProgress}
            onClick={handleUpload}
          >
            Bulk Create {titleType}
          </Button>
          {showProgress && <CircularProgress size={24} />}
        </Box>
      </Box>
    </FormCard>
  );
}

function BulkCheckin() {
  const [numBallkids, setNumBallkids] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = () => {
    fetch("/api/bulk-checkin", {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({ num: numBallkids }),
    })
      .then((response) => {
        if (response.ok) {
          setSuccessMsg("Ballkids checked in!");
          setNumBallkids("");
        } else {
          setErrorMsg("Error checking in ballkids.");
        }
      })
      .catch(() => setErrorMsg("Network error checking in ballkids."));
  };

  return (
    <FormCard title="Bulk Ballkid Check-In" icon={GroupAdd}>
      <Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            value={numBallkids}
            label="Number of Ballkids"
            variant="outlined"
            type="number"
            required
            onChange={(e) => setNumBallkids(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Note: Ballkids to be checked in will be randomly selected from active entries.
          </Typography>
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Button size="large" color="primary" variant="contained" onClick={handleSubmit}>
            Bulk Check In
          </Button>
        </Grid>
      </Grid>
    </FormCard>
  );
}

export default function DebugPage() {
  const [ballkids, setBallkids] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [activeSection, setActiveSection] = useState("ballkid");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width:899.95px)");

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setBallkids(data);
          setCaptains(data.filter((b) => b && (b.is_captain === true || b.is_chairperson === true)));
        }
      })
      .catch(() => {});
  }, []);

  const ballkidsList = (Array.isArray(ballkids) ? ballkids : []).map((b) => ({
    label: `${b?.first_name || ""} ${b?.last_name || ""}`.trim() || `Ballkid #${b?.id || ""}`,
    id: b?.id,
  }));

  const captainsList = (Array.isArray(captains) ? captains : []).map((b) => ({
    label: `${b?.first_name || ""} ${b?.last_name || ""}`.trim() || `Captain #${b?.id || ""}`,
    id: b?.id,
  }));

  const menuCategories = [
    {
      title: "User Management",
      items: [
        { id: "ballkid", label: "Create Ballkid", icon: PersonAdd },
        { id: "user", label: "Create User", icon: Badge },
      ],
    },
    {
      title: "Histories & Shifts",
      items: [
        { id: "checkin", label: "Check-in History", icon: AccessTime },
        { id: "team", label: "Team History", icon: Groups },
        { id: "captain", label: "Captain History", icon: HistoryEdu },
        { id: "finals", label: "Finals History", icon: EmojiEvents },
        { id: "cut", label: "Cut History", icon: ContentCut },
        { id: "shift", label: "Update Shift", icon: EventAvailable },
      ],
    },
    {
      title: "Evaluations",
      items: [{ id: "rating", label: "Create Rating", icon: StarRate }],
    },
    {
      title: "Bulk Uploads",
      items: [
        { id: "bulk-checkin", label: "Bulk Check-in", icon: GroupAdd },
        { id: "bulk-ballkids", label: "Bulk Ballkids", icon: CloudUpload },
        { id: "bulk-users", label: "Bulk Users", icon: CloudUpload },
        { id: "bulk-signups", label: "Bulk Signups", icon: CloudUpload },
        { id: "bulk-ratings", label: "Bulk Ratings", icon: CloudUpload },
        { id: "bulk-finals", label: "Bulk Finals", icon: CloudUpload },
        { id: "bulk-cuts", label: "Bulk Cuts", icon: CloudUpload },
        { id: "bulk-checkins", label: "Bulk Check-ins", icon: CloudUpload },
      ],
    },
  ];

  const renderActiveForm = () => {
    switch (activeSection) {
      case "ballkid":
        return <CreateBallkid />;
      case "user":
        return <CreateUser />;
      case "checkin":
        return <CreateCheckinHistory ballkidsList={ballkidsList} />;
      case "team":
        return <CreateTeamHistory ballkidsList={ballkidsList} />;
      case "captain":
        return <CreateCaptainHistory ballkidsList={ballkidsList} captainsList={captainsList} />;
      case "finals":
        return <CreateFinalsHistory ballkidsList={ballkidsList} />;
      case "cut":
        return <CreateCutHistory ballkidsList={ballkidsList} />;
      case "shift":
        return <UpdateShift />;
      case "rating":
        return <CreateRating ballkidsList={ballkidsList} captainsList={captainsList} />;
      case "bulk-checkin":
        return <BulkCheckin />;
      case "bulk-ballkids":
        return <BulkCreation type="ballkids" />;
      case "bulk-users":
        return <BulkCreation type="users" />;
      case "bulk-signups":
        return <BulkCreation type="signups" />;
      case "bulk-ratings":
        return <BulkCreation type="ratings" />;
      case "bulk-finals":
        return <BulkCreation type="finals" />;
      case "bulk-cuts":
        return <BulkCreation type="cuts" />;
      case "bulk-checkins":
        return <BulkCreation type="checkins" />;
      default:
        return <CreateBallkid />;
    }
  };

  const drawerContent = (
    <nav className="debug-nav">
      <div className="debug-nav__head">
        <div className="debug-nav__head-icon">
          <AdminPanelSettingsIcon />
        </div>
        <div>
          <h1 className="debug-nav__title">Debug</h1>
          <p className="debug-nav__subtitle">Seed &amp; manage test data</p>
        </div>
      </div>

      {menuCategories.map((category, catIdx) => (
        <div className="debug-nav__category" key={catIdx}>
          <h2 className="debug-nav__category-title">{category.title}</h2>
          <List disablePadding>
            {category.items.map((item) => {
              const IconComponent = item.icon;
              const isSelected = activeSection === item.id;
              return (
                <ListItemButton
                  key={item.id}
                  className="debug-nav__item"
                  selected={isSelected}
                  onClick={() => {
                    setActiveSection(item.id);
                    if (isMobile) setMobileOpen(false);
                  }}
                >
                  <ListItemIcon>
                    <IconComponent fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
          </List>
        </div>
      ))}
    </nav>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <div className="debug-shell">
        <div className="debug-page">
          <Banners />

          {isMobile ? (
            <div className="debug-mobile-bar">
              <h1 className="debug-mobile-bar__title">Debug</h1>
              <IconButton
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            </div>
          ) : null}

          <div className="debug-layout">
            {!isMobile ? (
              <aside className="debug-nav--sticky">{drawerContent}</aside>
            ) : (
              <Drawer
                anchor="left"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                PaperProps={{ className: "debug-drawer" }}
              >
                {drawerContent}
              </Drawer>
            )}

            <div className="debug-main">
              <FormErrorBoundary key={activeSection}>
                {renderActiveForm()}
              </FormErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </LocalizationProvider>
  );
}