import DialogContentText from "@mui/material/DialogContentText";

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
    and not yet cut. The list is organized with rookies at the top of the list,
    captains at the bottom of the list, and ascending order of years of
    experience.
    <br /> <br />
    The cut sections (Definitely Keep, Possibly Keep, Possibly Cut, and
    Definitely Cut) are not publicly visible to ballkids and captains and can be
    treated as a working space.
    <br /> <br />
    In order to actually cut one or more ballkid(s) such that the cut is
    publicly visible by ballkids and captains, move the ballkid to either the
    Possibly Cut or Definitely Cut sections. From there, you can either cut the
    whole cut category (via the "Cut All" button) or cut individual ballkids
    (via the red octogonal X icon). The gray X icon removes the ballkid from the
    cut section and moves them back into the Active Ballkids section.
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

export const teams = (
  <DialogContentText>
    This page allows you to create teams and control whether or not ballkids and
    captains can view the teams.
    <br /> <br />
    The hide/show toggle controls whether or not ballkids and captains can view
    the teams. Toggling to "Show" will make all teams publicly visible for
    ballkids and captains to view.
    <br /> <br />
    The Unassigned section lists all checked in and unassigned ballkids.
    Ballkids are listed with chairpeople on top, followed by captains, followed
    by descending number of years of experience, with rookies at the bottom. A
    red circle (as opposed to a green circle) indicates the ballkid is an
    out-of-town rookie. The "Check Out All" button will check out all unassigned
    ballkids.
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
    the ballkid has received (from anyone) is listed as well.
    <br /> <br />
    In order to only show ballkids who you have not yet rated, toggle the "Show
    All Ballkids / Show Ballkids to Rate" toggle at the top of the page. In
    order to only show ballkids who are on your currently assigned team, toggle
    the "Show All Teams / Show My Team Only" toggle at the top of the page.
  </DialogContentText>
);

export const rateByNameNonchairperson = (
  <DialogContentText>
    This page allows you to submit ratings for ballkids by name.
    <br /> <br />
    As on the List by Name page, ballkids are listed alphabetically by (last
    name, first name). Ratings can be submitted for any ballkid, but ballkids
    whom you have already rated will be indicated by a checkmark and an outlined
    (as opposed to filled in) "Give Rating" button.
    <br /> <br />
    In order to only show ballkids who you have not yet rated, toggle the "Show
    All Ballkids / Show Ballkids to Rate" toggle at the top of the page. In
    order to only show ballkids who are on your currently assigned team, toggle
    the "Show All Teams / Show My Team Only" toggle at the top of the page.
  </DialogContentText>
);

export const rateByCurrentTeam = (
  <DialogContentText>
    This page allows you to submit ratings for ballkids by the team to which
    they are currently assigned.
    <br /> <br />
    Ratings can be submitted for any ballkid, but ballkids whom you have already
    rated will be indicated by a checkmark and an outlined (as opposed to filled
    in) "Give Rating" button. The total number of ratings the ballkid has
    received (from anyone) is listed as well.
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
    ballkids who are currently on your team will show up.
    <br /> <br />
    Ratings can be submitted for any ballkid, but ballkids whom you have already
    rated will be indicated by a checkmark and an outlined (as opposed to filled
    in) "Give Rating" button. In order to only show ballkids who you have not
    yet rated, toggle the "Show All Ballkids / Show Ballkids to Rate" toggle at
    the top of the page.
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
    column. Be careful with this action as it cannot be undone.
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
