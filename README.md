# 🩸 HemoVisit — Mobile Blood Testing Platform

A full-stack web platform connecting patients with phlebotomists for at-home blood sample collection.

## Project Structure

```
hemovisit/
├── backend/          Node.js + Express + MongoDB API
│   ├── config/       DB connection
│   ├── controllers/  Route handlers
│   ├── middleware/   Auth + error handling
│   ├── models/       Mongoose schemas
│   ├── routes/       Express routers
│   ├── utils/        PDF generator, notify, seed
│   ├── uploads/      Saved report PDFs
│   ├── server.js     Entry point
│   └── .env          Environment variables (copy from .env.example)
│
└── frontend/         React + Vite + Tailwind CSS
    ├── src/
    │   ├── context/  AuthContext
    │   ├── hooks/    useSocket (real-time)
    │   ├── pages/    User / Phlebotomist / Admin dashboards
    │   ├── components/
    │   └── utils/    Axios API instance
    ├── index.html
    └── vite.config.js
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env      # fill in your MongoDB URI, JWT secret, Twilio, etc.
npm install
npm run dev               # starts on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # starts on http://localhost:5173
```

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React 18, Vite, Tailwind CSS v3     |
| Backend      | Node.js, Express                    |
| Database     | MongoDB Atlas (Mongoose)            |
| Auth         | JWT + bcryptjs                      |
| Real-time    | Socket.io                           |
| SMS          | Twilio                              |
| Email        | Nodemailer (Gmail SMTP)             |
| PDF Reports  | PDFKit + bwip-js + qrcode           |
| File Uploads | Multer                              |

## Roles
- **User** — Book tests, view history, download PDF reports
- **Phlebotomist** — Accept jobs, update sample status, toggle availability  
- **Admin** — Assign phlebotomists, manage catalog, view analytics

## Barcode / QR Scan
Every completed report includes a CODE-128 barcode and QR code.  
Lab staff scan to instantly retrieve patient + booking details via:
```
GET /api/bookings/verify/:bookingId
```
