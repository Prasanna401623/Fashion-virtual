<script setup>
import WebcamView from './components/WebcamView.vue'
import ShirtSelector from './components/ShirtSelector.vue'
import ScenarioSelector from './components/ScenarioSelector.vue'
import FeedbackPanel from './components/FeedbackPanel.vue'
import { ref } from 'vue'

// These are "reactive" variables — when they change, the UI updates automatically
const selectedShirt = ref(null)      // Which shirt is currently selected
const selectedScenario = ref('')     // Which scenario is selected (e.g. "job interview")
const aiFeedback = ref('')           // The AI's style advice
const isLoadingFeedback = ref(false) // Whether we're waiting for the AI response

// Called when user clicks "Get AI Feedback"
async function getFeedback() {
  if (!selectedShirt.value || !selectedScenario.value) return
  isLoadingFeedback.value = true
  aiFeedback.value = ''
  try {
    const response = await fetch('http://localhost:3000/api/style-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shirtColor: selectedShirt.value.color,
        scenario: selectedScenario.value
      })
    })
    const data = await response.json()
    aiFeedback.value = data.feedback
  } catch (err) {
    aiFeedback.value = 'Could not reach the AI server. Make sure the backend is running.'
  } finally {
    isLoadingFeedback.value = false
  }
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="logo-area">
          <span class="logo-icon">👗</span>
          <div>
            <h1 class="app-title">Virtual Styling Studio</h1>
            <p class="app-subtitle">AI-Powered Fashion Advisor</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Layout -->
    <main class="main-layout">
      <!-- Left Panel: Controls -->
      <aside class="control-panel">
        <ShirtSelector @shirt-selected="selectedShirt = $event" :selected="selectedShirt" />
        <ScenarioSelector @scenario-selected="selectedScenario = $event" :selected="selectedScenario" />
        <FeedbackPanel
          :feedback="aiFeedback"
          :loading="isLoadingFeedback"
          :canAsk="!!selectedShirt && !!selectedScenario"
          @get-feedback="getFeedback"
        />
      </aside>

      <!-- Right Panel: Webcam -->
      <section class="webcam-section">
        <WebcamView :shirt="selectedShirt" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 2rem;
}

.app-title {
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.app-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
  letter-spacing: 0.05em;
}

.main-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  flex: 1;
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.webcam-section {
  display: flex;
  align-items: flex-start;
}

@media (max-width: 900px) {
  .main-layout {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
}
</style>
