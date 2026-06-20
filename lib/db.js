import { neon } from "@neondatabase/serverless";

let sqlClient = null;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

export async function initSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      blood_type TEXT NOT NULL,
      phone TEXT NOT NULL,
      phone_key TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      donation_date DATE NOT NULL,
      owner_name TEXT NOT NULL,
      owner_phone TEXT NOT NULL,
      owner_phone_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS hospital_inventory (
      hospital_name TEXT PRIMARY KEY,
      available_types TEXT[] NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS donors_blood_type_idx ON donors (blood_type)`;
  await sql`CREATE INDEX IF NOT EXISTS donors_phone_key_idx ON donors (phone_key)`;
}

export function mapDonorRow(row) {
  return {
    id: row.id,
    name: row.name,
    bloodType: row.blood_type,
    phone: row.phone,
    city: row.city,
    address: row.address,
    donationDate: row.donation_date instanceof Date ? row.donation_date.toISOString().slice(0, 10) : String(row.donation_date).slice(0, 10),
    createdAt: row.created_at,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    ownerPhoneKey: row.owner_phone_key,
  };
}
