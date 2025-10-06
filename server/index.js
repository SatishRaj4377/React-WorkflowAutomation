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

// Server-side node execution endpoints for specific integrations
const mockNodeExecution = (nodeType, data) => {
  return new Promise((resolve) => {
    const processingTime = Math.random() * 1000 + 500;
    setTimeout(() => {
      const success = Math.random() > 0.1;
      if (success) {
        resolve({ 
          success: true, 
          data: {
            ...data,
            executedAt: new Date().toISOString(),
            nodeType,
            executionId: `exec-${Date.now()}`
          }
        });
      } else {
        resolve({ 
          success: false, 
          error: `Failed to execute ${nodeType} node: Service temporarily unavailable`
        });
      }
    }, processingTime);
  });
};

// Gmail integration endpoint
app.post('/execute-node/gmail', async (req, res) => {
  const result = await mockNodeExecution('Gmail', {
    messages: [
      { 
        id: '1', 
        subject: 'Test Email', 
        from: 'test@example.com', 
        date: new Date(),
        snippet: 'This is a test email message...',
        hasAttachments: false,
        labels: ['inbox', 'unread']
      }
    ],
    totalMessages: 1,
    mailbox: 'inbox'
  });
  res.json(result);
});

// Google Sheets integration endpoint
app.post('/execute-node/gsheets', async (req, res) => {
  const result = await mockNodeExecution('Google Sheets', {
    values: [
      ['Column 1', 'Column 2', 'Column 3'], 
      ['Value 1', 'Value 2', 'Value 3'],
      ['Value 4', 'Value 5', 'Value 6']
    ],
    sheetName: 'Sheet1',
    totalRows: 3,
    totalColumns: 3,
    lastUpdated: new Date().toISOString()
  });
  res.json(result);
});

// Google Calendar integration endpoint
app.post('/execute-node/gcalendar', async (req, res) => {
  const result = await mockNodeExecution('Google Calendar', {
    events: [
      { 
        id: '1',
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        location: 'Online - Google Meet',
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
        attendees: ['team@company.com'],
        status: 'confirmed'
      }
    ],
    calendar: 'primary',
    timezone: 'UTC'
  });
  res.json(result);
});

// Google Docs integration endpoint
app.post('/execute-node/gdocs', async (req, res) => {
  const result = await mockNodeExecution('Google Docs', {
    document: {
      id: 'doc1',
      title: 'Test Document',
      content: 'This is a test document content',
      lastModified: new Date().toISOString(),
      permissions: ['view', 'edit']
    }
  });
  res.json(result);
});

// Telegram integration endpoint
app.post('/execute-node/telegram', async (req, res) => {
  const result = await mockNodeExecution('Telegram', {
    message: {
      id: 'msg1',
      text: 'Test message',
      chat: { id: 123, type: 'private' },
      date: new Date().toISOString(),
      status: 'sent'
    }
  });
  res.json(result);
});

// Twilio integration endpoint
app.post('/execute-node/twilio', async (req, res) => {
  const result = await mockNodeExecution('Twilio', {
    message: {
      sid: 'SM123',
      body: 'Test SMS',
      to: '+1234567890',
      status: 'sent',
      sent: new Date().toISOString()
    }
  });
  res.json(result);
});


// --- Start the Server ---
// We start the combined HTTP and WebSocket server, not the Express app directly.
server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});