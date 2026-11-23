# HikePAD System Architecture

## 📊 System Overview

HikePAD (Performance Analytics Dashboard) is a full-stack web application for tracking and analyzing sales performance metrics across multiple branches. The system consists of a React frontend, Express.js backend, real-time Firebase-MongoDB sync service, and integrates with external services for email notifications.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  👥 Users (BDEs, Team Leaders, Admins, Super Admins)              │  │
│  │  🌐 Web Browsers (Chrome, Firefox, Safari, Edge)                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND APPLICATION                            │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ⚛️  React + TypeScript + Vite                                    │ │
│  │  🎨 UI: shadcn/ui + Tailwind CSS + Framer Motion                  │ │
│  │  🔌 Port: 8080                                                     │ │
│  │                                                                    │ │
│  │  📄 Pages:                                                         │ │
│  │    • Dashboard (Role-based views)                                 │ │
│  │    • KRA Reports (Performance Analytics)                          │ │
│  │    • Team Management (Org Charts, Team Views)                     │ │
│  │    • Analytics (Charts & KPIs)                                    │ │
│  │    • Admin Upload (Excel/CSV Import)                              │ │
│  │    • Login & Auth                                                 │ │
│  │                                                                    │ │
│  │  🎯 Features:                                                      │ │
│  │    • Role-based Access Control (RBAC)                             │ │
│  │    • Real-time Data Visualization                                 │ │
│  │    • Responsive Design                                            │ │
│  │    • Interactive Charts (Chart.js)                                │ │
│  │    • Team Hierarchy Visualization                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API + JWT
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API SERVER                             │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  🚀 Express.js (Node.js)                                          │ │
│  │  🔌 Port: 3000                                                     │ │
│  │                                                                    │ │
│  │  🔐 Authentication & Authorization:                                │ │
│  │    • JWT-based authentication                                     │ │
│  │    • Password encryption (AES + bcrypt)                           │ │
│  │    • Role-based middleware                                        │ │
│  │                                                                    │ │
│  │  📋 Main API Endpoints:                                            │ │
│  │    POST   /api/login                - User authentication         │ │
│  │    GET    /api/sales-records        - Fetch sales data            │ │
│  │    POST   /api/sales-records        - Upload sales data           │ │
│  │    GET    /api/kra-reports          - KRA analytics               │ │
│  │    GET    /api/teams                - Team structure              │ │
│  │    POST   /api/admin/send-bulk-email- Bulk email notifications    │ │
│  │    POST   /api/admin/create-user    - User management             │ │
│  │    PUT    /api/admin/update-user    - User updates                │ │
│  │    DELETE /api/admin/delete-user    - User deletion               │ │
│  │                                                                    │ │
│  │  🔧 Core Features:                                                 │ │
│  │    • File Upload (Excel/CSV parsing with Multer + xlsx)           │ │
│  │    • Data Validation & Normalization                              │ │
│  │    • Email Notifications (Gmail API via Nodemailer)               │ │
│  │    • Password Setup & Management                                  │ │
│  │    • Data Aggregation & Analytics                                 │ │
│  │    • CORS & Security Middleware                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ MongoDB Driver
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FIREBASE-MONGODB SYNC SERVICE                        │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  🔄 Real-time Firebase → MongoDB Sync                             │ │
│  │  ⚡ Node.js Background Process                                     │ │
│  │                                                                    │ │
│  │  📡 Sync Configuration:                                            │ │
│  │    Path: /logs_HYD/daily_logs → Collection: KRA_Reports_HYD       │ │
│  │    Path: /logs_MUM/daily_logs → Collection: KRA_Reports_MUM       │ │
│  │                                                                    │ │
│  │  🔍 Features:                                                      │ │
│  │    • Real-time Firebase listener (on value change)                │ │
│  │    • Bulk upsert operations                                       │ │
│  │    • Name normalization (Title Case)                              │ │
│  │    • Branch-specific data tagging                                 │ │
│  │    • Automatic data transformation                                │ │
│  │    • Heartbeat monitoring (every hour)                            │ │
│  │    • Graceful shutdown handling                                   │ │
│  │                                                                    │ │
│  │  📊 Sync Statistics:                                               │ │
│  │    • Tracks: new records, updated records                         │ │
│  │    • Logs: timestamp, branch, operation counts                    │ │
│  │    • Error handling with detailed logging                         │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
              │                                          │
              │                                          │
              ▼                                          ▼
