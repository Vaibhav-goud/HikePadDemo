# Role-Based Access Control (RBAC) Documentation

This document outlines the access permissions for every role type and page within the HikePAD V2.0 application. Access is enforced through both route-level guards (`ProtectedRoute`) and UI-level navigation filtering (`Sidebar`).

## 1. User Role Definitions

The system categorizes users into several roles, which can be grouped into four main tiers:

| Tier | Role Full Name | Code Identifier / Label |
| :--- | :--- | :--- |
| **Administrative** | Super Admin | `Admin` |
| | Operations Leader | `Operations Leader` |
| | Vice President | `Vice President` |
| **Management** | Deputy Branch Manager | `Deputy Branch Manager` |
| | Team Leader | `Team Leader` |
| | Proposed Team Leader | `Proposed Team Leader (PTL)` |
| | Assistant Team Leader | `Assistant Team Leader (ATL)` |
| | Proposed Assistant Team Leader | `Proposed Assistant Team Leader (PATL)` |
| **Executory** | Business Development Executive | `Business Development Executive` |
| | Business Development Manager | `Business Development Manager (BDM)` |
| | Senior Business Development Manager | `Senior Business Development Manager (Sr. BDM)` |
| **Support / Special** | Human Resources | `HR` |
| | Operations Executive | `Operations Executive` |

---

## 2. Page Access Matrix

The following table defines which roles can access specific pages. 
- **A**: Authorized (explicitly allowed in code)
- **-**: No Access

| Page | Path | Admin | Ops Leader | VP | DBM | TL / PTL | ATL / PATL | BDE / BDM / Sr. BDM | HR / Ops Exec |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Login / Index** | `/` | A | A | A | A | A | A | A | A |
| **Main Dashboard** | `/dashboard` | A | A | A | A | A | A | A | - |
| **KRA Tracking** | `/kra` | A | A | A | A | A | A | A | - |
| **Revenue View** | `/revenue` | A | A | A | - | - | - | - | - |
| **Enrolled List** | `/enrolled` | A | - | A | - | - | - | - | - |
| **Analytics (Indiv. BDE)**| `/analytics` | A | A | A | A | A | A | - | - |
| **My Team Performance** | `/my-team` | - | - | - | - | - | - | A | - |
| **Team Flowchart** | `/teams` | A | - | - | - | - | - | - | - |
| **Performance Matrix** | `/performance` | A | A | A | - | - | - | - | - |
| **Kaante Ki Takkar** | `/march-madness` | A | A | A | A | A | A | A | A |
| **Hike Wrapped** | `/wrapped` | A | A | A | A | A | A | A | A |
| **Admin: Data Upload** | `/admin/upload` | A | - | - | - | - | - | - | - |
| **Admin: Manage Teams** | `/admin/teams` | A | - | - | - | - | - | - | - |
| **Admin: User Management**| `/admin/users` | A | - | - | - | - | - | - | - |
| **Admin: User Images** | `/admin/user-images`| A | - | - | - | - | - | - | - |

---

## 3. Role-Specific Permissions & Logic

### Super Admin (`Admin`)
- Full access to all system features.
- Exclusive access to management tools (Teams, Users, Designation, Image pipeline).
- Responsible for data uploads and system maintenance.

### Operations Leader
- Strategic view of Revenue and Performance.
- Can monitor Individual BDE analytics across branches.
- Focuses on operational efficiency without administrative management overhead.

### Vice President (`VP`)
- High-level access to Revenue, Enrollment, and Performance data.
- Can view individual analytics to monitor branch success.

### Management Roles (DBM, TL, ATL)
- Focused on team-level performance and individual monitoring.
- Access to high-level Dashboard and KRA tracking.
- Can drill down into individual BDE analytics via the Analytics page.

### Performer Roles (BDE, BDM, Sr. BDM)
- Specialized access to their own data via the Dashboard and KRA.
- **Exclusive Access** to the `My Team` page (Performance comparison within their specific unit).
- **Restricted** from seeing the detailed `Analytics` (Individual BDE) page to maintain peer privacy.

### Support Roles (HR, Operations Executive)
- Limited access to engagement-focused pages: `Kaante Ki Takkar` and `Hike Wrapped`.
- Restricted from all revenue, admissions, and management dashboard data.

---

## 4. Technical Enforcement

RBAC is enforced using a dual-layer approach:

1. **Route Protection**: The `ProtectedRoute` component in `App.tsx` wraps every sensitive route. It checks the user's `role` property against an `allowedRoles` array. If a user tries to access a path they aren't authorized for, they are automatically redirected.
   ```tsx
   // Example Route Protection
   <Route path="/revenue" element={
     <ProtectedRoute allowedRoles={['Admin', 'Vice President', 'Operations Leader']}>
       <Revenue />
     </ProtectedRoute>
   } />
   ```

2. **Navigation Filtering**: The `Sidebar.tsx` component dynamically generates the navigation menu. It uses conditional logic to only show links to pages that the current user is authorized to visit, providing a clean and relevant UI.
