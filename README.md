# 🏛️ Dr. B. B. Hegde First Grade College, Kundapura
### A Unit of Coondapur Education Society (R)
## National Service Scheme (NSS Unit) — Official Live Leaderboard & Camp Portal

An institutional, real-time web portal designed for NSS camps, youth festivals, and squad championships. Featuring real-time leaderboard sync, a photo gallery for camp memories, a simplified standings table, light/dark themes, and an officer scoring admin console.

---

## 🌟 Key Highlights & Features

1. **Light & Dark Mode**:
   - **Default Clean Light Mode**: Clean white background (`#FFFFFF`), institutional royal navy typography, and gold accents.
   - **Dark Mode**: Deep navy/slate theme for low-light environments.
   - One-click toggle in the top header with automatic local storage memory.

2. **Simplified Leaderboard Table & Podium**:
   - **Hall of Fame Top 3 Podium**: Elevated podium cards for 1st (Gold with champion crown), 2nd (Silver), and 3rd (Bronze).
   - **Simple Standings Table**: Highly legible table displaying Squad Rank (#1, #2, #3 badges), Squad Name & Motto, Squad Captain, Volunteer count, Recent activity points, Total Points, and Point Audit history.
   - **Live Search**: Instant filter by squad name or captain.

3. **📸 Camp & Event Photos Section**:
   - Dedicated **Photos & Memories** tab with categorized gallery filter chips (*Shramadaan, Cultural Night, Camp Life, Community Service*).
   - **Add Photos**: Admins can upload photos directly from a computer/phone (with automatic compression) or paste image web URLs, complete with titles and event categories.
   - **Lightbox View**: Fullscreen image preview modal with photo caption and date.

4. **⚡ Real-Time Instant Multi-Screen Synchronization**:
   - Powered by `BroadcastChannel` and `LocalStorage`.
   - When points are awarded in the Admin portal on one screen/tab, **all open tabs, phones, and projector displays update immediately with zero reload**.
   - Confetti celebration and synthesized chime sounds when a new squad takes 1st place!

5. **🔐 Protected Admin Scoring Dashboard**:
   - **Security PIN**: Default passcode is `nss@2026` (configurable in settings).
   - **Fast Point Presets**: One-click `+10`, `+25`, `+50`, `+100`, `-10`, `-25` or custom points.
   - **Event Categorization**: Assign points to specific NSS activities (Shramadaan, Cultural Performance, Camp Craft, Daily Wall Journal, Quiz, Discipline).
   - **Team Management**: Add, edit, or delete competing squads.
   - **Photo Management**: Upload or remove camp gallery photos.
   - **Backup & Export**: One-click CSV spreadsheet export and complete JSON backup/restore.

6. **🖥️ Auditorium / Projector Fullscreen Mode**:
   - High-contrast edge-to-edge display optimized for auditorium stage screens during NSS Camps.

---

## 🚀 How to Run Locally

You can open the application in any modern web browser:

### Option 1: Direct File Open
Simply double-click `index.html` in your file explorer.

### Option 2: Local HTTP Server (Recommended)
Open PowerShell in this folder (`c:\Users\DELL\OneDrive\Desktop\NSS`) and run:
```powershell
python -m http.server 8080
```
Then visit in your browser:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 📋 Credentials & Defaults

- **Admin Passcode**: `nss@2026`
- **College Motto**: *"Truth & Honesty - Live to Learn"*
- **NSS Motto**: *"NOT ME BUT YOU"*
- **Logos**: Located in `assets/college-logo.png` and `assets/nss-logo.png`
