<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  shirt: Object   // Selected shirt object: { id, name, color, hex }
})

// Template refs — these give us direct access to the HTML elements
const videoRef = ref(null)    // The hidden <video> element (webcam stream)
const canvasRef = ref(null)   // The <canvas> we draw everything onto

let stream = null             // Stores the webcam MediaStream
let animationId = null        // Used to cancel the drawing loop

// ─── STEP 1: Start the Webcam ────────────────────────────────────────────────
// This asks the browser for camera permission and starts streaming
async function startWebcam() {
  try {
    // getUserMedia is the browser API for accessing the camera
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: 'user' }
    })
    videoRef.value.srcObject = stream
    videoRef.value.play()
    // Once video starts playing, begin the drawing loop
    videoRef.value.addEventListener('playing', startDrawingLoop)
  } catch (err) {
    console.error('Camera access denied or unavailable:', err)
    errorMsg.value = 'Camera access denied. Please allow camera access and refresh.'
  }
}

// ─── STEP 2: The Drawing Loop ─────────────────────────────────────────────────
// requestAnimationFrame calls this ~60 times per second, creating smooth video
function startDrawingLoop() {
  const canvas = canvasRef.value
  const video = videoRef.value
  const ctx = canvas.getContext('2d')

  // Match canvas size to video size
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  function draw() {
    // Draw the live webcam frame onto the canvas
    // We flip it horizontally (mirror mode) — natural for selfie cameras
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    // ─── STEP 3: Draw the Shirt Overlay ──────────────────────────────────────
    // Right now: draw a colored rectangle as placeholder
    // On Day 2: replace this with MediaPipe shoulder-detection coordinates
    if (props.shirt) {
      drawShirtPlaceholder(ctx, canvas.width, canvas.height, props.shirt)
    }

    // Request next frame (creates the animation loop)
    animationId = requestAnimationFrame(draw)
  }

  draw()
}

// ─── Shirt Placeholder ───────────────────────────────────────────────────────
// This simulates where the shirt will appear once we add pose detection.
// The shirt is placed at ~40% from top, centered, at ~50% of canvas width.
// On Day 2 we'll replace these fixed numbers with real shoulder coordinates.
function drawShirtPlaceholder(ctx, canvasW, canvasH, shirt) {
  const shirtW = canvasW * 0.5        // Shirt width = 50% of canvas
  const shirtH = shirtW * 1.2         // Height proportional (portrait shirt shape)
  const x = (canvasW - shirtW) / 2    // Centered horizontally
  const y = canvasH * 0.32            // ~1/3 down the canvas (chest area)

  // Draw filled rectangle as shirt shape
  ctx.save()
  ctx.globalAlpha = 0.55              // Semi-transparent so you can see through

  // Shirt body
  ctx.fillStyle = shirt.hex
  ctx.beginPath()
  ctx.roundRect(x, y, shirtW, shirtH, [8, 8, 12, 12])
  ctx.fill()

  // Neckline cutout (simple trapezoid shape)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  const neckW = shirtW * 0.2
  ctx.ellipse(x + shirtW / 2, y + 4, neckW, shirtH * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalCompositeOperation = 'source-over'

  // Collar outline
  ctx.globalAlpha = 0.8
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x, y, shirtW, shirtH, [8, 8, 12, 12])
  ctx.stroke()

  ctx.restore()

  // Label (helpful during development)
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(x + shirtW/2 - 60, y + shirtH + 8, 120, 24)
  ctx.fillStyle = 'white'
  ctx.font = '12px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('📍 Shirt position (placeholder)', x + shirtW/2, y + shirtH + 24)
  ctx.restore()
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────
function stopWebcam() {
  if (animationId) cancelAnimationFrame(animationId)
  if (stream) stream.getTracks().forEach(track => track.stop())
}

// Lifecycle hooks — Vue calls these automatically
onMounted(() => startWebcam())
onUnmounted(() => stopWebcam())

const errorMsg = ref('')
const isPoseReady = ref(false)  // Will become true on Day 2 when MediaPipe loads
</script>

<template>
  <div class="webcam-wrapper">
    <!-- Status bar -->
    <div class="webcam-status-bar">
      <div class="status-dot" :class="{ active: !errorMsg }"></div>
      <span class="status-text">{{ errorMsg ? 'Camera Error' : 'Live Preview' }}</span>
      <span class="badge" style="margin-left: auto;">
        {{ shirt ? `Shirt: ${shirt.name}` : 'No shirt selected' }}
      </span>
    </div>

    <!-- Canvas: this is what the user sees — webcam + shirt overlay on top -->
    <div class="canvas-container">
      <!-- Hidden video element — provides the raw camera stream to draw from -->
      <video ref="videoRef" class="hidden-video" autoplay muted playsinline></video>

      <!-- Visible canvas — we draw video frames + shirt overlay here -->
      <canvas ref="canvasRef" class="main-canvas"></canvas>

      <!-- Error overlay -->
      <div v-if="errorMsg" class="error-overlay">
        <span>📷</span>
        <p>{{ errorMsg }}</p>
      </div>

      <!-- The "no shirt" hint -->
      <div v-if="!shirt && !errorMsg" class="no-shirt-hint">
        <span>👕</span>
        <p>Select a shirt from the left panel to see the overlay</p>
      </div>

      <!-- Day 2 badge — will be replaced with real MediaPipe status -->
      <div class="pose-badge">
        <span class="pose-dot placeholder"></span>
        Pose Detection: Coming Day 2
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

/* The video element is hidden — we only use it as a source for the canvas */
.hidden-video {
  display: none;
}

.main-canvas {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.error-overlay,
.no-shirt-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: rgba(0,0,0,0.7);
  font-size: 2rem;
}

.no-shirt-hint {
  background: rgba(0,0,0,0.4);
}

.no-shirt-hint p,
.error-overlay p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 260px;
  text-align: center;
  line-height: 1.5;
}

.pose-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.65rem;
  background: rgba(0,0,0,0.6);
  border-radius: 999px;
  font-size: 0.72rem;
  color: var(--text-secondary);
  backdrop-filter: blur(4px);
  border: 1px solid var(--border);
}

.pose-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.pose-dot.placeholder {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b88;
}

.pose-dot.active {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e88;
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
