import DialogContentText from "@mui/material/DialogContentText";
import Campaign from "@mui/icons-material/Campaign";
import ConfirmationNumber from "@mui/icons-material/ConfirmationNumber";
import Edit from "@mui/icons-material/Edit";
import EventAvailable from "@mui/icons-material/EventAvailable";
import PlaylistAddCheck from "@mui/icons-material/PlaylistAddCheck";
import History from "@mui/icons-material/History";
import Replay from "@mui/icons-material/Replay";
import { SUPERVET_THRESHOLD } from "./Consts";

const TICKETS_UI_TERMS = ["Make live", "Requests", "Allocate"];

function withTicketsUiTerms(text) {
  const parts = text.split(new RegExp(`(${TICKETS_UI_TERMS.join("|")})`, "g"));
  return parts.map((part, i) =>
    TICKETS_UI_TERMS.includes(part) ? <strong key={i}>{part}</strong> : part
  );
}

function TicketsHelpSection({ icon, title, copy }) {
  return (
    <section className="tickets-help-section">
      <h3 className="tickets-help-heading">
        <span className="tickets-help-icon">{icon}</span>
        {title}
      </h3>
      <p className="tickets-help-copy">{withTicketsUiTerms(copy)}</p>
    </section>
  );
}

export const list = (
  <DialogContentText>
    This page lists all active, non-cut ballkids by name.
    <br /> <br />
    Ballkids are in alphabetical order of (last name, first name). You can also
    search by name and/or filter to various designations (e.g. rookie, captain,
    chairperson, back, or net). To view pictures, view the list in Grid mode (as
    opposed to List mode).
    <br /> <br />
    Note that this list only includes active and non-cut ballkids. To view
    inactive (archived or cut) ballkids, go to the Inactive page (List &gt;
    Inactive).
  </DialogContentText>
);

export const listNonchairperson = (
  <DialogContentText>
    This page lists all active, non-cut ballkids by name.
    <br /> <br />
    Ballkids are in alphabetical order of (last name, first name). You can also
    search by name and/or filter to various designations (e.g. captain,
    chairperson, back, net). To view pictures, view the list in Grid mode (as
    opposed to List mode).
  </DialogContentText>
);

export const checkin = (
  <DialogContentText>
    This page allows you to check in and check out ballkids.
    <br /> <br />
    As with the List by Name page, ballkids are in alphabetical order of (last
    name, first name). You can also search by name and/or filter to various
    designations (e.g. rookie, captain, chairperson, back, or net). To view
    pictures, view the list in Grid mode (as opposed to List mode).
    <br /> <br />
    On desktop, a ballkid's last day and check-out time for today can be updated
    and saved from the check-in page. All values default to "End" but need to be
    confirmed by clicking on the check mark before their last day / check-out
    time will be saved as such. Once saved, last day / check-out time comments
    can be updated from the check-in page by double clicking on the dropdown,
    updating the value, and saving by clicking the checkmark again. These values
    can be updated on the individual ballkid page as well. Check-out time
    comments will display for checked in ballkids in the "Checked In" section of
    the check-in page, as well as on the teams page. Ballkids with "End" saved
    will display "End," ballkids with no saved check-out time will not display
    anything, and ballkids with a check-out time saved will show that time
    highlighted orange. Check-out time comments are reset when the ballkid is
    checked out.
    <br /> <br />
    Note that this list only includes active, non-cut ballkids. To view inactive
    (archived or cut) ballkids, go to the Inactive page (List &gt; Inactive).
    <br /> <br />
    Check-in history is automatically saved and check-in analytics are
    automatically calculated and populate on the ballkid page and check-in
    leaderboard. As such, don't forget to check out all ballkids at the end of
    the night, otherwise analytics will be inaccurate!
  </DialogContentText>
);

