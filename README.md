# 🚀 LabShare - Enterprise LAN File Hub & Real-Time Workspace

LabShare is a high-speed, centralized Local Area Network (LAN) file-sharing hub and real-time collaboration dashboard. Designed specifically to bypass external internet bottlenecks in educational labs and corporate environments, LabShare allows users on the same Wi-Fi network to instantly share heavy assets (ISOs, datasets, software installers) at maximum router bandwidth.

![LabShare Interface](https://via.placeholder.com/1000x500.png?text=LabShare+Mission+Control+Dashboard) 

## ✨ Key Features

* **⚡ Gigabit LAN Streaming:** Bypasses standard internet upload limits. Shares massive files instantly over the local router using dynamic IP targeting.
* **🛡️ Point-of-Download Security:** Integrates the **VirusTotal API** via Node `crypto` hashing. Scans files for malware signatures *before* they are downloaded to a peer's machine. Features an advanced 2-step physical upload fallback for files up to 650MB.
* **💾 Smart Storage Deduplication:** Utilizes SHA-256 cryptographic hashing to ensure exact duplicate files are instantly rejected, preventing database bloat and saving hard drive space.
* **💬 Real-Time Lab Chat:** Built-in Socket.io WebSockets allow instant, LAN-wide communication and file requests without page refreshes.
* **🧠 Frictionless Identity:** Uses `localStorage` to assign and remember persistent peer identities (e.g., `Student_473`) without requiring a clunky login system.
* **🛑 "Nuke" Admin Protocol:** A secure, password-protected backend route that allows the server host to instantly wipe the MongoDB metadata, physically delete all hard-drive files, and blank out all connected peer screens via WebSockets.

## 🛠️ Tech Stack

* **Frontend:** React.js, Context/State Hooks, standard CSS3 (CSS Grid/Flexbox), Lucide-React Icons.
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB (Mongoose Schema).
* **File Handling:** Multer (DiskStorage streaming for zero RAM bottlenecking).
* **Real-Time / APIs:** Socket.io, Axios, VirusTotal API, Node Crypto.

---

## 🚦 Local Installation & Setup Guide

To run LabShare on your own machine and broadcast it to your local network, follow these exact steps.

### Prerequisites
1.  **Node.js** installed on your machine.
2.  **MongoDB Server** running locally in the background (Port `27017`).
3.  A free **VirusTotal API Key**.

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/LabShare-Network.git](https://github.com/Parth-Chavan-15/LabShare)
```

### 2. Setup the Backend Engine
Navigate to the backend folder and install the dependencies:
```bash
cd backend
npm install
```

#### Create your secret environment file:
Copy the .env.example file and rename the copy to .env.
Fill in your VirusTotal API key and set a custom Admin password.

<pre>
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/labshare_db
VT_API_KEY=your_actual_key_here
ADMIN_SECRET=my_custom_password
</pre>

Start the backend server:
```bash
npx nodemon server.js
```
If successful, you will see "Connected to MongoDB LabShare Vault."

### 3. Setup the Frontend Dashboard
Open a new terminal window, navigate to the frontend folder, and install the dependencies:

```bash
cd frontend
npm install
```

Start the React application:
```bash
npm start
```
The application will open on http://localhost:3000.

## 🌐 How to Share with the Lab (LAN Access)
Ensure the Node backend and React frontend are running on your Host Laptop.

Connect your Host Laptop and your Peers' devices (Phones, Laptops) to the exact same Wi-Fi router or Mobile Hotspot.

Open a terminal on your Host Laptop and find your IPv4 Address (e.g., ipconfig on Windows or ifconfig on Mac/Linux). Let's assume it is 192.168.1.55.

Tell your peers to open their browsers and type: http://192.168.1.55:3000.

They are now connected to your LabShare Hub!

## ⚠️ Admin Nuke Protocol
To instantly wipe the vault between demo sessions:

Open Postman or Thunder Client.

Send a DELETE request to http://localhost:5000/api/admin/clear-vault.

Set the Body to JSON: {"adminPassword": "your_password_here"}.