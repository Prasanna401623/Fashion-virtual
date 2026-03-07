<script setup>
import { ref, watch } from 'vue'

const emit = defineEmits(['update:settings', 'close'])

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

const isOpen = ref(false)

const sensitivity = ref(props.settings.sensitivity)
const smoothing = ref(props.settings.smoothing)
const fireGesture = ref(props.settings.fireGesture)
const positionLock = ref(props.settings.positionLock)
const lockDuration = ref(props.settings.lockDuration)

function emitUpdate() {
  emit('update:settings', {
    sensitivity: sensitivity.value,
    smoothing: smoothing.value,
    fireGesture: fireGesture.value,
    positionLock: positionLock.value,
    lockDuration: lockDuration.value
  })
}

watch([sensitivity, smoothing, fireGesture, positionLock, lockDuration], emitUpdate)

function toggle() {
  isOpen.value = !isOpen.value
}

function resetDefaults() {
  sensitivity.value = 1.0
  smoothing.value = 5
  fireGesture.value = 'Closed_Fist'
  positionLock.value = true
  lockDuration.value = 300
}
</script>

<template>
  <div class="settings-wrapper">
    <!-- Toggle button -->
    <button class="settings-toggle" @click="toggle" :class="{ open: isOpen }">
      ⚙️
    </button>

    <!-- Settings panel -->
    <Transition name="slide">
      <div v-if="isOpen" class="settings-panel glass-panel">
        <div class="panel-header">
          <h3 class="font-display">SETTINGS</h3>
          <button class="close-btn" @click="toggle">✕</button>
        </div>

        <!-- Sensitivity -->
        <div class="setting-group">
          <label class="setting-label">
            <span>🎯 Cursor Sensitivity</span>
            <span class="setting-value">{{ sensitivity.toFixed(1) }}x</span>
          </label>
          <input type="range" v-model.number="sensitivity" min="0.3" max="3.0" step="0.1" class="slider" />
          <div class="slider-labels">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>

        <!-- Smoothing -->
        <div class="setting-group">
          <label class="setting-label">
            <span>🧈 Cursor Smoothing</span>
            <span class="setting-value">{{ smoothing }} frames</span>
          </label>
          <input type="range" v-model.number="smoothing" min="1" max="15" step="1" class="slider" />
          <div class="slider-labels">
            <span>Responsive</span>
            <span>Smooth</span>
          </div>
        </div>

        <!-- Fire Gesture -->
        <div class="setting-group">
          <label class="setting-label">
            <span>🔫 Fire Gesture</span>
          </label>
          <div class="gesture-options">
            <button
              class="gesture-btn"
              :class="{ active: fireGesture === 'Closed_Fist' }"
              @click="fireGesture = 'Closed_Fist'"
            >
              ✊ Closed Fist
            </button>
            <button
              class="gesture-btn"
              :class="{ active: fireGesture === 'Thumb_Up' }"
              @click="fireGesture = 'Thumb_Up'"
            >
              👍 Thumbs Up
            </button>
            <button
              class="gesture-btn"
              :class="{ active: fireGesture === 'Victory' }"
              @click="fireGesture = 'Victory'"
            >
              ✌️ Peace Sign
            </button>
          </div>
        </div>

        <!-- Position Lock -->
        <div class="setting-group">
          <label class="setting-label toggle-label" @click="positionLock = !positionLock">
            <span>🔒 Lock Aim on Fire</span>
            <div class="toggle" :class="{ on: positionLock }">
              <div class="toggle-thumb"></div>
            </div>
          </label>
          <p class="setting-hint">Freezes crosshair at your last aim position when you fire. Prevents aim drop.</p>
        </div>

        <!-- Lock Duration -->
        <div class="setting-group" v-if="positionLock">
          <label class="setting-label">
            <span>⏱️ Lock Duration</span>
            <span class="setting-value">{{ lockDuration }}ms</span>
          </label>
          <input type="range" v-model.number="lockDuration" min="100" max="800" step="50" class="slider" />
          <div class="slider-labels">
            <span>Quick</span>
            <span>Long</span>
          </div>
        </div>

        <!-- Reset -->
        <button class="reset-btn" @click="resetDefaults">↻ Reset Defaults</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.settings-wrapper {
  position: fixed;
  top: 60px;
  right: 20px;
  z-index: 200;
}

.settings-toggle {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.settings-toggle:hover,
.settings-toggle.open {
  border-color: rgba(0, 212, 255, 0.4);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.15);
}

.settings-panel {
  position: absolute;
  top: 48px;
  right: 0;
  width: 310px;
  padding: 16px;
  border-radius: var(--radius-lg);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-header h3 {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: var(--neon-blue);
  margin: 0;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  transition: var(--transition);
}

.close-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.setting-group {
  margin-bottom: 18px;
}

.setting-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-primary);
  margin-bottom: 6px;
  font-weight: 500;
}

.toggle-label {
  cursor: pointer;
  user-select: none;
}

.setting-value {
  font-family: 'Orbitron', monospace;
  font-size: 0.7rem;
  color: var(--neon-green);
}

.setting-hint {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin: 4px 0 0;
  line-height: 1.4;
}

/* Slider */
.slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 2px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--neon-green);
  cursor: pointer;
  box-shadow: 0 0 8px rgba(57, 255, 20, 0.4);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.58rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Gesture Buttons */
.gesture-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gesture-btn {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.72rem;
  cursor: pointer;
  transition: var(--transition);
  text-align: left;
}

.gesture-btn:hover {
  border-color: rgba(57, 255, 20, 0.3);
  color: var(--text-primary);
}

.gesture-btn.active {
  border-color: var(--neon-green);
  color: var(--neon-green);
  background: rgba(57, 255, 20, 0.08);
}

/* Toggle */
.toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border);
  position: relative;
  transition: var(--transition);
  flex-shrink: 0;
}

.toggle.on {
  background: rgba(57, 255, 20, 0.3);
}

.toggle-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-muted);
  position: absolute;
  top: 2px;
  left: 2px;
  transition: var(--transition);
}

.toggle.on .toggle-thumb {
  left: 18px;
  background: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
}

/* Reset */
.reset-btn {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  transition: var(--transition);
}

.reset-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