export const cut = (
  <DialogContentText>
    This page allows you to categorize ballkids into various cut categories.
    <br /> <br />
    The Active Ballkids section only includes ballkids that are active this year
    and not yet cut. The list is organized with captains at the top of the list,
    rookies at the bottom of the list, and descending order of years of
    experience. Supervets (&gt; {SUPERVET_THRESHOLD} years of experience) are
    indicated by a blue square and out-of-town rookies are indicated by a red
    circle.
    <br /> <br />
    The cut sections (Definitely Keep, Possibly Keep, Possibly Cut, and
    Definitely Cut) are not publicly visible to ballkids and captains and can be
    treated as a working space. The last cut section (Self-Cut) is automatically
    populated with the list of ballkids who have today indicated as their last
    day of the tournament.
    <br /> <br />
    A ballkid's rank by average calibrated rating is listed in a pink highlight
    next to their name. If the ballkid received 5 or fewer total ratings, the
    rank is still listed but grayed out and not highlighted pink. A ballkid's
    number of years of experience is listed too, with a green highlight.
    <br /> <br />
    In order to actually cut one or more ballkid(s) such that the cut is
    publicly visible by ballkids and captains, move the ballkid to either the
    Possibly Cut or Definitely Cut sections. From there, you can either cut the
    whole cut category (via the "Cut All" button) or cut individual ballkids
    (via the red octogonal X icon). The blue - icon removes the ballkid from the
    cut section and moves them back into the Active Ballkids section.
    <br /> <br />
    The "Copy All Keep Ballkid Names" button copies the list of all ballkids in
    the Definitely Keep, Possibly Keep, and Active (uncategorized) sections to
    the clipboard. This list is copied in alphabetical order. The "Copy All
    Ballkid Emails" button copies the list of all emails for ballkids who are
    not yet publicly cut (inclusive of ballkids that are in the Definitely Cut
    and Possibly Cut sections).
    <br /> <br />
    To view cut ballkids, go to the Inactive page (List &gt; Inactive).
  </DialogContentText>
);

export const inactive = (
  <DialogContentText>
    This page lists all inactive (cut and archived) ballkids by name.
    <br /> <br />
    Cut ballkids are ballkids which were active this year (signed up) but have
    already been cut from the tournament.
    <br /> <br />
    Archived ballkids are ballkids from previous years which did not sign up to
    ballkid this year. To view active, non-cut ballkids, go to the List By Name
    page (List &gt; By Name).
  </DialogContentText>
);

export const ticketsPage = (
  <div className="tickets-help">
    <p className="tickets-help-subtitle">
      How rounds, lotteries, and the waitlist work.
    </p>
    <TicketsHelpSection
      icon={<EventAvailable fontSize="inherit" />}
      title="Creating a round"
      copy="A round is a ticket form for one date. Add each session ballkids can choose (session #, day/night/all day, pool size), then set when requests close and when winners can decline. Times are shown in EST. Each date can only have one round — edit the existing one instead of creating a duplicate."
    />
    <TicketsHelpSection
      icon={<Campaign fontSize="inherit" />}
      title="Publishing"
      copy="Rounds start as drafts. Click Make live when you're ready for ballkids to request tickets — the form appears on their Tickets page right away. Only one round can be live at a time. The form closes automatically when the request deadline passes."
    />
    <TicketsHelpSection
      icon={<ConfirmationNumber fontSize="inherit" />}
      title="How winners are chosen"
      copy="When requests close, each session runs its own lottery. Winners are confirmed automatically, and those tickets count toward their tournament cap of 2. Everyone else for that session is placed on the waitlist."
    />
    <TicketsHelpSection
      icon={<Replay fontSize="inherit" />}
      title="Declines and backfilling"
      copy="Winners can decline up until the decline deadline. A decline immediately reallocates those tickets to a random waitlisted ballkid for that same session (never someone who already declined that day) — if fewer tickets remain than they requested, they get a partial allocation. Once the decline deadline passes, any tickets still unclaimed are given out the same way, and anyone left on the waitlist is marked denied."
    />
    <TicketsHelpSection
      icon={<PlaylistAddCheck fontSize="inherit" />}
      title="Managing requests"
      copy="Expand Requests on a round to see each person's session, status, and how many tickets they requested, were granted, and accepted (accepted reflects the confirmed amount, or 0 if none). Allocate only appears on waitlisted or denied rows when leftover tickets remain after automatic allocation. It is disabled if that ballkid is already at the tournament cap."
    />
    <TicketsHelpSection
      icon={<Edit fontSize="inherit" />}
      title="Editing and deleting"
      copy="While a round is a draft, you can add or remove sessions. After it's live, Edit still lets you adjust pool size or deadlines. Delete removes the round and its requests entirely, and returns any confirmed tickets to those ballkids' tournament totals."
    />
    <TicketsHelpSection
      icon={<History fontSize="inherit" />}
      title="Upcoming vs. finalized rounds"
      copy="Draft, live, and allocating rounds stay under Upcoming rounds. Once a round is finalized, it moves to Finalized rounds, which starts collapsed."
    />
  </div>
);

