<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

const emit = defineEmits(['hand-move', 'shoot', 'hand-lost', 'ready'])

// Refs
const videoRef = ref(null)
const canvasRef = ref(null)
const isReady = ref(false)
const gesture = ref('')

// State
let gestureRecognizer = null
let animationFrameId = null
let previousGesture = ''
let stream = null

// ─── Initialize MediaPipe GestureRecognizer ───
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
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  })
}

// ─── Start Webcam ───
async function startWebcam() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' }
  })
  videoRef.value.srcObject = stream
  await new Promise(resolve => {
    videoRef.value.onloadeddata = resolve
  })
  isReady.value = true
  emit('ready')
  processFrame()
}

// ─── Main Processing Loop ───
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

  // Run gesture recognition
  const result = gestureRecognizer.recognizeForVideo(video, performance.now())

  // Draw PiP preview: mirrored webcam + hand landmarks
  ctx.save()
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0)
  ctx.restore()

  if (result.landmarks && result.landmarks.length > 0) {
    // Draw hand landmarks on PiP
    const drawingUtils = new DrawingUtils(ctx)
    for (const landmarks of result.landmarks) {
      // Mirror landmarks for drawing
      const mirrored = landmarks.map(l => ({ ...l, x: 1 - l.x }))
      drawingUtils.drawConnectors(mirrored, GestureRecognizer.HAND_CONNECTIONS, {
        color: '#39ff14',
        lineWidth: 2
      })
      drawingUtils.drawLandmarks(mirrored, {
        color: '#00d4ff',
        lineWidth: 1,
        radius: 3
      })
    }

    // Extract index fingertip (landmark #8) for cursor position
    const indexTip = result.landmarks[0][8]
    // Mirror X for selfie view
    const x = 1 - indexTip.x
    const y = indexTip.y

    emit('hand-move', { x, y })

    // Detect gesture
    if (result.gestures && result.gestures.length > 0) {
      const currentGesture = result.gestures[0][0].categoryName
      gesture.value = currentGesture

      // Fire on TRANSITION to Closed_Fist only
      if (currentGesture === 'Closed_Fist' && previousGesture !== 'Closed_Fist') {
        emit('shoot')
      }
      previousGesture = currentGesture
    }
  } else {
    gesture.value = ''
    previousGesture = ''
    emit('hand-lost')
  }

  animationFrameId = requestAnimationFrame(processFrame)
}

// ─── Lifecycle ───
onMounted(async () => {
  try {
    await initGestureRecognizer()
    await startWebcam()
  } catch (err) {
    console.error('[HandTracker] Init failed:', err)
  }
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (stream) stream.getTracks().forEach(t => t.stop())
  if (gestureRecognizer) gestureRecognizer.close()
})
</script>

<template>
  <div class="hand-tracker">
    <!-- Hidden video element for MediaPipe input -->
    <video ref="videoRef" autoplay playsinline muted class="hidden-video"></video>

    <!-- PiP webcam preview with landmarks -->
    <div class="pip-container" :class="{ active: gesture }">
      <canvas ref="canvasRef" class="pip-canvas"></canvas>

      <!-- Gesture badge -->
      <div class="gesture-badge" :class="{
        aiming: gesture === 'Open_Palm',
        shooting: gesture === 'Closed_Fist'
      }">
        <span class="gesture-dot"></span>
        {{ gesture === 'Closed_Fist' ? '🔫 FIRE!' : gesture === 'Open_Palm' ? '🎯 Aiming' : '✋ Show Hand' }}
      </div>

      <!-- Loading state -->
      <div v-if="!isReady" class="pip-loading">
        <div class="loading-spinner"></div>
        <span>Starting camera...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hand-tracker {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 100;
}

.hidden-video {
  display: none;
}

.pip-container {
  width: 240px;
  height: 180px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 2px solid var(--border);
  background: #000;
  position: relative;
  transition: border-color 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.pip-container.active {
  border-color: var(--neon-green);
  box-shadow: 0 0 20px rgba(57, 255, 20, 0.2);
}

.pip-canvas {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.gesture-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  font-family: 'Orbitron', monospace;
  background: rgba(0, 0, 0, 0.7);
  color: var(--text-secondary);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  transition: var(--transition);
  letter-spacing: 0.03em;
}

.gesture-badge.aiming {
  border-color: rgba(57, 255, 20, 0.4);
  color: var(--neon-green);
}

.gesture-badge.shooting {
  border-color: rgba(255, 59, 59, 0.4);
  color: var(--neon-red);
}

.gesture-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: var(--transition);
}

.gesture-badge.aiming .gesture-dot {
  background: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
  animation: pulse-glow 1.5s infinite;
}

.gesture-badge.shooting .gesture-dot {
  background: var(--neon-red);
  box-shadow: 0 0 6px var(--neon-red);
}

.pip-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(57, 255, 20, 0.2);
  border-top-color: var(--neon-green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
