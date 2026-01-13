const db = require("../../../../db/models/index");

// Helper function to verify user can manage meetings (owner, admin, calendar-admin)
const verifyMeetingAccess = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {
      clubId,
      userId,
      role: {[db.Op.in]: ["owner", "admin", "calendar-admin"]},
    },
  });
  return membership;
};

// GET /v1/meetings - Get all meetings
const getMeetings = async (req, res, next) => {
  try {
    const {clubId, userId, startDate, endDate, limit} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    // Build where clause
    const whereClause = {clubId: parseInt(clubId)};

    // Filter by date range if provided (defaults to upcoming only)
    if (startDate && endDate) {
      whereClause.date = {
        [db.Op.between]: [startDate, endDate],
      };
    } else if (startDate) {
      whereClause.date = {
        [db.Op.gte]: startDate,
      };
    } else if (endDate) {
      whereClause.date = {
        [db.Op.lte]: endDate,
      };
    } else {
      // Default to today if no startDate provided
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      whereClause.date = {
        [db.Op.gte]: today.toISOString().split("T")[0],
      };
    }

    // Build include array for Book
    const bookInclude = {
      model: db.Book,
      as: "book",
      attributes: ["id", "title", "author", "coverImage"],
    };

    // If userId is provided, include user's BookProgress for each book
    if (userId) {
      bookInclude.include = [{
        model: db.BookProgress,
        as: "bookProgresses",
        where: {userId: userId},
        required: false, // LEFT JOIN - include books even if no progress
        attributes: ["id", "status", "percentComplete", "privacy", "updatedAt"],
      }];
    }

    const queryOptions = {
      where: whereClause,
      order: [["date", "ASC"]],
      include: [bookInclude],
    };

    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        queryOptions.limit = parsedLimit;
      }
    }

    const meetings = await db.Meeting.findAll(queryOptions);

    // Transform the response to nest progress in book.progress
    const transformedMeetings = meetings.map((meeting) => {
      const meetingJson = meeting.toJSON();
      if (meetingJson.book && userId && meetingJson.book.bookProgresses &&
          meetingJson.book.bookProgresses.length > 0) {
        // User has progress for this book - nest it in book.progress
        meetingJson.book.progress = meetingJson.book.bookProgresses[0];
        delete meetingJson.book.bookProgresses;
      } else if (meetingJson.book && userId) {
        // User has no progress - set progress to null
        meetingJson.book.progress = null;
        delete meetingJson.book.bookProgresses;
      }
      return {id: meeting.id, ...meetingJson};
    });

    res.json(transformedMeetings);
  } catch (e) {
    next(e);
  }
};

// POST /v1/meetings - Create new meeting (club owner only)
const createMeeting = async (req, res, next) => {
  try {
    const {clubId} = req.query;
    const userId = req.query.userId;
    const meetingData = req.body;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify meeting access
    const meetingAccess = await verifyMeetingAccess(parseInt(clubId), userId);
    if (!meetingAccess) {
      const error = new Error("Only club owners, admins, or calendar admins can create meetings");
      error.status = 403;
      throw error;
    }

    const meeting = await db.Meeting.create({
      date: meetingData.date,
      startTime: meetingData.startTime || null,
      duration: meetingData.duration || 120, // Default to 2 hours if not provided
      location: meetingData.location || null,
      title: meetingData.title || null,
      bookId: meetingData.bookId || null,
      notes: meetingData.notes || null,
      clubId: parseInt(clubId),
    });

    // Update book discussion date if book is selected
    if (meeting.bookId) {
      await db.Book.update(
          {discussionDate: meeting.date},
          {where: {id: meeting.bookId}},
      );
    }

    const meetingWithBook = await db.Meeting.findByPk(meeting.id, {
      include: [{model: db.Book, as: "book", attributes: ["id", "title", "author"]}],
    });

    res.status(201).json({id: meeting.id, ...meetingWithBook.toJSON()});
  } catch (e) {
    next(e);
  }
};

// PATCH /v1/meetings/:meetingId - Update meeting (club owner only)
const updateMeeting = async (req, res, next) => {
  try {
    const {meetingId} = req.params;
    const {clubId} = req.query;
    const userId = req.query.userId;
    const updates = req.body;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify meeting access
    const meetingAccess = await verifyMeetingAccess(parseInt(clubId), userId);
    if (!meetingAccess) {
      const error = new Error("Only club owners, admins, or calendar admins can update meetings");
      error.status = 403;
      throw error;
    }

    const meeting = await db.Meeting.findByPk(meetingId);
    if (!meeting) {
      const error = new Error("Meeting not found");
      error.status = 404;
      throw error;
    }

    // Verify meeting belongs to club
    if (meeting.clubId !== parseInt(clubId)) {
      const error = new Error("Meeting does not belong to this club");
      error.status = 403;
      throw error;
    }

    // Update allowed fields
    if (updates.date !== undefined) {
      meeting.date = updates.date;
    }
    if (updates.startTime !== undefined) {
      meeting.startTime = updates.startTime || null;
    }
    if (updates.duration !== undefined) {
      meeting.duration = updates.duration || 120;
    }
    if (updates.location !== undefined) {
      meeting.location = updates.location;
    }
    if (updates.title !== undefined) {
      meeting.title = updates.title || null;
    }
    if (updates.bookId !== undefined) {
      meeting.bookId = updates.bookId;
    }
    if (updates.notes !== undefined) {
      meeting.notes = updates.notes;
    }

    await meeting.save();

    // Update book discussion date if book is selected
    if (meeting.bookId) {
      await db.Book.update(
          {discussionDate: meeting.date},
          {where: {id: meeting.bookId}},
      );
    }

    const meetingWithBook = await db.Meeting.findByPk(meeting.id, {
      include: [{model: db.Book, as: "book", attributes: ["id", "title", "author"]}],
    });

    res.json({id: meeting.id, ...meetingWithBook.toJSON()});
  } catch (e) {
    next(e);
  }
};

