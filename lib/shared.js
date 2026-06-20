export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const HOSPITALS = [
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

export function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeBloodType(value) {
  return normalizeText(value).toUpperCase();
}

export function normalizePhone(value) {
  return normalizeText(value).replace(/[^\d]/g, "");
}

export function phoneKeysMatch(firstPhone, secondPhone) {
  if (!firstPhone || !secondPhone) {
    return false;
  }

  if (firstPhone === secondPhone) {
    return true;
  }

  const shortestLength = Math.min(firstPhone.length, secondPhone.length);
  return shortestLength >= 10 && (firstPhone.endsWith(secondPhone) || secondPhone.endsWith(firstPhone));
}

export function normalizeDateValue(value) {
  const text = normalizeText(value);

  if (!text) {
    return "";
  }

  const date = parseDateValue(text);
  return date ? getDateInputValue(date) : "";
}

export function parseDateValue(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const dateOnly = text.includes("T") ? text.split("T")[0] : text;
  const date = new Date(`${dateOnly}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function getDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

export function sortBloodTypes(types) {
  return [...new Set(types.filter((type) => BLOOD_TYPES.includes(type)))].sort(
    (first, second) => BLOOD_TYPES.indexOf(first) - BLOOD_TYPES.indexOf(second),
  );
}

export function createId() {
  return globalThis.crypto.randomUUID();
}
