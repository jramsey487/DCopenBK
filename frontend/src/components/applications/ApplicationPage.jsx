import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";

// Semantic day keys -- must match api/models/application.py exactly. Never
// tied to a literal calendar date, since the tournament's actual dates
// change year to year; actual dates are computed below from
// tournament_start_date (the first Saturday), fetched from the backend.
const DAY_SAT_1 = "sat_1";
const DAY_SUN_1 = "sun_1";
const DAY_MON = "mon";
const DAY_TUE = "tue";
const DAY_WED = "wed";
const DAY_THU = "thu";
const DAY_FRI = "fri";
const DAY_SAT_2 = "sat_2";
const DAY_SUN_2 = "sun_2";

// Offset in days from the tournament's first Saturday (start_date) for each
// semantic day key -- the tournament always runs Saturday through the
// following Sunday, 9 days total.
const DAY_OFFSETS = {
  [DAY_SAT_1]: 0,
  [DAY_SUN_1]: 1,
  [DAY_MON]: 2,
  [DAY_TUE]: 3,
  [DAY_WED]: 4,
  [DAY_THU]: 5,
  [DAY_FRI]: 6,
  [DAY_SAT_2]: 7,
  [DAY_SUN_2]: 8,
};

const FIRST_TIMER_AVAILABILITY_DAYS = [DAY_WED, DAY_THU, DAY_FRI, DAY_SAT_2, DAY_SUN_2];
const VETERAN_END_OF_TOURNAMENT_DAYS = [DAY_FRI, DAY_SAT_2, DAY_SUN_2];

/** "Saturday, July 25" for a given semantic day key, given the tournament's
 * start date (ISO string, the first Saturday). Falls back to just the
 * weekday name if the start date hasn't loaded yet. */
