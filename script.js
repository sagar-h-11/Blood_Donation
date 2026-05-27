const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STORAGE_KEY = "pulse-link-donors";
const HOSPITAL_STORAGE_KEY = "pulse-link-hospital-inventory";
const USER_STORAGE_KEY = "pulse-link-user";
const HOSPITALS = [
  {
    name: "KLES Dr. Prabhakar Kore Hospital & MRC",
    address: "Nehru Nagar, Belagavi - 590010",
    phone: "0831-2473777",
    lat: 15.8879056,
    lng: 74.5199058,
    availableTypes: ["A+", "A-", "B+", "AB+", "O+", "O-"],
  },
  {
    name: "KLE Centenary Charitable Hospital & MRC",
    address: "Yellur Road, Belagavi - 590005",
    phone: "0831-2413777",
    lat: 15.8207,
    lng: 74.5065,
    availableTypes: ["A+", "B+", "B-", "O+", "AB+"],
  },
  {
    name: "MyBlood Charitable Blood Center",
    address: "Siddeshwar Nagar, Kanabargi, Belagavi - 590016",
    phone: "+91 7777-88-11-48",
    lat: 15.9072,
    lng: 74.4973,
    availableTypes: ["A+", "A-", "B+", "B-", "AB-", "O+", "O-"],
  },
  {
    name: "Shree Mahaveer Blood Bank",
    address: "Radio Complex, Shivaji Road, Raviwar Peth, Belagavi - 590002",
    phone: "0831-2430759",
    lat: 15.8591,
    lng: 74.5097,
    availableTypes: ["A+", "B+", "AB+", "AB-", "O+"],
  },
  {
    name: "Lakeview Hospital",
    address: "Opposite Fort Lake, Belagavi - 590016",
    phone: "",
    lat: 15.8626,
    lng: 74.5226,
    availableTypes: ["A-", "B+", "B-", "O+", "O-"],
  },
  {
    name: "Deccan Medical Centre",
    address: "Good Shed Road, Railway Over Bridge, Belagavi - 590001",
    phone: "0831-2436444",
    lat: 15.8523,
    lng: 74.5106,
    availableTypes: ["A+", "B+", "AB+", "O+"],
  },
  {
    name: "Belgaum Cancer Hospital Pvt Ltd",
    address: "Ashok Nagar, Belagavi - 590001",
    phone: "0831-2472770",
    lat: 15.8746,
    lng: 74.5157,
    availableTypes: ["A+", "A-", "B-", "AB+", "O-"],
  },
];

const donorForm = document.querySelector("#donor-form");
const hospitalForm = document.querySelector("#hospital-form");
const searchForm = document.querySelector("#search-form");
const formMessage = document.querySelector("#form-message");
const hospitalMessage = document.querySelector("#hospital-message");
const donorTableBody = document.querySelector("#donor-table-body");
const hospitalTableBody = document.querySelector("#hospital-table-body");
const emptyState = document.querySelector("#empty-state");
const totalDonors = document.querySelector("#total-donors");
const availabilityCard = document.querySelector("#availability-card");
const trackedTypes = document.querySelector("#tracked-types");
const donatePanel = document.querySelector("#donate-panel");
const needPanel = document.querySelector("#need-panel");
const hospitalPanel = document.querySelector("#hospital-panel");
const tabs = document.querySelectorAll(".tab-button");
const bloodTypeSelect = document.querySelector("#bloodType");
const searchBloodTypeSelect = document.querySelector("#searchBloodType");
const hospitalNameSelect = document.querySelector("#hospitalName");
const hospitalBloodTypeSelect = document.querySelector("#hospitalBloodType");
const locationButton = document.querySelector("#location-button");
const locationMessage = document.querySelector("#location-message");
const tabLinks = document.querySelectorAll("[data-open-tab]");
const loginPage = document.querySelector("#login-page");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const appBackdrop = document.querySelector("#app-backdrop");
const appShell = document.querySelector("#app-shell");
const signedInText = document.querySelector("#signed-in-text");
const logoutButton = document.querySelector("#logout-button");

let currentUser = loadCurrentUser();
let donors = loadDonors();
let hospitalInventory = loadHospitalInventory();
let lastSearchType = "";
let userLocation = null;

