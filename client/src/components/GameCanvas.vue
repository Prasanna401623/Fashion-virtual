<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  handPosition: Object,     // { x: 0-1, y: 0-1 }
  targets: Array,           // [{ id, x, y, radius, maxRadius, spawnTime, hit }]
  score: Number,
  combo: Number,
  timeLeft: Number,
  round: Number,
  gameState: String,        // 'idle' | 'playing' | 'round-end' | 'game-over'
  shotFired: Number,        // increments on each shot - triggers effects
  lastHit: Object           // { x, y, points } or null
})

const canvasRef = ref(null)
let animationFrameId = null

// Smoothed crosshair position (lerped)
let smoothX = 0.5
let smoothY = 0.5

// Particles for hit effects
let particles = []

// Screen shake
let shakeAmount = 0

// Score popups
let scorePopups = []

// Shot flash
let flashAlpha = 0

// ─── Particle system ───
function spawnHitParticles(x, y) {
  for (let i = 0; i < 15; i++) {
    const angle = (Math.PI * 2 * i) / 15 + Math.random() * 0.5
    const speed = 2 + Math.random() * 4
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      radius: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? '#39ff14' : '#00d4ff'
    })
  }
}

function spawnMissEffect() {
  shakeAmount = 6
  flashAlpha = 0.15
}

// Watch for shots
watch(() => props.shotFired, () => {
  if (props.lastHit) {
    // Hit!
    const canvas = canvasRef.value
    if (canvas) {
      spawnHitParticles(props.lastHit.x * canvas.width, props.lastHit.y * canvas.height)
      scorePopups.push({
        x: props.lastHit.x * canvas.width,
        y: props.lastHit.y * canvas.height,
        points: props.lastHit.points,
        life: 1
      })
    }
  } else {
    // Miss!
    spawnMissEffect()
  }
})

