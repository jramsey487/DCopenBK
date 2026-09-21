import React, { useState } from "react";
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

// Same day vocabulary as api/models/application.py TOURNAMENT_DAYS.
const TOURNAMENT_DAYS = [
  { value: "sat_jul_25", label: "Saturday, July 25" },
  { value: "sun_jul_26", label: "Sunday, July 26" },
  { value: "mon_jul_27", label: "Monday, July 27" },
  { value: "tue_jul_28", label: "Tuesday, July 28" },
  { value: "wed_jul_29", label: "Wednesday, July 29" },
  { value: "thu_jul_30", label: "Thursday, July 30" },
  { value: "fri_jul_31", label: "Friday, July 31" },
  { value: "sat_aug_1", label: "Saturday, August 1" },
  { value: "sun_aug_2", label: "Sunday, August 2" },
];

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
  is_veteran: null,
  // veteran-only
  years_experience: "",
  position: "",
  is_captain: false,
  likelihood: "",
  headshot_update: null,
  tryout_help_availability: [],
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

const STEPS = ["Basic Info", "Experience", "Availability & Waiver"];

export default function ApplicationPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
            helperText="Must be 14 years old by July 25"
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
        </Stack>
      )}

      {activeStep === 2 && (
        <Stack spacing={2}>
          <Typography variant="subtitle1">
            {form.is_veteran ? "Days you're available to help with tryouts" : "Days you plan to volunteer (Sat/Mon/Tue required)"}
          </Typography>
          <FormGroup>
            {TOURNAMENT_DAYS.map((day) => (
              <FormControlLabel
                key={day.value}
                control={
                  <Checkbox
                    checked={form.availability_days.includes(day.value)}
                    onChange={() => toggleDay("availability_days")(day.value)}
                  />
                }
                label={day.label}
              />
            ))}
          </FormGroup>
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