function formatDayLabel(dayKey, startDateIso) {
  const weekday = {
    [DAY_SAT_1]: "Saturday",
    [DAY_SUN_1]: "Sunday",
    [DAY_MON]: "Monday",
    [DAY_TUE]: "Tuesday",
    [DAY_WED]: "Wednesday",
    [DAY_THU]: "Thursday",
    [DAY_FRI]: "Friday",
    [DAY_SAT_2]: "Saturday",
    [DAY_SUN_2]: "Sunday",
  }[dayKey];

  if (!startDateIso) {
    return weekday;
  }

  const start = new Date(startDateIso + "T00:00:00");
  const date = new Date(start);
  date.setDate(date.getDate() + DAY_OFFSETS[dayKey]);
  const monthDay = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${weekday}, ${monthDay}`;
}

const SIZES = ["XS", "S", "M", "L", "XL"];

const emptyForm = {
  email: "",
  first_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  state: "",
  phone: "",
  additional_email: "",
  emergency_contact_name: "",
  emergency_contact_relationship: "",
  emergency_contact_phone: "",
  tshirt_size: "",
  shorts_size: "",
  shoe_size: "",
  motivation: "",
  is_vegetarian: false,
  fun_fact: "",
  traveling_with_names: "",
  is_veteran: null,
  // veteran-only
  years_experience: "",
  position: "",
  is_captain: false,
  likelihood: "",
  headshot_update: null,
  tryout_help_availability: [],
  veteran_sunday_or_monday: "",
  veteran_wed_thu_choice: "",
  // first-timer-only
  headshot: null,
  has_tried_out_before: false,
  prior_experience: "",
  tryout_date: "",
  // shared
  availability_days: [],
  waiver_signature_name: "",
  parent_signature_name: "",
};

const STEPS = ["Basic Info", "Availability & Experience", "Waiver"];

export default function ApplicationPage() {
  const [applicationsOpen, setApplicationsOpen] = useState(null); // null = still checking
  const [tournamentStartDate, setTournamentStartDate] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/application-settings")
      .then((res) => res.json())
      .then((data) => {
        setApplicationsOpen(Boolean(data.is_open));
        setTournamentStartDate(data.tournament_start_date || null);
      })
      .catch(() => setApplicationsOpen(true)); // fail open on network hiccup rather than blocking real applicants
  }, []);

  const set = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const setFile = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.files[0] || null }));
  };

  const toggleDay = (field) => (day) => {
    setForm((f) => {
      const current = f[field];
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...f, [field]: next };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        body.append(key, JSON.stringify(value));
      } else {
        body.append(key, value);
      }
    });

    try {
      const response = await fetch("/api/submit-application", {
        method: "POST",
        body: body,
      });
      if (!response.ok) {
        const data = await response.json();
        setErrors(data);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setErrors({ non_field: "Submission failed." });
    } finally {
      setSubmitting(false);
    }
  };

  if (applicationsOpen === null) {
    return null; // brief check, avoids a flash of the form before we know
  }

  if (applicationsOpen === false) {
    return (
      <Paper sx={{ p: 4, maxWidth: 600, mx: "auto", mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Applications are currently closed
        </Typography>
        <Typography>
          We're not accepting new ballcrew applications right now. Check
          back later, or reach out to mdetennis.ballcrew@gmail.com with any
          questions.
        </Typography>
      </Paper>
    );
  }

  if (submitted) {
    return (
      <Paper sx={{ p: 4, maxWidth: 600, mx: "auto", mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Thanks for applying!
        </Typography>
        <Typography>
          We've received your application. You'll hear from us about tryout
          selection and next steps by email.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 4, maxWidth: 700, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Ballcrew Application &mdash; Mubadala DC Open 2026
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        New to ball crew, or just want a refresher before tryouts? Check out
        the{" "}
        <a href="/handbook" target="_blank" rel="noopener noreferrer">
          Ball Crew Handbook
        </a>
        .
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Stack spacing={2}>
          <TextField label="Email" value={form.email} onChange={set("email")} required />
          <TextField label="First Name" value={form.first_name} onChange={set("first_name")} required />
          <TextField label="Last Name" value={form.last_name} onChange={set("last_name")} required />
          <TextField select label="Gender" value={form.gender} onChange={set("gender")} required>
            <MenuItem value="M">Male</MenuItem>
            <MenuItem value="F">Female</MenuItem>
          </TextField>
          <TextField
            label="Date of Birth"
            type="date"
            value={form.date_of_birth}
            onChange={set("date_of_birth")}
            InputLabelProps={{ shrink: true }}
            helperText={
              tournamentStartDate
                ? `Must be 14 years old by ${formatDayLabel(DAY_SAT_1, tournamentStartDate)}`
                : "Must be 14 years old by the start of the tournament"
            }
            required
          />
          <TextField label="State of Residence (2-letter)" value={form.state} onChange={set("state")} inputProps={{ maxLength: 2 }} required />
          <TextField label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="XXX-XXX-XXXX" required />
          <TextField label="Additional Email Contact" value={form.additional_email} onChange={set("additional_email")} />
          <TextField label="Emergency Contact Name" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} required />
          <TextField label="Emergency Contact Relationship" value={form.emergency_contact_relationship} onChange={set("emergency_contact_relationship")} required />
          <TextField label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} required />
          <TextField select label="T-Shirt Size" value={form.tshirt_size} onChange={set("tshirt_size")} required>
            {SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField select label="Shorts Size" value={form.shorts_size} onChange={set("shorts_size")} required>
            {SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField label="Shoe Size" value={form.shoe_size} onChange={set("shoe_size")} required />
          <TextField
            label="Why do you want to be a Ballperson? (3 sentences max)"
            value={form.motivation}
            onChange={set("motivation")}
            multiline
            rows={3}
            required
          />
          <FormControlLabel
            control={<Checkbox checked={form.is_vegetarian} onChange={set("is_vegetarian")} />}
            label="Do you have vegetarian food requirements?"
          />
          <TextField
            label="Interesting fact about yourself (optional, for trivia)"
            value={form.fun_fact}
            onChange={set("fun_fact")}
            multiline
            rows={2}
          />
          <TextField
            label="Are you traveling with any potential ballcrew? List their name(s) below (optional)"
            value={form.traveling_with_names}
            onChange={set("traveling_with_names")}
            multiline
            rows={2}
          />
          <Typography variant="subtitle1">
            Have you been a Ballperson at the Mubadala Citi Open before?
          </Typography>
          <RadioGroup
            value={form.is_veteran === null ? "" : String(form.is_veteran)}
            onChange={(e) => setForm((f) => ({ ...f, is_veteran: e.target.value === "true" }))}
          >
            <FormControlLabel value="true" control={<Radio />} label="I'm a Veteran" />
            <FormControlLabel value="false" control={<Radio />} label="This is my first time" />
          </RadioGroup>
        </Stack>
      )}

      {activeStep === 1 && form.is_veteran && (
        <Stack spacing={2}>
          <Typography variant="h6">Veteran Ballperson</Typography>
          <TextField
            label="Years of experience (not counting this year)"
            type="number"
            value={form.years_experience}
            onChange={set("years_experience")}
            required
          />
          <TextField select label="Position" value={form.position} onChange={set("position")} required>
            <MenuItem value="Net">Net</MenuItem>
            <MenuItem value="Back">Back</MenuItem>
            {/* Enum order is Back-then-Net vs Net-then-Back; mapped here by
                which position the form's phrasing puts first ("Prefer Net"/
                "Prefer Back") -- confirm this matches how your captains
                actually read these two values day-to-day. */}
            <MenuItem value="Net/Back">Switch (Prefer Net)</MenuItem>
            <MenuItem value="Back/Net">Switch (Prefer Back)</MenuItem>
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={form.is_captain} onChange={set("is_captain")} />}
            label="Are you a captain?"
          />
          <TextField select label="Likelihood you'll volunteer this year" value={form.likelihood} onChange={set("likelihood")} required>
            <MenuItem value="certain">Absolutely Certain</MenuItem>
            <MenuItem value="moderate">Moderately Likely</MenuItem>
            <MenuItem value="unsure">Unsure, But Submitting Just In Case</MenuItem>
          </TextField>
          <Typography variant="body2">Updated headshot (optional)</Typography>
          <input type="file" accept="image/*" onChange={setFile("headshot_update")} />

          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Availability
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You'll need to work {formatDayLabel(DAY_SAT_1, tournamentStartDate)} and{" "}
            {formatDayLabel(DAY_TUE, tournamentStartDate)}. Email us at
            mdetennis.ballcrew@gmail.com if that's a problem for some reason.
          </Typography>

          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Which will you also work: {formatDayLabel(DAY_SUN_1, tournamentStartDate)} or{" "}
            {formatDayLabel(DAY_MON, tournamentStartDate)}?
          </Typography>
          <RadioGroup
            value={form.veteran_sunday_or_monday}
            onChange={set("veteran_sunday_or_monday")}
          >
            <FormControlLabel value={DAY_SUN_1} control={<Radio />} label={formatDayLabel(DAY_SUN_1, tournamentStartDate)} />
            <FormControlLabel value={DAY_MON} control={<Radio />} label={formatDayLabel(DAY_MON, tournamentStartDate)} />
          </RadioGroup>

          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Round of 16 ({formatDayLabel(DAY_WED, tournamentStartDate)} /{" "}
            {formatDayLabel(DAY_THU, tournamentStartDate)}) -- you'll need to arrive on time
            for the start of the day.
          </Typography>
          <RadioGroup
            value={form.veteran_wed_thu_choice}
            onChange={set("veteran_wed_thu_choice")}
          >
            <FormControlLabel
              value={DAY_WED}
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(DAY_WED, tournamentStartDate)}`}
            />
            <FormControlLabel
              value={DAY_THU}
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(DAY_THU, tournamentStartDate)}`}
            />
            <FormControlLabel
              value="both"
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(DAY_WED, tournamentStartDate)} & ${formatDayLabel(DAY_THU, tournamentStartDate)}`}
            />
          </RadioGroup>

          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Can you work the end of the tournament?
          </Typography>
          <FormGroup>
            {VETERAN_END_OF_TOURNAMENT_DAYS.map((day) => (
              <FormControlLabel
                key={day}
                control={
                  <Checkbox
                    checked={form.availability_days.includes(day)}
                    onChange={() => toggleDay("availability_days")(day)}
                  />
                }
                label={formatDayLabel(day, tournamentStartDate)}
              />
            ))}
          </FormGroup>
        </Stack>
      )}

      {activeStep === 1 && form.is_veteran === false && (
        <Stack spacing={2}>
          <Typography variant="h6">First-Time Ballperson</Typography>
          <Typography variant="body2">Headshot (required)</Typography>
          <input type="file" accept="image/*" onChange={setFile("headshot")} />
          <FormControlLabel
            control={<Checkbox checked={form.has_tried_out_before} onChange={set("has_tried_out_before")} />}
            label="Have you previously tried out with us?"
          />
          <TextField
            label="Prior ballcrew experience (tournament, years, contact) or 'n/a'"
            value={form.prior_experience}
            onChange={set("prior_experience")}
            multiline
            rows={2}
            required
          />
          <TextField select label="Preferred tryout date" value={form.tryout_date} onChange={set("tryout_date")} required>
            <MenuItem value="may_31">Sunday, May 31: 1pm-4pm at Banneker Tennis Courts</MenuItem>
          </TextField>

          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Availability
          </Typography>
          <Typography variant="body2" color="text.secondary">
            First-time ballcrew are required to attend all four of the first four days of the
            tournament ({formatDayLabel(DAY_SAT_1, tournamentStartDate)} through{" "}
            {formatDayLabel(DAY_TUE, tournamentStartDate)}) at the start of the day -- you're
            welcome to check out early if needed. Matches start at 10am on{" "}
            {formatDayLabel(DAY_SAT_1, tournamentStartDate)} and{" "}
            {formatDayLabel(DAY_SUN_1, tournamentStartDate)}, and 11am on{" "}
            {formatDayLabel(DAY_MON, tournamentStartDate)} and{" "}
            {formatDayLabel(DAY_TUE, tournamentStartDate)}. Plan to arrive 2 hours early on{" "}
            {formatDayLabel(DAY_SAT_1, tournamentStartDate)}, and 90 minutes early{" "}
            {formatDayLabel(DAY_SUN_1, tournamentStartDate)} through{" "}
            {formatDayLabel(DAY_TUE, tournamentStartDate)}.
          </Typography>

          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Which of the remaining days can you work?
          </Typography>
          <FormGroup>
            {FIRST_TIMER_AVAILABILITY_DAYS.map((day) => (
              <FormControlLabel
                key={day}
                control={
                  <Checkbox
                    checked={form.availability_days.includes(day)}
                    onChange={() => toggleDay("availability_days")(day)}
                  />
                }
                label={formatDayLabel(day, tournamentStartDate)}
              />
            ))}
          </FormGroup>
        </Stack>
      )}

      {activeStep === 2 && (
        <Stack spacing={2}>
          <TextField
            label="Waiver signature (type your name, or 'N/A' if under 18)"
            value={form.waiver_signature_name}
            onChange={set("waiver_signature_name")}
            required
          />
          <TextField
            label="Parent signature (required if under 18)"
            value={form.parent_signature_name}
            onChange={set("parent_signature_name")}
          />
          {errors && Object.keys(errors).length > 0 && (
            <Typography color="error" variant="body2">
              {JSON.stringify(errors)}
            </Typography>
          )}
        </Stack>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
          Back
        </Button>
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            disabled={activeStep === 0 && form.is_veteran === null}
            onClick={() => setActiveStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        )}
      </Box>
    </Paper>
  );
}
