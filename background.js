chrome.runtime.onInstalled.addListener(() => {
  fetchAllDataAndCache();
  chrome.alarms.create('fetchDataAlarm', {
    delayInMinutes: 1,
    periodInMinutes: 180
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'fetchDataAlarm') {
    fetchAllDataAndCache();
  }
});

async function fetchAllDataAndCache() {
  const calendarEvents = await fetchICS('https://www.dis.sc.kr/cf_calendar/feed.cfm?type=ical&feedID=7A4135B32FB844059B0B745DB50EE56A');
  const lunchMenu = await fetchICS('https://www.dis.sc.kr/cf_calendar/feed.cfm?type=ical&feedID=1DA05BFFCF06482C9E5ED8A403FDB454');

  await chrome.storage.local.set({
    calendarEvents,
    lunchMenu,
    lastUpdated: Date.now()
  });
  console.log('Data fetched and cached successfully.');
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
      const dtstartMatch = eventText.match(/DTSTART.*:(.*)/);
      const dtendMatch = eventText.match(/DTEND.*:(.*)/);

      events.push({
        title: summaryMatch ? summaryMatch[1].trim() : 'No Title',
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
  // Convert e.g. 20240527T080000Z to readable format
  const year = icsDate.substr(0, 4);
  const month = icsDate.substr(4, 2) - 1; // JS month 0-11
  const day = icsDate.substr(6, 2);
  const hour = icsDate.substr(9, 2);
  const minute = icsDate.substr(11, 2);

  const date = new Date(Date.UTC(year, month, day, hour, minute));
  return date.toLocaleString(); // Format to local string
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "fetchAllDataAndCache") {
    fetchAllDataAndCache().then(() => sendResponse({ status: "success" }))
    .catch(e => sendResponse({ status: "error", message: e.toString() }));
    return true;
  }
});