// ─── Main render loop ───
function render() {
  const canvas = canvasRef.value
  if (!canvas) {
    animationFrameId = requestAnimationFrame(render)
    return
  }

  const ctx = canvas.getContext('2d')
  const W = canvas.width = canvas.clientWidth * window.devicePixelRatio
  const H = canvas.height = canvas.clientHeight * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  const w = canvas.clientWidth
  const h = canvas.clientHeight

  // Apply screen shake
  if (shakeAmount > 0) {
    ctx.save()
    ctx.translate(
      (Math.random() - 0.5) * shakeAmount,
      (Math.random() - 0.5) * shakeAmount
    )
    shakeAmount *= 0.9
    if (shakeAmount < 0.5) shakeAmount = 0
  }

  // ── Background ──
  ctx.fillStyle = '#0a0e17'
  ctx.fillRect(0, 0, w, h)

  // Grid lines (shooting range aesthetic)
  ctx.strokeStyle = 'rgba(57, 255, 20, 0.04)'
  ctx.lineWidth = 1
  const gridSize = 60
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // ── Draw targets ──
  if (props.targets && props.gameState === 'playing') {
    const now = Date.now()
    for (const target of props.targets) {
      if (target.hit) continue

      const tx = target.x * w
      const ty = target.y * h
      const age = (now - target.spawnTime) / target.lifetime
      const currentRadius = target.maxRadius * (1 - age * 0.6) // Shrink over time
      const alpha = Math.max(0, 1 - age)

      if (currentRadius <= 0 || alpha <= 0) continue

      // Outer ring
      ctx.beginPath()
      ctx.arc(tx, ty, currentRadius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 59, 59, ${alpha * 0.6})`
      ctx.lineWidth = 2
      ctx.stroke()

      // Middle ring
      ctx.beginPath()
      ctx.arc(tx, ty, currentRadius * 0.65, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 149, 0, ${alpha * 0.5})`
      ctx.lineWidth = 2
      ctx.stroke()

      // Inner bullseye
      ctx.beginPath()
      ctx.arc(tx, ty, currentRadius * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 59, 59, ${alpha * 0.8})`
      ctx.fill()

      // Center dot
      ctx.beginPath()
      ctx.arc(tx, ty, 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fill()

      // Glow
      const gradient = ctx.createRadialGradient(tx, ty, 0, tx, ty, currentRadius * 1.3)
      gradient.addColorStop(0, `rgba(255, 59, 59, ${alpha * 0.15})`)
      gradient.addColorStop(1, 'rgba(255, 59, 59, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(tx, ty, currentRadius * 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Draw particles ──
  particles = particles.filter(p => p.life > 0)
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.1 // gravity
    p.life -= p.decay

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2)
    ctx.fillStyle = p.color.replace(')', `, ${p.life})`).replace('rgb', 'rgba').replace('#', '')
    // Use hex with alpha
    const r = parseInt(p.color.slice(1, 3), 16)
    const g = parseInt(p.color.slice(3, 5), 16)
    const b = parseInt(p.color.slice(5, 7), 16)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life})`
    ctx.fill()
  }

  // ── Score popups ──
  scorePopups = scorePopups.filter(s => s.life > 0)
  for (const s of scorePopups) {
    s.y -= 1.5
    s.life -= 0.02

    ctx.font = `bold ${18 + (1 - s.life) * 10}px 'Orbitron', monospace`
    ctx.fillStyle = `rgba(57, 255, 20, ${s.life})`
    ctx.textAlign = 'center'
    ctx.fillText(`+${s.points}`, s.x, s.y)
  }

  // ── Crosshair ──
  if (props.handPosition && props.gameState === 'playing') {
    // Lerp for smoothness
    smoothX += (props.handPosition.x - smoothX) * 0.15
    smoothY += (props.handPosition.y - smoothY) * 0.15

    const cx = smoothX * w
    const cy = smoothY * h
    const size = 20

    ctx.strokeStyle = '#39ff14'
    ctx.lineWidth = 2
    ctx.shadowColor = '#39ff14'
    ctx.shadowBlur = 10

    // Horizontal line
    ctx.beginPath()
    ctx.moveTo(cx - size, cy)
    ctx.lineTo(cx - 6, cy)
    ctx.moveTo(cx + 6, cy)
    ctx.lineTo(cx + size, cy)
    ctx.stroke()

    // Vertical line
    ctx.beginPath()
    ctx.moveTo(cx, cy - size)
    ctx.lineTo(cx, cy - 6)
    ctx.moveTo(cx, cy + 6)
    ctx.lineTo(cx, cy + size)
    ctx.stroke()

    // Center dot
    ctx.beginPath()
    ctx.arc(cx, cy, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#39ff14'
    ctx.fill()

    // Outer circle
    ctx.beginPath()
    ctx.arc(cx, cy, size + 4, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(57, 255, 20, 0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.shadowBlur = 0
  }

  // ── Shot flash overlay ──
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 59, 59, ${flashAlpha})`
    ctx.fillRect(0, 0, w, h)
    flashAlpha *= 0.85
    if (flashAlpha < 0.01) flashAlpha = 0
  }

  // ── Idle state message ──
  if (props.gameState === 'idle') {
    ctx.font = "bold 20px 'Orbitron', monospace"
    ctx.fillStyle = 'rgba(57, 255, 20, 0.8)'
    ctx.textAlign = 'center'
    ctx.fillText('PRESS START TO BEGIN', w / 2, h / 2 - 10)

    ctx.font = "14px 'Inter', sans-serif"
    ctx.fillStyle = 'rgba(139, 148, 158, 0.8)'
    ctx.fillText('Open your palm to aim • Close your fist to shoot', w / 2, h / 2 + 20)
  }

  // ── Round end message ──
  if (props.gameState === 'round-end') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, w, h)

    ctx.font = "bold 28px 'Orbitron', monospace"
    ctx.fillStyle = '#00d4ff'
    ctx.textAlign = 'center'
    ctx.fillText(`ROUND ${props.round} COMPLETE`, w / 2, h / 2 - 10)

    ctx.font = "16px 'Inter', sans-serif"
    ctx.fillStyle = '#8b949e'
    ctx.fillText('Next round starting...', w / 2, h / 2 + 25)
  }

  if (shakeAmount > 0) {
    ctx.restore()
  }

  animationFrameId = requestAnimationFrame(render)
}

onMounted(() => {
  animationFrameId = requestAnimationFrame(render)
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
})
</script>

<template>
  <canvas ref="canvasRef" class="game-canvas"></canvas>
</template>

<style scoped>
.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}
</style>
