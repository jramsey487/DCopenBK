import React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const STATUS_COLORS = {
  pending: "default",
  accepted: "success",
  rejected: "error",
  waitlisted: "warning",
};

const DAY_LABELS = {
  sat_1: "Sat (first)",
  sun_1: "Sun (first)",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat_2: "Sat (final)",
  sun_2: "Sun (final)",
};

const SLOT_LABELS = { first: "First tryout date", second: "Second tryout date" };

const LIKELIHOOD_LABELS = {
  certain: "Absolutely certain",
  moderate: "Moderately likely",
  unsure: "Unsure, but applying just in case",
};

const SUN_MON_LABELS = {
  sun_1: "Start of Sunday",
  mon: "Start of Monday",
  both: "Start of Sunday & Monday",
};

const WED_THU_LABELS = {
  wed: "Start of Wednesday",
  thu: "Start of Thursday",
  both: "Start of Wednesday & Thursday",
};

const RECOMMENDATIONS = {
  strong_yes: { label: "Strong yes", color: "success" },
  yes: { label: "Yes", color: "success" },
  no: { label: "No", color: "error" },
  strong_no: { label: "Strong no", color: "error" },
};

const EMAIL_KIND_LABELS = {
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  waitlist_promoted: "Moved up from waitlist",
  tryout_reminder: "Tryout reminder",
};

const RATING_FIELDS = [
  ["athleticism_rating", "Athleticism"],
  ["rolling_rating", "Rolling"],
  ["awareness_rating", "Awareness"],
  ["decision_rating", "Decisions"],
  ["effort_rating", "Effort"],
  ["overall_rating", "Overall"],
];

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="overline"
        sx={{ display: "block", color: "text.secondary", letterSpacing: 1 }}
      >
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {children}
    </Box>
  );
}

function Field({ label, value }) {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  if (empty) return null;

  const display =
    typeof value === "boolean" ? (value ? "Yes" : "No") : value;

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {display}
      </Typography>
    </Box>
  );
}

function days(list) {
  return (list || []).map((d) => DAY_LABELS[d] || d).join(", ");
}

