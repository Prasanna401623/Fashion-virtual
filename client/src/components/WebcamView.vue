<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import { Camera } from '@mediapipe/camera_utils'

const props = defineProps({
  shirt: Object
})

// Template refs — direct access to DOM elements
const videoRef = ref(null)
const canvasRef = ref(null)

// State
const errorMsg = ref('')
const isPoseReady = ref(false)   // true once MediaPipe detects a person

// These hold the latest shoulder positions MediaPipe detected
// We store them outside the drawing loop so they persist between frames
let lastLandmarks = null

// MediaPipe and Camera instances
let pose = null
let camera = null

// ─── STEP 1: Initialize MediaPipe Pose ───────────────────────────────────────
// MediaPipe Pose is an AI model that runs entirely in the browser.
// It takes a video frame and returns 33 "landmarks" (x,y coordinates
// for parts of your body like shoulders, elbows, hips, nose, etc.)
async function initPose() {
  pose = new Pose({
    locateFile: (file) => {
      // MediaPipe needs to load its AI model files (.wasm, .tflite)
      // This URL tells it where to find them (from a CDN — no download needed)
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    }
  })

  // These settings control the AI model's behavior
  pose.setOptions({
    modelComplexity: 1,         // 0=fastest, 1=balanced, 2=most accurate
    smoothLandmarks: true,      // Smooths jittery movements between frames
    enableSegmentation: false,  // We don't need background removal
    minDetectionConfidence: 0.5, // How sure it needs to be to "find" a person
    minTrackingConfidence: 0.5, // How sure it needs to be to keep tracking
  })

  // This callback fires every time MediaPipe finishes analyzing a frame
  // It gives us the 33 landmark coordinates
  pose.onResults(onPoseResults)
}

// ─── STEP 2: Handle Each Pose Result ─────────────────────────────────────────
// This is called ~30 times per second by MediaPipe with new landmark data
function onPoseResults(results) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  // Match canvas to video dimensions
  canvas.width = results.image.width
  canvas.height = results.image.height

  // Clear the previous frame
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw the webcam frame (mirrored, like a selfie camera)
  ctx.save()
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
  ctx.restore()

  // results.poseLandmarks = array of 33 points, each with {x, y, z, visibility}
  // x and y are normalized (0.0 to 1.0) — multiply by canvas size for pixel coords
  if (results.poseLandmarks) {
    lastLandmarks = results.poseLandmarks
    isPoseReady.value = true

    // Draw shoulder dots (helpful for debugging — shows what MediaPipe detects)
    drawShoulderDebug(ctx, results.poseLandmarks, canvas.width, canvas.height)

    // Draw the shirt on top of the webcam feed
    if (props.shirt) {
      drawShirtOnShoulders(ctx, results.poseLandmarks, canvas.width, canvas.height, props.shirt)
    }
  } else {
    // No person detected in this frame
    isPoseReady.value = false
    lastLandmarks = null
  }
}

// ─── STEP 3: Shoulder Debug Dots ─────────────────────────────────────────────
// Shows small circles where MediaPipe thinks your shoulders are.
// This is just for development — we'll remove or toggle it later.
function drawShoulderDebug(ctx, landmarks, w, h) {
  // Index 11 = LEFT_SHOULDER, Index 12 = RIGHT_SHOULDER
  // (MediaPipe's "left" is YOUR left, not the mirror's left)
  // Because we mirror the canvas, left and right appear correctly
  const leftShoulder  = landmarks[11]
  const rightShoulder = landmarks[12]

  ;[leftShoulder, rightShoulder].forEach(pt => {
    // Landmarks are 0–1 normalized. Multiply by canvas size for pixel position.
    // Mirror the x coordinate to match our flipped canvas
    const px = (1 - pt.x) * w
    const py = pt.y * h

    ctx.beginPath()
    ctx.arc(px, py, 8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(168, 85, 247, 0.8)'   // Purple dot
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()
  })
}

// Cache to store pre-loaded Image objects so we don't recreate them every frame
const imageCache = {}

function getOrLoadImage(url) {
  if (imageCache[url]) return imageCache[url]
  
  // Create and cache the image immediately so we don't spam requests
  const img = new Image()
  img.crossOrigin = 'anonymous' // Important for loading S3 images into Canvas
  img.src = url
  imageCache[url] = img
  return img
}

// ─── STEP 4: Draw Shirt Using Real Shoulder Positions ────────────────────────
// This is the core of the overlay logic.
// We use the shoulder coordinates to position and scale the shirt correctly.
function drawShirtOnShoulders(ctx, landmarks, w, h, shirt) {
  const leftShoulder  = landmarks[11]   // MediaPipe landmark index 11
  const rightShoulder = landmarks[12]   // MediaPipe landmark index 12

  // Convert normalized 0–1 coordinates to actual pixel positions
  // We mirror x because our canvas is flipped
  const lx = (1 - leftShoulder.x)  * w
  const ly = leftShoulder.y         * h
  const rx = (1 - rightShoulder.x) * w
  const ry = rightShoulder.y        * h

  // Calculate the midpoint between the two shoulders (center of chest)
  const midX = (lx + rx) / 2
  const midY = (ly + ry) / 2

  // Measure pixel distance between shoulders
  const dx = rx - lx
  const dy = ry - ly
  const shoulderDist = Math.sqrt(dx * dx + dy * dy)

  // Scale the shirt wider than the shoulders
  // 1.8 means shirt is 80% wider — covers arms too
  const shirtW = shoulderDist * 2.2
  // For Real PNGs, maintaining aspect ratio is crucial. Most tshirts are roughly 1:1.1 aspect.
  // We will draw it with a fixed ratio here, but ideally we'd use the loaded image's natural ratio.
  const img = getOrLoadImage(shirt.imageUrl)
  
  // If the image is fully loaded, use its actual aspect ratio
  const ratio = img.complete && img.naturalWidth > 0 
    ? (img.naturalHeight / img.naturalWidth) 
    : 1.1

  const shirtH = shirtW * ratio

  // Position: center horizontally at midpoint, go up slightly from midpoint
  // The exact Y offset depends on how the PNG is cropped. About 15% up usually looks right for a tight crop.
  const shirtX = midX - shirtW / 2
  const shirtY = midY - shirtH * 0.15

  // Draw the real shirt image
  ctx.save()
  // Add a tiny bit of opacity just so it blends smoothly with the camera feed
  ctx.globalAlpha = 0.95
  
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, shirtX, shirtY, shirtW, shirtH)
  }

  ctx.restore()
}

