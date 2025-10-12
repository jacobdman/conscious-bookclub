// Configuration - Replace with your Google Calendar ID
const GOOGLE_CALENDAR_ID = '99d5640c339ece5cf6b5abb26854d93f2cf4b8fc4b87e4a5aa0ca6bb4bc49020@group.calendar.google.com'; // Replace this with your actual calendar ID

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
export const fetchCalendarEvents = async () => {
  try {
    if (GOOGLE_CALENDAR_ID === 'YOUR_CALENDAR_ID_HERE') {
      throw new Error('Please configure your Google Calendar ID in calendarService.js');
    }
    
    // Construct iCal feed URL with CORS proxy
    const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/public/basic.ics`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`;
    
    console.log('Fetching calendar events from iCal feed via CORS proxy:', proxyUrl);
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar iCal feed: ${response.status} ${response.statusText}`);
    }
    
    const icalText = await response.text();
    const events = parseICalFeed(icalText);
    
    console.log(`Successfully fetched ${events.length} calendar events`);
    return events;
    
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    
    // Return mock data as fallback if RSS feed fails
    console.log('Falling back to mock events due to error');
    return [
      {
        id: 'mock-1',
        title: 'Book Club Meeting',
        description: 'Discussion of "Atomic Habits" by James Clear',
        start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        location: 'Community Center Room A',
        allDay: false
      },
      {
        id: 'mock-2',
        title: 'Reading Group Planning',
        description: 'Plan next month\'s book selections',
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        location: 'Online - Zoom',
        allDay: false
      }
    ];
  }
};
