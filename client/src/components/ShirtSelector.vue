<script setup>
// defineProps lets parent components pass data INTO this component
// defineEmits lets this component send events back UP to the parent
const props = defineProps({
  shirt: Object  // The currently selected shirt object
})
const emit = defineEmits(['shirt-selected'])

// Our shirt options — in a real app these URLs would come from AWS S3
// For now we use placeholder colors; we'll swap with real S3 URLs on Day 4
const s3BaseUrl = 'https://virtual-styling-shirts-prasanna.s3.us-east-2.amazonaws.com'

const shirts = [
  { id: 1, name: 'Classic White', color: 'white', imageUrl: `${s3BaseUrl}/white-tshirt.png` },
  { id: 2, name: 'Ruby Red',      color: 'red',   imageUrl: `${s3BaseUrl}/red-tshirt.png` },
  { id: 3, name: 'Ocean Blue',    color: 'blue',  imageUrl: `${s3BaseUrl}/blue-tshirt.png` },
  { id: 4, name: 'Cool Grey',     color: 'grey',  imageUrl: `${s3BaseUrl}/grey-tshirt.png` },
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
        <!-- Real image thumbnail -->
        <div class="thumbnail-wrapper" :class="{ 'is-selected': props.shirt?.id === shirt.id }">
          <img :src="shirt.imageUrl" :alt="shirt.name" class="shirt-thumbnail" />
        </div>
        
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

.thumbnail-wrapper {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  transition: var(--transition);
}

.thumbnail-wrapper.is-selected {
  border-color: var(--accent-primary);
  background: rgba(168, 85, 247, 0.1);
}

.shirt-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* Add a tiny drop shadow to make the transparent png pop */
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
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
