<script setup>
defineProps({
  score: { type: Number, default: 0 },
  combo: { type: Number, default: 0 },
  timeLeft: { type: Number, default: 30 },
  round: { type: Number, default: 1 },
  totalRounds: { type: Number, default: 3 },
  hits: { type: Number, default: 0 },
  misses: { type: Number, default: 0 }
})
</script>

<template>
  <div class="scoreboard">
    <!-- Score -->
    <div class="stat-block score-block">
      <span class="stat-label">SCORE</span>
      <span class="stat-value text-neon-green font-display">{{ score.toLocaleString() }}</span>
    </div>

    <!-- Combo -->
    <div class="stat-block combo-block" :class="{ active: combo > 1 }">
      <span class="stat-label">COMBO</span>
      <span class="stat-value font-display" :class="{ 'text-neon-blue': combo > 1 }">
        ×{{ combo }}
      </span>
    </div>

    <!-- Timer -->
    <div class="stat-block timer-block" :class="{ urgent: timeLeft <= 5 }">
      <span class="stat-label">TIME</span>
      <span class="stat-value font-display">{{ timeLeft }}s</span>
    </div>

    <!-- Round -->
    <div class="stat-block round-block">
      <span class="stat-label">ROUND</span>
      <span class="stat-value font-display">{{ round }}/{{ totalRounds }}</span>
    </div>

    <!-- Accuracy -->
    <div class="stat-block accuracy-block">
      <span class="stat-label">ACC</span>
      <span class="stat-value font-display">
        {{ hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0 }}%
      </span>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(12px);
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 14px;
  border-radius: var(--radius-md);
  min-width: 70px;
}

.stat-label {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  font-family: 'Orbitron', monospace;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  transition: var(--transition);
}

.score-block {
  min-width: 100px;
}

.combo-block.active {
  background: rgba(0, 212, 255, 0.08);
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.combo-block.active .stat-value {
  animation: pulse-glow 0.8s infinite;
}

.timer-block.urgent .stat-value {
  color: var(--neon-red);
  animation: pulse-glow 0.5s infinite;
}

.accuracy-block .stat-value {
  color: var(--neon-orange);
}

@media (max-width: 600px) {
  .scoreboard {
    gap: 6px;
    padding: 8px 10px;
  }
  .stat-block {
    padding: 4px 8px;
    min-width: 50px;
  }
  .stat-value {
    font-size: 0.9rem;
  }
}
</style>
