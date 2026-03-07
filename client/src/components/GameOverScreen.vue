<script setup>
import { computed } from 'vue'

const props = defineProps({
  finalScore: { type: Number, default: 0 },
  hits: { type: Number, default: 0 },
  misses: { type: Number, default: 0 },
  bestCombo: { type: Number, default: 0 }
})

const emit = defineEmits(['restart'])

const accuracy = computed(() => {
  const total = props.hits + props.misses
  return total > 0 ? Math.round((props.hits / total) * 100) : 0
})

const stars = computed(() => {
  if (accuracy.value >= 80) return 3
  if (accuracy.value >= 50) return 2
  return 1
})

const ratingText = computed(() => {
  if (stars.value === 3) return 'SHARPSHOOTER!'
  if (stars.value === 2) return 'NICE SHOOTING!'
  return 'KEEP PRACTICING'
})
</script>

<template>
  <div class="game-over-overlay">
    <div class="game-over-card">
      <!-- Title -->
      <h2 class="game-over-title font-display">GAME OVER</h2>

      <!-- Stars -->
      <div class="stars">
        <span v-for="i in 3" :key="i" class="star" :class="{ filled: i <= stars }">★</span>
      </div>
      <p class="rating-text font-display">{{ ratingText }}</p>

      <!-- Final Score -->
      <div class="final-score">
        <span class="score-label">FINAL SCORE</span>
        <span class="score-number font-display text-neon-green">{{ finalScore.toLocaleString() }}</span>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-num text-neon-blue font-display">{{ hits }}</span>
          <span class="stat-name">Hits</span>
        </div>
        <div class="stat-item">
          <span class="stat-num font-display" style="color: var(--neon-red);">{{ misses }}</span>
          <span class="stat-name">Misses</span>
        </div>
        <div class="stat-item">
          <span class="stat-num font-display" style="color: var(--neon-orange);">{{ accuracy }}%</span>
          <span class="stat-name">Accuracy</span>
        </div>
        <div class="stat-item">
          <span class="stat-num font-display" style="color: var(--neon-purple);">×{{ bestCombo }}</span>
          <span class="stat-name">Best Combo</span>
        </div>
      </div>

      <!-- Replay Button -->
      <button class="replay-btn font-display" @click="emit('restart')">
        <span>🎯</span> PLAY AGAIN
      </button>
    </div>
  </div>
</template>

<style scoped>
.game-over-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 23, 0.85);
  backdrop-filter: blur(8px);
  z-index: 50;
  animation: slide-in-up 0.5s ease;
}

.game-over-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 48px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(16px);
  max-width: 420px;
  width: 90%;
}

.game-over-title {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, var(--neon-red), var(--neon-orange));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stars {
  display: flex;
  gap: 8px;
  font-size: 2.5rem;
}

.star {
  color: var(--text-muted);
  transition: var(--transition-slow);
}

.star.filled {
  color: #fbbf24;
  text-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
  animation: count-up 0.5s ease both;
}

.star.filled:nth-child(2) { animation-delay: 0.2s; }
.star.filled:nth-child(3) { animation-delay: 0.4s; }

.rating-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  letter-spacing: 0.15em;
}

.final-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 0;
}

.score-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 0.15em;
  font-family: 'Orbitron', monospace;
}

.score-number {
  font-size: 2.8rem;
  font-weight: 900;
  animation: count-up 0.6s ease both;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-num {
  font-size: 1.2rem;
  font-weight: 700;
}

.stat-name {
  font-size: 0.62rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.replay-btn {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  background: linear-gradient(135deg, rgba(57, 255, 20, 0.15), rgba(0, 212, 255, 0.15));
  border: 1px solid rgba(57, 255, 20, 0.3);
  border-radius: var(--radius-md);
  color: var(--neon-green);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: var(--transition);
}

.replay-btn:hover {
  background: linear-gradient(135deg, rgba(57, 255, 20, 0.25), rgba(0, 212, 255, 0.25));
  border-color: rgba(57, 255, 20, 0.5);
  box-shadow: var(--glow-green);
  transform: translateY(-2px);
}

.replay-btn:active {
  transform: translateY(0);
}

@media (max-width: 500px) {
  .game-over-card {
    padding: 24px 20px;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .score-number {
    font-size: 2rem;
  }
}
</style>
