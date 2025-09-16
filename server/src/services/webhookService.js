// In-memory storage for webhooks and SSE clients
const webhooks = new Map();
const sseClients = new Set();

class WebhookService {
  // Add SSE client
  addSSEClient(client) {
    sseClients.add(client);
    client.on('close', () => {
      sseClients.delete(client);
    });
  }

  // Get SSE clients
  getSSEClients() {
    return sseClients;
  }
  // Generate a unique webhook ID
  generateWebhookId() {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create a new webhook
  createWebhook(config) {
    const webhookId = this.generateWebhookId();
    webhooks.set(webhookId, {
      id: webhookId,
      config,
      createdAt: new Date().toISOString()
    });
    return webhookId;
  }

  // Get webhook by ID
  getWebhook(webhookId) {
    return webhooks.get(webhookId);
  }

  // Delete webhook
  deleteWebhook(webhookId) {
    return webhooks.delete(webhookId);
  }

  // List all webhooks
  listWebhooks() {
    return Array.from(webhooks.values());
  }
}

export default new WebhookService();