applyAuthState();
populateBloodTypeOptions();
populateHospitalOptions();
renderDonorTable();
renderHospitalTable();
updateHeroStats();

tabs.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

tabLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    activateTab(link.dataset.openTab);
    document.querySelector(link.getAttribute("href"))?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const username = normalizeText(formData.get("username"));
  const phone = normalizeText(formData.get("phone"));

  if (!username || !phone) {
    showLoginMessage("Please enter your username and phone number.", "error");
    return;
  }

  if (normalizePhone(phone).length < 7) {
    showLoginMessage("Please enter a valid phone number.", "error");
    return;
  }

  currentUser = {
    username,
    phone,
    phoneKey: normalizePhone(phone),
  };

  if (!persistCurrentUser()) {
    showLoginMessage("This browser could not save login details. Please try again.", "error");
    return;
  }

  loginForm.reset();
  showLoginMessage("", "");
  applyAuthState();
  renderDonorTable();

  if (lastSearchType) {
    renderAvailability(lastSearchType);
  }
});

logoutButton.addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem(USER_STORAGE_KEY);
  applyAuthState();
  showLoginMessage("", "");
});

donorForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser?.phoneKey) {
    showFormMessage("Please sign in before saving a donor record.", "error");
    return;
  }

  const formData = new FormData(donorForm);
  const donor = {
    name: normalizeText(formData.get("name")),
    bloodType: normalizeBloodType(formData.get("bloodType")),
    phone: normalizeText(formData.get("phone")),
    city: normalizeText(formData.get("city")),
    address: normalizeText(formData.get("address")),
  };

  if (Object.values(donor).some((value) => !value)) {
    showFormMessage("Please complete all fields before saving a donor.", "error");
    return;
  }

  donors.unshift({
    ...donor,
    id: createId(),
    createdAt: new Date().toISOString(),
    ownerName: currentUser.username,
    ownerPhone: currentUser.phone,
    ownerPhoneKey: currentUser.phoneKey,
  });

  if (!persistDonors()) {
    showFormMessage("This browser could not save the donor. Please try again.", "error");
    donors.shift();
    return;
  }

  donorForm.reset();
  renderDonorTable();
  updateHeroStats();
  showFormMessage(`Saved ${donor.name} as a ${donor.bloodType} donor.`, "success");

  if (lastSearchType) {
    renderAvailability(lastSearchType);
  }
});

donorForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    showFormMessage("", "");
  }, 0);
});

hospitalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const hospitalName = normalizeText(hospitalNameSelect.value);
  const bloodType = normalizeBloodType(hospitalBloodTypeSelect.value);

  if (!hospitalName || !bloodType) {
    showHospitalMessage("Please select a hospital and blood type.", "error");
    return;
  }

  const hospital = hospitalInventory.find((entry) => entry.name === hospitalName);
  if (!hospital) {
    showHospitalMessage("Please select a listed Belagavi hospital.", "error");
    return;
  }

  if (hospital.availableTypes.includes(bloodType)) {
    showHospitalMessage(`${bloodType} is already listed for ${hospital.name}.`, "error");
    return;
  }

  hospital.availableTypes.push(bloodType);
  hospital.availableTypes.sort((first, second) => BLOOD_TYPES.indexOf(first) - BLOOD_TYPES.indexOf(second));

  if (!persistHospitalInventory()) {
    hospital.availableTypes = hospital.availableTypes.filter((type) => type !== bloodType);
    showHospitalMessage("This browser could not save the hospital update. Please try again.", "error");
    return;
  }

  renderHospitalTable();
  hospitalForm.reset();
  showHospitalMessage(`Added ${bloodType} at ${hospital.name}.`, "success");

  if (lastSearchType) {
    renderAvailability(lastSearchType);
  }
});

hospitalTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-blood]");
  if (!button) {
    return;
  }

  const hospitalName = button.dataset.hospital;
  const bloodType = button.dataset.bloodType;
  const hospital = hospitalInventory.find((entry) => entry.name === hospitalName);

  if (!hospital || !hospital.availableTypes.includes(bloodType)) {
    return;
  }

  const previousTypes = [...hospital.availableTypes];
  hospital.availableTypes = hospital.availableTypes.filter((type) => type !== bloodType);

  if (!persistHospitalInventory()) {
    hospital.availableTypes = previousTypes;
    showHospitalMessage("This browser could not remove the blood type. Please try again.", "error");
    return;
  }

  renderHospitalTable();
  showHospitalMessage(`Removed ${bloodType} from ${hospital.name}.`, "success");

  if (lastSearchType) {
    renderAvailability(lastSearchType);
  }
});

donorTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-donor]");
  if (!button) {
    return;
  }

  deleteDonor(button.dataset.donorId);
});

availabilityCard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-donor]");
  if (!button) {
    return;
  }

  deleteDonor(button.dataset.donorId);
});

hospitalForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    showHospitalMessage("", "");
  }, 0);
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedType = normalizeBloodType(searchBloodTypeSelect.value);

  if (!selectedType) {
    lastSearchType = "";
    renderAvailability("");
    return;
  }

  lastSearchType = selectedType;
  renderAvailability(selectedType);
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showLocationMessage("GPS is not available in this browser.", "error");
    return;
  }

  showLocationMessage("Checking your location...", "neutral");
  locationButton.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      showLocationMessage("Location added. Hospital results now show nearest distance.", "success");
      locationButton.disabled = false;

      if (lastSearchType) {
        renderAvailability(lastSearchType);
      }
    },
    (error) => {
      const message =
        error.code === error.PERMISSION_DENIED
          ? "Location permission is needed to calculate nearest distance."
          : "Location could not be found right now. Try again or search without GPS.";
      showLocationMessage(message, "error");
      locationButton.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    },
  );
});

function activateTab(tabName) {
  const targetTab = ["donate", "need", "hospital"].includes(tabName) ? tabName : "donate";

  tabs.forEach((tab) => {
    const active = tab.dataset.tab === targetTab;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  [
    { name: "donate", panel: donatePanel },
    { name: "need", panel: needPanel },
    { name: "hospital", panel: hospitalPanel },
  ].forEach(({ name, panel }) => {
    const active = name === targetTab;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

function populateBloodTypeOptions() {
  trackedTypes.textContent = String(BLOOD_TYPES.length);

  BLOOD_TYPES.forEach((type) => {
    const donorOption = document.createElement("option");
    donorOption.value = type;
    donorOption.textContent = type;
    bloodTypeSelect.appendChild(donorOption);

    const searchOption = document.createElement("option");
    searchOption.value = type;
    searchOption.textContent = type;
    searchBloodTypeSelect.appendChild(searchOption);

    const hospitalOption = document.createElement("option");
    hospitalOption.value = type;
    hospitalOption.textContent = type;
    hospitalBloodTypeSelect.appendChild(hospitalOption);
  });
}

function populateHospitalOptions() {
  hospitalInventory.forEach((hospital) => {
    const option = document.createElement("option");
    option.value = hospital.name;
    option.textContent = hospital.name;
    hospitalNameSelect.appendChild(option);
  });
}

function loadDonors() {
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);
    if (!savedValue) {
      return [];
    }

    const parsed = JSON.parse(savedValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((donor) => ({
        id: normalizeText(donor?.id) || createId(),
        name: normalizeText(donor?.name),
        bloodType: normalizeBloodType(donor?.bloodType),
        phone: normalizeText(donor?.phone),
        city: normalizeText(donor?.city),
        address: normalizeText(donor?.address),
        createdAt: normalizeText(donor?.createdAt),
        ownerName: normalizeText(donor?.ownerName),
        ownerPhone: normalizeText(donor?.ownerPhone),
        ownerPhoneKey: normalizePhone(donor?.ownerPhoneKey || donor?.ownerPhone),
      }))
      .filter((donor) =>
        donor.name &&
        BLOOD_TYPES.includes(donor.bloodType) &&
        donor.phone &&
        donor.city &&
        donor.address,
      );
  } catch {
    return [];
  }
}

function loadCurrentUser() {
  try {
    const savedValue = localStorage.getItem(USER_STORAGE_KEY);
    if (!savedValue) {
      return null;
    }

    const parsed = JSON.parse(savedValue);
    const username = normalizeText(parsed?.username);
    const phone = normalizeText(parsed?.phone);
    const phoneKey = normalizePhone(phone);

    if (!username || phoneKey.length < 7) {
      return null;
    }

    return {
      username,
      phone,
      phoneKey,
    };
  } catch {
    return null;
  }
}

function loadHospitalInventory() {
  const baseInventory = HOSPITALS.map((hospital) => ({
    ...hospital,
    availableTypes: [...hospital.availableTypes],
  }));

  try {
    const savedValue = localStorage.getItem(HOSPITAL_STORAGE_KEY);
    if (!savedValue) {
      return baseInventory;
    }

    const savedInventory = JSON.parse(savedValue);
    if (!Array.isArray(savedInventory)) {
      return baseInventory;
    }

    return baseInventory.map((hospital) => {
      const savedHospital = savedInventory.find((entry) => entry.name === hospital.name);
      const savedTypes = Array.isArray(savedHospital?.availableTypes)
        ? savedHospital.availableTypes.filter((type) => BLOOD_TYPES.includes(type))
        : hospital.availableTypes;

      return {
        ...hospital,
        availableTypes: [...new Set(savedTypes)].sort(
          (first, second) => BLOOD_TYPES.indexOf(first) - BLOOD_TYPES.indexOf(second),
        ),
      };
    });
  } catch {
    return baseInventory;
  }
}

function persistDonors() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
    return true;
  } catch {
    return false;
  }
}

function persistCurrentUser() {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
    return true;
  } catch {
    return false;
  }
}

function persistHospitalInventory() {
  const savedInventory = hospitalInventory.map(({ name, availableTypes }) => ({
    name,
    availableTypes,
  }));

  try {
    localStorage.setItem(HOSPITAL_STORAGE_KEY, JSON.stringify(savedInventory));
    return true;
  } catch {
    return false;
  }
}

function renderDonorTable() {
  donorTableBody.innerHTML = "";

  if (!donors.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  donors.forEach((donor) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(donor.name)}</td>
      <td><strong>${escapeHtml(donor.bloodType)}</strong></td>
      <td>${escapeHtml(donor.phone)}</td>
      <td>${escapeHtml(donor.city)}</td>
      <td>${escapeHtml(donor.address)}</td>
      <td>${buildDonorDeleteCell(donor)}</td>
    `;
    donorTableBody.appendChild(row);
  });
}

function renderHospitalTable() {
  hospitalTableBody.innerHTML = "";

  hospitalInventory.forEach((hospital) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(hospital.name)}</strong></td>
      <td>${escapeHtml(hospital.phone || "Call hospital")}</td>
      <td>${escapeHtml(hospital.address)}</td>
      <td>${buildBloodTypePills(hospital.availableTypes)}</td>
      <td>${buildRemoveButtons(hospital)}</td>
    `;
    hospitalTableBody.appendChild(row);
  });
}

