<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

// ─── State ───
const videoRef = ref(null)
const canvasRef = ref(null)
const isReady = ref(false)
const currentGesture = ref('')
const confidence = ref(0)
const handedness = ref('')
const fps = ref(0)
const landmarkCount = ref(0)

let gestureRecognizer = null
let animationFrameId = null
let stream = null
let frameCount = 0
let lastFpsTime = Date.now()

// ─── Initialize ───
async function initGestureRecognizer() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  )

  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6
  })
}

async function startWebcam() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    }
  })
  videoRef.value.srcObject = stream
  await new Promise(resolve => {
    videoRef.value.onloadeddata = resolve
  })
  isReady.value = true
  processFrame()
}

function processFrame() {
  if (!gestureRecognizer || !videoRef.value || videoRef.value.readyState < 2) {
    animationFrameId = requestAnimationFrame(processFrame)
    return
  }

  const video = videoRef.value
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const result = gestureRecognizer.recognizeForVideo(video, performance.now())

  // Draw mirrored webcam
  ctx.save()
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0)
  ctx.restore()

  // FPS counter
  frameCount++
  const now = Date.now()
  if (now - lastFpsTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastFpsTime = now
  }

  if (result.landmarks && result.landmarks.length > 0) {
    landmarkCount.value = result.landmarks[0].length

    // Draw hand landmarks
    const drawingUtils = new DrawingUtils(ctx)
    for (const landmarks of result.landmarks) {
      const mirrored = landmarks.map(l => ({ ...l, x: 1 - l.x }))

      // Draw connections with thick neon lines
      drawingUtils.drawConnectors(mirrored, GestureRecognizer.HAND_CONNECTIONS, {
        color: '#39ff14',
        lineWidth: 4
      })

      // Draw landmarks as glowing dots
      drawingUtils.drawLandmarks(mirrored, {
        color: '#00d4ff',
        lineWidth: 2,
        radius: 6
      })

      // Highlight fingertips with larger circles
      const fingertips = [4, 8, 12, 16, 20]
      for (const idx of fingertips) {
        const pt = mirrored[idx]
        const px = pt.x * canvas.width
        const py = pt.y * canvas.height

        ctx.beginPath()
        ctx.arc(px, py, 10, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 149, 0, 0.6)'
        ctx.fill()
        ctx.strokeStyle = '#ff9500'
        ctx.lineWidth = 2
        ctx.stroke()

        // Label
        ctx.font = 'bold 10px Orbitron, monospace'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.fillText(idx, px, py - 14)
      }

      // Draw index fingertip with special highlight (this controls the cursor)
      const indexTip = mirrored[8]
      const ix = indexTip.x * canvas.width
      const iy = indexTip.y * canvas.height

      // Crosshair at index finger
      ctx.strokeStyle = '#ff3b3b'
      ctx.lineWidth = 2
      ctx.shadowColor = '#ff3b3b'
      ctx.shadowBlur = 10
      const size = 25

      ctx.beginPath()
      ctx.moveTo(ix - size, iy)
      ctx.lineTo(ix - 8, iy)
      ctx.moveTo(ix + 8, iy)
      ctx.lineTo(ix + size, iy)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(ix, iy - size)
      ctx.lineTo(ix, iy - 8)
      ctx.moveTo(ix, iy + 8)
      ctx.lineTo(ix, iy + size)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(ix, iy, size + 4, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 59, 59, 0.4)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.shadowBlur = 0

      // Label: "AIM POINT"
      ctx.font = 'bold 11px Orbitron, monospace'
      ctx.fillStyle = '#ff3b3b'
      ctx.textAlign = 'center'
      ctx.fillText('AIM', ix, iy - 32)
    }

    // Gesture info
    if (result.gestures && result.gestures.length > 0) {
      currentGesture.value = result.gestures[0][0].categoryName
      confidence.value = Math.round(result.gestures[0][0].score * 100)
    }

    if (result.handednesses && result.handednesses.length > 0) {
      handedness.value = result.handednesses[0][0].categoryName
    }

    // Draw gesture label on canvas
    const gestureLabel = currentGesture.value === 'Closed_Fist' ? '✊ SHOOTING' : currentGesture.value === 'Open_Palm' ? '✋ AIMING' : currentGesture.value
    ctx.font = 'bold 28px Orbitron, monospace'
    ctx.textAlign = 'center'

    // Background pill
    const textWidth = ctx.measureText(gestureLabel).width
    ctx.fillStyle = currentGesture.value === 'Closed_Fist' ? 'rgba(255, 59, 59, 0.7)' : 'rgba(57, 255, 20, 0.3)'
    ctx.beginPath()
    const pillX = canvas.width / 2
    const pillY = 50
    ctx.roundRect(pillX - textWidth / 2 - 20, pillY - 20, textWidth + 40, 44, 22)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.fillText(gestureLabel, pillX, pillY + 8)

  } else {
    currentGesture.value = ''
    confidence.value = 0
    landmarkCount.value = 0
    handedness.value = ''

    // "No hand detected" message
    ctx.font = 'bold 24px Orbitron, monospace'
    ctx.fillStyle = 'rgba(255, 149, 0, 0.8)'
    ctx.textAlign = 'center'
    ctx.fillText('👋 Show your hand to the camera', canvas.width / 2, canvas.height / 2)
  }

  animationFrameId = requestAnimationFrame(processFrame)
}

