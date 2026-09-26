# MineOS Authentication and MongoDB Atlas Troubleshooting Guide

## Purpose

This guide explains the login and registration failures seen in the MineOS mobile application, how the application is connected, how the issue was diagnosed, how to configure MongoDB Atlas correctly, and how to verify the complete fix.

It applies to these endpoints:

- `POST /api/auth/login`
- `POST /api/auth/register`

## Symptom

The mobile application's API log showed requests reaching the backend successfully but receiving an HTTP 500 response:

```text
POST http://<computer-LAN-IP>:5000/api/auth/login     -> 500
POST http://<computer-LAN-IP>:5000/api/auth/register  -> 500
```

The important detail is that this is **not** a phone-to-server connectivity failure. A network failure would normally have no HTTP status response. A `500` response means:

1. The phone reached the Node/Express server.
2. Express received the request at the correct route.
3. A server-side operation failed while processing it.

## Confirmed Cause

The backend's MongoDB Atlas connection was rejected because the backend machine's public internet IP was not allowed in the Atlas project's **Network Access** list.

MongoDB Atlas receives connections from the computer running the backend, not from the mobile phone. The phone uses a private LAN address such as `10.x.x.x` only to reach the computer. Atlas sees the computer's public IP address assigned by the internet provider.

When Atlas cannot be reached, authentication cannot work because both login and registration read or write the `User` collection:

- Login looks up the user by email and verifies the bcrypt password hash.
- Registration checks for an existing email and creates a new user document.

## What Was Checked

The following parts of the application were verified during diagnosis:

| Area | Result | Meaning |
| --- | --- | --- |
| Mobile API base URL | Reachable | The app successfully contacted `http://<LAN-IP>:5000/api`. |
| Express auth routes | Reachable | Both `/api/auth/login` and `/api/auth/register` were reached. |
| JWT configuration | Valid | The configured secret and expiry value can create tokens. |
| Authentication request structure | Valid | The required `email`, `password`, `name`, and `role` fields are sent by the application. |
| MongoDB Atlas connection | Rejected | Atlas reported that no cluster server could be reached and pointed to its IP allowlist. |

Therefore changing the mobile application's LAN IP or Axios configuration alone will not solve this particular issue. Atlas access must be restored first.

## Authentication Flow

```text
Mobile app
  |
  | POST /api/auth/login or /api/auth/register
  v
Express backend on the development computer (port 5000)
  |
  | Mongoose query / write
  v
MongoDB Atlas User collection
  |
  | user record or newly created record
  v
JWT created by backend and returned to mobile app
```

If the Atlas step fails, no login token can be created and no account can be registered.

## Required Backend Environment Configuration

The backend environment file is `Backend/.env`. Keep it private; do not commit it to Git or paste its values into chats, screenshots, or documentation.

Use this structure, replacing placeholders with your own values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<database-user>:<database-password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://127.0.0.1:5173
```

The backend also supports `MONGODB_DIRECT_URI`. If it is present, it is preferred over `MONGODB_URI`. Use it only when a non-SRV connection string is intentionally required:

```env
MONGODB_DIRECT_URI=mongodb://<database-user>:<database-password>@<node-1>:27017,<node-2>:27017,<node-3>:27017/<database-name>?ssl=true&replicaSet=<replica-set>&authSource=admin
```

### Environment variable notes

- `PORT`: The Express port. The mobile app currently expects `5000`.
- `MONGODB_URI`: Atlas connection string. It must be for the correct Atlas cluster and database user.
- `MONGODB_DIRECT_URI`: Optional direct connection string. If set, it overrides `MONGODB_URI`.
- `JWT_SECRET`: Long, unique random value used to sign login tokens.
- `JWT_EXPIRES_IN`: Token lifetime, for example `1d` or `8h`.
- `CORS_ORIGIN`: Needed for browser clients. React Native traffic is not blocked by browser CORS, but keeping this value correct helps web development.

## Fix MongoDB Atlas Network Access

### Development setup

1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Open the Atlas project that contains the MineOS cluster.
3. Go to **Security** → **Network Access**.
4. Select **Add IP Address**.
5. Select **Add My Current IP Address**.
6. Save the entry and wait until Atlas reports that the change is active.
7. Restart the MineOS backend.

Do not add the mobile device's private address such as `10.106.x.x`. Atlas needs the public IP address of the computer that runs `Backend`.

### Temporary testing-only option

For a short-lived local demo, Atlas allows this entry:

```text
0.0.0.0/0
```

This permits access from any IP address. It is convenient for testing but unsafe for a deployed or long-running project. Remove it and replace it with specific trusted IP addresses after testing.

### If it still cannot connect

Check each of the following:

1. The current public IP was added to the same Atlas project as the configured cluster.
2. The internet connection did not change after the allowlist entry was added. Home and mobile networks can change public IPs.
3. The Atlas cluster is running and not paused.
4. The database username and password in the connection string are valid.
5. The database user has at least `readWrite` access to the MineOS database.
6. A corporate firewall, VPN, antivirus product, or school/office network is not blocking outbound MongoDB/TLS traffic.
7. If an SRV URI is used, DNS can resolve the cluster hostname. Use `MONGODB_DIRECT_URI` only when DNS/SRV resolution is the known problem.

## Start or Restart the Backend

Run these commands in a terminal from the repository root:

```cmd
cd Backend
npm run build
npm run dev
```

For the compiled production-style command instead:

```cmd
cd Backend
npm run build
npm start
```

Only one backend process should listen on port `5000`. If an older process is running, stop it with `Ctrl+C` in the terminal where it was started before launching a new one.

Successful startup should include messages similar to:

```text
MongoDB connected
MineOS backend listening on http://0.0.0.0:5000
```

If startup says `MongoDB connection unavailable`, resolve Atlas access before testing login or registration.

## Mobile Application Configuration

The API URL is resolved in `application/src/services/api.ts`.

For a physical phone on the same Wi-Fi network as the computer:

```env
EXPO_PUBLIC_API_URL=http://<computer-LAN-IP>:5000/api
```

Example only:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api
```

