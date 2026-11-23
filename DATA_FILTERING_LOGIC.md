# HikePAD Data Filtering & Visibility Logic

This document outlines the source of truth for how data is aggregated and displayed across the HikePAD dashboard, specifically regarding Inactive users and Non-Current Team Members.

---

## 1. Inactive Users (Status: `inactive: true`)
A user is marked as inactive when they leave the organization or change roles.

### Aggregation (Calculations)
- **Branch Totals (KPIs):** Data from inactive members **MUST** be included in branch totals. Historical performance is part of the branch's record.
- **Team Totals:** Data from inactive members **MUST** be included in the team's total target, admissions, and closed points for the months they were part of that team.

### Visibility (Display)
- **Individual BDE Page:** Inactive members **SHOULD NOT** appear in the list of performers by default.
- **Leaderboards (EPI/Efficiency):** Inactive members **SHOULD NOT** appear in the rankings.
- **Admin View:** Admins can see inactive members only if the "Show Inactive" toggle is explicitly enabled.

---

## 2. Non-Current Team Members (Status: `isCurrentTeamMember: false` for a specific record)
This status is used when a BDE moves from one team to another. A record is "non-current" for a Team Leader if that BDE is no longer under them.

### Aggregation (Calculations)
- **Team Totals:** For the specific team and month where the record exists, the data **MUST** be included in the Team Leader's totals.
    - *Example:* If BDE 'A' was in 'Team X' in OCTOBER but moved to 'Team Y' in JANUARY, 'Team X''s OCTOBER total must still include BDE 'A's performance.

### Visibility (Display)
- **Team Leader View:** The Team Leader **SHOULD NOT** see the individual performance row for a non-current member in their team list.
    - *Example:* Marcos (TL) see the admissions/points in his team total for Zohra Baig (former member), but Zohra Baig does not appear as a line item in his "BDE Performance" table.
- **Individual BDE Page:** A performer only appears under their **Current Team**. Their history under old teams is preserved in the background for totals but hidden from the individual list of those old teams.

---

## 3. Implementation Checklist for Developers

| Feature | Includes Inactive? | Includes Non-Current? | Individual Visibility? |
| :--- | :---: | :---: | :--- |
| **KPI Total Cards** | Yes | Yes | N/A |
| **Team Performance Table** | Yes | Yes | N/A |
| **Individual BDE List** | No | No | Only Current Team |
| **Performance Leaderboards** | No | No | No |

> **Note:** The `isCurrentTeamMember` flag is critical for maintaining accurate historical team records while keeping the current management view focused on active members.
