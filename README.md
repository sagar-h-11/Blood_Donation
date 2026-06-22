# PulseLink Blood Donation Website

PulseLink is a blood donation directory for saving donor records, checking blood type availability, and maintaining demo hospital inventory for Belagavi.

## Features

- Name and phone login for lightweight donor ownership.
- Donor records stored in a Neon Postgres database through Vercel Functions.
- Server-side validation for required fields, blood groups, phone ownership, and the 3-month donation gap.
- Blood availability search across saved donors and hospital inventory.
- Hospital inventory updates that persist after refresh.
- GPS-assisted nearest hospital sorting in the browser.

## Tech Stack

- HTML
- CSS
- JavaScript
- Vercel Functions
- Neon Postgres through `@neondatabase/serverless`

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Neon Postgres database from the Vercel Marketplace or Neon dashboard for production-style persistence.

3. Add the database connection string to `.env.local`:

   ```bash
   DATABASE_URL="your-neon-connection-string"
   ```

4. Create the database tables:

   ```bash
   npm run init-db
   ```

5. Run the Vercel local dev server:

   ```bash
   npm run dev
   ```

6. Open the local URL printed by Vercel, usually `http://localhost:3000`.

If `DATABASE_URL` is not set during local development, the API automatically saves donor and hospital changes to `.data/pulselink.json`. This keeps the app usable locally, but deployed production should still use Neon/Postgres through `DATABASE_URL`.

## Deployment

Connect Neon through the Vercel Marketplace so `DATABASE_URL` is available to the project. After deployment, run the database initialization once with the same connection string, then visit the live site and test donor save/search/edit/delete plus hospital inventory updates.

## Repository

https://github.com/sagar-h-11/Blood_Donation

## Author

Sagar Hukkeri