// ─── STEP 5: Start MediaPipe Camera ──────────────────────────────────────────
// @mediapipe/camera_utils handles feeding video frames into MediaPipe.
// It's smarter than using requestAnimationFrame directly because it
// handles timing, skips frames if the model is busy, etc.
function startCamera() {
  camera = new Camera(videoRef.value, {
    onFrame: async () => {
      // Every frame from the webcam → send it to MediaPipe for analysis
      await pose.send({ image: videoRef.value })
    },
    width: 1280,
    height: 720
  })
  camera.start()
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await initPose()
    startCamera()
  } catch (err) {
    console.error(err)
    errorMsg.value = 'Failed to initialize pose detection. Check your internet connection.'
  }
})

onUnmounted(() => {
  camera?.stop()
  pose?.close()
})
</script>

<template>
  <div class="webcam-wrapper">
    <!-- Status bar -->
    <div class="webcam-status-bar">
      <div class="status-dot" :class="{ active: isPoseReady }"></div>
      <span class="status-text">{{ isPoseReady ? 'Pose Detected' : 'Looking for pose...' }}</span>
      <span class="badge" style="margin-left: auto;">
        {{ shirt ? `Shirt: ${shirt.name}` : 'No shirt selected' }}
      </span>
    </div>

    <!-- Canvas container -->
    <div class="canvas-container">
      <!-- Hidden video: MediaPipe reads frames from here -->
      <video ref="videoRef" class="hidden-video" autoplay muted playsinline></video>

      <!-- Visible canvas: webcam + shirt overlay drawn here -->
      <canvas ref="canvasRef" class="main-canvas"></canvas>

      <!-- Error overlay -->
      <div v-if="errorMsg" class="overlay-message">
        <span>📷</span>
        <p>{{ errorMsg }}</p>
      </div>

      <!-- Loading state while MediaPipe initializes -->
      <div v-if="!isPoseReady && !errorMsg" class="overlay-message loading">
        <div class="loading-spinner"></div>
        <p>Loading AI Pose Detection...<br><small>First load may take a few seconds</small></p>
      </div>

      <!-- Pose status badge (bottom left corner) -->
      <div class="pose-badge" :class="{ active: isPoseReady }">
        <span class="pose-dot" :class="{ active: isPoseReady, placeholder: !isPoseReady }"></span>
        {{ isPoseReady ? 'Pose Active ✓' : 'Pose Loading...' }}
      </div>
    </div>

    <!-- Instructions -->
    <div class="webcam-instructions">
      <span>💡</span>
      <span>Stand ~1–2 meters from camera · Face forward · Ensure good lighting</span>
    </div>
  </div>
</template>

<style scoped>
.webcam-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.webcam-status-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
  transition: var(--transition);
}

.status-dot.active {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e88;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.canvas-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  border-top: none;
}

.hidden-video {
  display: none;
}

.main-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* Overlay for error or loading states */
.overlay-message {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.75);
  font-size: 2rem;
  backdrop-filter: blur(4px);
}

.overlay-message.loading {
  background: rgba(0, 0, 0, 0.6);
}

.overlay-message p {
  font-size: 0.88rem;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.6;
}

.overlay-message small {
  font-size: 0.76rem;
  color: var(--text-muted);
}

/* Loading spinner */
.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(168, 85, 247, 0.2);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Pose status badge in corner */
.pose-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.65rem;
  background: rgba(0, 0, 0, 0.65);
  border-radius: 999px;
  font-size: 0.72rem;
  color: var(--text-secondary);
  backdrop-filter: blur(4px);
  border: 1px solid var(--border);
  transition: var(--transition);
}

.pose-badge.active {
  border-color: rgba(34, 197, 94, 0.4);
  color: #22c55e;
}

.pose-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transition: var(--transition);
}

.pose-dot.placeholder {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b88;
}

.pose-dot.active {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e88;
  animation: pulse 2s infinite;
}

.webcam-instructions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.76rem;
  color: var(--text-muted);
  padding: 0 0.25rem;
}
</style>
