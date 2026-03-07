<script setup>
import { ref } from 'vue'
import HandTracker from './components/HandTracker.vue'
import GameSettings from './components/GameSettings.vue'

// ─── State ───
const iframeRef = ref(null)
const handPosition = ref(null)
const gesture = ref('')
const trackerReady = ref(false)
const gameLoaded = ref(false)
const showInstructions = ref(true)

// ─── Settings ───
const settings = ref({
  sensitivity: 1.0,
  smoothing: 5,
  fireGesture: 'Closed_Fist',
  positionLock: true,
  lockDuration: 300
})

function onSettingsUpdate(newSettings) {
  settings.value = newSettings
}

// Smoothed cursor position
let smoothX = 0.5
let smoothY = 0.5

// Crosshair cursor element
const cursorX = ref(50)
const cursorY = ref(50)

// ─── Dispatch synthetic mouse events into the DuckHunt iframe ───
function dispatchClickToIframe(x, y) {
  try {
    const iframe = iframeRef.value
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return

    const iframeDoc = iframe.contentDocument
    const canvas = iframeDoc.querySelector('canvas')
    if (!canvas) return

    // Convert normalized 0-1 coords to iframe pixel coords.
    // canvas fills the iframe window so rect.left/top ≈ 0;
    // clientX = x * rect.width places the click at the right screen position.
    const rect = canvas.getBoundingClientRect()
    const clientX = rect.left + x * rect.width
    const clientY = rect.top + y * rect.height
    const iframeWin = iframe.contentWindow

    const shared = { bubbles: true, cancelable: true, view: iframeWin, clientX, clientY }

    // PIXI v4 in Chrome sets supportsPointerEvents=true and its onMouseDown()
    // returns early — it ONLY processes pointerdown. Dispatching mousedown alone
    // is silently ignored. We send both event types to cover all PIXI versions.
    const pointerShared = { ...shared, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 }

    // Move first so PIXI's internal cursor position is up-to-date
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...pointerShared, buttons: 0 }))
    canvas.dispatchEvent(new MouseEvent('mousemove', { ...shared, button: 0, buttons: 0 }))

    // Fire
    canvas.dispatchEvent(new PointerEvent('pointerdown', pointerShared))
    canvas.dispatchEvent(new MouseEvent('mousedown', { ...shared, button: 0, buttons: 1 }))

    setTimeout(() => {
      canvas.dispatchEvent(new PointerEvent('pointerup', { ...pointerShared, buttons: 0 }))
      canvas.dispatchEvent(new MouseEvent('mouseup', { ...shared, button: 0, buttons: 0 }))
    }, 50)
  } catch (err) {
    console.error('[GunHand] Error dispatching click to iframe:', err)
  }
}

// ─── Hand Tracker Events ───
function onHandMove(pos) {
  handPosition.value = pos

  // Smooth the cursor (lerp) for crosshair visual
  smoothX += (pos.x - smoothX) * 0.2
  smoothY += (pos.y - smoothY) * 0.2

  cursorX.value = smoothX * 100
  cursorY.value = smoothY * 100
}

function onGestureChange(g) {
  gesture.value = g
}

function onShoot() {
  if (!gameLoaded.value) return

  // Use HandTracker's emitted position (already position-locked) for accuracy
  const pos = handPosition.value
  if (pos) {
    dispatchClickToIframe(pos.x, pos.y)
  } else {
    dispatchClickToIframe(smoothX, smoothY)
  }
}

function onHandLost() {
  handPosition.value = null
}

function onTrackerReady() {
  trackerReady.value = true
}

// ─── iframe load handler ───
function onIframeLoad() {
  gameLoaded.value = true
  // Auto-hide instructions after 8 seconds
  setTimeout(() => {
    showInstructions.value = false
  }, 8000)
}

