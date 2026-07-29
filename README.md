# Serenity Spa - Luxury Massage Technician Tracking System

A full-stack real-time technician tracking system for luxury massage spas.

## Features

### Public Website
- Beautiful luxury spa design with dark theme and gold accents
- View technicians working today
- Real-time status updates (Available, Busy, Resting, Off Duty)
- Timer countdown for busy technicians
- Photo and video gallery for each technician
- Fully responsive design

### Admin Dashboard
- Secure login authentication
- Dashboard with real-time statistics
- Technician management (Add, Edit, Delete)
- Toggle "Working Today" status
- Change technician status
- Media management (Upload photos/videos, delete, reorder)
- Timer controls (Start, Pause, Resume, Add time, Finish)
- Password management

### Real-Time Updates
- Socket.IO for instant updates
- All connected browsers update automatically
- No page refresh required

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Database:** MySQL, Prisma ORM
- **Real-Time:** Socket.IO
- **Authentication:** JWT (JSON Web Tokens)

## Prerequisites

- Node.js (v18+)
- MySQL (v8.0+)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
cd massage-tracker
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Set up MySQL

Install MySQL, start the server, then run the SQL file:

```bash
mysql -u root -p < prisma/init.sql
```

Or in MySQL CLI:

```sql
SOURCE prisma/init.sql;
```

Update `root:password` in `.env` to match your MySQL credentials.

### 4. Configure environment variables

Edit the `.env` file in the root directory:

```env
DATABASE_URL="mysql://root:password@localhost:3306/msgTrack"
JWT_SECRET="your-super-secret-jwt-key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
PORT=5000
CLIENT_URL="http://localhost:5173"
UPLOAD_DIR="uploads"
```

### 5. Start the app

From the root directory:

```bash
npm run dev
```

This will start both the backend (port 5000) and frontend (port 5173) servers.

### 6. Access the app

- **Public Website:** http://localhost:5173
- **Admin Dashboard:** http://localhost:5173/admin
- **Default Login:** admin / admin123

## Project Structure

```
massage-tracker/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React context providers
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utility functions
│   │   ├── pages/             # Page components
│   │   │   └── admin/         # Admin pages
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── ...
├── server/                    # Express backend
│   ├── src/
│   │   ├── lib/               # Utilities (prisma, socket, auth)
│   │   ├── middleware/         # Express middleware
│   │   ├── routes/            # API routes
│   │   ├── index.ts           # Entry point
│   │   └── seed.ts            # Admin seed
│   └── ...
├── prisma/                    # Prisma schema
├── uploads/                   # Uploaded files
│   ├── photos/
│   └── videos/
├── .env
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current admin
- `POST /api/auth/change-password` - Change password

### Technicians
- `GET /api/technicians` - Get all technicians
- `GET /api/technicians/working-today` - Get working technicians
- `GET /api/technicians/:id` - Get technician by ID
- `POST /api/technicians` - Create technician (auth)
- `PUT /api/technicians/:id` - Update technician (auth)
- `DELETE /api/technicians/:id` - Delete technician (auth)
- `PATCH /api/technicians/:id/status` - Update status (auth)
- `PATCH /api/technicians/:id/working-today` - Toggle working today (auth)

### Media
- `GET /api/media/:technicianId` - Get technician media
- `POST /api/media/:technicianId/photos` - Upload photos (auth)
- `POST /api/media/:technicianId/videos` - Upload videos (auth)
- `DELETE /api/media/:id` - Delete media (auth)
- `PATCH /api/media/order` - Reorder media (auth)

### Timer
- `GET /api/timer/:technicianId` - Get timer
- `POST /api/timer/:technicianId/start` - Start timer (auth)
- `POST /api/timer/:technicianId/pause` - Pause timer (auth)
- `POST /api/timer/:technicianId/resume` - Resume timer (auth)
- `POST /api/timer/:technicianId/add-time` - Add time (auth)
- `POST /api/timer/:technicianId/finish` - Finish service (auth)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard stats (auth)

## License

MIT
