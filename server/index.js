const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS so our React/Vue frontend on port 5173 can talk to this server
app.use(cors());

// Enable JSON parsing for incoming request bodies
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// The AI feedback endpoint (placeholder for now, Azure AI comes in Day 5)
app.post('/api/style-feedback', (req, res) => {
  const { shirtColor, scenario } = req.body;

  console.log(`Received request for shirt: ${shirtColor}, scenario: ${scenario}`);

  // Fake AI response for testing the connection
  const fakeResponse = `(Day 4 Placeholder) A ${shirtColor} shirt is a fantastic choice for a ${scenario}. It creates a very clean and confident look!`;

  // We simulate a 1-second delay so you can see the loading spinner in the UI
  setTimeout(() => {
    res.json({ feedback: fakeResponse });
  }, 1000);
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