// Dismiss instructions on click
function dismissInstructions() {
  showInstructions.value = false
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="logo-area">
          <span class="logo-icon">🔫</span>
          <div>
            <h1 class="app-title font-display">GUNHAND</h1>
            <p class="app-subtitle">Gesture-Controlled Duck Hunt</p>
          </div>
        </div>

        <!-- Status indicators -->
        <div class="status-bar">
          <div class="status-chip" :class="{ active: trackerReady }">
            <span class="status-dot"></span>
            {{ trackerReady ? 'Camera Ready' : 'Starting Camera...' }}
          </div>
          <div class="status-chip" :class="{ active: gameLoaded }">
            <span class="status-dot"></span>
            {{ gameLoaded ? 'Game Loaded' : 'Loading Game...' }}
          </div>
          <div class="status-chip gesture-chip" :class="{
            aiming: handPosition && gesture !== settings.fireGesture,
            shooting: gesture === settings.fireGesture
          }">
            <span class="status-dot"></span>
            {{ gesture === settings.fireGesture ? '🔫 FIRE!' : handPosition ? '🎯 Aiming' : '✋ Show Hand' }}
          </div>
        </div>
      </div>
    </header>

    <!-- Game Area -->
    <main class="game-area">
      <!-- DuckHunt iframe -->
      <div class="game-frame">
        <iframe
          ref="iframeRef"
          src="/duckhunt/"
          class="game-iframe"
          @load="onIframeLoad"
          allow="autoplay"
        ></iframe>

        <!-- Custom crosshair overlay -->
        <div
          v-if="handPosition && gameLoaded"
          class="crosshair-overlay"
          :style="{
            left: cursorX + '%',
            top: cursorY + '%'
          }"
        >
          <div class="crosshair">
            <div class="crosshair-line h"></div>
            <div class="crosshair-line v"></div>
            <div class="crosshair-dot"></div>
            <div class="crosshair-ring"></div>
          </div>
        </div>

        <!-- Instructions overlay -->
        <div v-if="showInstructions && gameLoaded" class="instructions-overlay" @click="dismissInstructions">
          <div class="instructions-card glass-panel">
            <h2 class="font-display" style="color: var(--neon-green); font-size: 1.2rem;">HOW TO PLAY</h2>
            <div class="instruction-steps">
              <div class="step">
                <span class="step-icon">✋</span>
                <div>
                  <strong>Open Palm</strong>
                  <p>Move your hand to aim the crosshair</p>
                </div>
              </div>
              <div class="step">
                <span class="step-icon">✊</span>
                <div>
                  <strong>Close Fist</strong>
                  <p>Shoot at the ducks!</p>
                </div>
              </div>
              <div class="step">
                <span class="step-icon">🦆</span>
                <div>
                  <strong>Hit the Ducks</strong>
                  <p>Score points before they fly away</p>
                </div>
              </div>
            </div>
            <p class="dismiss-hint">Click anywhere to dismiss</p>
          </div>
        </div>
      </div>

      <!-- Hand Tracker PiP -->
      <HandTracker
        :settings="settings"
        @hand-move="onHandMove"
        @shoot="onShoot"
        @hand-lost="onHandLost"
        @ready="onTrackerReady"
        @gesture-change="onGestureChange"
      />
    </main>

    <!-- Settings Panel -->
    <GameSettings :settings="settings" @update:settings="onSettingsUpdate" />
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  padding: 8px 24px;
  position: relative;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 1.6rem;
}

.app-title {
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, var(--neon-green), var(--neon-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.app-subtitle {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin: 0;
  letter-spacing: 0.05em;
}

/* ── Status Bar ── */
.status-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  font-family: 'Orbitron', monospace;
  letter-spacing: 0.03em;
  transition: var(--transition);
}

.status-chip.active {
  color: var(--neon-green);
  border-color: rgba(57, 255, 20, 0.2);
}

.status-chip.aiming {
  color: var(--neon-green);
  border-color: rgba(57, 255, 20, 0.3);
}

.status-chip.shooting {
  color: var(--neon-red);
  border-color: rgba(255, 59, 59, 0.3);
  background: rgba(255, 59, 59, 0.08);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: var(--transition);
}

.status-chip.active .status-dot {
  background: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
}

.status-chip.aiming .status-dot {
  background: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
  animation: pulse-glow 1.5s infinite;
}

.status-chip.shooting .status-dot {
  background: var(--neon-red);
  box-shadow: 0 0 8px var(--neon-red);
}

/* ── Game Area ── */
.game-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.game-frame {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.game-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* ── Crosshair Overlay ── */
.crosshair-overlay {
  position: absolute;
  pointer-events: none;
  z-index: 50;
  transform: translate(-50%, -50%);
  transition: left 0.05s ease-out, top 0.05s ease-out;
}

.crosshair {
  position: relative;
  width: 40px;
  height: 40px;
}

.crosshair-line {
  position: absolute;
  background: rgba(57, 255, 20, 0.9);
  box-shadow: 0 0 6px rgba(57, 255, 20, 0.6);
}

.crosshair-line.h {
  width: 100%;
  height: 2px;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  /* Gap in center */
  background: transparent;
  background-image: linear-gradient(to right,
    rgba(57, 255, 20, 0.9) 0%, rgba(57, 255, 20, 0.9) 35%,
    transparent 35%, transparent 65%,
    rgba(57, 255, 20, 0.9) 65%, rgba(57, 255, 20, 0.9) 100%
  );
}

.crosshair-line.v {
  height: 100%;
  width: 2px;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  background: transparent;
  background-image: linear-gradient(to bottom,
    rgba(57, 255, 20, 0.9) 0%, rgba(57, 255, 20, 0.9) 35%,
    transparent 35%, transparent 65%,
    rgba(57, 255, 20, 0.9) 65%, rgba(57, 255, 20, 0.9) 100%
  );
}

.crosshair-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background: var(--neon-green);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px var(--neon-green);
}

.crosshair-ring {
  position: absolute;
  inset: -2px;
  border: 1px solid rgba(57, 255, 20, 0.3);
  border-radius: 50%;
}

/* ── Instructions Overlay ── */
.instructions-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 23, 0.7);
  backdrop-filter: blur(4px);
  z-index: 60;
  cursor: pointer;
  animation: slide-in-up 0.4s ease;
}

.instructions-card {
  padding: 32px 40px;
  max-width: 380px;
  text-align: center;
}

.instruction-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 20px 0;
  text-align: left;
}

.step {
  display: flex;
  align-items: center;
  gap: 14px;
}

.step-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.step strong {
  display: block;
  color: var(--text-primary);
  font-size: 0.85rem;
  margin-bottom: 2px;
}

.step p {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin: 0;
}

.dismiss-hint {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 8px;
}

@media (max-width: 768px) {
  .header {
    padding: 6px 12px;
  }
  .header-content {
    flex-direction: column;
    gap: 6px;
  }
  .status-bar {
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