┌──────────────────────────────┐         ┌──────────────────────────────┐
│   FIREBASE REALTIME DB       │         │      MONGODB ATLAS           │
│                              │         │                              │
│  🔥 Google Cloud Platform    │◄───────►│  🍃 Cloud Database           │
│                              │         │                              │
│  📁 Database Structure:      │         │  📦 Database:                │
│    /logs_HYD/                │         │    hike_dashboard_db         │
│      /daily_logs/            │         │                              │
│        /2026-02-09/          │         │  📊 Collections:             │
│          /{uid}/             │         │    • sales_records           │
│            - name            │         │    • users                   │
│            - prospects       │         │    • KRA_Reports_HYD         │
│            - duration        │         │    • KRA_Reports_MUM         │
│            - calls           │         │    • drives                  │
│            - date            │         │    • system_settings         │
│                              │         │                              │
│    /logs_MUM/                │         │  🔐 Security:                │
│      /daily_logs/            │         │    • Encrypted connections   │
│        (same structure)      │         │    • Role-based access       │
│                              │         │    • Indexed queries         │
│  ⚡ Real-time Updates        │         │                              │
│  🔒 Firebase Auth            │         │  📈 Features:                │
│  🌍 Multi-region Support     │         │    • Aggregation pipelines   │
│                              │         │    • Full-text search        │
│                              │         │    • Change streams          │
└──────────────────────────────┘         └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                               │
│                                                                         │
│  📧 Gmail API (via Nodemailer)                                          │
│     • Bulk email notifications                                         │
│     • Password setup emails                                            │
│     • System update announcements                                      │
│     • Custom HTML email templates                                      │
│                                                                         │
│  📊 Google APIs                                                         │
│     • Gmail integration                                                │
│     • OAuth 2.0 authentication                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1️⃣ **User Authentication Flow**
```
User → Frontend Login Page
  ↓
Frontend sends POST /api/login {userId, password}
  ↓
Backend validates credentials against MongoDB users collection
  ↓
Backend generates JWT token
  ↓
Frontend stores token and redirects to Dashboard
  ↓
All subsequent requests include JWT in Authorization header
```

### 2️⃣ **Sales Data Upload Flow**
```
Admin uploads Excel/CSV file → Frontend
  ↓
Frontend sends file to POST /api/sales-records
  ↓
Backend parses file (xlsx/csv-parser)
  ↓
Backend validates & normalizes headers
  ↓
Backend transforms data to MongoDB format
  ↓
Backend performs bulk upsert to sales_records collection
  ↓
Backend sends success response
  ↓
Frontend refreshes dashboard data
```

### 3️⃣ **KRA Data Sync Flow (Real-time)**
```
User updates KRA data in external system/UI
  ↓
Data written to Firebase Realtime Database
  ↓
Firebase triggers 'value' event
  ↓
Sync Service detects change
  ↓
Sync Service reads all daily logs
  ↓
Sync Service normalizes names (Title Case)
  ↓
Sync Service performs bulk upsert to MongoDB
  ↓
MongoDB KRA_Reports collection updated
  ↓
Next API request from Frontend gets fresh data
```

### 4️⃣ **Dashboard Data Retrieval Flow**
```
User views Dashboard → Frontend
  ↓
Frontend sends GET /api/sales-records?branch=HYD
  ↓
Backend queries MongoDB with filters (branch, month, role)
  ↓
Backend aggregates data (totals, averages, rankings)
  ↓
Backend returns JSON response
  ↓
Frontend renders charts, tables, KPI cards
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI component library |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Build tool & dev server |
| **shadcn/ui** | Pre-built UI components |
| **Tailwind CSS** | Utility-first CSS framework |
| **Framer Motion** | Animation library |
| **Chart.js** | Data visualization |
| **React Router** | Client-side routing |
| **React Hook Form** | Form management |
| **Zod** | Schema validation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework |
| **MongoDB** | Primary database |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Multer** | File upload handling |
| **xlsx** | Excel file parsing |
| **csv-parser** | CSV file parsing |
| **Nodemailer** | Email sending |
| **CORS** | Cross-origin resource sharing |
| **dotenv** | Environment variables |

### Sync Service
| Technology | Purpose |
|------------|---------|
| **Firebase Admin SDK** | Firebase database access |
| **MongoDB Driver** | MongoDB connection |
| **Node.js** | Runtime environment |

---

## 🔐 Security Features

1. **Authentication**
   - JWT-based token authentication
   - Token expiry: 12 hours
   - Secure password storage (AES encryption + bcrypt fallback)

2. **Authorization**
   - Role-based access control (RBAC)
   - Middleware: `authenticateToken`, `requireAdmin`
   - Roles: Super Admin, Admin, Operations, Vice President, Team Leader, BDE

3. **Data Protection**
   - CORS configuration for allowed origins
   - Environment variable protection (.env files)
   - Input validation and sanitization
   - SQL injection prevention (using MongoDB drivers)

4. **Password Management**
   - Encrypted password storage
   - Password setup via email
   - Super Admin password visibility (encrypted)

---

## 📦 Database Schema

### MongoDB Collections

#### `sales_records`
```javascript
{
  _id: ObjectId,
  fy: String,              // Fiscal year
  month: String,           // JANUARY-DECEMBER
  branch: String,          // HYD/MUM
  dbm: String,             // Deputy Branch Manager
  teamLeader: String,      // Team Leader name
  bdeName: String,         // BDE name
  target: Number,
  admissions: Number,
  points: Number,
  closedAdm: Number,
  closedPoints: Number,
  cancellation: Number,
  incomplete: Number,
  targetPct: Number,
  current: Boolean,        // Is currently active
  createdAt: Date,
  updatedAt: Date
}
```

#### `users`
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,        // AES encrypted
  role: String,            // Super Admin, Admin, Team Leader, BDE, etc.
  branch: String,          // HYD/MUM
  inactive: Boolean,
  createdAt: Date
}
```