function renderAvailability(bloodType) {
  if (!bloodType) {
    availabilityCard.className = "availability-card neutral";
    availabilityCard.innerHTML = `
      <p class="section-label">Status</p>
      <h3>Select a blood type to begin</h3>
      <p class="section-text">
        Choose one blood type and the app will check demo Belagavi hospital
        inventory plus the saved donor directory.
      </p>
    `;
    return;
  }

  const donorMatches = donors.filter((donor) => donor.bloodType === bloodType);
  const hospitalMatches = getHospitalMatches(bloodType);
  const isAvailable = hospitalMatches.length > 0 || donorMatches.length > 0;
  const nearestHospital = hospitalMatches[0] || null;

  availabilityCard.className = `availability-card ${isAvailable ? "available" : "unavailable"}`;
  availabilityCard.innerHTML = `
    <p class="section-label">Status</p>
    <h3>${isAvailable ? "Blood type available in Belagavi" : "Blood type not available"}</h3>
    <p class="section-text">
      ${isAvailable
        ? `${hospitalMatches.length} hospital${hospitalMatches.length === 1 ? "" : "s"} and ${donorMatches.length} saved donor${donorMatches.length === 1 ? "" : "s"} currently match ${escapeHtml(bloodType)}.`
        : `No demo hospital inventory or donor records are currently saved for ${escapeHtml(bloodType)}.`}
    </p>
    <p class="section-text inventory-note">
      Hospital blood availability is demo inventory. Call the hospital before acting on an emergency.
    </p>
    <div class="availability-meta">
      <span class="pill">Blood type: ${escapeHtml(bloodType)}</span>
      <span class="pill">Hospitals: ${hospitalMatches.length}</span>
      <span class="pill">Donors: ${donorMatches.length}</span>
      <span class="pill">${userLocation ? "GPS active" : "GPS not added"}</span>
    </div>
    ${nearestHospital && userLocation ? buildNearestHospitalCard(nearestHospital) : ""}
    ${hospitalMatches.length ? buildHospitalList(hospitalMatches) : buildNoHospitalMessage(bloodType)}
    ${donorMatches.length ? buildMatchList(donorMatches) : buildNoDonorMessage(bloodType)}
  `;
}