// Helper function to format date for iCal (YYYYMMDD or YYYYMMDDTHHMMSS)
// Uses floating time (no timezone) for timed events to preserve local time
const formatICalDate = (date, isAllDay = true) => {
  const d = new Date(date);
  // Use local time components for all parts to maintain consistency
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  if (isAllDay) {
    return `${year}${month}${day}`;
  }

  // For timed events, use local time components (floating time, no timezone)
  // This preserves the time as entered by the user
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  const second = String(d.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}${second}`;
};

// Helper function to escape iCal text (escape commas, semicolons, backslashes, newlines)
const escapeICalText = (text) => {
  if (!text) return "";
  return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
};

// GET /v1/meetings/:clubId/ical - Generate iCal feed for club meetings
const getMeetingsICal = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    // Get club info for calendar name
    const club = await db.Club.findByPk(parseInt(clubId));
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    // Get all meetings for the club
    const meetings = await db.Meeting.findAll({
      where: {clubId: parseInt(clubId)},
      order: [["date", "ASC"]],
      include: [{model: db.Book, as: "book", attributes: ["id", "title", "author"]}],
    });

    // Generate iCal content
    const lines = [];
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//Conscious Book Club//Meetings//EN");
    lines.push("CALSCALE:GREGORIAN");
    lines.push(`X-WR-CALNAME:${escapeICalText(club.name)} Book Club Meetings`);
    lines.push("METHOD:PUBLISH");

    meetings.forEach((meeting) => {
      // Parse the date string (YYYY-MM-DD format)
      const dateParts = meeting.date.split("-").map((v) => parseInt(v, 10));
      const [year, month, day] = dateParts;

      let startDateTime;
      let endDateTime;
      let isAllDay = true;

      // If startTime is provided, combine date and time using local time
      if (meeting.startTime) {
        const timeParts = meeting.startTime.split(":").map((v) => parseInt(v, 10) || 0);
        const [hours, minutes, seconds] = timeParts;

        // Create date using local time (month is 0-indexed in Date constructor)
        startDateTime = new Date(year, month - 1, day, hours, minutes, seconds || 0);

        // End time is based on duration (default to 120 minutes / 2 hours if not set)
        const durationMinutes = meeting.duration || 120;
        endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

        isAllDay = false;
      } else {
        // For all-day events, create date at midnight local time
        startDateTime = new Date(year, month - 1, day, 0, 0, 0);
        endDateTime = new Date(year, month - 1, day + 1, 0, 0, 0);
      }

      // Generate unique ID for the event
      const uid = `meeting-${meeting.id}@consciousbookclub.com`;

      // Build title: prefer custom meeting title, otherwise derive from book
      let title = meeting.title || "Book Club Meeting";
      if (!meeting.title && meeting.book) {
        title = `${meeting.book.title} - Book Club Meeting`;
        if (meeting.book.author) {
          title += ` (${meeting.book.author})`;
        }
      }

      // Build description
      const descriptionParts = [];
      if (meeting.book) {
        descriptionParts.push(`Book: ${meeting.book.title}`);
        if (meeting.book.author) {
          descriptionParts.push(`Author: ${meeting.book.author}`);
        }
      }
      if (meeting.notes) {
        descriptionParts.push(`Notes: ${meeting.notes}`);
      }
      const description = descriptionParts.join("\\n");

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      const dtStartValue = isAllDay ? ";VALUE=DATE" : "";
      lines.push(`DTSTART${dtStartValue}:${formatICalDate(startDateTime, isAllDay)}`);
      const dtEndValue = isAllDay ? ";VALUE=DATE" : "";
      lines.push(`DTEND${dtEndValue}:${formatICalDate(endDateTime, isAllDay)}`);
      lines.push(`DTSTAMP:${formatICalDate(new Date(), false)}`);
      lines.push(`SUMMARY:${escapeICalText(title)}`);
      if (description) {
        lines.push(`DESCRIPTION:${escapeICalText(description)}`);
      }
      if (meeting.location) {
        lines.push(`LOCATION:${escapeICalText(meeting.location)}`);
      }
      lines.push("STATUS:CONFIRMED");
      lines.push("SEQUENCE:0");
      lines.push("END:VEVENT");
    });

    lines.push("END:VCALENDAR");

    // Set proper content type for iCal
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    const filename = `${club.name.replace(/[^a-z0-9]/gi, "_")}_meetings.ics`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(lines.join("\r\n"));
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getMeetings,
  createMeeting,
  updateMeeting,
  getMeetingsICal,
};