export const ticketsPageBallkid = (
  <DialogContentText>
    While the window is open, pick one session and request 1 or 2 tickets (up to
    however many you have left of the tournament cap of 2). After you submit,
    your request stays under Current form — use Edit to change it, or Cancel
    request to withdraw it, until the form closes. After the lottery, winners
    are confirmed automatically — decline in this page by the deadline if you
    can&apos;t use them. If you&apos;re waitlisted, keep checking this page
    until the decline deadline in case a spot opens up. Past requests are from
    earlier rounds.
  </DialogContentText>
);

export const teams = (
  <DialogContentText>
    This page allows you to create teams and control whether or not ballkids and
    captains can view teams.
    <br /> <br />
    The hide/show toggle controls whether or not ballkids and captains can view
    the teams. Toggling to "Show" will make all teams publicly visible for
    ballkids and captains to view. Teams can only be auto-created if no ballkids
    are currently assigned. All currently assigned teams can be unassigned in
    bulk or checked out in bulk if desired.
    <br /> <br />
    The Unassigned section lists all checked in and unassigned ballkids.
    Ballkids are listed with chairpeople on top, followed by captains, followed
    by descending number of years of experience, with rookies at the bottom. A
    red circle (as opposed to a green circle) indicates the ballkid is an
    out-of-town rookie. A red square (as opposed to a blue square) indicates the
    ballkid has out-of-town experience but is not a rookie at this tournament.
    Check-out time comments (if not empty and not "End") will display next to
    the ballkid name with an orange highlight. The "Check Out All" button will
    check out all unassigned ballkids.
    <br /> <br />
    On desktop, the Unassigned section has separate lists for Nets and Backs,
    where Switches will ONLY show up in the section for their preferred
    position. Once assigned to a team, a switch can be switched to the other
    position. To create teams, drag and drop a ballkid from the Unassigned
    section to the "New Team" box. This will automatically create a new team.
    Continue constructing teams by dragging and dropping ballkids from the
    Unassigned section to either an existing or a new team. The "Clear" button
    on a team will clear the team and unassign (although not check out) the
    whole team. The "Check Out All" button on a team will clear the team and
    check out the whole team. Switches can be switched from a back to a net, or
    vice versa. The gray X icon will unassign a particular ballkid from a team.
    <br /> <br />
    On mobile, to create teams, click the corresponding button in the Unassigned
    section to either create a new team or assign a ballkid to an existing team.
    Ballkids in the Unassigned section on mobile are not split into separate Net
    and Back sections, and instead are listed out (chairpeople, followed by
    captains, followed by descending number of years experience) with the
    preferred position listed.
    <br /> <br />
    Teams that are currently on court will be highlighted green, with the
    current court assignment listed. Teams that are not currently on court will
    indicate their next upcoming court assignment, or "No more shifts" if they
    do not have any more upcoming shifts.
  </DialogContentText>
);

export const teamsNonchairperson = (
  <DialogContentText>
    This page allows you to view current teams.
    <br /> <br />
    Teams that are currently on court will be highlighted green, with the
    current court assignment listed. Teams that are not currently on court will
    indicate their next upcoming court assignment, or "No more shifts" if they
    do not have any more upcoming shifts.
  </DialogContentText>
);