Important requirements:

- Phone and computer must be on the same LAN/Wi-Fi network.
- Use the computer's current IPv4 address from `ipconfig`, not `localhost`.
- Windows Firewall must permit inbound TCP connections to port `5000` for Node.js.
- Restart Expo after changing `application/.env` so `EXPO_PUBLIC_API_URL` is loaded again.

The LAN IP can change whenever the computer joins another network. Update `application/.env` or the fallback host in `application/src/services/api.ts` when that happens.

## Expected API Responses

After Atlas connectivity is restored, authentication responses should have these meanings:

| Status | Endpoint | Meaning |
| --- | --- | --- |
| `201 Created` | Register | Account created; response includes a JWT and user object. |
| `200 OK` | Login | Credentials valid; response includes a JWT and user object. |
| `400 Bad Request` | Register | Missing required fields or password shorter than 8 characters. |
| `401 Unauthorized` | Login | Invalid email or password. |
| `409 Conflict` | Register | The email is already registered. |
| `503 Service Unavailable` | Login/Register | Backend cannot currently access MongoDB. Check Atlas, connection string, and network access. |
| `500 Internal Server Error` | Any | Unexpected server issue. Check the backend terminal for the logged error. |

## Backend Error Handling Improvement

`Backend/src/middleware/errorHandler.ts` now recognizes MongoDB connection and server-selection failures. Instead of reporting such failures as a generic `500`, it returns:

```json
{
  "message": "Database unavailable",
  "error": "The API server is running, but it is not connected to MongoDB. Check the MongoDB connection settings and Atlas Network Access."
}
```

with status `503`.

This does not bypass Atlas security. It gives the mobile app and developers an accurate error, so database availability can be fixed directly.

## Verification Checklist

Complete this checklist after changing Atlas Network Access:

- [ ] Atlas Network Access includes the backend computer's current public IP.
- [ ] Atlas cluster status is running.
- [ ] `Backend/.env` contains a valid MongoDB URI and JWT secret.
- [ ] The backend was restarted from the `Backend` directory.
- [ ] Backend console shows `MongoDB connected`.
- [ ] `http://127.0.0.1:5000/api/health` responds with JSON containing `"status":"ok"`.
- [ ] The phone can open the backend through the configured LAN URL.
- [ ] A new account can be registered.
- [ ] The new account can log in.
- [ ] A duplicate registration returns `409`, not `500`.
- [ ] An incorrect password returns `401`, not `500`.

## API Test Commands

Run these from the repository root after the backend reports `MongoDB connected`.

### Health check

```cmd
curl http://127.0.0.1:5000/api/health
```

### Register a test user

Use a unique email every time, or expect `409 Conflict` for an existing account.

```cmd
curl -X POST http://127.0.0.1:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"test.user@example.com\",\"password\":\"Password@12345\",\"role\":\"worker\"}"
```

### Login

```cmd
curl -X POST http://127.0.0.1:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test.user@example.com\",\"password\":\"Password@12345\"}"
```

The successful response includes this shape:

```json
{
  "token": "<JWT>",
  "user": {
    "id": "<MongoDB ObjectId>",
    "name": "Test User",
    "email": "test.user@example.com",
    "role": "worker"
  }
}
```

## Security Actions Required

1. Rotate the MongoDB database password if it was ever printed, copied into logs, included in a screenshot, or shared outside the development team.
2. Generate a new `JWT_SECRET` if it was exposed.
3. Update `Backend/.env` with the new credentials.
4. Restart the backend after changing secrets.
5. Confirm `.env` is excluded by `.gitignore` and is not committed to Git.
6. Remove temporary `0.0.0.0/0` Atlas allowlist entries after development testing.
7. Use separate Atlas database users and secrets for development, staging, and production.

## Quick Resolution Summary

1. Add the backend computer's current public IP in MongoDB Atlas Network Access.
2. Confirm the Atlas cluster is running and the URI credentials are valid.
3. From `Backend`, run `npm run build` and `npm run dev`.
4. Wait for `MongoDB connected`.
5. Restart Expo if the mobile API URL was changed.
6. Register a new account, then log in.

Once the backend reaches Atlas, both registration and login can access the `User` collection and the `500` authentication errors will be resolved.
