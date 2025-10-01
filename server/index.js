// Import the Express library to create and manage the server
const express = require('express');

// Import the CORS library to allow requests from your frontend
const cors = require('cors');

// Create an instance of an Express application
const app = express();

// Define the port number the server will run on. 
// It's good practice to use an environment variable or a default.
const PORT = 3001;

// --- Middleware ---
// Middleware are functions that run for every request.

// Enable CORS for all routes, so your React app (on a different port) can make requests.
app.use(cors());

// Enable the Express app to parse JSON-formatted request bodies.
// This is how you'll get data from your frontend.
app.use(express.json());


// --- Routes ---
// Routes define the API endpoints of your server.

// A simple test route to check if the server is working.
app.get('/', (req, res) => {
  res.send('Workflow Automation Server is running!');
});


// Endpoint to execute a single workflow node
app.post('/execute-node', (req, res) => {
  // Get the node's configuration from the request body
  const { nodeConfig } = req.body;

  if (!nodeConfig) {
    return res.status(400).json({ success: false, error: 'Node configuration is missing.' });
  }

  console.log(`Server received request to execute node: ${nodeConfig.displayName}`);

  // --- THIS IS WHERE YOUR ACTUAL NODE LOGIC WILL GO ---
  // For now, we'll just simulate a process that takes 1-2 seconds.
  // We'll also simulate a 90% success rate, just like the old mock function.
  
  const processingTime = Math.random() * 1000 + 1000; // 1-2 seconds
  setTimeout(() => {
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      console.log(`Execution SUCCESS for node: ${nodeConfig.displayName}`);
      res.json({
        success: true,
        data: {
          message: `Successfully executed ${nodeConfig.displayName}`,
          receivedAt: new Date().toISOString(),
        },
      });
    } else {
      console.log(`Execution FAILED for node: ${nodeConfig.displayName}`);
      res.status(500).json({
        success: false,
        error: `Simulated server-side failure for ${nodeConfig.displayName}`,
      });
    }
  }, processingTime);
});



// --- Start the Server ---
// This command starts the server and makes it listen for incoming requests on the specified port.
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});