export const finalsTeams = (
  <DialogContentText>
    This page allows you to create finals teams and control whether or not
    ballkids and captains can view the finals teams.
    <br /> <br />
    As with the Current Teams page, the hide/show toggle controls whether or not
    ballkids and captains can view finals teams. Toggling to "Show" will make
    all finals teams publicly visible for ballkids and captains to view.
    <br /> <br />
    The Unassigned section lists all active (non-cut) unassigned ballkids,
    regardless of whether or not they are checked in or currently assigned to a
    non-finals team. Ballkids are listed with chairpeople on top, followed by
    captains, followed by descending number of years of experience, with rookies
    at the bottom. A red circle (as opposed to a green circle) indicates that
    the ballkid is an out-of-town rookie.
    <br /> <br />
    On desktop, the Unassigned section has separate lists for Nets and Backs,
    where Switches will ONLY show up in the section for their preferred
    position. Once assigned to a team, a switch can be switched to the other
    position. To create finals teams, drag and drop ballkids from the Unassigned
    section to the appropriate finals team box. The "Clear" button on a team
    will clear the team and unassign (although not check out) the whole team.
    Switches can be switched from a back to a net, or vice versa. The gray X
    icon will unassign a particular ballkid from a finals team.
    <br /> <br />
    On mobile, to create teams, click the corresponding button in the Unassigned
    section to assign a ballkid to a finals team. Ballkids in the Unassigned
    section on mobile are not split into separate Net and Back sections, and
    instead are listed out (chairpeople, followed by captains, followed by
    descending number of years experience) with the preferred position listed.
  </DialogContentText>
);

export const pastFinalsTeams = (
  <DialogContentText>
    This page allows you to view past finals teams.
    <br /> <br />
    Ballkids will ONLY show up if they have an associated ballkid created in the
    system. As such, teams may be incomplete if they included a ballkid who has
    not been created in the system.
  </DialogContentText>
);

export const finalsTeamsNonchairperson = (
  <DialogContentText>
    This page allows you to view finals teams.
  </DialogContentText>
);

export const schedule = (
  <DialogContentText>
    This page displays the schedule for the selected date.
    <br /> <br />
    If there are no shifts found for the selected date, you can create a default
    schedule based on the inputted parameters. When creating the schedule, the
    correct courts will automatically be chosen based on the number of courts
    inputted (e.g. indicating 4 courts will choose all courts except for Court
    5, indicating 3 courts will choose all courts excpet for Courts 4 and 5,
    etc.).
    <br /> <br />
    If there are shifts found for the selected date, you can view and edit the
    schedule. When editing the schedule, you can update which team is assigned
    to which court at what hour, add and delete hours, add and delete courts,
    and change court names. To change a team assignment, enter edit mode and
    enter the desired team in the corresponding cell; team changes are
    auto-saved. To add a court, enter edit mode and click the right + icon on
    the far right of the table. To change a court name, enter edit mode, enter
    the desired court name, and hit ENTER to save. To delete a court, enter edit
    mode, delete the court name, and hit ENTER to save. To add or delete an
    hour, enter edit mode and click the corresponding +/- icon at the bottom of
    the table; this will add or remove an hour at the end of the current
    schedule.
    <br /> <br />
    Captain and court time analytics are based on this schedule. Try to keep it
    accurate! Shifts are assumed to last the full hour. If a shift ends early
    (due to a not before, no more matches, etc.), you can update the end time in
    the Debug Page to keep analytics fully accurate.
    <br /> <br />
    The schedule can be shifted up or down by 1 hour increments. You need to be
    in view mode (not edit mode) to be able to shift the schedule. You can also
    end a court, which will clear team assignments on that court for all future
    shifts and update the current shift's end time. Ending a court can also only
    be in view mode.
    <br /> <br />
    The schedule can also be deleted for the day. This enables you to recreate a
    default schedule with inputted parameters.
  </DialogContentText>
);

export const scheduleNonchairperson = (
  <DialogContentText>
    This page displays the schedule for the selected date. Changing the selected
    date automatically fetches and displays the schedule for the new date.
  </DialogContentText>
);

export const rateByName = (
  <DialogContentText>
    This page allows you to submit ratings for ballkids by name.
    <br /> <br />
    As on the List by Name page, ballkids are listed alphabetically by (last
    name, first name). Ratings can be submitted for any ballkid, but ballkids
    whom you have already rated will be indicated by a checkmark and an outlined
    (as opposed to filled in) "Give Rating" button. The total number of ratings
    the ballkid has received (from anyone, as well as from you) is listed as
    well.
    <br /> <br />
    In order to only show ballkids who you have not yet rated, toggle the "Show
    All Ballkids / Show Ballkids to Rate" toggle at the top of the page. In
    order to only show ballkids who are on your currently assigned team, toggle
    the "Show All Teams / Show My Team Only" toggle at the top of the page. This
    will only show ballkids on your current team if teams are publicly available
    to ballkids and captains.
  </DialogContentText>
);

