import { getSql, hasDatabaseUrl, initSchema } from "../lib/db.js";
import { handleApiError, methodNotAllowed, readBody, sendJson } from "../lib/api.js";
import { readLocalStore, updateLocalStore } from "../lib/local-store.js";
import { BLOOD_TYPES, HOSPITALS, normalizeBloodType, normalizeText, sortBloodTypes } from "../lib/shared.js";

export default async function handler(request, response) {
  try {
    if (hasDatabaseUrl()) {
      await initSchema();
    }

    if (request.method === "GET") {
      return listHospitals(response);
    }

    if (request.method === "PATCH") {
      return updateHospitalInventory(request, response);
    }

    return methodNotAllowed(response, ["GET", "PATCH"]);
  } catch (error) {
    return handleApiError(response, error);
  }
}

async function listHospitals(response) {
  sendJson(response, 200, { hospitals: await getMergedHospitalInventory() });
}

async function updateHospitalInventory(request, response) {
  const body = await readBody(request);
  const hospitalName = normalizeText(body.hospitalName);
  const bloodType = normalizeBloodType(body.bloodType);
  const action = normalizeText(body.action).toLowerCase();
  const baseHospital = HOSPITALS.find((hospital) => hospital.name === hospitalName);

  if (!baseHospital) {
    return sendJson(response, 400, { error: "Please select a listed Belagavi hospital." });
  }

  if (!BLOOD_TYPES.includes(bloodType)) {
    return sendJson(response, 400, { error: "Please select a valid blood type." });
  }

  if (!["add", "remove"].includes(action)) {
    return sendJson(response, 400, { error: "Hospital action must be add or remove." });
  }

  if (!hasDatabaseUrl()) {
    const store = await readLocalStore();
    const savedHospital = store.hospitalInventory.find((entry) => entry.hospitalName === hospitalName);
    const currentTypes = Array.isArray(savedHospital?.availableTypes)
      ? savedHospital.availableTypes
      : baseHospital.availableTypes;
    const nextTypes = action === "add"
      ? sortBloodTypes([...currentTypes, bloodType])
      : sortBloodTypes(currentTypes.filter((type) => type !== bloodType));

    await updateLocalStore((currentStore) => ({
      ...currentStore,
      hospitalInventory: [
        ...currentStore.hospitalInventory.filter((entry) => entry.hospitalName !== hospitalName),
        { hospitalName, availableTypes: nextTypes, updatedAt: new Date().toISOString() },
      ],
    }));

    const hospitals = await getMergedHospitalInventory();
    const hospital = hospitals.find((entry) => entry.name === hospitalName);
    return sendJson(response, 200, { hospital, hospitals });
  }

  const sql = getSql();
  const [savedHospital] = await sql`
    SELECT available_types
    FROM hospital_inventory
    WHERE hospital_name = ${hospitalName}
    LIMIT 1
  `;
  const currentTypes = Array.isArray(savedHospital?.available_types)
    ? savedHospital.available_types
    : baseHospital.availableTypes;
  const nextTypes = action === "add"
    ? sortBloodTypes([...currentTypes, bloodType])
    : sortBloodTypes(currentTypes.filter((type) => type !== bloodType));

  const [updatedHospital] = await sql`
    INSERT INTO hospital_inventory (hospital_name, available_types, updated_at)
    VALUES (${hospitalName}, ${nextTypes}, NOW())
    ON CONFLICT (hospital_name)
    DO UPDATE SET available_types = EXCLUDED.available_types, updated_at = NOW()
    RETURNING hospital_name, available_types
  `;

  const hospitals = await getMergedHospitalInventory();
  const hospital = hospitals.find((entry) => entry.name === updatedHospital.hospital_name);
  sendJson(response, 200, { hospital, hospitals });
}

async function getMergedHospitalInventory() {
  if (!hasDatabaseUrl()) {
    const store = await readLocalStore();

    return HOSPITALS.map((hospital) => {
      const savedHospital = store.hospitalInventory.find((entry) => entry.hospitalName === hospital.name);
      const availableTypes = Array.isArray(savedHospital?.availableTypes)
        ? sortBloodTypes(savedHospital.availableTypes)
        : [...hospital.availableTypes];

      return {
        ...hospital,
        availableTypes,
      };
    });
  }

  const sql = getSql();
  const savedInventory = await sql`SELECT hospital_name, available_types FROM hospital_inventory`;

  return HOSPITALS.map((hospital) => {
    const savedHospital = savedInventory.find((entry) => entry.hospital_name === hospital.name);
    const availableTypes = Array.isArray(savedHospital?.available_types)
      ? sortBloodTypes(savedHospital.available_types)
      : [...hospital.availableTypes];

    return {
      ...hospital,
      availableTypes,
    };
  });
}
