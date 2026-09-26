# MINSOS web application

Day-1 frontend foundation for **MINSOS — Mining Intelligence & Smart Operations System**, an SIH 2026 concept for coal-mine governance and compliance monitoring.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the running backend API (for example, `http://127.0.0.1:5000/api`). Start the backend first, then create an account or sign in with an existing backend account. Passwords must contain at least eight characters; the backend assigns the account role.

```bash
npm run build
```

## Technology

React, TypeScript, Vite, Tailwind CSS, React Router and Axios. Authentication is connected to the backend through `src/services/auth.ts`; the JWT is attached to protected API requests. Current dashboard values are static demo data in `src/data/`, so they do not yet use live backend records.

See [mind.md](./mind.md) for the complete engineering record and phased plan.
