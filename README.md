# 🔫 GunHand - Gesture-Controlled Duck Hunt

GunHand is an interactive, browser-based reimagining of the classic Nintendo game **Duck Hunt**. Instead of using a mouse or a light gun, players control the game entirely through computer vision and hand gestures using their webcam!

## 🎮 How to Play
- **Aim**: Hold your hand up to the webcam with an open palm. The crosshair will track your hand movements.
- **Shoot**: Make a "Closed Fist" gesture to fire the gun at the ducks before they fly away!

## 🏗️ Architecture
This project uses a split modern web architecture:

- **Frontend (`/client`)**: Built with **Vue 3** and **Vite**. It handles the webcam feed, integrates **Google MediaPipe Vision Tasks** for real-time hand-tracking, and intelligently dispatches synthetic mouse events into the game iframe.
- **Backend (`/server`)**: A lightweight **Node.js** and **Express.js** server. It serves the DuckHunt game assets and provides a REST API for the global high-score leaderboard.

### Acknowledgements & Game Source
The magnificent HTML5/Canvas recreation of Duck Hunt used in this project was originally created by **Matt Surabian**. You can find the original game source code and assets here:
👉 **[MattSurabian/DuckHunt on GitHub](https://github.com/MattSurabian/DuckHunt)**

*The `duckhunt-source` folder in this repository contains a fork/copy of those assets, heavily integrated into our iframe and gesture-control pipeline.*

---

## 🚀 Running Locally

### Prerequisites
You will need [Node.js](https://nodejs.org/) installed on your machine.

### 1. Start the Backend (API & Game Server)
The backend runs on `http://localhost:3000`.
```bash
cd server
npm install
node index.js
```

### 2. Start the Frontend (Vue Interface)
The frontend usually runs on `http://localhost:5173`.
```bash
cd client
npm install
npm run dev
```
Vite is configured to automatically proxy requests for `/duckhunt` and `/api` to the local Node server so you don't encounter CORS issues during development.

---

## 🌍 Deployment
This application is designed for split deployment:

1. **Backend**: Deployed on **Render** as a standard Node.js Web Service. It exposes the `/api/...` endpoints and serves the static DuckHunt game files.
2. **Frontend**: Deployed on **Netlify** (or **Vercel**). 

### Netlify Proxying
To ensure the frontend can communicate with the Render backend without CORS or routing issues, the `client/public/_redirects` file tells Netlify to act as a proxy:

```text
/duckhunt/*  https://<your-render-url>/duckhunt/:splat  200
/api/*       https://<your-render-url>/api/:splat       200
```
*(If deploying via Vercel, the equivalent logic is found in `client/vercel.json`)*.