function ReviewCard({ review }) {
  const rec = RECOMMENDATIONS[review.recommendation];
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          {review.reviewer_name || "Unknown reviewer"}
        </Typography>
        {rec ? <Chip size="small" label={rec.label} color={rec.color} /> : null}
      </Box>
      <Typography variant="caption" color="text.secondary">
        Tryout {formatDate(review.tryout_date)}
        {review.observed_position ? ` · saw them at ${review.observed_position}` : ""}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {RATING_FIELDS.map(([field, label]) => `${label} ${review[field]}`).join(" · ")}{" "}
        <Typography component="span" variant="caption" color="text.secondary">
          (out of 10)
        </Typography>
      </Typography>
      {review.notes ? (
        <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}>
          {review.notes}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * Right-hand drawer with everything about one application: all answers,
 * headshot(s), each tryout review with notes, and which emails have gone out.
 *
 * Props: app, open, onClose, onStatus(app, status), onPromote(app),
 * onWaitlistMove(app)
 */
export default function ApplicationDetailDrawer({
  app,
  open,
  onClose,
  onStatus,
  onPromote,
  onWaitlistMove,
}) {
  if (!app) return null;

  const counts = app.recommendation_counts || {};
  const reviews = app.tryout_reviews || [];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 540 } } }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1,
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", minWidth: 0 }}>
            {app.headshot ? (
              <Avatar
                variant="rounded"
                src={app.headshot}
                sx={{ width: 72, height: 72 }}
              />
            ) : null}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ wordBreak: "break-word" }}>
                {app.first_name} {app.last_name}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                <Chip
                  size="small"
                  label={app.status}
                  color={STATUS_COLORS[app.status]}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={app.is_veteran ? "Veteran" : "First-time"}
                />
                {app.promoted_ballkid ? (
                  <Chip size="small" color="info" label="Promoted" />
                ) : null}
              </Stack>
            </Box>
          </Box>
          <IconButton onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
          <Button size="small" onClick={() => onStatus(app, "accepted")} disabled={app.status === "accepted"}>
            Accept
          </Button>
          <Button size="small" onClick={() => onStatus(app, "waitlisted")} disabled={app.status === "waitlisted"}>
            Waitlist
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => onStatus(app, "rejected")}
            disabled={app.status === "rejected"}
          >
            Reject
          </Button>
          {app.status === "waitlisted" ? (
            <Button size="small" variant="outlined" onClick={() => onWaitlistMove(app)}>
              Move up from waitlist
            </Button>
          ) : null}
          {app.status === "accepted" && !app.promoted_ballkid ? (
            <Button size="small" variant="contained" onClick={() => onPromote(app)}>
              Promote to Ballkid
            </Button>
          ) : null}
        </Box>

        <Section title="Tryout reviews">
          <Typography variant="body2" sx={{ mb: 1 }}>
            {app.review_count} review{app.review_count === 1 ? "" : "s"}
            {app.average_overall_rating != null
              ? ` · average overall ${app.average_overall_rating}`
              : ""}
            {app.review_count
              ? ` · ${counts.strong_yes || 0} strong yes, ${counts.yes || 0} yes, ${counts.no || 0} no, ${counts.strong_no || 0} strong no`
              : ""}
          </Typography>
          {reviews.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No tryout reviews yet.
            </Typography>
          ) : (
            reviews.map((review) => <ReviewCard key={review.id} review={review} />)
          )}
        </Section>

        <Section title="About them">
          <Field label="Why they want to be on ball crew" value={app.motivation} />
          <Field label="Fun fact" value={app.fun_fact} />
          <Field label="Traveling / applying with" value={app.traveling_with_names} />
          <Field label="Vegetarian" value={app.is_vegetarian} />
        </Section>

        {app.is_veteran ? (
          <Section title="Returning ball crew">
            <Field label="Years of experience" value={app.years_experience} />
            <Field label="Position" value={app.position} />
            <Field label="Likelihood they'll volunteer" value={LIKELIHOOD_LABELS[app.likelihood]} />
            <Field label="Sunday / Monday" value={SUN_MON_LABELS[app.veteran_sunday_or_monday]} />
            <Field label="Wednesday / Thursday" value={WED_THU_LABELS[app.veteran_wed_thu_choice]} />
            <Field label="End of tournament" value={days(app.availability_days)} />
            <Field
              label="Can help at tryouts"
              value={(app.tryout_help_availability || [])
                .map((v) => SLOT_LABELS[v] || v)
                .join(", ")}
            />
            {app.headshot_update ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Updated headshot
                </Typography>
                <Box>
                  <Avatar variant="rounded" src={app.headshot_update} sx={{ width: 96, height: 96 }} />
                </Box>
              </Box>
            ) : null}
          </Section>
        ) : (
          <Section title="First-time applicant">
            <Field label="Tried out with us before" value={app.has_tried_out_before} />
            <Field label="Prior ball crew experience" value={app.prior_experience} />
            <Field label="Tryout" value={SLOT_LABELS[app.tryout_date] || app.tryout_date} />
            <Field label="Days available after the first four" value={days(app.availability_days)} />
          </Section>
        )}

        <Section title="Contact">
          <Field label="Email" value={app.email} />
          <Field label="Additional email" value={app.additional_email} />
          <Field label="Phone" value={app.phone} />
          <Field label="State" value={app.state} />
          <Field label="Date of birth" value={formatDate(app.date_of_birth)} />
          <Field label="Gender" value={app.gender === "M" ? "Male" : app.gender === "F" ? "Female" : app.gender} />
          <Field label="Emergency contact" value={app.emergency_contact_name} />
          <Field label="Emergency phone" value={app.emergency_contact_phone} />
        </Section>

        <Section title="Sizes">
          <Field label="T-shirt" value={app.tshirt_size} />
          <Field label="Shorts" value={app.shorts_size} />
          <Field label="Shoe" value={app.shoe_size} />
        </Section>

        <Section title="Waiver">
          <Field label="Signed by" value={app.waiver_signature_name} />
          <Field label="Parent / guardian" value={app.parent_signature_name} />
        </Section>

        <Section title="History">
          <Field label="Submitted" value={formatDateTime(app.submitted_at)} />
          <Field label="Edited by applicant" value={formatDateTime(app.edited_at)} />
          <Field label="Last reviewed" value={formatDateTime(app.reviewed_at)} />
          <Field
            label="Emails sent to applicant"
            value={(app.emails_sent || [])
              .map((e) => `${EMAIL_KIND_LABELS[e.kind] || e.kind} (${formatDateTime(e.sent_at)})`)
              .join("\n")}
          />
        </Section>
      </Box>
    </Drawer>
  );
}
