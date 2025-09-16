import express from 'express';
import webhookService from '../services/webhookService.js';

const router = express.Router();

// Create a new webhook
router.post('/webhooks', (req, res) => {
  const config = req.body;
  const webhookId = webhookService.createWebhook(config);
  
  res.json({
    id: webhookId,
    url: `${process.env.API_BASE_URL || `http://localhost:${process.env.SERVER_PORT || 3001}`}/api/webhooks/${webhookId}/trigger`
  });
});

// List all webhooks
router.get('/webhooks', (_req, res) => {
  const webhooks = webhookService.listWebhooks();
  res.json(webhooks);
});

// Delete a webhook
router.delete('/webhooks/:id', (req, res) => {
  const { id } = req.params;
  const deleted = webhookService.deleteWebhook(id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Webhook not found' });
  }
  
  res.json({ success: true });
});

// SSE endpoint for webhook events
router.get('/webhooks/events', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:3000',
    'Access-Control-Allow-Credentials': 'true'
  });
  
  // Send initial connection succeeded message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  // Add this client to SSE clients list
  webhookService.addSSEClient(res);
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    webhookService.getSSEClients().delete(res);
    res.end();
  });
});

// Handle webhook triggers
router.post('/webhooks/:id/trigger', (req, res) => {
  const { id } = req.params;
  const webhook = webhookService.getWebhook(id);
  
  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }
  
  const triggerData = {
    webhookId: id,
    timestamp: new Date().toISOString(),
    payload: req.body,
    webhookName: webhook.config.name || 'Unnamed Webhook'
  };
  
  // Store trigger data with webhook
  webhook.lastTrigger = triggerData;

  // Notify all SSE clients
  const sseClients = webhookService.getSSEClients();
  const eventData = {
    type: 'webhook-triggered',
    data: {
      ...triggerData,
      payload: JSON.stringify(triggerData.payload) // Ensure payload is stringified
    }
  };
  
  console.log('Broadcasting to SSE clients:', eventData);
  const eventString = `event: webhook\ndata: ${JSON.stringify(eventData)}\n\n`;
  
  sseClients.forEach(client => {
    try {
      client.write(eventString);
      console.log('Successfully sent event to client');
    } catch (error) {
      console.error('Failed to send SSE event:', error);
      // Remove failed client
      webhookService.getSSEClients().delete(client);
    }
  });
  
  res.json({ success: true, triggerData });
});

export default router;