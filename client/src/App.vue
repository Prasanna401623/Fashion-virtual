<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import GameCanvas from './components/GameCanvas.vue'
import HandTracker from './components/HandTracker.vue'
import ScoreBoard from './components/ScoreBoard.vue'
import GameOverScreen from './components/GameOverScreen.vue'
import { Howl } from 'howler'

// ─── Sound System (synthesized web audio) ───
const sounds = {
  shoot: new Howl({
    src: ['data:audio/wav;base64,UklGRl9vT19teleXkZGRkQBQAAAEAAIAESsAACJWAAACABAAUklGRg=='],
    volume: 0.3,
    onloaderror: () => {} // Fallback: silent
  }),
  hit: new Howl({
    src: ['data:audio/wav;base64,UklGRl9vT19teleXkZGRkQBQAAAEAAIAESsAACJWAAACABAAUklGRg=='],
    volume: 0.4,
    onloaderror: () => {}
  }),
  miss: new Howl({
    src: ['data:audio/wav;base64,UklGRl9vT19teleXkZGRkQBQAAAEAAIAESsAACJWAAACABAAUklGRg=='],
    volume: 0.2,
    onloaderror: () => {}
  })
}

// Use Web Audio API for actual sound synthesis
const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

function playShootSound() {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.frequency.setValueAtTime(800, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15)
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.15)
}

function playHitSound() {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1)
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.2)
}

function playMissSound() {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3)
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.3)
}

// ─── Game State ───
const gameState = ref('idle')    // 'idle' | 'playing' | 'round-end' | 'game-over'
const score = ref(0)
const combo = ref(0)
const bestCombo = ref(0)
const hits = ref(0)
const misses = ref(0)
const timeLeft = ref(30)
const round = ref(1)
const totalRounds = 3
const handPosition = ref(null)
const targets = ref([])
const shotFired = ref(0)
const lastHit = ref(null)
const trackerReady = ref(false)

// Timer & target spawner
let timerInterval = null
let spawnInterval = null
let targetIdCounter = 0

// ─── Difficulty Config (per round) ───
const ROUND_CONFIG = [
  { spawnRate: 1500, targetLifetime: 3000, maxRadius: 45, maxTargets: 3 },  // Round 1: Easy
  { spawnRate: 1200, targetLifetime: 2500, maxRadius: 38, maxTargets: 4 },  // Round 2: Medium
  { spawnRate: 900,  targetLifetime: 2000, maxRadius: 30, maxTargets: 5 },  // Round 3: Hard
]

function getRoundConfig() {
  return ROUND_CONFIG[Math.min(round.value - 1, ROUND_CONFIG.length - 1)]
}

// ─── Target Spawning ───
function spawnTarget() {
  const config = getRoundConfig()
  if (targets.value.filter(t => !t.hit).length >= config.maxTargets) return

  // Random position with margins (10%-90% range)
  const margin = 0.1
  const x = margin + Math.random() * (1 - 2 * margin)
  const y = margin + Math.random() * (1 - 2 * margin)

  targets.value.push({
    id: targetIdCounter++,
    x,
    y,
    maxRadius: config.maxRadius * (0.7 + Math.random() * 0.3),
    spawnTime: Date.now(),
    lifetime: config.targetLifetime,
    hit: false
  })
}

function cleanExpiredTargets() {
  const now = Date.now()
  targets.value = targets.value.filter(t => {
    if (t.hit) return false
    return (now - t.spawnTime) < t.lifetime
  })
}

// ─── Game Controls ───
function startGame() {
  // Resume audio context (browsers require user gesture)
  if (audioCtx.state === 'suspended') audioCtx.resume()

  score.value = 0
  combo.value = 0
  bestCombo.value = 0
  hits.value = 0
  misses.value = 0
  round.value = 1
  timeLeft.value = 30
  targets.value = []
  lastHit.value = null
  gameState.value = 'playing'

  startRound()
}

function startRound() {
  timeLeft.value = 30
  targets.value = []
  const config = getRoundConfig()

  // Timer countdown
  timerInterval = setInterval(() => {
    timeLeft.value--
    cleanExpiredTargets()

    if (timeLeft.value <= 0) {
      endRound()
    }
  }, 1000)

  // Target spawner
  spawnInterval = setInterval(spawnTarget, config.spawnRate)
  // Spawn first target immediately
  spawnTarget()
}

function endRound() {
  clearInterval(timerInterval)
  clearInterval(spawnInterval)
  targets.value = []

  if (round.value >= totalRounds) {
    gameState.value = 'game-over'
  } else {
    gameState.value = 'round-end'
    setTimeout(() => {
      round.value++
      gameState.value = 'playing'
      startRound()
    }, 2500)
  }
}

