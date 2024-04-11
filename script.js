document.addEventListener("DOMContentLoaded", () => {
  fetchEvents();
  document.getElementById("search-btn").addEventListener("click", searchEvents);
  loadMyEvents();
});

function fetchEvents() {
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=72vCrK1Md1oUVmciC0MlTtbg49XOn2J2&size=10&countryCode=US`;

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data._embedded && data._embedded.events) {
        displayEvents(data._embedded.events);
      } else {
        console.log("No events found in the response.");
      }
    })
    .catch((error) => console.error("Error fetching events:", error));
}

function displayEvents(events) {
  const container = document.getElementById("events-container");
  container.innerHTML = ""; // Clear existing events

  events.forEach((event) => {
    const eventDiv = document.createElement("div");
    eventDiv.classList.add("event");

    const eventImage = event.images[0].url;
    const eventName = event.name;
    const eventDate = event.dates.start.localDate;
    const eventUrl = event.url;

    eventDiv.innerHTML = `
        <img src="${eventImage}" alt="${eventName}" />
        <div class="event-info">
            <h3 class="event-title">${eventName}</h3>
            <p class="event-date">Date: ${eventDate}</p>
            <div class="action-buttons">
                <a href="${eventUrl}" target="_blank">Event Details</a>
                <button class="save-event-btn">Save Event</button>
            </div>
        </div>
    `;
    container.appendChild(eventDiv);

    // Add event listener to the save button
    eventDiv.querySelector(".save-event-btn").addEventListener("click", () => {
      saveEvent({
        id: event.id,
        name: event.name,
        date: event.dates.start.localDate,
        imageUrl: event.images[0].url, // Ensure this is correctly pointing to the image URL in the event object
        detailsUrl: event.url,
      });
    });
  });
}

function saveEvent(event) {
  console.log("Saving event:", event);
  let savedEvents = JSON.parse(localStorage.getItem("myEvents")) || [];
  // Ensure no duplicate events are saved
  if (!savedEvents.some((e) => e.id === event.id)) {
    savedEvents.push({
      id: event.id,
      name: event.name,
      date: event.date,
      imageUrl: event.imageUrl, // Make sure this matches how you're capturing the image URL
      detailsUrl: event.detailsUrl,
    });
    localStorage.setItem("myEvents", JSON.stringify(savedEvents));
    alert("Event saved!");
    loadMyEvents();
    console.log("Loaded saved events:", savedEvents);
  }
}

function loadMyEvents() {
  let savedEvents = JSON.parse(localStorage.getItem("myEvents")) || [];
  const myEventsContainer = document.getElementById("my-events-container");
  myEventsContainer.innerHTML = "";

  savedEvents.forEach((event) => {
    const eventDiv = document.createElement("div");
    eventDiv.classList.add("event");

    eventDiv.innerHTML = `
        <img src="${event.imageUrl}" alt="${event.name}" /> <!-- Verify 'imageUrl' is correctly named -->
        <div class="event-info">
            <h3 class="event-title">${event.name}</h3>
            <p class="event-date">Date: ${event.date}</p>
            <div class="action-buttons">
                <a href="${event.detailsUrl}" target="_blank">Event Details</a>
                <button class="remove-event-btn" onclick="removeEvent('${event.id}')">X</button>
            </div>
        </div>
    `;
    myEventsContainer.appendChild(eventDiv);
  });
}

function removeEvent(eventId) {
  let savedEvents = JSON.parse(localStorage.getItem("myEvents")) || [];
  savedEvents = savedEvents.filter((event) => event.id !== eventId);
  localStorage.setItem("myEvents", JSON.stringify(savedEvents));
  loadMyEvents();
}

function searchEvents() {
  const searchInput = document
    .getElementById("search-input")
    .value.toLowerCase(); // Get the search input value and convert it to lowercase for case-insensitive search
  const events = document.querySelectorAll(".event"); // Get all event elements

  events.forEach((event) => {
    const eventName = event
      .querySelector(".event-title")
      .textContent.toLowerCase(); // Get the event name and convert it to lowercase

    if (eventName.includes(searchInput)) {
      // Check if the event name contains the search input
      event.style.display = "block"; // Show the event
    } else {
      event.style.display = "none"; // Hide the event if it doesn't match the search criteria
    }
  });
}