export const rateByNameNonchairperson = (
  <DialogContentText>
    This page allows you to submit ratings for ballkids by name.
    <br /> <br />
    As on the List by Name page, ballkids are listed alphabetically by (last
    name, first name). Ratings can be submitted for any ballkid, but ballkids
    whom you have already rated will be indicated by a checkmark and an outlined
    (as opposed to filled in) "Give Rating" button. The number of ratings you
    have personally submitted for each ballkid is also listed.
    <br /> <br />
    In order to only show ballkids who you have not yet rated, toggle the "Show
    All Ballkids / Show Ballkids to Rate" toggle at the top of the page. In
    order to only show ballkids who are on your currently assigned team, toggle
    the "Show All Teams / Show My Team Only" toggle at the top of the page. This
    will only show ballkids on your current team if teams are publicly available
    to ballkids and captains.
  </DialogContentText>
);

export const rateByCurrentTeam = (
  <DialogContentText>
    This page allows you to submit ratings for ballkids by the team to which
    they are currently assigned.
    <br /> <br />
    Ratings can be submitted for any ballkid, but ballkids whom you have already
    rated will be indicated by a checkmark and an outlined (as opposed to filled
    in) "Give Rating" button. This page will only display teams to captains if
    teams are toggled to be shown. This page will always show teams to
    chairpeople, regardless of whether or not teams are toggled to be shown.
    <br /> <br />
    Teams that are currently on court will be highlighted green, with the
    current court assignment listed. Teams that are not currently on court will
    indicate their next upcoming court assignment, or "No more shifts" if they
    do not have any more upcoming shifts.
  </DialogContentText>
);

export const rateByPastTeam = (
  <DialogContentText>
    This page allows you to submit ratings for ballkids who were on YOUR team
    today and/or previous days.
    <br /> <br />
    Ballkids are organized by day. If a ballkid was on your team for more than 1
    day, they will show up under both days. For previous teams (i.e. if you are
    not currently on a team with a ballkid), ballkids will only show up if you
    had at least 30 minutes of court time with them. For your current team, all
    ballkids who are currently on your team will show up, unless teams are
    currently hidden.
    <br /> <br />
    Ratings can be submitted for any ballkid, but ballkids whom you have already
    rated will be indicated by a checkmark and an outlined (as opposed to filled
    in) "Give Rating" button. The number of ratings you have personally
    submitted for each ballkid is also listed.
  </DialogContentText>
);

export const viewRatings = (
  <DialogContentText>
    This page allows you to view all submitted ratings.
    <br /> <br />
    Ratings are listed alphabetically by: ratee name (last name, first name),
    followed by descending date, followed by rater name (last name, first name).
    Only ratings given during the year selected at the top of the page will be
    listed. Changing the year will automaticaly update the ratings which are
    listed.
    <br /> <br />
    To view calibrated ratings, toggle the "Raw Ratings / Calibrated Ratings" at
    the top of the page. Chairpeople and captains are calibrated from ratings
    they have submitted from all years, but ballkid calibration parameters are
    only derived from ratings submitted in the current year.
    <br /> <br />
    Columns in the ratings table can be filtered, sorted, and hidden. Hover over
    the column heading, click the three-dot menu, and filter/sort/hide
    accordingly. The table's data can also be exported.
    <br /> <br />
    Individual ratings can be delete using the Trash icon in the "Delete"
    column. Be careful with this action as it cannot be undone. Individual
    ratings can also be excluded using the "X" icon. This means that the rating
    will be excluded from all of calibration.
  </DialogContentText>
);

export const viewMyRatings = (
  <DialogContentText>
    This page allows you to view all of YOUR submitted ratings.
    <br /> <br />
    Ratings are listed alphabetically by: ratee name (last name, first name),
    followed by descending date. Only ratings given during the current year are
    listed.
    <br /> <br />
    As with the View Ratings page, columns in the ratings table can be filtered,
    sorted, and hidden. Hover over the column heading, click the three-dot menu,
    and filter/sort/hide accordingly. The table's data can also be exported.
    <br /> <br />
    Individual ratings can be delete using the Trash icon in the "Delete"
    column. Be careful with this action as it cannot be undone.
  </DialogContentText>
);

