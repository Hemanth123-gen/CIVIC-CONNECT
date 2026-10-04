# 🏛️ Civic-Connect / CivicPulse (जनसमाधान)
### Smart Civic Issue Resolution & Automated Priority Engine
> **SET-2 : FOR E2 STUDENTS · PROBLEM STATEMENT 01: CIVIC ISSUES RESOLUTION**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite%203-blue.svg)](https://www.sqlite.org/)
[![Backend: Express](https://img.shields.io/badge/Backend-Express.js-lightgrey.svg)](https://expressjs.com/)
[![UI: EduResolve Design](https://img.shields.io/badge/UI-EduResolve%20Theme-064e3b.svg)]()

---

## 📌 Context & Problem Statement

In villages, panchayats, peri-urban towns, and municipal wards, citizens face everyday civic infrastructure breakdowns: damaged roads, cratered culverts, contaminated drinking water, ruptured pipelines, dangling high-voltage electric wires, and overflowing drains.

### The Fundamental Bottlenecks in Existing Grievance Portals:
1. **The Duplicate Tsunami:** When a main road pipe bursts, 40 citizens file 40 separate complaints. Authorities are flooded with redundant tickets and cannot pinpoint the root crisis.
2. **Subjective Urgency Inflation:** Every citizen marks their own issue as `HIGH` or `CRITICAL`, making self-declared priority operationally useless.
3. **Spam & Fake Reports:** Stock photos from the internet, vague descriptions (*"road bad"*), or frivolous disputes clog the grievance pipeline.
4. **The "Closed on Paper" Scam:** Field contractors mark tickets as "Resolved" without visiting the ground, destroying citizen trust.
5. **Digital Exclusion of Rural Citizens:** Complex forms requiring English typing, desktop navigation, or high-bandwidth uploads isolate rural farmers and elders.

---

## 💡 Our Solution & Core Innovations

**Civic-Connect (CivicPulse)** is a next-generation civic redressal platform built to organize, prioritize, and resolve everyday civic issues transparently.

```
                              CIVIC-CONNECT PLATFORM FLOW
                                           │
        ┌──────────────────────────────────┴──────────────────────────────────┐
        ▼                                                                     ▼
[CITIZEN REPORTING FLOW]                                            [COMMUNITY FEED & MAP]
  - 3-Tap Visual Submission                                           - Live Interactive Heatmap
  - Multilingual Voice Note (Hindi/Telugu/Eng)                        - "I Face This Too" Vouching
  - Auto GPS Lock & Geofence Verification                             - Proximity Duplicate Alert
        │                                                                     │
        └──────────────────────────────────┬──────────────────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │     AI & TRUST ENGINE VERIFICATION     │
                       │  - GPS Geofence & EXIF Validation      │
                       │  - Cluster within 60m (Auto-Merge)     │
                       │  - Citizen TrustScore™ Verification    │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │     CIPI™ DYNAMIC PRIORITY ENGINE      │
                       │  Safety (35%) + Density (20%) +        │
                       │  Vulnerability (20%) + Vouch (15%) +   │
                       │  SLA Age Escalation (10%)              │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │       AUTHORITY COMMAND CENTER         │
                       │  - Ranked Triage Matrix (0-100 Score)  │
                       │  - Department Auto-Routing (PWD/Water) │
                       │  - Crew Dispatch & Navigation          │
                       │  - SLA Breach Countdown Clock          │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │      TWO-WAY PROOF-OF-RESOLUTION       │
                       │  - Officer uploads geo-tagged "After"  │
                       │  - Interactive Before/After comparison │
                       │  - 48h Citizen Quorum Sign-off         │
                       └────────────────────────────────────────┘
```

### 1. Dynamic Civic Impact Priority Index (CIPI™ Engine)
Rather than relying on citizen self-declared priority, the platform uses an objective mathematical formula (0–100 points):

$$\mathbf{CIPI} = (S \times 0.35) + (D \times 0.20) + (V \times 0.20) + (C \times 0.15) + (T \times 0.10)$$

* **$S$ (Base Hazard Severity, 0–100):** AI-classified safety risk (e.g., Dangling live electric wire = `98`, Ruptured drinking water main = `88`, Road cave-in = `85`).
* **$D$ (Population & Traffic Density, 0–100):** Arterial highway / weekly bazaar = `90`, quiet residential lane = `60`.
* **$V$ (Vulnerability Proximity Multiplier, 0–100):** Proximity (<200m) to Hospitals, Primary Health Centers, Anganwadis, or Schools adds $+25\text{ to }+35$ points.
* **$C$ (Community Corroboration, 0–100):** Logarithmic scale based on how many verified neighbors clicked *"I Face This Too"*.
* **$T$ (SLA Time-Decay Escalator, 0–100):** Automatically escalates priority every hour an issue remains unaddressed past statutory deadlines.

### 2. Proximity Duplicate Detection (< 60m Clustering)
* If another issue in the same category exists within 60 meters, the citizen is alerted:  
  *"An active issue was reported 24m away. Click 'Vouch for Existing Issue Instead' to boost priority without creating duplicate tickets."*

### 3. Multilingual Voice-Assisted Reporting
* Vernacular audio input in **Hindi, Telugu, Tamil, Marathi, Kannada, or English** via the native **Web Speech Recognition API**.
* Automatically detects keywords (*"paani"*, *"water pipe"*, *"sadak"*, *"wire"*, *"bijli"*) to categorize issues with zero typing required.

### 4. Authority Command Center & Triage Matrix
* Real-time triage table automatically sorted descending by **CIPI score**.
* One-click crew dispatch (assign Junior Engineer, PWD Inspector, or Lineman Unit).
* Visual countdown timers showing statutory SLA deadlines before escalation.

### 5. Two-Way Proof of Resolution (Citizen Sign-off Quorum)
* Field workers must upload a geo-tagged **"After" completion photo**.
* The ticket enters **"Awaiting Citizen Quorum"** with an interactive **Before & After Visual Inspector**.
* Citizens vote:
  * `✅ Yes, Confirmed Fixed on Ground` $\to$ officially closes the ticket.
  * `❌ Dispute: Still Broken / Incomplete` $\to$ re-opens and escalates the ticket.

### 6. Interactive GIS Leaflet Radar Map
* OpenStreetMap integration with custom color-coded pins:
  * 🔴 **Red:** CIPI $\ge 75$ (Critical Life/Safety Hazard)
  * 🟠 **Amber:** CIPI $50\text{--}74$ (Moderate / Urgent)
  * 🟢 **Green:** Verified Resolved

### 7. Public Transparency Leaderboard
* Real-time rankings of Wards and Gram Panchayats by infrastructure health, resolution speed, and cleanliness percentage.

---

## 🎨 Design System (EduResolve Theme)

Built directly with the **EduResolve design philosophy**:
* **Top Header:** Deep emerald logo emblem (`🏛️`), CivicPulse brand title, integrated live search bar, real-time sync pulse (`● SQLite Live`), and instant **Role Switcher** (`👤 Citizen`, `🛡️ Municipal Engineer`, `🏛️ Sarpanch`).
* **Pill-Based Tab Bar:** Seamless navigation across **Citizen Feed**, **Authority Command Center**, **Live GIS Radar Map**, **My Grievances & Vouched**, and **Public Transparency Scorecard**.
* **Elevated KPI Cards:** High-contrast stat cards with colored borders (Red, Amber, Green, Blue) displaying Critical Emergencies, Active Clustered Incidents, Community Vouches, and SLA Quorum Rates.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Semantic HTML5, Modular JavaScript (ES6+), Vanilla CSS Design System (EduResolve theme) |
| **GIS Mapping** | Leaflet.js + OpenStreetMap (no external API key required) |
| **Speech & Audio** | Native HTML5 Web Speech Recognition API |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite 3 (Persistent local storage, auto-seeding & migrations) |
| **Deployment / Tunnel** | Cloudflare Tunnel (`cloudflared`) |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/nehagen/Civic-Connect.git
cd Civic-Connect
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the application
```bash
# Start backend server
node server.js

# Or start with live Cloudflare public tunnel:
start_server.bat
```

Open your browser at **`http://localhost:5050`**.

---

## 👥 Personas for Testing

| Persona | Switch via Header Dropdown | Key Actions Available |
|---|---|---|
| **Ramesh Kumar (Citizen)** | `👤 Ramesh Kumar (Citizen)` | File 30-sec report, voice input, auto GPS, vouch for issues, verify Before/After photos |
| **Er. Rajesh Sharma (Engineer)** | `🛡️ Er. Rajesh Sharma (Municipal Engineer)` | View CIPI triage matrix, dispatch field crews, update status, upload "After" completion photos |
| **Smt. Kavitha (Sarpanch)** | `🏛️ Smt. Kavitha (Village Sarpanch)` | Oversee ward health, monitor SLA breaches, view Transparency Scorecard |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
