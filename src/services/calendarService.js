// Parse iCal text to extract calendar events
const parseICalFeed = (icalText) => {
  const events = [];
  const lines = icalText.split('\n');
  
  let currentEvent = null;
  let inEvent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        id: '',
        title: '',
        description: '',
        start: '',
        end: '',
        location: '',
        allDay: false
      };
    } else if (line === 'END:VEVENT' && currentEvent) {
      inEvent = false;
      
      // Only include future events or events from the last 7 days
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startTime = new Date(currentEvent.start);
      
      if (startTime >= weekAgo) {
        events.push(currentEvent);
      }
      
      currentEvent = null;
    } else if (inEvent && currentEvent) {
      // Parse event properties
      if (line.startsWith('UID:')) {
        currentEvent.id = line.substring(4);
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.title = line.substring(8);
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12);
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9);
      } else if (line.startsWith('DTSTART:')) {
        const dateStr = line.substring(8);
        if (dateStr.includes('T')) {
          // Date-time format: 20241102T233000Z
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          const hour = dateStr.substring(9, 11);
          const minute = dateStr.substring(11, 13);
          const second = dateStr.substring(13, 15);
          currentEvent.start = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
          currentEvent.allDay = false;
        } else {
          // Date format: 20250321
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          currentEvent.start = new Date(`${year}-${month}-${day}`).toISOString();
          currentEvent.allDay = true;
        }
      } else if (line.startsWith('DTEND:')) {
        const dateStr = line.substring(6);
        if (dateStr.includes('T')) {
          // Date-time format
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          const hour = dateStr.substring(9, 11);
          const minute = dateStr.substring(11, 13);
          const second = dateStr.substring(13, 15);
          currentEvent.end = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
        } else {
          // Date format
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          currentEvent.end = new Date(`${year}-${month}-${day}`).toISOString();
        }
      }
    }
  }
  
  // Sort events by start time
  return events.sort((a, b) => new Date(a.start) - new Date(b.start));
};

// Fetch calendar events from Google Calendar iCal feed
export const fetchCalendarEvents = async (googleCalendarId) => {
  try {
    if (!googleCalendarId) {
      throw new Error('Google Calendar ID is not configured for this club');
    }
    
    // Construct iCal feed URL with CORS proxy
    const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(googleCalendarId)}/public/basic.ics`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar iCal feed: ${response.status} ${response.statusText}`);
    }
    
    const icalText = await response.text();
    const events = parseICalFeed(icalText);
    
    return events;
    
  } catch (error) {
    // Re-throw the error instead of returning mock data
    // This allows the component to handle the error appropriately
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};
