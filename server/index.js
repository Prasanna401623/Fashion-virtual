const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Serve DuckHunt game files ───
app.use('/duckhunt', express.static(path.join(__dirname, 'public', 'duckhunt')));

// ─── In-memory leaderboard ───
let leaderboard = [];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GunHand backend is running!' });
});

// Get leaderboard (top 10)
app.get('/api/leaderboard', (req, res) => {
  const top10 = leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json({ leaderboard: top10 });
});

// Submit score
app.post('/api/leaderboard', (req, res) => {
  const { name, score, hits, misses, accuracy, bestCombo } = req.body;

  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: 'Name and score are required' });
  }

  const entry = {
    id: Date.now().toString(),
    name: name.slice(0, 20),
    score,
    hits: hits || 0,
    misses: misses || 0,
    accuracy: accuracy || 0,
    bestCombo: bestCombo || 0,
    timestamp: new Date().toISOString()
  };

  leaderboard.push(entry);
  console.log(`[Leaderboard] New entry: ${name} — ${score} pts`);

  res.json({ entry, rank: leaderboard.filter(e => e.score >= score).length });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ GunHand server running on http://localhost:${PORT}`);
  console.log(`🦆 DuckHunt available at http://localhost:${PORT}/duckhunt/`);
});