#### `KRA_Reports_HYD` / `KRA_Reports_MUM`
```javascript
{
  _id: ObjectId,
  report_id: String,       // Unique identifier
  name: String,            // Normalized to Title Case
  prospects: Number,
  duration: Number,
  calls: Number,
  date: String,            // YYYY-MM-DD
  branch: String,          // "Hyderabad Branch" / "Mumbai Branch"
  branchCode: String,      // "HYD" / "MUM"
  last_synced: Date
}
```

---

## 🚀 Deployment Architecture

### Local Development
- **Frontend**: `npm run dev` (Port 8080)
- **Backend**: `node backend/server.js` (Port 3000)
- **Sync Service**: `node firebase-mongo-sync/sync.js`

### Production (Render + Netlify)
```
Netlify (Frontend)
  ↓
https://hikepadv3.netlify.app
  ↓
Render (Backend API)
  ↓
MongoDB Atlas (Database)
  ↑
Firebase Realtime DB
```

### Process Management
- **PM2 Ecosystem**: Manages backend + sync service + frontend
- **Auto-restart**: Enabled for all services
- **Logging**: Centralized logs in `./logs/`

---

## 📊 Key Features by Role

### Super Admin
- Full system access
- User management (create, edit, delete)
- View all passwords (encrypted)
- Send bulk emails
- Upload sales data

### Admin / Operations / VP
- View all branch data
- Send bulk emails
- Upload sales data
- Manage teams

### Team Leader
- View team performance
- View direct reports
- Access team analytics

### BDE (Business Development Executive)
- View personal performance
- View team rankings
- Access personal KRA reports

---

## 🔧 Environment Configuration

### Backend `.env`
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://hikepadv3.netlify.app
GMAIL_USER=...
GMAIL_PASS=...
ENCRYPTION_KEY=...
```

### Sync Service `.env`
```
MONGO_URI=mongodb+srv://...
FIREBASE_DATABASE_URL=https://...firebaseio.com
```

---

## 📈 Performance Optimizations

1. **Database Indexing**
   - Indexed fields: `branch`, `month`, `bdeName`, `teamLeader`
   - Compound indexes for common queries

2. **Caching**
   - Frontend caching via React Query
   - Database connection pooling

3. **Lazy Loading**
   - Code splitting in Vite
   - Lazy component loading

4. **Batch Operations**
   - Bulk upserts for data import
   - Bulk email sending with chunking

---

## 🔍 Monitoring & Logging

1. **Application Logs**
   - Detailed request/response logging
   - Error tracking with stack traces
   - Authentication attempt logging

2. **Sync Service Logs**
   - Hourly heartbeat monitoring
   - Sync statistics (new/updated records)
   - Firebase event tracking

3. **Performance Metrics**
   - API response times
   - Database query performance
   - File upload processing times

---

## 🆘 Error Handling

1. **Frontend**
   - React Error Boundaries
   - Toast notifications for user feedback
   - Form validation errors

2. **Backend**
   - Try-catch blocks for all routes
   - Detailed error messages in development
   - Generic error messages in production
   - HTTP status codes (400, 401, 403, 500)

3. **Sync Service**
   - Graceful shutdown on SIGINT/SIGTERM
   - Retry logic for failed operations
   - Firebase subscription error handling

---

## 📝 Future Enhancements

- [ ] Implement Redis caching layer
- [ ] Add WebSocket support for real-time dashboard updates
- [ ] Implement audit logs for all admin actions
- [ ] Add data export functionality (PDF reports)
- [ ] Mobile app development
- [ ] Advanced analytics with ML predictions
- [ ] Multi-language support

---

**Last Updated**: February 9, 2026
**Maintained by**: HikeEducation Development Team
