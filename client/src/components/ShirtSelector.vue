<script setup>
// defineProps lets parent components pass data INTO this component
// defineEmits lets this component send events back UP to the parent
const props = defineProps({
  shirt: Object  // The currently selected shirt object
})
const emit = defineEmits(['shirt-selected'])

// Our shirt options — in a real app these URLs would come from AWS S3
// For now we use placeholder colors; we'll swap with real S3 URLs on Day 4
const shirts = [
  { id: 1, name: 'Classic White', color: 'white', hex: '#f0f0f0', emoji: '⬜' },
  { id: 2, name: 'Ocean Blue',   color: 'blue',   hex: '#2563eb', emoji: '🟦' },
  { id: 3, name: 'Midnight Black', color: 'black', hex: '#1a1a1a', emoji: '⬛' },
  { id: 4, name: 'Coral Pink',   color: 'pink',   hex: '#ec4899', emoji: '🟥' },
  { id: 5, name: 'Forest Green', color: 'green',  hex: '#16a34a', emoji: '🟩' },
  { id: 6, name: 'Royal Purple', color: 'purple', hex: '#7c3aed', emoji: '🟪' },
]

function selectShirt(shirt) {
  emit('shirt-selected', shirt)
}
</script>

<template>
  <div class="card shirt-selector">
    <p class="section-label">Select Your Shirt</p>

    <div class="shirts-grid">
      <button
        v-for="shirt in shirts"
        :key="shirt.id"
        class="shirt-btn"
        :class="{ active: props.shirt?.id === shirt.id }"
        @click="selectShirt(shirt)"
        :title="shirt.name"
      >
        <!-- Color preview circle -->
        <span
          class="color-circle"
          :style="{ background: shirt.hex, boxShadow: props.shirt?.id === shirt.id ? `0 0 12px ${shirt.hex}88` : 'none' }"
        ></span>
        <span class="shirt-name">{{ shirt.name }}</span>

        <!-- Checkmark when selected -->
        <span v-if="props.shirt?.id === shirt.id" class="selected-check">✓</span>
      </button>
    </div>

    <!-- Show currently selected shirt -->
    <div v-if="props.shirt" class="selected-info">
      <span class="badge">Selected: {{ props.shirt.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.shirt-selector {
  /* Inherits .card from global style.css */
}

.shirts-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.shirt-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.85rem;
  position: relative;
  text-align: left;
}

.shirt-btn:hover {
  background: var(--bg-card-hover);
  border-color: rgba(168, 85, 247, 0.3);
  color: var(--text-primary);
}

.shirt-btn.active {
  background: rgba(168, 85, 247, 0.1);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

.color-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.15);
  transition: var(--transition);
}

.shirt-name {
  flex: 1;
}

.selected-check {
  color: var(--accent-primary);
  font-weight: 700;
  font-size: 0.8rem;
}

.selected-info {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}
</style>
