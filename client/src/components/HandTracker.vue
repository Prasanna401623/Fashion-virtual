<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

const emit = defineEmits(['hand-move', 'shoot', 'hand-lost', 'ready', 'gesture-change'])

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({
      sensitivity: 1.0,
      smoothing: 5,
      fireGesture: 'Closed_Fist',
      positionLock: true,
      lockDuration: 300
    })
  }
})

// Refs
const videoRef = ref(null)
const canvasRef = ref(null)
const isReady = ref(false)
const gesture = ref('')
const errorMsg = ref('')

// State
let gestureRecognizer = null
let animationFrameId = null
let previousGesture = ''
let stream = null

// Position lock state
let positionLocked = false
let lockTimer = null
let lockedPosition = null

// Smoothing buffer
let posBuffer = []

function getSmoothedPosition(x, y) {
  const bufferSize = props.settings.smoothing || 5
  posBuffer.push({ x, y })
  if (posBuffer.length > bufferSize) posBuffer.shift()

  const avg = posBuffer.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  )
  return {
    x: avg.x / posBuffer.length,
    y: avg.y / posBuffer.length
  }
}

// ─── Initialize MediaPipe GestureRecognizer ───
async function createRecognizer(delegate = 'GPU') {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  )

  return await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
      delegate: delegate
    },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5
  })
}

// ─── Start Webcam ───
async function startWebcam() {
  console.log('[HandTracker] Requesting camera access...')
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
        frameRate: { ideal: 30 }
      }
    })
    console.log('[HandTracker] Camera stream obtained:', stream.getVideoTracks()[0].label)
  } catch (camErr) {
    console.error('[HandTracker] Camera access failed:', camErr.name, camErr.message)
    errorMsg.value = `Camera error: ${camErr.message}`
    return
  }

  const video = videoRef.value
  if (!video) {
    console.error('[HandTracker] Video element not found')
    return
  }

  video.srcObject = stream

  await new Promise((resolve) => {
    if (video.readyState >= 2) {
      resolve()
      return
    }
    const onLoaded = () => {
      clearTimeout(timer)
      resolve()
    }
    video.addEventListener('loadeddata', onLoaded, { once: true })
    const timer = setTimeout(() => {
      video.removeEventListener('loadeddata', onLoaded)
      resolve()
    }, 3000)
  })

  try {
    await video.play()
    console.log('[HandTracker] Video playing:', video.videoWidth, 'x', video.videoHeight)
  } catch (playErr) {
    console.warn('[HandTracker] Video autoplay failed:', playErr.message)
  }

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

  const result = gestureRecognizer.recognizeForVideo(video, performance.now())

  // Draw mirrored PiP preview
  ctx.save()
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0)
  ctx.restore()

  if (result.landmarks && result.landmarks.length > 0) {
    // Draw landmarks
    const drawingUtils = new DrawingUtils(ctx)
    for (const landmarks of result.landmarks) {
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

    // Get cursor position from index fingertip (#8)
    const indexTip = result.landmarks[0][8]
    const sens = props.settings.sensitivity || 1.0

    // Apply sensitivity: scale from center (0.5)
    const rawX = 0.5 + ((1 - indexTip.x) - 0.5) * sens
    const rawY = 0.5 + (indexTip.y - 0.5) * sens

    // Clamp to 0-1 range
    const clampedX = Math.max(0, Math.min(1, rawX))
    const clampedY = Math.max(0, Math.min(1, rawY))

    const smoothed = getSmoothedPosition(clampedX, clampedY)

    // If position is locked (after firing), emit the locked position instead
    if (positionLocked && lockedPosition) {
      emit('hand-move', lockedPosition)
    } else {
      emit('hand-move', smoothed)
      // Store last known good position (for position lock)
      lockedPosition = { ...smoothed }
    }

    // Detect gesture and fire
    if (result.gestures && result.gestures.length > 0) {
      const currentGesture = result.gestures[0][0].categoryName
      gesture.value = currentGesture

      // Notify App.vue of gesture changes
      if (currentGesture !== previousGesture) {
        emit('gesture-change', currentGesture)
      }

      const fireGesture = props.settings.fireGesture || 'Closed_Fist'

      // Fire on TRANSITION to fire gesture
      if (currentGesture === fireGesture && previousGesture !== fireGesture) {
        // Lock the position before firing
        if (props.settings.positionLock && lockedPosition) {
          positionLocked = true

          // Clear any existing lock timer
          if (lockTimer) clearTimeout(lockTimer)

          // Unlock after duration
          lockTimer = setTimeout(() => {
            positionLocked = false
          }, props.settings.lockDuration || 300)
        }

        emit('shoot')
      }
      previousGesture = currentGesture
    }
  } else {
    gesture.value = ''
    if (previousGesture !== '') {
      emit('gesture-change', '')
    }
    previousGesture = ''
    posBuffer = []
    positionLocked = false
    emit('hand-lost')
  }

  animationFrameId = requestAnimationFrame(processFrame)
}

// ─── Lifecycle (with Safari GPU fallback) ───
onMounted(async () => {
  try {
    gestureRecognizer = await createRecognizer('GPU')
    await startWebcam()
  } catch (err) {
    console.warn('[HandTracker] GPU init failed, trying CPU fallback:', err.message)
    try {
      gestureRecognizer = await createRecognizer('CPU')
      await startWebcam()
    } catch (fallbackErr) {
      console.error('[HandTracker] CPU fallback also failed:', fallbackErr)
      errorMsg.value = 'Hand tracking failed to load. Try Chrome.'
    }
  }
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (lockTimer) clearTimeout(lockTimer)
  if (stream) stream.getTracks().forEach(t => t.stop())
  if (gestureRecognizer) gestureRecognizer.close()
})
</script>

<template>
  <div class="hand-tracker">
    <video ref="videoRef" autoplay playsinline muted class="hidden-video"></video>

    <div class="pip-container" :class="{ active: gesture }">
      <canvas ref="canvasRef" class="pip-canvas"></canvas>

      <div class="gesture-badge" :class="{
        aiming: gesture && gesture !== (settings.fireGesture || 'Closed_Fist'),
        shooting: gesture === (settings.fireGesture || 'Closed_Fist')
      }">
        <span class="gesture-dot"></span>
        {{ gesture === (settings.fireGesture || 'Closed_Fist') ? '🔫 FIRE!' : gesture ? '🎯 Aiming' : '✋ Show Hand' }}
      </div>

      <div v-if="!isReady && !errorMsg" class="pip-loading">
        <div class="loading-spinner"></div>
        <span>Starting camera...</span>
      </div>

      <div v-if="errorMsg" class="pip-loading" style="color: #ff3b3b;">
        <span>⚠️</span>
        <span>{{ errorMsg }}</span>
      </div>

      <a href="/debug" target="_blank" class="debug-link" title="Open hand tracking debug view">🖐️</a>
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
  position: absolute;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
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
  text-align: center;
  padding: 10px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(57, 255, 20, 0.2);
  border-top-color: var(--neon-green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.debug-link {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--border);
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.9rem;
  transition: var(--transition);
}

.debug-link:hover {
  background: rgba(0, 212, 255, 0.15);
  border-color: rgba(0, 212, 255, 0.3);
}
</style>
