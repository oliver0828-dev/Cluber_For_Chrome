document.addEventListener('DOMContentLoaded', async () => {
  const todayEventsDiv = document.getElementById('today-events');
  const upcomingEventsDiv = document.getElementById('upcoming-events');
  const lunchDiv = document.getElementById('lunch-menu');
  const lastUpdated = document.getElementById('last-updated');
  const refreshButton = document.getElementById('refresh-button');
  const themeToggle = document.getElementById('theme-toggle');

  function isToday(dateStr) {
    const eventDate = new Date(dateStr);
    const today = new Date();
    return eventDate.getFullYear() === today.getFullYear() &&
           eventDate.getMonth() === today.getMonth() &&
           eventDate.getDate() === today.getDate();
  }

  function isTomorrow(dateStr) {
    const eventDate = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return eventDate.getFullYear() === tomorrow.getFullYear() &&
           eventDate.getMonth() === tomorrow.getMonth() &&
           eventDate.getDate() === tomorrow.getDate();
  }

  async function fetchICS(url) {
    try {
      const response = await fetch(url);
      const icsText = await response.text();

      const events = [];
      const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
      let match;
      while ((match = eventRegex.exec(icsText)) !== null) {
        const eventText = match[1];

        const summaryMatch = eventText.match(/SUMMARY:(.*)/);
        const descriptionMatch = eventText.match(/DESCRIPTION:(.*)/);
        const xAltDescMatch = eventText.match(/X-ALT-DESC:(.*)/);
        const locationMatch = eventText.match(/LOCATION:(.*)/);
        const dtstartMatch = eventText.match(/DTSTART.*:(.*)/);
        const dtendMatch = eventText.match(/DTEND.*:(.*)/);

        let description = descriptionMatch ? descriptionMatch[1] : '';
        if (xAltDescMatch) {
          description += '\n' + xAltDescMatch[1];
        }

        description = description.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\').trim();

        events.push({
          title: summaryMatch ? summaryMatch[1].trim() : 'No Title',
          description,
          location: locationMatch ? locationMatch[1].trim() : '',
          start: dtstartMatch ? formatICSDate(dtstartMatch[1]) : 'No Start',
          end: dtendMatch ? formatICSDate(dtendMatch[1]) : 'No End'
        });
      }

      return events;
    } catch (error) {
      console.error(`Error fetching ICS data from ${url}:`, error);
      return [];
    }
  }

  function formatICSDate(icsDate) {
    const year = icsDate.substr(0, 4);
    const month = icsDate.substr(4, 2) - 1;
    const day = icsDate.substr(6, 2);
    const hour = icsDate.substr(9, 2);
    const minute = icsDate.substr(11, 2);

    const date = new Date(Date.UTC(year, month, day, hour, minute));
    return date.toISOString();
  }

  async function displayData() {
    todayEventsDiv.innerHTML = '<p>Loading today\'s events...</p>';
    upcomingEventsDiv.innerHTML = '<p>Loading upcoming events...</p>';
    lunchDiv.innerHTML = '<p>Loading lunch menu...</p>';

    const data = await chrome.storage.local.get(['calendarEvents', 'lunchMenu', 'lastUpdated']);

    // Calendar Events
    if (data.calendarEvents?.length) {
      const todayEvents = data.calendarEvents.filter(e => isToday(e.start));
      const tomorrowEvents = data.calendarEvents.filter(e => isTomorrow(e.start));

      todayEventsDiv.innerHTML = todayEvents.length
        ? todayEvents.map(e => `<div class="event-item"><strong>${e.title}</strong><br>${new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`).join('')
        : '<p>No events today.</p>';

      upcomingEventsDiv.innerHTML = tomorrowEvents.length
        ? tomorrowEvents.map(e => `<div class="event-item"><strong>${e.title}</strong><br>${new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`).join('')
        : '<p>No events tomorrow.</p>';
    } else {
      todayEventsDiv.innerHTML = '<p>No calendar events found.</p>';
      upcomingEventsDiv.innerHTML = '<p>No calendar events found.</p>';
    }

    // Lunch Menu
    if (data.lunchMenu?.length) {
      const todayLunch = data.lunchMenu.filter(e => isToday(e.start));
      const lunchItems = todayLunch
        .flatMap(e => {
          const desc = e.description || e.title || '';
          return desc.split(/\n/);
        })
        .filter(line => line.toLowerCase().includes('lunch'));

      lunchDiv.innerHTML = lunchItems.length
        ? lunchItems.map(item => `<div class="lunch-item">${item.replace(/lunch[:\-]/i, '').trim()}</div>`).join('')
        : '<p>No lunch menu for today.</p>';
    } else {
      lunchDiv.innerHTML = '<p>No lunch menu found.</p>';
    }

    lastUpdated.textContent = data.lastUpdated 
      ? `Last updated: ${new Date(data.lastUpdated).toLocaleString()}` 
      : 'Last updated: Never';
  }

  await displayData();

  refreshButton.addEventListener('click', async () => {
    refreshButton.disabled = true;
    lastUpdated.textContent = 'Refreshing...';
    await chrome.runtime.sendMessage({ command: "fetchAllDataAndCache" });
    setTimeout(displayData, 2500);
    refreshButton.disabled = false;
  });

  themeToggle.addEventListener('click', () => {
    const mode = document.body.classList.toggle('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', mode);
  });

  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
});
