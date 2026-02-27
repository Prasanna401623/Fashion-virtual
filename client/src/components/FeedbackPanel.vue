<script setup>
defineProps({
  feedback: String,
  loading: Boolean,
  canAsk: Boolean
})
defineEmits(['get-feedback'])
</script>

<template>
  <div class="card feedback-panel">
    <p class="section-label">AI Style Advisor</p>

    <!-- Prompt to make selections first -->
    <div v-if="!canAsk" class="hint-box">
      <span class="hint-icon">💡</span>
      <p class="hint-text">Select a shirt and scenario above to unlock AI style feedback.</p>
    </div>

    <!-- Get Feedback Button -->
    <button
      v-else
      class="btn-primary get-feedback-btn"
      :disabled="loading"
      @click="$emit('get-feedback')"
    >
      <span v-if="loading" class="spinner"></span>
      <span v-else>✨ Get AI Style Feedback</span>
      <span v-if="loading"> Analyzing your style...</span>
    </button>

    <!-- AI Response -->
    <div v-if="feedback" class="feedback-result">
      <div class="feedback-header">
        <span>🤖 AI Advisor Says</span>
      </div>
      <p class="feedback-text">{{ feedback }}</p>
    </div>
  </div>
</template>

<style scoped>
.feedback-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hint-box {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
}

.hint-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.hint-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.get-feedback-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Loading spinner animation */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.feedback-result {
  background: rgba(168, 85, 247, 0.06);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.feedback-header {
  padding: 0.5rem 0.85rem;
  background: rgba(168, 85, 247, 0.1);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-primary);
  border-bottom: 1px solid rgba(168, 85, 247, 0.15);
}

.feedback-text {
  padding: 0.85rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.7;
}
</style>
