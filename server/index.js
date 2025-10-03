const express = require('express');
const cors = require('cors');
const http = require('http'); // We need the http module to share a port
const { WebSocketServer } = require('ws'); // Import the WebSocketServer

// --- Basic Setup ---
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Create an HTTP server from the Express app
const server = http.createServer(app);

// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

// This will store our connected clients, mapping a workflow ID to a WebSocket connection
const clients = new Map();

// --- WebSocket Connection Logic ---
wss.on('connection', (ws) => {
  console.log('Frontend client connected via WebSocket.');

  // This event handler is called when a message is received from the frontend
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      // When the frontend starts a webhook workflow, it will send a 'register' event
      if (data.event === 'register-webhook') {
        const { workflowId } = data;
        console.log(`Registering client for webhook ID: ${workflowId}`);
        // Store the WebSocket connection with its unique workflow ID
        clients.set(workflowId, ws);
      }
    } catch(e) {
      console.error('Error parsing message from client:', e);
    }
  });

  ws.on('close', () => {
    console.log('Frontend client disconnected.');
    // Clean up the clients map when a client disconnects
    for (let [key, value] of clients.entries()) {
      if (value === ws) {
        clients.delete(key);
        console.log(`Unregistered client for webhook ID: ${key}`);
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});


// --- Express Routes ---
app.get('/', (req, res) => {
  res.send('Workflow Automation Server is running!');
});

app.post('/webhook/:nodeId', (req, res) => {
  const { nodeId } = req.params; // Using nodeId now
  console.log(`Webhook triggered for node ID: ${nodeId}`);

  // The map key is now the permanent node ID
  const clientWs = clients.get(nodeId);

  if (clientWs && clientWs.readyState === clientWs.OPEN) {
    console.log('Notifying frontend via WebSocket...');
    // *** CRITICAL CHANGE HERE: Send the nodeId back to the frontend ***
    clientWs.send(JSON.stringify({
      event: 'webhook-triggered',
      nodeId: nodeId, // Tell the client WHICH node was triggered
      data: req.body,
    }));
    res.status(200).json({ success: true, message: 'Webhook data successfully forwarded to workflow.' });
  } else {
    // ... rest of the function is the same
    console.warn('No active client listening for this webhook ID.');
    res.status(404).json({ success: false, error: 'No active workflow is listening for this webhook ID.' });
  }
});

// The existing endpoint for all other nodes remains the same
app.post('/execute-node', (req, res) => {
    // ... (Your existing /execute-node logic) ...
    const { nodeConfig } = req.body;
    if (!nodeConfig) {
      return res.status(400).json({ success: false, error: 'Node configuration is missing.' });
    }
    console.log(`Server received request to execute node: ${nodeConfig.displayName}`);
    const processingTime = Math.random() * 1000 + 1000;
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1;
      if (isSuccess) {
        res.json({ success: true, data: { message: `Successfully executed ${nodeConfig.displayName}` } });
      } else {
        res.status(500).json({ success: false, error: `Simulated server-side failure for ${nodeConfig.displayName}` });
      }
    }, processingTime);
});


// --- Start the Server ---
// We start the combined HTTP and WebSocket server, not the Express app directly.
server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});