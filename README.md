# DIGITAL TIME CAPSULE

Monorepo for the **Digital Time Capsule** application.

## Structure

- `frontend/` – Next.js 14 (App Router) client
- `server/` – Express + MongoDB API

## Scripts

- `npm run install:all` – install dependencies in root, `server/`, and `frontend/`
- `npm run dev` – run backend on `localhost:5000` and frontend on `localhost:3000`
- `npm run start` – run both backend and frontend in production mode
- `npm run seed` – seed the database with initial data

## Running Locally

1. Install all dependencies:

   ```bash
   npm run install:all
   ```

2. Create environment files based on `server/.env.example` and (optionally) `frontend/.env.local`.

3. Seed the database (optional but recommended):

   ```bash
   npm run seed
   ```

4. Start development servers:

   ```bash
   npm run dev
   ```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

