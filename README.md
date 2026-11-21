<div align="center">

# 🚀 LabShare
### Enterprise LAN File Hub & Real-Time Workspace

[![Node.js Version](https://img.shields.io/badge/node-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-v19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express.js](https://img.shields.io/badge/express-v5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-v6%2B-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/socket.io-v4-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![VirusTotal API](https://img.shields.io/badge/security-VirusTotal_v3-3949AB?style=for-the-badge&logo=virustotal&logoColor=white)](https://www.virustotal.com/)

<p align="center">
  <b>A fast, local-network file sharing hub and real-time collaboration workspace designed for computer labs, classrooms, and hackathons.</b>
</p>

---

<img src="assets/labshare-dashboard.png" alt="LabShare Mission Control Interface" width="100%" style="border-radius: 10px; border: 1px solid #30363d; box-shadow: 0 16px 36px rgba(0,0,0,0.6);" />

</div>

<br>

## 📖 Overview

**LabShare** is a centralized Local Area Network (LAN) file-sharing hub and real-time collaboration dashboard. In university computer labs, college classrooms, and hackathons, dozens of students often need to download the exact same large files—such as virtual machine OS images (ISOs), machine learning datasets, software installers, or digital textbooks. When everyone downloads from the internet at the same time, external internet connections slow down to a crawl.

LabShare solves this problem by allowing one person to host the files locally. Connected peers on the same Wi-Fi router or mobile hotspot can upload and download heavy files directly between devices at the full speed of the local router. No external internet bandwidth is consumed for file transfers, and no account registration is required.

---

## ✨ Key Features

* **⚡ Fast Local Network Streaming:**
  Files are streamed directly to server disk storage using Multer without overloading system memory (RAM). Peers download files directly from the host at maximum local router speed.

* **🛡️ Pre-Download Security Check (VirusTotal Integration):**
  Peers can inspect files before saving them to their machines:
  * **Instant Hash Lookup:** First checks the file's SHA-256 fingerprint against the VirusTotal database.
  * **Automatic Upload Fallback:** If the file is unknown to VirusTotal, the backend automatically uploads it for scanning (supports files up to 650 MB). Files over 650 MB trigger an advisory notice.

* **💾 Smart Storage Deduplication:**
  Every uploaded file gets a cryptographic SHA-256 fingerprint. If an identical file already exists in the Global Vault, the server rejects the duplicate, deletes the newly uploaded copy from the disk, and notifies the user to prevent wasted storage.

* **💬 Live Lab Chat:**
  Built-in real-time messaging powered by Socket.io. Connected peers can request files, ask lab questions, and coordinate work across the room with instant message updates and automatic smooth scrolling.

* **🔍 Live Asset Search:**
  Easily find files in the vault using a real-time search bar that filters by file name instantly as you type.

* **🧠 Frictionless Identity:**
  Zero sign-up hassle. When a user opens LabShare, their browser assigns and remembers a persistent random peer identifier (e.g., `Student_473`) in `localStorage` across reloads without requiring usernames or passwords.

* **🛑 Host "Nuke" Admin Protocol:**
  A password-protected admin endpoint allows the host to completely wipe the vault between demo sessions or classes—deleting database records, clearing the physical storage folder, and immediately updating all connected peer screens via WebSockets.

---

## 🏗️ Interactive Flowcharts

<details>
<summary><b>🔍 1. How Devices Connect on the LAN (Click to expand)</b></summary>
<br>

```mermaid
flowchart TB
    subgraph LAN["🏠 Local Area Network (Wi-Fi Router or Mobile Hotspot)"]
        direction TB
        subgraph Host["💻 Host Machine (Running LabShare)"]
            React["⚛️ React Client (Port 3000)"]
            Node["🟢 Express + Socket.io Server (Port 5000)"]
            Mongo[("🍃 Local MongoDB (Port 27017)")]
            Disk[("📁 Local Storage (/uploads)")]
            
            React <-->|"Local Connection"| Node
            Node <-->|"Mongoose"| Mongo
            Node <-->|"Disk Storage"| Disk
        end

        subgraph Peers["👥 Connected Peer Devices (Laptops, Phones, Tablets)"]
            Peer1["📱 Student Mobile"]
            Peer2["💻 Student Laptop 1"]
            Peer3["💻 Student Laptop 2"]
        end

        Peers <-->|"LAN Connection (http://HOST_IP:3000)"| Host
    end

    subgraph External["☁️ External Web (Optional)"]
        VT["🛡️ VirusTotal API v3"]
    end

    Node <-->|"Security Checks"| VT
```

</details>

<details>
<summary><b>🔍 2. File Upload & Duplicate Detection (Click to expand)</b></summary>
<br>

```mermaid
flowchart TD
    Start(["📤 User Selects File & Adds Description"]) --> Upload["File is sent to /api/upload"]
    Upload --> Stream["Multer writes the file to the uploads folder"]
    Stream --> Hash["Node crypto computes the SHA-256 hash"]
    Hash --> CheckDB{"Does this file hash already exist in MongoDB?"}

    CheckDB -->|"Yes (Duplicate File)"| Delete["Delete the newly uploaded file from disk"]
    Delete --> AlertErr["Return Error 409: Duplicate file already exists"]
    AlertErr --> DoneErr(["❌ Upload rejected & storage saved"])

    CheckDB -->|"No (Unique File)"| Save["Save file record to MongoDB"]
    Save --> Broadcast["Socket.io sends 'new-file-added' to all peers"]
    Broadcast --> DoneSucc(["✅ New file card appears instantly on all peer screens"])
```

</details>

<details>
<summary><b>🔍 3. Pre-Download Security Scan (Click to expand)</b></summary>
<br>

```mermaid
flowchart TD
    Click(["📥 Peer clicks 'Pull' on a file card"]) --> Modal["Security Modal opens ('Scanning...')"]
    Modal --> ReqScan["Client calls GET /api/scan/:id"]
    ReqScan --> SizeCheck{"Is file size greater than 650 MB?"}
    
    SizeCheck -->|"Yes"| Oversized["Return status: 'oversized'<br>(Exceeds 650 MB limit, download with caution)"]
    
    SizeCheck -->|"No"| KeyCheck{"Is VirusTotal API Key present?"}
    KeyCheck -->|"No"| NoKey["Return status: 'error' (Missing API key)"]
    
    KeyCheck -->|"Yes"| QueryHash["Query VirusTotal with file SHA-256 hash"]
    QueryHash --> Result{"Did VirusTotal find this hash?"}
    
    Result -->|"Yes (Hash Known)"| CheckFlag{"Were any malicious flags found?"}
    CheckFlag -->|"Yes"| Bad["Status: 'malicious' (Flagged by security vendors)"]
    CheckFlag -->|"No"| Good["Status: 'safe' (Verified safe signature)"]
    
    Result -->|"No (Hash Unknown / 404)"| CheckUploadSize{"Is file size greater than 32 MB?"}
    CheckUploadSize -->|"32 MB to 650 MB"| GetURL["Request large-file upload URL from VirusTotal"]
    GetURL --> SendVT["Upload file stream to VirusTotal"]
    CheckUploadSize -->|"Up to 32 MB"| SendDirect["Upload file directly to VirusTotal"]
    SendDirect --> Pending["Status: 'pending' (Scan in progress)"]
    SendVT --> Pending
    
    Good --> ShowUI["Modal displays security badge and scan message"]
    Bad --> ShowUI
    Pending --> ShowUI
    Oversized --> ShowUI
    NoKey --> ShowUI
    
    ShowUI --> Choice{"User chooses to download?"}
    Choice -->|"Confirm"| StartDownload["Browser downloads file directly from host at LAN speed"]
    Choice -->|"Cancel"| CloseModal(["Dismiss Modal"])
```

</details>

<details>
<summary><b>🔍 4. Admin Vault Reset Protocol (Click to expand)</b></summary>
<br>

```mermaid
flowchart TD
    HostTrigger(["🚨 Host sends DELETE /api/admin/clear-vault"]) --> CheckPW{"Does adminPassword match ADMIN_SECRET?"}
    
    CheckPW -->|"Wrong Password"| Reject["Return HTTP 403 Forbidden"]
    
    CheckPW -->|"Correct Password"| ClearDB["Delete all file records from MongoDB"]
    ClearDB --> ClearDisk["Delete all uploaded files from the storage folder"]
    ClearDisk --> SocketBlank["Broadcast 'load-vault' with empty list to all screens"]
    SocketBlank --> SocketMsg["Broadcast system chat announcement: 'Vault has been cleared'"]
    SocketMsg --> Finished(["⚡ All connected screens reset to clean state"])
```

</details>

---

## 🛠️ Technology Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend UI** | **React.js 19** | Modern reactive component interface |
| **Styling** | **CSS3 Grid & Flexbox** | Clean dark theme with responsive mobile layout |
| **Icons** | **Lucide-React** | Intuitive visual icons for files, downloads, and status indicators |
| **Real-Time Engine** | **Socket.io (v4)** | Instant live updates for vault additions, chat, and resets |
| **Backend API** | **Node.js & Express.js (v5)** | High-performance server with local network binding |
| **Database** | **MongoDB & Mongoose (v9)** | Stores file details, uploader names, and unique file hashes |
| **File Handling** | **Multer (v2)** | Efficient disk storage streaming |
| **Security Scanning** | **VirusTotal API v3 & Node Crypto** | SHA-256 fingerprinting and pre-download malware scanning |

---

## 📁 Repository Structure

```plaintext
LabShare/
├── assets/
│   ├── dashboard.png                 # Live UI screenshot
│   └── labshare-dashboard.png        # High-resolution UI screenshot
├── backend/
│   ├── models/
│   │   └── File.js                   # MongoDB schema for file records
│   ├── uploads/                      # Storage folder for uploaded files (auto-created)
│   ├── .env.example                  # Environment configuration template
│   ├── .gitignore                    # Node modules & uploads ignore rules
│   ├── package.json                  # Backend dependencies and scripts
│   └── server.js                     # Express server, Socket.io events, and VirusTotal logic
├── frontend/
│   ├── public/
│   │   ├── index.html                # Main HTML template
│   │   └── manifest.json             # Web app metadata
│   ├── src/
│   │   ├── App.css                   # Complete dark-mode theme & mobile styles
│   │   ├── App.js                    # Core dashboard UI (vault, chat, modals, upload)
│   │   ├── index.css                 # Global typography and base styles
│   │   └── index.js                  # React application entry point
│   ├── package.json                  # Frontend dependencies and scripts
│   └── .gitignore                    # Frontend build ignores
└── README.md                         # Documentation
```

---

## 🚦 Local Installation & Setup Guide

Follow these simple steps to run LabShare on your machine.

### Prerequisites
1. **Node.js** installed on your computer.
2. **MongoDB** installed and running locally on port `27017`.
3. A free **VirusTotal API Key** (optional, but needed for security scans). You can get one for free at [virustotal.com](https://www.virustotal.com/).

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Parth-Chavan-15/LabShare.git
cd LabShare
```

---

### Step 2: Set Up the Backend

1. Navigate to the `backend` folder and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create your `.env` configuration file:
   ```bash
   # On Windows (PowerShell):
   Copy-Item .env.example .env

   # On macOS or Linux:
   cp .env.example .env
   ```

3. Open `.env` and verify your settings:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/labshare_db
   VT_API_KEY=your_virustotal_api_key_here
   ADMIN_SECRET=your_custom_admin_password
   ```

4. Start the backend server:
   ```bash
   npx nodemon server.js
   ```
   *(Or run `node server.js` directly)*

   When connected, you will see:
   ```plaintext
   🚀 LabShare Hub running on port 5000
   📦 Connected to MongoDB LabShare Vault
   ```

---

### Step 3: Set Up the Frontend

1. Open a second terminal window, navigate to the `frontend` folder, and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the React application:
   ```bash
   npm start
   ```

3. The dashboard will automatically open in your browser at `http://localhost:3000`.

---

## 🌐 How to Share with the Lab (LAN Access)

To let other devices on the same Wi-Fi network connect to your LabShare vault:

1. **Connect to the Same Network:** Ensure your host computer and your peers' devices (laptops, phones) are connected to the exact same Wi-Fi router or mobile hotspot.
2. **Find Your Local IPv4 Address:**
   * **Windows:** Open PowerShell and type `ipconfig`. Find the `IPv4 Address` under your active Wi-Fi connection (e.g., `192.168.1.55`).
   * **macOS:** Open Terminal and type `ipconfig getifaddr en0`.
   * **Linux:** Open Terminal and type `hostname -I` or `ip a`.
3. **Share the Link with Peers:**
   Tell peers on your network to open their browser and visit:
   ```text
   http://<YOUR_IP_ADDRESS>:3000
   ```
   *(For example: `http://192.168.1.55:3000`)*

> [!TIP]
> **Firewall Note (Windows):** If peers cannot connect or the page times out, check that Windows Defender Firewall allows incoming connections on ports `3000` and `5000`. You can grant access in PowerShell (Run as Administrator):
> ```powershell
> New-NetFirewallRule -DisplayName "LabShare Web" -Direction Inbound -LocalPort 3000,5000 -Protocol TCP -Action Allow
> ```

---

## 🛑 Admin "Nuke" Protocol (Resetting the Vault)

When you finish a lab class or demo session and want to clear out all files and chat messages:

### Using cURL:
```bash
curl -X DELETE http://localhost:5000/api/admin/clear-vault \
  -H "Content-Type: application/json" \
  -d '{"adminPassword": "your_custom_admin_password"}'
```

### Using Postman or Thunder Client:
* **Method:** `DELETE`
* **URL:** `http://localhost:5000/api/admin/clear-vault`
* **Header:** `Content-Type: application/json`
* **JSON Body:**
  ```json
  {
    "adminPassword": "your_custom_admin_password"
  }
  ```

---

## 💡 Frequently Asked Questions

<details>
<summary><b>Q: What happens if someone uploads the exact same file under a different name?</b></summary>
<br>
LabShare checks the file's binary contents using SHA-256 hashing rather than relying on the filename. If the contents match an existing file, the server recognizes it as a duplicate, deletes the duplicate file from the hard drive, and shows an alert.
</details>

<details>
<summary><b>Q: Do peers need an internet connection to use LabShare?</b></summary>
<br>
No. As long as all devices are connected to the same local Wi-Fi router or mobile hotspot, all file transfers and chat work completely offline without an active internet connection. An internet connection is only needed if you wish to run VirusTotal scans against external security servers.
</details>

<details>
<summary><b>Q: Why do peers get a connection timeout when trying to visit my IP?</b></summary>
<br>
This is almost always due to the host computer's firewall blocking incoming connections on ports 3000 or 5000, or the router having "Client Isolation" turned on. Opening the ports in the host firewall resolves this.
</details>

---

## 📄 License & Attribution

Distributed under the **ISC License**. Developed by [Parth Chavan](https://github.com/Parth-Chavan-15).

<div align="center">
  <sub>Engineered with ❤️ for seamless local network collaboration.</sub>
</div>