onMounted(async () => {
  try {
    await initGestureRecognizer()
    await startWebcam()
  } catch (err) {
    console.error('[HandDebug] Init failed:', err)
    // Fallback: Try CPU delegate if GPU fails (Safari fix)
    try {
      console.log('[HandDebug] Retrying with CPU delegate...')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      })
      await startWebcam()
    } catch (fallbackErr) {
      console.error('[HandDebug] CPU fallback also failed:', fallbackErr)
    }
  }
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (stream) stream.getTracks().forEach(t => t.stop())
  if (gestureRecognizer) gestureRecognizer.close()
})
</script>

<template>
  <div class="debug-page">
    <!-- Top bar -->
    <header class="debug-header">
      <div class="debug-title">
        <span>🖐️</span>
        <h1 class="font-display">HAND TRACKING DEBUG</h1>
        <a href="/" class="back-link">← Back to Game</a>
      </div>
      <div class="debug-stats">
        <div class="stat" :class="{ active: isReady }">
          <span class="stat-label">STATUS</span>
          <span class="stat-val">{{ isReady ? 'ACTIVE' : 'LOADING' }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">FPS</span>
          <span class="stat-val" :class="{ warn: fps < 20 }">{{ fps }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">GESTURE</span>
          <span class="stat-val" :class="{
            'text-green': currentGesture === 'Open_Palm',
            'text-red': currentGesture === 'Closed_Fist'
          }">{{ currentGesture || 'None' }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">CONFIDENCE</span>
          <span class="stat-val">{{ confidence }}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">HAND</span>
          <span class="stat-val">{{ handedness || '—' }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">LANDMARKS</span>
          <span class="stat-val">{{ landmarkCount }}/21</span>
        </div>
      </div>
    </header>

    <!-- Full-screen canvas -->
    <main class="debug-canvas-area">
      <video ref="videoRef" autoplay playsinline muted class="hidden-video"></video>
      <canvas ref="canvasRef" class="debug-canvas"></canvas>

      <!-- Loading overlay -->
      <div v-if="!isReady" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading MediaPipe Hand Tracking...</p>
        <small>First load may take a few seconds</small>
      </div>
    </main>

    <!-- Instructions footer -->
    <footer class="debug-footer">
      <div class="tip">✋ <strong>Open Palm</strong> = Aim (moves crosshair)</div>
      <div class="tip">✊ <strong>Closed Fist</strong> = Shoot (fires at crosshair position)</div>
      <div class="tip">🎯 <strong>Red crosshair on index finger</strong> = Where your shot lands in the game</div>
    </footer>
  </div>
</template>

<style scoped>
.debug-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0e17;
  color: #f0f6fc;
  overflow: hidden;
}

.debug-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
  gap: 12px;
}

.debug-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.debug-title h1 {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #00d4ff;
  margin: 0;
}

.back-link {
  font-size: 0.72rem;
  color: #8b949e;
  text-decoration: none;
  padding: 4px 10px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  transition: all 0.2s;
}

.back-link:hover {
  color: #39ff14;
  border-color: rgba(57,255,20,0.3);
}

.debug-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.stat-label {
  font-size: 0.55rem;
  color: #484f58;
  letter-spacing: 0.1em;
  font-family: 'Orbitron', monospace;
}

.stat-val {
  font-size: 0.8rem;
  font-weight: 600;
  font-family: 'Orbitron', monospace;
  color: #8b949e;
  transition: color 0.2s;
}

.stat.active .stat-val { color: #39ff14; }
.stat-val.warn { color: #f59e0b; }
.stat-val.text-green { color: #39ff14; }
.stat-val.text-red { color: #ff3b3b; }

.debug-canvas-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}

.hidden-video {
  display: none;
}

.debug-canvas {
  max-width: 100%;
  max-height: 100%;
  display: block;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0,0,0,0.85);
  z-index: 10;
}

.loading-overlay p {
  color: #8b949e;
  font-size: 0.9rem;
}

.loading-overlay small {
  color: #484f58;
  font-size: 0.75rem;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 212, 255, 0.2);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.debug-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 8px 20px;
  background: rgba(255,255,255,0.02);
  border-top: 1px solid rgba(255,255,255,0.06);
}

.tip {
  font-size: 0.72rem;
  color: #8b949e;
}

.tip strong {
  color: #f0f6fc;
}

@media (max-width: 768px) {
  .debug-stats { gap: 8px; }
  .debug-footer { flex-direction: column; gap: 4px; }
}
</style>
