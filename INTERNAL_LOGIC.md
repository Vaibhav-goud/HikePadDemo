# HikePAD V2.0 - Internal Logic & RBAC Documentation

This document details the internal logic, state management, and role-based access control (RBAC) implementation for the HikePAD V2.0 platform.

---

## 1. Project Overview
HikePAD V2.0 is a business intelligence and performance tracking dashboard designed for education consultancy operations. It aggregates data from multiple sources (Firebase/MongoDB) to provide insights into sales performance, KRA (Key Result Areas) metrics, revenue tracking, and candidate enrollment.

---

## 2. Role-Based Access Control (RBAC)

The platform employs a robust RBAC system that operates at three levels: **Route Protection**, **Internal Page Logic**, and **Data Visibility**.

### 2.1 User Roles
- **Admin / Super Admin / Operations / Vice President**: High-level privileged roles with broad access to all operational data and administrative tools.
- **Deputy Branch Manager (DBM)**: Mid-level management restricted to data within their specific branch.
- **Team Leader (TL) / Proposed Team Leader (PTL)**: Managers responsible for specific teams and Assistant Team Leaders.
- **Assistant Team Leader (ATL) / Proposed Assistant Team Leader (PATL)**: Sub-managers reporting to TLs.
- **Business Development Executive (BDE) / BDM / Sr. BDM**: Front-line performers who can only view their own data.

### 2.2 Route Protection (`App.tsx`)
Routes are secured using a `ProtectedRoute` component. Most pages enforce an `allowedRoles` check:

| Page | Allowed Roles |
| :--- | :--- |
| **Dashboard** | All authenticated users |
| **KRA Page** | All authenticated users (data filtered internally) |
| **Revenue** | Admin, Vice President, Operations |
| **Enrolled** | Admin, Vice President |
| **Analytics** | Admin, Ops, VP, DBM, TL, ATL |
| **My Team** | BDE, BDM, Sr. BDM |
| **Performance** | Admin (Special restriction: Vaibhav only) |
| **Admin Tools** | Admin |

### 2.3 Data Visibility Logic
Data is dynamically filtered based on the logged-in user's role and identity.

- **Admin/VP/Ops**: The `filterRecordsByRole` function returns all records.
- **DBM**: Filters records to match the user's `branch`.
- **TL/PTL**: Implements complex hierarchical filtering. They see:
    - Their own records.
    - Records where the `teamName` matches "Team [TL Name]".
    - Records of BDEs assigned to Assistant Team Leaders (ATLs) under them.
- **ATL/PATL**: See their own records and records of BDEs where they are designated as the `atl` or `teamLeader` in the record metadata.
- **BDE**: Strictly filtered to records where `bdeName` matches their own name.

---

## 3. Core Page Logic & Features

### 3.1 Dashboard (`Dashboard.tsx`)
- **KPI Cards**: Displays "Total Target", "Total Admissions", "Closed Points", and "Achievement %".
- **Achievement %**: Weighted calculation often prioritizing current month's performance.
- **Charts**: Interactive line/bar charts showing monthly trends and branch-wise performance.
- **Team Table**: A leaderboard showing all performers. 
    - *Logic*: BDEs see a limited view focused on their own ranking, while managers see the full team/branch performance.
- **My Report Toggle**: Allows managers to switch between "Team View" and "Self View" (viewing only their own performance records).

### 3.2 Revenue Page (`Revenue.tsx`)
Comprehensive tracking of branch, team, and BDE enrollment revenue.
- **Filters**: Advanced filtering by Branch, Status, Date Range, **Month**, and **University**.
- **Search Bar**: A specialized search bar in the filter section allows searching for any BDE/TL by name. Selecting a name triggers a drill-down view showing all their associated enrollment records.
- **Drill-down Hierarchy**: Allows managers to navigate from Branch level -> Team level -> BDE level -> Individual Admission details.

### 3.3 KRA Page (`KRAPage.tsx`)
Track operational activities like Calls, Walk-ins, Leads, and Meetings.
- **Aggregation**: Data is aggregated by performer name from the `kraReports` collection.
- **Activity Metrics**: Calculates "Deducted Calls", "Follow-up Leads", "Fresh Leads", etc.
- **Drill-down**: Clicking a user opens a detailed view showing daily activity logs for the selected month/week.

### 3.3 Performance Analytics (`Performance.tsx`)
Provides deep insights into performer consistency and quality.
- **Elite Performer Index (EPI)**: A weighted formula:
    - 40% Achievement
    - 30% Success Rate
    - 20% Consistency
    - 10% Trend
- **View States**:
    - **Stability**: Focuses on EPI and overall reliability.
    - **Efficiency**: Analyzes input/output ratios (e.g. leads to admissions).
    - **Lead Conversion**: Visualizes the funnel from lead generation to enrollment. **Normalization**: Lead source entries are normalized (trimmed and lowercased) during sync and aggregation to ensure consistent grouping.
- **View All**: A "View All" button in the filter bar provides a complete list of performers with color-coded backgrounds based on performance thresholds:
    - **Green (>75%)**: High Performers / Elite Tier.
    - **Yellow (50-75%)**: Stable / Core Tier.
    - **Red (<50%)**: Needs Improvement / High Volatility.
- **Vaibhav's Detail View**: Specifically for the admin user "Vaibhav", clicking any name in the performance list opens a detailed modal showing the specific calculation factors (Achievement, Success Rate, Consistency, Trend) used to derive the final score.

### 3.5 Enrolled Candidates (`Enrolled.tsx`)
- **Hierarchy View**: For non-BDE users, lists students grouped by Team and BDE.
- **Status Tracking**: Shows "Approved", "Pending", or "Cancelled" statuses for each enrollment.
- **Source Analysis**: Breaks down admissions by source (e.g., Portal, Walk-in).

### 3.5 Administrative Tools
- **AdminTeams**: Handles leadership mapping (linking ATLs to TLs) and BDE reassignments.
- **AdminUpload**: Processes Excel/CSV uploads. Logic parses headers and maps them to standard fields (e.g., mapping "target" or "tgt" to `target`).
- **Sync Logic**: Scripts in `firebase-mongo-sync` ensure real-time data flow from the legacy Firebase system to the modern MongoDB backend.

### 3.6 Data Lifecycle & Synchronization
- **Legacy Source**: Data originates in a Firebase Realtime Database.
- **Modern Backend**: A Node.js backend with MongoDB serves as the primary data source for the V2.0 dashboard.
- **Sync Process**: 
    - Automated scripts (`sync.js`, `sync_kra.js`) reside in the `firebase-mongo-sync` directory.
    - These scripts perform ETL (Extract, Transform, Load) operations, mapping Firebase JSON structures to MongoDB schemas.
    - **Manual Sync**: Privileged users (Admin/Ops) can trigger a manual synchronization from the **Details Dashboard** to ensure the most recent enrollment data is reflected.

---

## 4. Key Technical Patterns

- **State Management**: Uses React `useState` for UI states and `@tanstack/react-query` for data fetching and caching.
- **Performance**: Heavy use of `useMemo` to prevent expensive re-calculations of filtered and aggregated data on every render.
- **UI/UX**: `framer-motion` for page transitions and interactive elements. `Lucide-react` for semantic iconography.
- **Utility Functions**: `dataProcess.ts` contains centralized logic for calculating BDE statistics, team data, and chart formatting.

---
*Last Updated: February 2026*
