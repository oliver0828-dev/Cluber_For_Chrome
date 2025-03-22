document.addEventListener('DOMContentLoaded', () => {
    fetchCalendarEvents();
    fetchLunchMenu();
});

function fetchCalendarEvents() {
    const calendarId = 'vri7ttidnah73ujmj0tptpdscicue13m@import.calendar.google.com';
    const apiKey = 'AIzaSyBFDvZH4c6WOwNkXA-pAUC_RuaTeA13g00';
    
    const now = new Date().toISOString();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const future = futureDate.toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?orderBy=startTime&singleEvents=true&timeMin=${now}&timeMax=${future}&key=${apiKey}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            displayEvents(data.items);
        })
        .catch(error => {
            document.getElementById('today-event').innerText = 'Error loading events.';
            console.error(error);
        });
}

function displayEvents(events) {
    const todayEvent = document.getElementById('today-event');
    const upcomingEvents = document.getElementById('upcoming-events');

    todayEvent.innerHTML = "No event today";
    upcomingEvents.innerHTML = "";

    let upcomingCount = 0;
    const todayDate = new Date().toDateString();

    events.forEach(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date);
        const eventString = `${event.summary} - ${eventDate.toLocaleDateString()} ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        if (eventDate.toDateString() === todayDate) {
            todayEvent.innerText = eventString;
        } else if (eventDate > new Date() && upcomingCount < 2) {
            const div = document.createElement('div');
            div.textContent = eventString;
            upcomingEvents.appendChild(div);
            upcomingCount++;
        }
    });

    if (upcomingEvents.innerHTML === "") {
        upcomingEvents.innerHTML = "No upcoming events";
    }
}

function fetchLunchMenu() {
    const cafeteriaUrl = 'https://www.dis.sc.kr/quicklinks/cafeteria';

    fetch(cafeteriaUrl)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            displayLunchMenu(doc);
        })
        .catch(error => {
            document.getElementById('lunch-menu').innerText = 'Error loading lunch menu.';
            console.error('Error fetching lunch menu:', error);
        });
}

function displayLunchMenu(doc) {
    const lunchMenuElement = document.getElementById('lunch-menu');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Adjust selectors if needed after inspecting actual site structure
    const calendarCells = doc.querySelectorAll('.fsCalendar td');

    let lunchFound = false;

    calendarCells.forEach(cell => {
        if (cell.getAttribute('data-date') === today) {
            const lunchDetails = cell.querySelectorAll('.fsCalendarEventTitle');
            lunchMenuElement.innerHTML = '';

            if (lunchDetails.length > 0) {
                lunchDetails.forEach(detail => {
                    const menuItem = document.createElement('div');
                    menuItem.textContent = detail.textContent.trim();
                    lunchMenuElement.appendChild(menuItem);
                });
                lunchFound = true;
            }
        }
    });

    if (!lunchFound) {
        lunchMenuElement.innerText = 'No lunch menu available today.';
    }
}

// Call this in your main DOMContentLoaded event:
document.addEventListener('DOMContentLoaded', fetchLunchMenu);