function buildMatchList(matches) {
  return `
    <div class="result-section">
      <h4>Saved matching donors</h4>
      <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Phone</th>
            <th>City</th>
            <th>Address</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          ${matches
            .map(
              (donor) => `
                <tr>
                  <td>${escapeHtml(donor.name)}</td>
                  <td><strong>${escapeHtml(donor.bloodType)}</strong></td>
                  <td>${escapeHtml(donor.phone)}</td>
                  <td>${escapeHtml(donor.city)}</td>
                  <td>${escapeHtml(donor.address)}</td>
                  <td>${buildDonorDeleteCell(donor)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
      </div>
    </div>
  `;
}

function buildHospitalList(hospitals) {
  return `
    <div class="result-section">
      <h4>Hospitals with this blood type</h4>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hospital</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Distance</th>
              <th>Directions</th>
            </tr>
          </thead>
          <tbody>
            ${hospitals.map(buildHospitalRow).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildHospitalRow(hospital) {
  return `
    <tr>
      <td><strong>${escapeHtml(hospital.name)}</strong></td>
      <td>${escapeHtml(hospital.phone || "Call hospital")}</td>
      <td>${escapeHtml(hospital.address)}</td>
      <td>${hospital.distanceKm !== null ? `${hospital.distanceKm.toFixed(1)} km` : "Use GPS"}</td>
      <td>
        <a class="table-link" href="${buildDirectionsUrl(hospital)}" target="_blank" rel="noopener">
          Get directions
        </a>
      </td>
    </tr>
  `;
}

function buildNearestHospitalCard(hospital) {
  return `
    <div class="nearest-card">
      <p class="section-label">Nearest matching hospital</p>
      <h4>${escapeHtml(hospital.name)}</h4>
      <p class="section-text">
        ${hospital.distanceKm.toFixed(1)} km away - ${escapeHtml(hospital.address)}
      </p>
      <a class="action-pill action-secondary" href="${buildDirectionsUrl(hospital)}" target="_blank" rel="noopener">
        Open directions
      </a>
    </div>
  `;
}

function buildNoHospitalMessage(bloodType) {
  return `
    <div class="empty-state result-empty">
      <h3>No hospital inventory match</h3>
      <p>No Belagavi hospital in the demo inventory currently lists ${escapeHtml(bloodType)}.</p>
    </div>
  `;
}

function buildNoDonorMessage(bloodType) {
  return `
    <div class="empty-state result-empty">
      <h3>No saved donor match</h3>
      <p>No donor records are currently saved in this browser for ${escapeHtml(bloodType)}.</p>
    </div>
  `;
}

function getHospitalMatches(bloodType) {
  return hospitalInventory.filter((hospital) => hospital.availableTypes.includes(bloodType))
    .map((hospital) => ({
      ...hospital,
      distanceKm: userLocation ? calculateDistanceKm(userLocation, hospital) : null,
    }))
    .sort((first, second) => {
      if (!userLocation) {
        return 0;
      }

      return first.distanceKm - second.distanceKm;
    });
}

function calculateDistanceKm(start, end) {
  const earthRadiusKm = 6371;
  const latDistance = toRadians(end.lat - start.lat);
  const lngDistance = toRadians(end.lng - start.lng);
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDistance / 2) * Math.sin(lngDistance / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function buildDirectionsUrl(hospital) {
  return `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`;
}

function updateHeroStats() {
  totalDonors.textContent = String(donors.length);
}

function showFormMessage(message, tone) {
  formMessage.textContent = message;
  formMessage.className = "form-message";

  if (tone) {
    formMessage.classList.add(tone);
  }
}

function showLocationMessage(message, tone) {
  locationMessage.textContent = message;
  locationMessage.className = "location-message";

  if (tone) {
    locationMessage.classList.add(tone);
  }
}

function showHospitalMessage(message, tone) {
  hospitalMessage.textContent = message;
  hospitalMessage.className = "form-message";

  if (tone) {
    hospitalMessage.classList.add(tone);
  }
}

function buildBloodTypePills(types) {
  if (!types.length) {
    return `<span class="pill">No blood added</span>`;
  }

  return types.map((type) => `<span class="pill blood-pill">${escapeHtml(type)}</span>`).join("");
}

function buildRemoveButtons(hospital) {
  if (!hospital.availableTypes.length) {
    return `<span class="section-text">No blood to remove</span>`;
  }

  return hospital.availableTypes
    .map(
      (type) => `
        <button
          class="remove-blood-button"
          type="button"
          data-hospital="${escapeHtml(hospital.name)}"
          data-blood-type="${escapeHtml(type)}"
          aria-label="Remove ${escapeHtml(type)} from ${escapeHtml(hospital.name)}"
        >
          ${escapeHtml(type)}
        </button>
      `,
    )
    .join("");
}

function buildDonorDeleteCell(donor) {
  if (canDeleteDonor(donor)) {
    return `
      <button
        class="delete-donor-button"
        type="button"
        data-delete-donor
        data-donor-id="${escapeHtml(donor.id)}"
        aria-label="Delete donor ${escapeHtml(donor.name)}"
      >
        Delete
      </button>
    `;
  }

  return `<span class="locked-delete">Only this donor can delete</span>`;
}

function canDeleteDonor(donor) {
  if (!currentUser?.phoneKey) {
    return false;
  }

  const ownerPhoneKey = getDonorOwnerPhoneKey(donor);
  return phoneKeysMatch(ownerPhoneKey, currentUser.phoneKey);
}

function getDonorOwnerPhoneKey(donor) {
  const savedOwnerPhoneKey = normalizePhone(donor?.ownerPhoneKey);

  if (savedOwnerPhoneKey) {
    return savedOwnerPhoneKey;
  }

  return normalizePhone(donor?.phone);
}

function deleteDonor(donorId) {
  const donor = donors.find((entry) => entry.id === donorId);

  if (!donor || !canDeleteDonor(donor)) {
    showFormMessage("You can only delete the donor record registered with your phone number.", "error");
    return;
  }

  if (!window.confirm("Delete this donor record?")) {
    return;
  }

  const previousDonors = [...donors];
  donors = donors.filter((entry) => entry.id !== donorId);

  if (!persistDonors()) {
    donors = previousDonors;
    showFormMessage("This browser could not delete the donor. Please try again.", "error");
    return;
  }

  renderDonorTable();
  updateHeroStats();
  showFormMessage(`Deleted ${donor.name}'s donor record.`, "success");

  if (lastSearchType) {
    renderAvailability(lastSearchType);
  }
}

function applyAuthState() {
  const isLoggedIn = Boolean(currentUser);
  loginPage.hidden = isLoggedIn;
  appBackdrop.hidden = !isLoggedIn;
  appShell.hidden = !isLoggedIn;
  document.body.classList.toggle("login-active", !isLoggedIn);

  if (currentUser) {
    signedInText.textContent = `${currentUser.username} - ${currentUser.phone}`;
  }
}

function showLoginMessage(message, tone) {
  loginMessage.textContent = message;
  loginMessage.className = "form-message";

  if (tone) {
    loginMessage.classList.add(tone);
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeBloodType(value) {
  return normalizeText(value).toUpperCase();
}

function normalizePhone(value) {
  return normalizeText(value).replace(/[^\d]/g, "");
}

function phoneKeysMatch(firstPhone, secondPhone) {
  if (!firstPhone || !secondPhone) {
    return false;
  }

  if (firstPhone === secondPhone) {
    return true;
  }

  const shortestLength = Math.min(firstPhone.length, secondPhone.length);
  return shortestLength >= 10 && (firstPhone.endsWith(secondPhone) || secondPhone.endsWith(firstPhone));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
