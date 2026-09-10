# Changes

## Scan results
- Final behavioral + static result is persisted in `dbo.Scans`.
- Behavioral events are collected during emulation and bulk-saved to `dbo.ScanEvents` using the real `Scans.id`.
- Upload API now returns the final persisted scan instead of a preliminary result.
- Dashboard refreshes after `scan:complete` and shows the latest result and recent database scans.

## History
- Fixed the response-shape bug in `ScanService.getScans()` that prevented history from receiving an array of scans.
- Fixed the incorrect `useSocketStore` named import.
- Removed duplicated file-size rendering.
- Improved search/verdict/date input styling for light/dark themes.

## Admin panel
- `http://localhost:3000/admin` is now a standalone live admin panel.
- Added `/api/admin/status` with Node.js, memory, CPU/load, uptime, Socket.IO clients, and MSSQL status/statistics.
- Server HTTP requests/responses are forwarded to the in-memory admin log.
- Added admin log clearing.
- Added the Socket.IO browser client script to the standalone admin page.

## Run

Backend:
```bash
cd backend
npm install
npm start
```

Frontend development server:
```bash
cd frontend
npm install
npm run dev
```

Open the React application at `http://localhost:5173` and the admin monitor at `http://localhost:3000/admin`.

The database schema/procedures in `backend/database.sql` and `backend/database_procedures.sql` must already be applied to the configured MSSQL database.
