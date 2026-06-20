import { getSql, initSchema, mapDonorRow } from "../lib/db.js";
import { handleApiError, methodNotAllowed, readBody, sendJson } from "../lib/api.js";
import {
  BLOOD_TYPES,
  addMonths,
  createId,
  normalizeBloodType,
  normalizeDateValue,
  normalizePhone,
  normalizeText,
  parseDateValue,
  phoneKeysMatch,
} from "../lib/shared.js";

export default async function handler(request, response) {
  try {
    await initSchema();

    if (request.method === "GET") {
      return listDonors(response);
    }

    if (request.method === "POST") {
      return createDonor(request, response);
    }

    if (request.method === "PUT") {
      return updateDonor(request, response);
    }

    if (request.method === "DELETE") {
      return deleteDonor(request, response);
    }

    return methodNotAllowed(response, ["GET", "POST", "PUT", "DELETE"]);
  } catch (error) {
    return handleApiError(response, error);
  }
}

async function listDonors(response) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM donors ORDER BY created_at DESC`;
  sendJson(response, 200, { donors: rows.map(mapDonorRow) });
}

async function createDonor(request, response) {
  const sql = getSql();
  const body = await readBody(request);
  const donor = normalizeDonorPayload(body);
  const user = normalizeUserPayload(body.user);
  const validationError = validateDonor(donor) || validateUser(user);

  if (validationError) {
    return sendJson(response, 400, { error: validationError });
  }

  const gapConflict = await getDonationGapConflict(donor.phoneKey, donor.donationDate);
  if (gapConflict) {
    return sendJson(response, 409, {
      error: `${donor.name} can donate again from ${formatDate(gapConflict.nextEligibleDate)}. Please keep a 3-month gap between donations.`,
    });
  }

  const [createdDonor] = await sql`
    INSERT INTO donors (
      id, name, blood_type, phone, phone_key, city, address, donation_date,
      owner_name, owner_phone, owner_phone_key
    )
    VALUES (
      ${createId()}, ${donor.name}, ${donor.bloodType}, ${donor.phone}, ${donor.phoneKey},
      ${donor.city}, ${donor.address}, ${donor.donationDate}, ${user.username}, ${user.phone}, ${user.phoneKey}
    )
    RETURNING *
  `;

  sendJson(response, 201, { donor: mapDonorRow(createdDonor) });
}

async function updateDonor(request, response) {
  const sql = getSql();
  const body = await readBody(request);
  const donorId = normalizeText(body.id);
  const donor = normalizeDonorPayload(body);
  const user = normalizeUserPayload(body.user);
  const validationError = !donorId ? "Missing donor id." : validateDonor(donor) || validateUser(user);

  if (validationError) {
    return sendJson(response, 400, { error: validationError });
  }

  const [existingDonor] = await sql`SELECT * FROM donors WHERE id = ${donorId} LIMIT 1`;
  if (!existingDonor) {
    return sendJson(response, 404, { error: "Donor record was not found." });
  }

  if (!phoneKeysMatch(existingDonor.owner_phone_key, user.phoneKey)) {
    return sendJson(response, 403, { error: "You can only edit the donor record registered with your phone number." });
  }

  const gapConflict = await getDonationGapConflict(donor.phoneKey, donor.donationDate, donorId);
  if (gapConflict) {
    return sendJson(response, 409, {
      error: `${donor.name} can donate again from ${formatDate(gapConflict.nextEligibleDate)}. Please keep a 3-month gap between donations.`,
    });
  }

  const [updatedDonor] = await sql`
    UPDATE donors
    SET
      name = ${donor.name},
      blood_type = ${donor.bloodType},
      phone = ${donor.phone},
      phone_key = ${donor.phoneKey},
      city = ${donor.city},
      address = ${donor.address},
      donation_date = ${donor.donationDate},
      updated_at = NOW()
    WHERE id = ${donorId}
    RETURNING *
  `;

  sendJson(response, 200, { donor: mapDonorRow(updatedDonor) });
}

async function deleteDonor(request, response) {
  const sql = getSql();
  const body = await readBody(request);
  const donorId = normalizeText(body.id);
  const user = normalizeUserPayload(body.user);
  const validationError = !donorId ? "Missing donor id." : validateUser(user);

  if (validationError) {
    return sendJson(response, 400, { error: validationError });
  }

  const [existingDonor] = await sql`SELECT * FROM donors WHERE id = ${donorId} LIMIT 1`;
  if (!existingDonor) {
    return sendJson(response, 404, { error: "Donor record was not found." });
  }

  if (!phoneKeysMatch(existingDonor.owner_phone_key, user.phoneKey)) {
    return sendJson(response, 403, { error: "You can only delete the donor record registered with your phone number." });
  }

  await sql`DELETE FROM donors WHERE id = ${donorId}`;
  sendJson(response, 200, { donor: mapDonorRow(existingDonor) });
}

async function getDonationGapConflict(phoneKey, donationDate, ignoredDonorId = "") {
  const sql = getSql();
  const rows = ignoredDonorId
    ? await sql`
        SELECT donation_date
        FROM donors
        WHERE phone_key = ${phoneKey} AND id <> ${ignoredDonorId}
        ORDER BY donation_date DESC
        LIMIT 1
      `
    : await sql`
        SELECT donation_date
        FROM donors
        WHERE phone_key = ${phoneKey}
        ORDER BY donation_date DESC
        LIMIT 1
      `;

  const latestDonation = parseDateValue(rows[0]?.donation_date);
  if (!latestDonation) {
    return null;
  }

  const submittedDate = parseDateValue(donationDate);
  const nextEligibleDate = addMonths(latestDonation, 3);
  return submittedDate.getTime() < nextEligibleDate.getTime() ? { latestDonation, nextEligibleDate } : null;
}

function normalizeDonorPayload(body) {
  const phone = normalizeText(body.phone);

  return {
    name: normalizeText(body.name),
    bloodType: normalizeBloodType(body.bloodType),
    phone,
    phoneKey: normalizePhone(phone),
    city: normalizeText(body.city),
    address: normalizeText(body.address),
    donationDate: normalizeDateValue(body.donationDate),
  };
}

function normalizeUserPayload(user) {
  const phone = normalizeText(user?.phone);

  return {
    username: normalizeText(user?.username),
    phone,
    phoneKey: normalizePhone(user?.phoneKey || phone),
  };
}

function validateDonor(donor) {
  if (!donor.name || !donor.bloodType || !donor.phone || !donor.city || !donor.address || !donor.donationDate) {
    return "Please complete all fields before saving a donor.";
  }

  if (!BLOOD_TYPES.includes(donor.bloodType)) {
    return "Please select a valid blood type.";
  }

  if (donor.phoneKey.length < 7) {
    return "Please enter a valid donor phone number.";
  }

  if (!parseDateValue(donor.donationDate)) {
    return "Please enter a valid donation date.";
  }

  return "";
}

function validateUser(user) {
  if (!user.username || user.phoneKey.length < 7) {
    return "Please sign in before changing donor records.";
  }

  return "";
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
