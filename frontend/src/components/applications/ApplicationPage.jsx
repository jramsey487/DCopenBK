import React, { useEffect, useState } from "react";
import {
  Alert,
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

const FIRST_TIMER_AVAILABILITY_DAYS = [
  DAY_WED,
  DAY_THU,
  DAY_FRI,
  DAY_SAT_2,
  DAY_SUN_2,
];

const VETERAN_END_OF_TOURNAMENT_DAYS = [
  DAY_FRI,
  DAY_SAT_2,
  DAY_SUN_2,
];

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

  const monthDay = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return `${weekday}, ${monthDay}`;
}

/** "First tryout date: Saturday, June 6 at Banneker Tennis Courts" -- date and
 * place both come from the tryout settings chairpersons edit in the app, so
 * nothing about a given year's tryouts is hardcoded here. */
function formatTryoutSlot(slot) {
  const date = slot.date
    ? new Date(slot.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return `${slot.label}${date ? `: ${date}` : ""}${
    slot.location ? ` at ${slot.location}` : ""
  }`;
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

const STEPS = [
  "Basic Info",
  "Availability & Experience",
  "Waiver",
];

// Required-field rules per step. Mirrors what the backend serializer
// enforces (api/serializers_application.py) so people find out here
// instead of at the very end. Returns { fieldName: "message" }.
//
// existingFiles is only relevant in edit mode. In that case, an already
// uploaded headshot satisfies the first-time headshot requirement.
function validateStep(step, form, existingFiles = {}) {
  const errors = {};

  const need = (field, msg = "Required") => {
    const v = form[field];

    if (
      v === null ||
      v === undefined ||
      String(v).trim() === ""
    ) {
      errors[field] = msg;
    }
  };

  if (step === 0) {
    [
      "email",
      "first_name",
      "last_name",
      "gender",
      "date_of_birth",
      "state",
      "phone",
      "emergency_contact_name",
      "emergency_contact_phone",
      "tshirt_size",
      "shorts_size",
      "shoe_size",
      "motivation",
    ].forEach((field) => need(field));

    if (
      form.email &&
      !/^\S+@\S+\.\S+$/.test(form.email.trim())
    ) {
      errors.email = "Enter a valid email address";
    }

    if (form.state && form.state.trim().length !== 2) {
      errors.state = "Use the 2-letter state code";
    }

    if (form.is_veteran === null) {
      errors.is_veteran = "Please choose one";
    }
  }

  if (step === 1) {
    if (form.is_veteran) {
      [
        "years_experience",
        "position",
        "likelihood",
        "veteran_sunday_or_monday",
        "veteran_wed_thu_choice",
      ].forEach((field) => need(field));
    } else if (form.is_veteran === false) {
      // A new first-time applicant must upload a headshot.
      //
      // In edit mode, however, an existing saved headshot satisfies this
      // requirement. A newly selected file can still replace it.
      if (!form.headshot && !existingFiles.headshot) {
        errors.headshot = "A headshot is required";
      }

      need("prior_experience");
      need("tryout_date", "Pick a tryout date");
    }
  }

  if (step === 2) {
    need("waiver_signature_name");

    if (
      typeof form.waiver_signature_name === "string" &&
      form.waiver_signature_name.trim().toUpperCase() === "N/A" &&
      !form.parent_signature_name.trim()
    ) {
      errors.parent_signature_name =
        "Required when the applicant is a minor";
    }
  }

  return errors;
}

function FieldError({ message }) {
  return message ? (
    <Typography variant="caption" color="error">
      {message}
    </Typography>
  ) : null;
}

// Applicants edit their own application via a personal link from their
// confirmation email / thank-you page: /apply?edit=<token>
function getEditToken() {
  return new URLSearchParams(window.location.search).get("edit");
}

export default function ApplicationPage() {
  const editToken = getEditToken();
  const isEditing = Boolean(editToken);

  const [applicationsOpen, setApplicationsOpen] = useState(null);
  const [tournamentStartDate, setTournamentStartDate] = useState(null);
  const [tryoutSlots, setTryoutSlots] = useState([]);
  const [rookieTryoutsAvailable, setRookieTryoutsAvailable] =
    useState(true);

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // IMPORTANT:
  // Validation is initially OFF. It is turned on only after the applicant
  // attempts to advance or submit. Once validation has been triggered,
  // stepErrors is recalculated automatically as the form changes.
  const [showErrors, setShowErrors] = useState(false);

  // Edit mode state
  const [editState, setEditState] = useState(
    isEditing ? "loading" : "none"
  );
  const [editLockedReason, setEditLockedReason] = useState(null);

  const [existingFiles, setExistingFiles] = useState({
    headshot: false,
    headshot_update: false,
  });

  // After a brand-new submission, the personal link to edit it later.
  const [newEditLink, setNewEditLink] = useState("");

  // Validation is displayed only after the user has attempted to advance
  // or submit. Once displayed, errors clear automatically as the user fixes
  // the corresponding fields.
  const stepErrors = showErrors
    ? validateStep(activeStep, form, existingFiles)
    : {};

  const hasStepErrors = Object.keys(stepErrors).length > 0;

  // Spread onto a TextField: {...fp("email")}
  const fp = (field) =>
    stepErrors[field]
      ? {
          error: true,
          helperText: stepErrors[field],
        }
      : {};

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Land at the top of every new page (Next or Back).
  useEffect(() => {
    scrollToTop();
  }, [activeStep]);

  useEffect(() => {
    fetch("/api/application-settings")
      .then((res) => res.json())
      .then((data) => {
        setApplicationsOpen(Boolean(data.is_open));
        setTournamentStartDate(
          data.tournament_start_date || null
        );
        setTryoutSlots(data.tryout_slots || []);
        setRookieTryoutsAvailable(
          data.rookie_tryouts_available !== false
        );
      })
      .catch(() => {
        // Fail open on network hiccup rather than blocking real applicants.
        setApplicationsOpen(true);
      });
  }, []);

  useEffect(() => {
    if (!editToken) {
      return;
    }

    fetch(`/api/application-edit/${editToken}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(res)
      )
      .then((data) => {
        const app = data.application || {};
        const loaded = { ...emptyForm };

        Object.keys(emptyForm).forEach((key) => {
          if (
            key in app &&
            app[key] !== null &&
            app[key] !== undefined
          ) {
            loaded[key] = app[key];
          }
        });

        // Files come back as URLs -- never send those back; only a newly
        // chosen file replaces what's already stored.
        loaded.headshot = null;
        loaded.headshot_update = null;

        setForm(loaded);

        setExistingFiles({
          headshot: Boolean(app.headshot),
          headshot_update: Boolean(app.headshot_update),
        });

        setEditLockedReason(
          data.editable ? null : data.locked_reason
        );

        setEditState("ready");
      })
      .catch(() => {
        setEditState("notfound");
      });
  }, [editToken]);

  // Field changes update the form only.
  //
  // IMPORTANT: These handlers intentionally DO NOT call setShowErrors(true).
  // That means required-field errors don't appear immediately while someone
  // is initially filling out the form. Validation is triggered by Next or
  // Submit instead.
  const set = (field) => (e) => {
    const value =
      e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;

    setForm((f) => ({
      ...f,
      [field]: value,
    }));
  };

  const setFile = (field) => (e) => {
    setForm((f) => ({
      ...f,
      [field]: e.target.files[0] || null,
    }));
  };

  const toggleDay = (field) => (day) => {
    setForm((f) => {
      const current = f[field] || [];

      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];

      return {
        ...f,
        [field]: next,
      };
    });
  };

  const handleNext = () => {
    const currentErrors = validateStep(
      activeStep,
      form,
      existingFiles
    );

    if (Object.keys(currentErrors).length > 0) {
      setShowErrors(true);
      scrollToTop();
      return;
    }

    // No errors: turn validation back off for the next step so the next
    // step starts clean.
    setShowErrors(false);
    setActiveStep((s) => s + 1);
  };

  const handleBack = () => {
    // Going backward should start the previous step without displaying
    // validation errors automatically.
    setShowErrors(false);
    setActiveStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    // Re-check every page so nobody can skip validation.
    for (let step = 0; step < STEPS.length; step++) {
      const stepValidationErrors = validateStep(
        step,
        form,
        existingFiles
      );

      if (Object.keys(stepValidationErrors).length > 0) {
        setActiveStep(step);
        setShowErrors(true);
        scrollToTop();
        return;
      }
    }

    setSubmitting(true);
    setErrors({});

    const body = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        body.append(key, JSON.stringify(value));
      } else {
        body.append(key, value);
      }
    });

    try {
      const response = await fetch(
        isEditing
          ? `/api/application-edit/${editToken}`
          : "/api/submit-application",
        {
          method: isEditing ? "PATCH" : "POST",
          body: body,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setErrors(data);
        return;
      }

      const saved = await response.json().catch(() => ({}));

      if (isEditing) {
        setExistingFiles({
          headshot: Boolean(saved.headshot),
          headshot_update: Boolean(saved.headshot_update),
        });

        setForm((f) => ({
          ...f,
          headshot: null,
          headshot_update: null,
        }));
      } else if (saved.edit_token) {
        setNewEditLink(
          `${window.location.origin}/apply?edit=${saved.edit_token}`
        );
      }

      setSubmitted(true);
    } catch (err) {
      setErrors({
        non_field: "Submission failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (
    applicationsOpen === null ||
    (isEditing && editState === "loading")
  ) {
    return null;
  }

  if (isEditing && editState === "notfound") {
    return (
      <Paper
        sx={{
          p: 4,
          maxWidth: 600,
          mx: "auto",
          mt: 4,
        }}
      >
        <Typography variant="h5" gutterBottom>
          We couldn't find that application
        </Typography>

        <Typography>
          This edit link is invalid or incomplete. Open the link
          from your confirmation email, or email
          mdetennis.ballcrew@gmail.com for help.
        </Typography>
      </Paper>
    );
  }

  if (isEditing && editLockedReason) {
    return (
      <Paper
        sx={{
          p: 4,
          maxWidth: 600,
          mx: "auto",
          mt: 4,
        }}
      >
        <Typography variant="h5" gutterBottom>
          This application can't be edited
        </Typography>

        <Typography>{editLockedReason}</Typography>
      </Paper>
    );
  }

  // Closed-to-new-applicants page doesn't apply to someone editing their
  // own application -- the server decides whether edits are still allowed.
  if (!isEditing && applicationsOpen === false) {
    return (
      <Paper
        sx={{
          p: 4,
          maxWidth: 600,
          mx: "auto",
          mt: 4,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Applications are currently closed
        </Typography>

        <Typography>
          We're not accepting new ballcrew applications right now.
          Check back later, or reach out to
          mdetennis.ballcrew@gmail.com with any questions.
        </Typography>
      </Paper>
    );
  }

  if (submitted) {
    return (
      <Paper
        sx={{
          p: 4,
          maxWidth: 600,
          mx: "auto",
          mt: 4,
        }}
      >
        <Typography variant="h5" gutterBottom>
          {isEditing
            ? "Your changes were saved"
            : "Thanks for applying!"}
        </Typography>

        <Typography sx={{ mb: 2 }}>
          {isEditing
            ? "Your application has been updated. You can keep editing it until it's been reviewed or the tournament starts."
            : "We've received your application. You'll hear from us about tryout selection and next steps by email."}
        </Typography>

        {!isEditing && newEditLink ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Need to change something later? You can edit your
            application until it's reviewed or the tournament starts
            using this personal link. Save it somewhere and don't
            share it (we'll also email it to you):

            <Box
              sx={{
                mt: 1,
                wordBreak: "break-all",
              }}
            >
              <a href={newEditLink}>{newEditLink}</a>
            </Box>
          </Alert>
        ) : null}

        {isEditing ? (
          <Button
            variant="outlined"
            onClick={() => {
              setSubmitted(false);
              setActiveStep(0);
              setShowErrors(false);
            }}
          >
            Keep editing
          </Button>
        ) : null}
      </Paper>
    );
  }

  // For new applicants, full tryout slots disappear.
  // For an applicant editing an existing application, their currently
  // selected slot remains available even if it has since become full.
  const visibleTryoutSlots = tryoutSlots.filter(
    (slot) =>
      !slot.full ||
      (isEditing && slot.value === form.tryout_date)
  );

  return (
    <Paper
      sx={{
        p: 4,
        maxWidth: 700,
        mx: "auto",
        mt: 4,
      }}
    >
      <Typography variant="h5" gutterBottom>
        {isEditing
          ? "Edit Your Application"
          : "Ballcrew Application"}{" "}
        &mdash; Mubadala DC Open 2026
      </Typography>

      {isEditing ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          You're editing your submitted application. Changes can
          be made until it's reviewed or the tournament starts. Your
          "veteran / first time" answer can't be changed here &mdash;
          email mdetennis.ballcrew@gmail.com if that needs to change.
        </Alert>
      ) : null}

      <Typography variant="body2" sx={{ mb: 2 }}>
        New to ball crew, or just want a refresher before tryouts?
        Check out the{" "}
        <a
          href="/handbook"
          target="_blank"
          rel="noopener noreferrer"
        >
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

      {hasStepErrors ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Please fill in the highlighted required fields to continue.
        </Alert>
      ) : null}

      {activeStep === 0 && (
        <Stack spacing={2}>
          <TextField
            label="Email"
            value={form.email}
            onChange={set("email")}
            required
            {...fp("email")}
          />

          <TextField
            label="First Name"
            value={form.first_name}
            onChange={set("first_name")}
            required
            {...fp("first_name")}
          />

          <TextField
            label="Last Name"
            value={form.last_name}
            onChange={set("last_name")}
            required
            {...fp("last_name")}
          />

          <TextField
            select
            label="Gender (used for clothing sizing)"
            value={form.gender}
            onChange={set("gender")}
            required
            {...fp("gender")}
          >
            <MenuItem value="M">Male</MenuItem>
            <MenuItem value="F">Female</MenuItem>
          </TextField>

          <TextField
            label="Date of Birth"
            type="date"
            value={form.date_of_birth}
            onChange={set("date_of_birth")}
            InputLabelProps={{ shrink: true }}
            required
            {...fp("date_of_birth")}
            helperText={
              stepErrors.date_of_birth ||
              (tournamentStartDate
                ? `Must be 14 years old by ${formatDayLabel(
                    DAY_SAT_1,
                    tournamentStartDate
                  )}`
                : "Must be 14 years old by the start of the tournament")
            }
          />

          <TextField
            label="State of Residence (2-letter)"
            value={form.state}
            onChange={set("state")}
            inputProps={{ maxLength: 2 }}
            required
            {...fp("state")}
          />

          <TextField
            label="Phone Number"
            value={form.phone}
            onChange={set("phone")}
            placeholder="XXX-XXX-XXXX"
            required
            {...fp("phone")}
          />

          <TextField
            label="Additional Email Contact (OPTIONAL - will be copied on all emails)"
            value={form.additional_email}
            onChange={set("additional_email")}
          />

          <TextField
            label="Emergency Contact Name"
            value={form.emergency_contact_name}
            onChange={set("emergency_contact_name")}
            required
            {...fp("emergency_contact_name")}
          />

          <TextField
            label="Emergency Contact Phone"
            value={form.emergency_contact_phone}
            onChange={set("emergency_contact_phone")}
            required
            {...fp("emergency_contact_phone")}
          />

          <TextField
            select
            label="T-Shirt Size"
            value={form.tshirt_size}
            onChange={set("tshirt_size")}
            required
            {...fp("tshirt_size")}
          >
            {SIZES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Shorts Size"
            value={form.shorts_size}
            onChange={set("shorts_size")}
            required
            {...fp("shorts_size")}
          >
            {SIZES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Shoe Size"
            value={form.shoe_size}
            onChange={set("shoe_size")}
            required
            {...fp("shoe_size")}
          />

          <TextField
            label="Why do you want to be a Ballperson? (3 sentences max)"
            value={form.motivation}
            onChange={set("motivation")}
            multiline
            rows={3}
            required
            {...fp("motivation")}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={form.is_vegetarian}
                onChange={set("is_vegetarian")}
              />
            }
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
            Have you been a Ballperson at the Mubadala Citi Open
            before?
          </Typography>

          <RadioGroup
            value={
              form.is_veteran === null
                ? ""
                : String(form.is_veteran)
            }
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                is_veteran: e.target.value === "true",
              }))
            }
          >
            <FormControlLabel
              value="true"
              control={<Radio />}
              label="I'm a Veteran"
              disabled={isEditing}
            />

            <FormControlLabel
              value="false"
              control={<Radio />}
              label="This is my first time"
              disabled={
                isEditing || !rookieTryoutsAvailable
              }
            />
          </RadioGroup>

          <FieldError message={stepErrors.is_veteran} />

          {!isEditing && !rookieTryoutsAvailable ? (
            <Typography
              variant="body2"
              color="text.secondary"
            >
              First-time applications are currently closed --
              both tryout dates are full.
            </Typography>
          ) : null}
        </Stack>
      )}

      {activeStep === 1 && form.is_veteran && (
        <Stack spacing={2}>
          <Typography variant="h6">
            Veteran Ballperson
          </Typography>

          <TextField
            label="Years of experience (not counting this year)"
            type="number"
            value={form.years_experience}
            onChange={set("years_experience")}
            required
            {...fp("years_experience")}
          />

          <TextField
            select
            label="Position"
            value={form.position}
            onChange={set("position")}
            required
            {...fp("position")}
          >
            <MenuItem value="Net">Net</MenuItem>
            <MenuItem value="Back">Back</MenuItem>
            <MenuItem value="Net/Back">
              Switch (Prefer Net)
            </MenuItem>
            <MenuItem value="Back/Net">
              Switch (Prefer Back)
            </MenuItem>
          </TextField>

          <TextField
            select
            label="Likelihood you'll volunteer this year"
            value={form.likelihood}
            onChange={set("likelihood")}
            required
            {...fp("likelihood")}
          >
            <MenuItem value="certain">
              Absolutely Certain
            </MenuItem>
            <MenuItem value="moderate">
              Moderately Likely
            </MenuItem>
            <MenuItem value="unsure">
              Unsure, But Submitting Just In Case
            </MenuItem>
          </TextField>

          <Typography variant="body2">
            Updated headshot (optional)
            {isEditing && existingFiles.headshot_update
              ? " -- one is already uploaded; choose a file only to replace it"
              : ""}
          </Typography>

          <input
            type="file"
            accept="image/*"
            onChange={setFile("headshot_update")}
          />

          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              mt: 1,
            }}
          >
            Tryouts aren't required for returning ballcrew, but
            they're highly encouraged -- and if you can make it,
            we'd really appreciate your help running them. Check any
            date you can attend and help out:
          </Typography>

          <FormGroup>
            {tryoutSlots.map((slot) => (
              <FormControlLabel
                key={slot.value}
                control={
                  <Checkbox
                    checked={form.tryout_help_availability.includes(
                      slot.value
                    )}
                    onChange={() =>
                      toggleDay(
                        "tryout_help_availability"
                      )(slot.value)
                    }
                  />
                }
                label={formatTryoutSlot(slot)}
              />
            ))}
          </FormGroup>

          <Typography
            variant="subtitle1"
            sx={{ mt: 2 }}
          >
            Availability
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            We'll follow up with your specific daily schedule once
            teams are set. You'll need to work{" "}
            {formatDayLabel(
              DAY_SAT_1,
              tournamentStartDate
            )}{" "}
            and{" "}
            {formatDayLabel(
              DAY_TUE,
              tournamentStartDate
            )}{" "}
            -- email us at mdetennis.ballcrew@gmail.com if that's a
            problem for some reason. You're only required to work
            one of{" "}
            {formatDayLabel(
              DAY_SUN_1,
              tournamentStartDate
            )}
            /
            {formatDayLabel(
              DAY_MON,
              tournamentStartDate
            )}{" "}
            and one of{" "}
            {formatDayLabel(
              DAY_WED,
              tournamentStartDate
            )}
            /
            {formatDayLabel(
              DAY_THU,
              tournamentStartDate
            )}
            .
          </Typography>

          <Typography
            variant="body2"
            sx={{ fontWeight: 500 }}
          >
            {formatDayLabel(
              DAY_SUN_1,
              tournamentStartDate
            )}{" "}
            /{" "}
            {formatDayLabel(
              DAY_MON,
              tournamentStartDate
            )}
          </Typography>

          <RadioGroup
            value={form.veteran_sunday_or_monday}
            onChange={set("veteran_sunday_or_monday")}
          >
            <FormControlLabel
              value={DAY_SUN_1}
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(
                DAY_SUN_1,
                tournamentStartDate
              )}`}
            />

            <FormControlLabel
              value={DAY_MON}
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(
                DAY_MON,
                tournamentStartDate
              )}`}
            />

            <FormControlLabel
              value="both"
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(
                DAY_SUN_1,
                tournamentStartDate
              )} & ${formatDayLabel(
                DAY_MON,
                tournamentStartDate
              )}`}
            />
          </RadioGroup>

          <FieldError
            message={
              stepErrors.veteran_sunday_or_monday
            }
          />

          <Typography
            variant="body2"
            sx={{ fontWeight: 500 }}
          >
            Round of 16 (
            {formatDayLabel(
              DAY_WED,
              tournamentStartDate
            )}{" "}
            /{" "}
            {formatDayLabel(
              DAY_THU,
              tournamentStartDate
            )}
            ) -- you'll need to arrive on time for the start of the
            day.
          </Typography>

          <RadioGroup
            value={form.veteran_wed_thu_choice}
            onChange={set("veteran_wed_thu_choice")}
          >
            <FormControlLabel
              value={DAY_WED}
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(
                DAY_WED,
                tournamentStartDate
              )}`}
            />

            <FormControlLabel
              value={DAY_THU}
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(
                DAY_THU,
                tournamentStartDate
              )}`}
            />

            <FormControlLabel
              value="both"
              control={<Radio />}
              label={`Available for start of ${formatDayLabel(
                DAY_WED,
                tournamentStartDate
              )} & ${formatDayLabel(
                DAY_THU,
                tournamentStartDate
              )}`}
            />
          </RadioGroup>

          <FieldError
            message={
              stepErrors.veteran_wed_thu_choice
            }
          />

          <Typography
            variant="body2"
            sx={{ fontWeight: 500 }}
          >
            Can you work the end of the tournament?
          </Typography>

          <FormGroup>
            {VETERAN_END_OF_TOURNAMENT_DAYS.map((day) => (
              <FormControlLabel
                key={day}
                control={
                  <Checkbox
                    checked={form.availability_days.includes(day)}
                    onChange={() =>
                      toggleDay(
                        "availability_days"
                      )(day)
                    }
                  />
                }
                label={formatDayLabel(
                  day,
                  tournamentStartDate
                )}
              />
            ))}
          </FormGroup>
        </Stack>
      )}

      {activeStep === 1 && form.is_veteran === false && (
        <Stack spacing={2}>
          <Typography variant="h6">
            First-Time Ballperson
          </Typography>

          <Typography variant="body2">
            Headshot (required)
            {isEditing && existingFiles.headshot
              ? " -- one is already uploaded; choose a file only to replace it"
              : ""}
          </Typography>

          <input
            type="file"
            accept="image/*"
            onChange={setFile("headshot")}
          />

          <FieldError message={stepErrors.headshot} />

          <FormControlLabel
            control={
              <Checkbox
                checked={form.has_tried_out_before}
                onChange={set("has_tried_out_before")}
              />
            }
            label="Have you previously tried out with us?"
          />

          <TextField
            label="Prior ballcrew experience (tournament, years, contact) or 'n/a'"
            value={form.prior_experience}
            onChange={set("prior_experience")}
            multiline
            rows={2}
            required
            {...fp("prior_experience")}
          />

          <TextField
            select
            label="Preferred tryout date"
            value={form.tryout_date}
            onChange={set("tryout_date")}
            required
            {...fp("tryout_date")}
          >
            {visibleTryoutSlots.map((slot) => (
              <MenuItem
                key={slot.value}
                value={slot.value}
              >
                {formatTryoutSlot(slot)}
              </MenuItem>
            ))}
          </TextField>

          {tryoutSlots.length > 0 &&
          tryoutSlots.every((s) => s.full) &&
          !isEditing ? (
            <Typography
              variant="body2"
              color="error"
            >
              Both tryout dates are currently full.
            </Typography>
          ) : null}

          <Typography
            variant="subtitle1"
            sx={{ mt: 2 }}
          >
            Availability
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            First-time ballcrew are required to attend all four of
            the first four days of the tournament (
            {formatDayLabel(
              DAY_SAT_1,
              tournamentStartDate
            )}{" "}
            through{" "}
            {formatDayLabel(
              DAY_TUE,
              tournamentStartDate
            )}
            ) at the start of the day -- you're welcome to check out
            early if needed. Matches start at 10am on{" "}
            {formatDayLabel(
              DAY_SAT_1,
              tournamentStartDate
            )}{" "}
            and{" "}
            {formatDayLabel(
              DAY_SUN_1,
              tournamentStartDate
            )}
            , and 11am on{" "}
            {formatDayLabel(
              DAY_MON,
              tournamentStartDate
            )}{" "}
            and{" "}
            {formatDayLabel(
              DAY_TUE,
              tournamentStartDate
            )}
            . Plan to arrive 2 hours early on{" "}
            {formatDayLabel(
              DAY_SAT_1,
              tournamentStartDate
            )}
            , and 90 minutes early{" "}
            {formatDayLabel(
              DAY_SUN_1,
              tournamentStartDate
            )}{" "}
            through{" "}
            {formatDayLabel(
              DAY_TUE,
              tournamentStartDate
            )}
            .
          </Typography>

          <Typography
            variant="body2"
            sx={{ fontWeight: 500 }}
          >
            All days after{" "}
            {formatDayLabel(
              DAY_TUE,
              tournamentStartDate
            )}{" "}
            are invite-only, but let us know which of these you'd be
            available for in case you're invited to stay on:
          </Typography>

          <FormGroup>
            {FIRST_TIMER_AVAILABILITY_DAYS.map((day) => (
              <FormControlLabel
                key={day}
                control={
                  <Checkbox
                    checked={form.availability_days.includes(day)}
                    onChange={() =>
                      toggleDay(
                        "availability_days"
                      )(day)
                    }
                  />
                }
                label={formatDayLabel(
                  day,
                  tournamentStartDate
                )}
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
            {...fp("waiver_signature_name")}
          />

          <TextField
            label="Parent signature (required if under 18)"
            value={form.parent_signature_name}
            onChange={set("parent_signature_name")}
            {...fp("parent_signature_name")}
          />

          {errors &&
          Object.keys(errors).length > 0 ? (
            <Typography
              color="error"
              variant="body2"
            >
              {typeof errors.detail === "string"
                ? errors.detail
                : JSON.stringify(errors)}
            </Typography>
          ) : null}
        </Stack>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 4,
        }}
      >
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>

        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? isEditing
                ? "Saving..."
                : "Submitting..."
              : isEditing
              ? "Save Changes"
              : "Submit Application"}
          </Button>
        )}
      </Box>
    </Paper>
  );
}