export const viewMyRatingsNonchairperson = (
  <DialogContentText>
    This page allows you to view all of YOUR submitted ratings.
    <br /> <br />
    Ratings are listed alphabetically by: ratee name (last name, first name),
    followed by descending date. Only ratings given during the current year are
    listed.
    <br /> <br />
    Columns in the ratings table can be filtered, sorted, and hidden. Hover over
    the column heading, click the three-dot menu, and filter/sort/hide
    accordingly. The table's data can also be exported.
  </DialogContentText>
);

export const checkinLeaderboard = (
  <DialogContentText>
    This page allows you to view the check-in leaderboard.
    <br /> <br />
    The average total check-in duration, average number of days, and average
    check-in duration per day, average check-in time, and average check-out time
    are listed at the top. Total Duration and # of Days are averaged across all
    active ballkids, captains, and chairpeople, regardless of whether or not
    they have any check-in history. Average Duration per Day, Average Check-in
    Time, and Average Check-out Time are only averaged across ballkids,
    captains, and chairpeople who have non-zero check-in history.
    <br /> <br />
    Note that even if the ballkid is still checked in, Average Duration per Day
    and Average Check-out Time will populate as if the ballkid is checked out at
    the current time. As such, with few days of data, Average Duration per Day
    and Average Check-out Time are only reliable at the end of the day after all
    ballkids are checked out. With more days of data, this inaccuracy should be
    minor.
    <br /> <br />
    In the table, ballkids are by default listed in descending order of their
    total check-in duration. The table can be sorted or filtered by any of the
    columns. The far left column is a simple rank.
  </DialogContentText>
);

export const courtLeaderboard = (
  <DialogContentText>
    This page allows you to view the court time leaderboard.
    <br /> <br />
    The average total time on any court and total time on each court is listed
    at the top. This is averaged across all ballkids, captains, and chairpeople.
    <br /> <br />
    In the table, ballkids are by default listed in descending order of their
    total court time. The table can be sorted or filtered by any of the columns.
    The far left column is a simple rank.
    <br /> <br />
    At the top of the page, the average and individual ballkid tables can be
    toggled to show as a raw time or as a percentage. If shown as a percentage,
    On Court percent is calculated as the total time the ballkid spent on any
    court divided by the total time checked in. The individual court percentages
    are calculated as the total time on the given court divided by the total
    time on any court.
    <br /> <br />
    Note that court time only includes time when a ballkid is assigned to a
    team, a team is assigned to a court, and that shift has already occurred (or
    is currently ongoing). It does not include any future court time for shifts
    that have not yet happened. Time is represented in [<em>hrs </em>]:[
    <em>mins </em>]
  </DialogContentText>
);

export const ratingsBallkidLeaderboard = (
  <DialogContentText>
    This page allows you to view the ballkid ratings leaderboard.
    <br /> <br />
    By default, ballkids are listed in descending order of their average raw
    overall rating. The number of ratings, standard deviation, calibrated
    average, and calibrated standard deviation are also listed. The table can be
    sorted or filtered by any of the columns. The far left column is a simple
    rank.
    <br /> <br />
    All ballkids (ballkids, captains, and chairpeople) are included in this
    table.
  </DialogContentText>
);

export const ratingsCaptainLeaderboard = (
  <DialogContentText>
    This page allows you to view the captain ratings leaderboard.
    <br /> <br />
    By default, captains / chairpeople are listed in descending order of the
    number of ratings given. The average rating given, standard deviation, and
    calibration parameters are also listed. The table can be sorted or filtered
    by any of the columns. The far left column is a simple rank.
    <br /> <br />
    Only raters (captains and chairpeople) are included in this table.
  </DialogContentText>
);

export const tournamentSettings = (
  <DialogContentText>
    This page allows you to view and change tournament-wide settings.
    <br /> <br />
    Up to three site-wide banners can be set and published from here. This will
    show up as banner(s) at the top of the screen for all logged in ballkids,
    captains, and chairpeople.
    <br /> <br />
    Visibility of teams and finals teams to ballkids and captains can be
    controlled from here. This can also be set on the Teams and Finals Teams
    pages, respectively.
    <br /> <br />
    All data from the database can be exported and downloaded. This will
    download as a .zip of .csv files.
  </DialogContentText>
);
