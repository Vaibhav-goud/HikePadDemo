# HikePAD V2.0 - Comprehensive Project Context

This document serves as the single source of truth for the HikePAD V2.0 project, detailing its architecture, logic, and operational rules.

---

## 1. Project Mission & Overview
HikePAD V2.0 is a premium business intelligence dashboard designed for education consultancy operations. It provides real-time insights into sales performance, revenue tracking, and operational efficiency by aggregating data from legacy Firebase systems and modern MongoDB backends.

**Core Tech Stack:**
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion (Animations), Lucide React (Icons).
- **Backend:** Node.js, Express, MongoDB.
- **Data Source:** Firebase Realtime Database (Synchronized to MongoDB).
- **State/Data:** TanStack Query (React Query) for caching and fetching.

---

## 2. Role-Based Access Control (RBAC)

Access is strictly controlled at three levels: Route protection, Page internal logic, and Data visibility.

### 2.1 User Roles & Permissions
| Role | Access Level | Data Visibility |
| :--- | :--- | :--- |
| **Admin / Super Admin / Ops** | Full System Access | All records across all branches and teams. |
| **Vice President (VP)** | Strategic Access | All records; visibility similar to Admin. |
| **Deputy Branch Manager (DBM)** | Mid-Level Management | All records within their assigned `branch`. |
| **Team Leader (TL/PTL)** | Team Management | Their own records + all BDEs in their team + assigned ATLs. |
| **Assistant Team Leader (ATL)** | Sub-Team Management | Their own records + BDEs reporting to them. |
| **BDE / BDM / Sr. BDM** | Individual Contributor | Strictly limited to their own records. |

### 2.2 Special Restrictions
- **Performance Page:** Specifically restricted to the admin user "Vaibhav". Other admins are redirected to the dashboard.
- **My Report Toggle:** In several pages (Dashboard, Performance), managers can toggle "My Report" to switch between viewing their entire team's data and just their own personal performance records.

---

## 3. Page Components & Features

### 3.0 Core Layout Components
Every page is wrapped in a consistent layout system:
- **`DashboardLayout`:** The primary wrapper providing the responsive grid and background styling.
- **`Sidebar`:** Role-aware navigation drawer containing the logo, menu links, and user profile.
- **`Header`:** Page title, breadcrumbs, search functionality, and global performance notification badge.
- **`ProtectedRoute`:** Enforces authentication and role verification before rendering child components.

### 3.1 Dashboard (`Dashboard.tsx`)
- **KPI Cards:** Display Total Target, Total Admissions, Closed Points, and Achievement %.
- **Trend Indicators:** Shows percentage change vs. the previous month.
- **Charts:** Monthly performance trends (Bar/Line charts using Recharts).
- **Leaderboards:** Top achievers across the organization or specific branch.
- **Team Flowchart:** Visual representation of team hierarchy and performance.

### 3.2 Revenue Page (`Revenue.tsx`)
- **Advanced Filters:** Filter by Month, University, Branch, and Lead Status.
- **Growth Analysis:** Comparison of revenue metrics across different time periods.
- **Search & Drill-down:** Search for any BDE/TL to see their individual enrollment breakdown.

### 3.3 Performance Analytics (`Performance.tsx`)
- **Stability View:** Focuses on the **Elite Performer Index (EPI)**.
- **Efficiency View:** Analyzes the conversion ratio of Leads/Prospects to Admissions.
- **Source Conversion:** Detailed breakdown of which lead sources (e.g., Portal, Walk-in) perform best.

### 3.4 KRA Page (`KRAPage.tsx`)
- **Operational Metrics:** Tracks daily activities (Calls, Meetings, Walk-ins, Leads).
- **Daily Logs:** Detailed drill-down into daily performance for specific users.

---

## 4. Key Calculation Formulas

### 4.1 Achievement %
`Achievement % = (Closed Points / Total Target) * 100`

### 4.2 Elite Performer Index (EPI)
A weighted power score calculated to identify top-tier reliability:
- **Default Weights:**
    - 40% Success Rate (Closed / Total Attempts)
    - 30% Achievement (vs Target)
    - 20% Consistency (Inverse of Standard Deviation)
    - 10% Trend (Growth vs last 2 months)
- **Drive Mode Weights:** (Trend is ignored when a specific "Drive" is selected)
    - 45% Success Rate
    - 35% Achievement
    - 20% Consistency

### 4.3 Efficiency Ratio
`Efficiency % = (Admissions / Total Prospects) * 100`

---

## 5. Data Filtering & "Source of Truth" Logic

### 5.1 Inactive Users (`inactive: true`)
- **Aggregation:** Historically, their data **MUST** be included in branch and team totals.
- **Visibility:** They are hidden from active rankings and individual lists unless the "Show Inactive" toggle is enabled (Admin only).

### 5.2 Non-Current Team Members (`isCurrentTeamMember: false`)
Used when a BDE moves teams.
- **Team Totals:** Their performance stays with the team they were in during that specific month.
- **Individual List:** They do not appear in the current team's BDE list if they are no longer part of that team.

### 5.3 Excluded Individuals
Specific high-level users (e.g., Akash Dubey, Kiran Sindal) are excluded from individual performance rankings to avoid skewing the leaderboards.

---

## 6. Backend & Technical Infrastructure

### 6.1 API Strategy (`server.js`)
- **Authentication:** JWT-based secure authentication with support for both bcrypt hashing and AES encryption.
- **Data Ingestion Buffer:** Multer-based middleware handles high-volume Excel (`.xlsx`, `.xls`) and CSV uploads.
- **Global Normalization:** A specialized `/api/admin/normalize-name` endpoint allows administrators to globally rename performers or leaders across all MongoDB collections, ensuring historical data remains consistent after role changes or spelling corrections.

### 6.2 Data Lifecycle & Synchronization
1. **Source:** Data is entered into a legacy Firebase Realtime Database.
2. **ETL Process:** Synchronization scripts (`sync.js`, `sync_kra.js`) pull data from Firebase, transform it (normalizing names, mapping headers), and push it to MongoDB.
3. **Consumption:** The Node.js API serves this processed data to the Vite-powered frontend.

### 6.3 Automated Communication
- **Bulk Email Engine:** Integrated Gmail service for sending performance updates, password setup links, and system notifications. Includes HTML templates with dynamic branding.

---

## 7. Development & Maintenance
- **Performance Optimization:** Heavy use of `useMemo` on the frontend for complex aggregations (EPI, Efficiency) and React Query for intelligent data caching.
- **Scalability:** Architecture separates "Master Data" (Sales records) from "System Metadata" (Users, Teams, Permissions), allowing each to scale independently.
- **Environment Management:** Managed via `.env` (Backend) and Netlify environment variables (Frontend).

---
*Last Refined: February 2026*
