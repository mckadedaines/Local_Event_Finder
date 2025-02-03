import config from "./config.js";

// Constants
const API_KEY = config.API_KEY;
const BASE_URL = config.BASE_URL?.replace(/\/$/, ""); // Remove trailing slash if present

// Validate required configuration
if (!API_KEY || !BASE_URL) {
  console.error("Missing required configuration. Please check config.js file.");
  showToast("Configuration error. Please contact support.", "error");
}

// State management
let currentEvents = [];
let currentView = "grid";

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

function initializeApp() {
  // Initialize event listeners
  document.getElementById("search-btn").addEventListener("click", handleSearch);
  document.getElementById("search-input").addEventListener("keyup", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  // Add change listeners for filters
  document
    .getElementById("date-filter")
    .addEventListener("change", handleSearch);
  document
    .getElementById("category-filter")
    .addEventListener("change", handleSearch);

  document.getElementById("sort-select").addEventListener("change", handleSort);
  document
    .getElementById("grid-view-btn")
    .addEventListener("click", () => setView("grid"));
  document
    .getElementById("list-view-btn")
    .addEventListener("click", () => setView("list"));

  // Initialize view
  setView(currentView);

  // Load initial data
  fetchEvents();
  loadMyEvents();

  // Initialize modal handlers
  initializeModal();
}

function setView(view) {
  currentView = view;
  const container = document.getElementById("events-container");
  const gridBtn = document.getElementById("grid-view-btn");
  const listBtn = document.getElementById("list-view-btn");

  // Remove both classes first
  container.classList.remove("events-grid", "events-list");
  // Add the appropriate class
  container.classList.add(`events-${view}`);

  // Update button states
  gridBtn.classList.toggle("active", view === "grid");
  listBtn.classList.toggle("active", view === "list");

  // Re-render events in new view
  if (currentEvents.length > 0) {
    displayEvents(currentEvents);
  }
}

async function fetchEvents() {
  showLoading(true);

  try {
    const url = `${BASE_URL}/events.json?apikey=${API_KEY}&size=20&countryCode=US`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (data._embedded && data._embedded.events) {
      currentEvents = data._embedded.events;
      displayEvents(currentEvents);
    } else {
      displayNoResults();
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    showToast("Error fetching events. Please try again later.", "error");
    displayNoResults();
  } finally {
    showLoading(false);
  }
}

function displayEvents(events) {
  const container = document.getElementById("events-container");
  container.innerHTML = "";

  events.forEach((event) => {
    const eventCard = createEventCard(event);
    container.appendChild(eventCard);
  });
}

function createEventCard(event) {
  const eventDiv = document.createElement("div");
  eventDiv.classList.add("event");

  const imageUrl =
    event.images.find((img) => img.ratio === "16_9")?.url ||
    event.images[0].url;
  const eventName = event.name;
  const eventDate = new Date(event.dates.start.localDate).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
  const venue = event._embedded?.venues?.[0]?.name || "Venue TBA";
  const categories = event.classifications?.[0]?.segment?.name || "General";

  eventDiv.innerHTML = `
    <img src="${imageUrl}" alt="${eventName}" loading="lazy" />
    <div class="event-info">
      <h3 class="event-title">${eventName}</h3>
      <div class="event-details">
        <p class="event-date"><i class="far fa-calendar"></i> ${eventDate}</p>
        <p class="event-location"><i class="fas fa-map-marker-alt"></i> ${venue}</p>
        <span class="category-tag">${categories}</span>
      </div>
      <div class="action-buttons">
        <button class="details-btn" onclick="openEventDetails('${event.id}')">
          <i class="fas fa-info-circle"></i> Details
        </button>
        <button class="save-event-btn">
          <i class="far fa-bookmark"></i> Save
        </button>
      </div>
    </div>
  `;

  // Add event listener to the save button
  eventDiv.querySelector(".save-event-btn").addEventListener("click", () => {
    saveEvent({
      id: event.id,
      name: event.name,
      date: event.dates.start.localDate,
      imageUrl: imageUrl,
      venue: venue,
      category: categories,
      detailsUrl: event.url,
    });
  });

  return eventDiv;
}

function saveEvent(event) {
  let savedEvents = JSON.parse(localStorage.getItem("myEvents")) || [];

  if (!savedEvents.some((e) => e.id === event.id)) {
    savedEvents.push(event);
    localStorage.setItem("myEvents", JSON.stringify(savedEvents));
    showToast("Event saved successfully!", "success");
    loadMyEvents();
  } else {
    showToast("Event already saved!", "info");
  }
}

function loadMyEvents() {
  const savedEvents = JSON.parse(localStorage.getItem("myEvents")) || [];
  const container = document.getElementById("my-events-container");

  container.innerHTML =
    savedEvents.length === 0
      ? '<p class="no-events">No saved events yet. Save some events to see them here!</p>'
      : "";

  savedEvents.forEach((event) => {
    const eventDiv = document.createElement("div");
    eventDiv.classList.add("event");

    eventDiv.innerHTML = `
      <img src="${event.imageUrl}" alt="${event.name}" loading="lazy" />
      <div class="event-info">
        <h3 class="event-title">${event.name}</h3>
        <div class="event-details">
          <p class="event-date"><i class="far fa-calendar"></i> ${new Date(
            event.date
          ).toLocaleDateString()}</p>
          <p class="event-location"><i class="fas fa-map-marker-alt"></i> ${
            event.venue
          }</p>
          <span class="category-tag">${event.category}</span>
        </div>
        <div class="action-buttons">
          <a href="${event.detailsUrl}" target="_blank" class="details-btn">
            <i class="fas fa-external-link-alt"></i> View
          </a>
          <button class="remove-event-btn" onclick="removeEvent('${event.id}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(eventDiv);
  });
}

function removeEvent(eventId) {
  let savedEvents = JSON.parse(localStorage.getItem("myEvents")) || [];
  savedEvents = savedEvents.filter((event) => event.id !== eventId);
  localStorage.setItem("myEvents", JSON.stringify(savedEvents));
  showToast("Event removed successfully!", "success");
  loadMyEvents();
}

async function handleSearch() {
  const searchInput = document.getElementById("search-input").value.trim();
  const dateFilter = document.getElementById("date-filter").value;
  const categoryFilter = document.getElementById("category-filter").value;

  showLoading(true);

  try {
    // Start building the URL with required parameters
    let url = `${BASE_URL}/events.json?apikey=${API_KEY}&size=20&countryCode=US`;

    // Add search keyword if provided
    if (searchInput) {
      url += `&keyword=${encodeURIComponent(searchInput)}`;
    }

    // Add date filter if provided
    if (dateFilter) {
      // Create date object for start of day
      const selectedDate = new Date(dateFilter + "T00:00:00");
      const endDate = new Date(dateFilter + "T23:59:59");

      // Format dates for API (YYYY-MM-DDTHH:mm:ssZ)
      const startStr = selectedDate.toISOString().slice(0, 19) + "Z";
      const endStr = endDate.toISOString().slice(0, 19) + "Z";

      url += `&startDateTime=${startStr}&endDateTime=${endStr}`;
    }

    // Add category filter if provided and not "all"
    if (categoryFilter && categoryFilter !== "all") {
      // Use segmentName for main categories
      url += `&segmentName=${encodeURIComponent(categoryFilter)}`;
    }

    console.log("Fetching events with URL:", url); // For debugging

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (data._embedded && data._embedded.events) {
      // Additional client-side filtering for categories if needed
      let filteredEvents = data._embedded.events;

      // Filter events based on category if one is selected
      if (categoryFilter && categoryFilter !== "all") {
        filteredEvents = filteredEvents.filter((event) => {
          const eventCategory = event.classifications?.[0]?.segment?.name;
          return (
            eventCategory &&
            eventCategory.toLowerCase() === categoryFilter.toLowerCase()
          );
        });
      }

      currentEvents = filteredEvents;

      if (currentEvents.length > 0) {
        displayEvents(currentEvents);
      } else {
        displayNoResults();
      }
    } else {
      displayNoResults();
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    showToast("Error fetching events. Please try again later.", "error");
    displayNoResults();
  } finally {
    showLoading(false);
  }
}

function handleSort(event) {
  const sortBy = event.target.value;

  const sortedEvents = [...currentEvents].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return (
          new Date(a.dates.start.localDate) - new Date(b.dates.start.localDate)
        );
      case "name":
        return a.name.localeCompare(b.name);
      case "popularity":
        return (b.popularity || 0) - (a.popularity || 0);
      default:
        return 0;
    }
  });

  displayEvents(sortedEvents);
}

function initializeModal() {
  const modal = document.getElementById("event-details-modal");
  const closeBtn = modal.querySelector(".close-button");

  closeBtn.onclick = () => (modal.style.display = "none");

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}

async function openEventDetails(eventId) {
  const modal = document.getElementById("event-details-modal");
  const modalBody = modal.querySelector(".modal-body");

  showLoading(true);

  try {
    const response = await fetch(
      `${BASE_URL}/events/${eventId}?apikey=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const event = await response.json();

    modalBody.innerHTML = `
      <div class="modal-event-details">
        <img src="${event.images[0].url}" alt="${event.name}" />
        <h3>${event.name}</h3>
        <p><i class="far fa-calendar"></i> ${new Date(
          event.dates.start.localDate
        ).toLocaleDateString()}</p>
        <p><i class="far fa-clock"></i> ${
          event.dates.start.localTime || "Time TBA"
        }</p>
        <p><i class="fas fa-map-marker-alt"></i> ${
          event._embedded?.venues?.[0]?.name
        }</p>
        <p>${event.description || "No description available."}</p>
        <div class="price-info">
          <p><strong>Price Range:</strong></p>
          <p>${
            event.priceRanges
              ? `$${event.priceRanges[0].min} - $${event.priceRanges[0].max}`
              : "Price TBA"
          }</p>
        </div>
      </div>
    `;

    modal.style.display = "block";
  } catch (error) {
    console.error("Error fetching event details:", error);
    showToast("Error loading event details. Please try again later.", "error");
  } finally {
    showLoading(false);
  }
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type} fade-in`;
  toast.innerHTML = `
    <i class="fas ${
      type === "success"
        ? "fa-check-circle"
        : type === "error"
        ? "fa-exclamation-circle"
        : "fa-info-circle"
    }"></i>
    <span>${message}</span>
  `;

  document.getElementById("toast-container").appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showLoading(show) {
  const loader = document.querySelector(".loading-container");
  loader.classList.toggle("hidden", !show);
}

function displayNoResults() {
  const container = document.getElementById("events-container");
  container.innerHTML = `
    <div class="no-results">
      <i class="fas fa-search fa-3x"></i>
      <h3>No Events Found</h3>
      <p>Try adjusting your search criteria or check back later for new events.</p>
    </div>
  `;
}
