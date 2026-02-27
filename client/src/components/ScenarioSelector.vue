<script setup>
const props = defineProps({
  selected: String  // Currently selected scenario
})
const emit = defineEmits(['scenario-selected'])

const scenarios = [
  { id: 'job-interview',  label: 'Job Interview',   icon: '💼', description: 'Professional & confident' },
  { id: 'date-night',     label: 'Date Night',       icon: '🌙', description: 'Romantic & charming' },
  { id: 'casual-day',     label: 'Casual Day Out',   icon: '☀️', description: 'Relaxed & effortless' },
  { id: 'workout',        label: 'Gym / Workout',    icon: '💪', description: 'Active & energetic' },
  { id: 'party',          label: 'Party / Event',    icon: '🎉', description: 'Bold & expressive' },
  { id: 'business-lunch', label: 'Business Lunch',   icon: '🍽️', description: 'Smart casual' },
]

function selectScenario(scenario) {
  emit('scenario-selected', scenario.id)
}
</script>

<template>
  <div class="card scenario-selector">
    <p class="section-label">Choose a Scenario</p>

    <div class="scenarios-grid">
      <button
        v-for="scenario in scenarios"
        :key="scenario.id"
        class="scenario-btn"
        :class="{ active: props.selected === scenario.id }"
        @click="selectScenario(scenario)"
      >
        <span class="scenario-icon">{{ scenario.icon }}</span>
        <div class="scenario-text">
          <span class="scenario-label">{{ scenario.label }}</span>
          <span class="scenario-desc">{{ scenario.description }}</span>
        </div>
        <span v-if="props.selected === scenario.id" class="selected-check">✓</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.scenarios-grid {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.scenario-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
  color: var(--text-secondary);
  font-family: inherit;
  text-align: left;
  position: relative;
}

.scenario-btn:hover {
  background: var(--bg-card-hover);
  border-color: rgba(168, 85, 247, 0.3);
  color: var(--text-primary);
}

.scenario-btn.active {
  background: rgba(168, 85, 247, 0.1);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

.scenario-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.scenario-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.scenario-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.scenario-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.scenario-btn.active .scenario-desc {
  color: var(--text-secondary);
}

.selected-check {
  color: var(--accent-primary);
  font-weight: 700;
  font-size: 0.8rem;
}
</style>