// ─── Event Handlers from HandTracker ───
function onHandMove(pos) {
  handPosition.value = pos
}

function onShoot() {
  if (gameState.value !== 'playing') return

  shotFired.value++
  playShootSound()

  // Check if crosshair is on any target
  const cx = handPosition.value?.x ?? 0
  const cy = handPosition.value?.y ?? 0

  let hitTarget = null
  for (const target of targets.value) {
    if (target.hit) continue

    const dx = cx - target.x
    const dy = cy - target.y
    // Calculate effective radius (targets are smaller in the game canvas, normalize)
    const hitRadius = (target.maxRadius / 800) * 1.2  // Approximate hit area
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < hitRadius) {
      hitTarget = target
      break
    }
  }

  if (hitTarget) {
    // HIT!
    hitTarget.hit = true
    combo.value++
    if (combo.value > bestCombo.value) bestCombo.value = combo.value
    hits.value++

    // Score: base 10 * combo, bonus for small targets
    const sizeBonus = hitTarget.maxRadius < 35 ? 5 : 0
    const points = (10 + sizeBonus) * combo.value
    score.value += points

    lastHit.value = { x: hitTarget.x, y: hitTarget.y, points }
    playHitSound()
  } else {
    // MISS
    combo.value = 0
    misses.value++
    lastHit.value = null
    playMissSound()
  }
}

function onHandLost() {
  handPosition.value = null
}

function onTrackerReady() {
  trackerReady.value = true
}

function restartGame() {
  clearInterval(timerInterval)
  clearInterval(spawnInterval)
  startGame()
}

onUnmounted(() => {
  clearInterval(timerInterval)
  clearInterval(spawnInterval)
})
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
            <p class="app-subtitle">Gesture-Controlled Shooting Range</p>
          </div>
        </div>

        <!-- Start Button (only in idle state) -->
        <button
          v-if="gameState === 'idle' && trackerReady"
          class="start-btn font-display"
          @click="startGame"
        >
          🎯 START GAME
        </button>

        <!-- Scoreboard (during game) -->
        <ScoreBoard
          v-if="gameState === 'playing' || gameState === 'round-end'"
          :score="score"
          :combo="combo"
          :timeLeft="timeLeft"
          :round="round"
          :totalRounds="totalRounds"
          :hits="hits"
          :misses="misses"
        />
      </div>
    </header>

    <!-- Game Area -->
    <main class="game-area">
      <div class="game-container">
        <GameCanvas
          :handPosition="handPosition"
          :targets="targets"
          :score="score"
          :combo="combo"
          :timeLeft="timeLeft"
          :round="round"
          :gameState="gameState"
          :shotFired="shotFired"
          :lastHit="lastHit"
        />

        <!-- Game Over Overlay -->
        <GameOverScreen
          v-if="gameState === 'game-over'"
          :finalScore="score"
          :hits="hits"
          :misses="misses"
          :bestCombo="bestCombo"
          @restart="restartGame"
        />
      </div>

      <!-- Hand Tracker PiP -->
      <HandTracker
        @hand-move="onHandMove"
        @shoot="onShoot"
        @hand-lost="onHandLost"
        @ready="onTrackerReady"
      />
    </main>
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
  padding: 10px 24px;
  position: relative;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1400px;
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
  font-size: 1.8rem;
}

.app-title {
  font-size: 1.3rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, var(--neon-green), var(--neon-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.app-subtitle {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin: 0;
  letter-spacing: 0.05em;
}

.start-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: linear-gradient(135deg, rgba(57, 255, 20, 0.15), rgba(0, 212, 255, 0.15));
  border: 1px solid rgba(57, 255, 20, 0.3);
  border-radius: var(--radius-md);
  color: var(--neon-green);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: var(--transition);
}

.start-btn:hover {
  background: linear-gradient(135deg, rgba(57, 255, 20, 0.25), rgba(0, 212, 255, 0.25));
  border-color: rgba(57, 255, 20, 0.5);
  box-shadow: var(--glow-green);
  transform: translateY(-2px);
}

.start-btn:active {
  transform: translateY(0);
}

.game-area {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: 16px 24px;
  overflow: hidden;
}

.game-container {
  flex: 1;
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

@media (max-width: 768px) {
  .header {
    padding: 8px 12px;
  }
  .header-content {
    flex-direction: column;
    gap: 8px;
  }
  .game-area {
    padding: 8px;
  }
}
</style>
