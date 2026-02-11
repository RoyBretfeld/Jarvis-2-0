/**
 * OpenClaw Gateway Integration
 *
 * Connects the GEM Configuration Agent to OpenClaw's multi-channel system
 * Supports: Telegram, WhatsApp, Discord, Slack, Google Chat, and more
 */

const EventEmitter = require('events');

class OpenClawGateway extends EventEmitter {
  constructor(agentCore, config = {}) {
    super();

    this.agent = agentCore;
    this.config = {
      gatewayPort: 18789,
      canvasPort: 18793,
      wsUrl: 'ws://127.0.0.1:18789',
      channels: {},
      ...config
    };

    this.channelConnections = new Map();
    this.messageQueue = [];
  }

  /**
   * Initialize OpenClaw gateway
   */
  async initialize() {
    console.log('🌐 Initializing OpenClaw Gateway...');

    try {
      // Initialize message queue processor
      this.startMessageQueueProcessor();

      // Register channels
      await this.registerChannels();

      console.log('✅ OpenClaw Gateway initialized');
      this.emit('gateway:ready');
    } catch (error) {
      console.error('❌ Gateway initialization failed:', error);
      this.emit('gateway:error', error);
      throw error;
    }
  }

  /**
   * Register supported channels
   */
  async registerChannels() {
    const channels = [
      { name: 'telegram', enabled: this.config.channels.telegram },
      { name: 'whatsapp', enabled: this.config.channels.whatsapp },
      { name: 'discord', enabled: this.config.channels.discord },
      { name: 'slack', enabled: this.config.channels.slack },
      { name: 'google-chat', enabled: this.config.channels['google-chat'] }
    ];

    for (const channel of channels) {
      if (channel.enabled) {
        try {
          await this.setupChannel(channel.name);
          console.log(`✅ Channel enabled: ${channel.name}`);
        } catch (error) {
          console.warn(`⚠️  Channel setup failed: ${channel.name}`, error.message);
        }
      }
    }
  }

  /**
   * Setup individual channel
   */
  async setupChannel(channelName) {
    const channelHandlers = {
      telegram: this.setupTelegram.bind(this),
      whatsapp: this.setupWhatsApp.bind(this),
      discord: this.setupDiscord.bind(this),
      slack: this.setupSlack.bind(this),
      'google-chat': this.setupGoogleChat.bind(this)
    };

    const handler = channelHandlers[channelName];
    if (!handler) throw new Error(`Unknown channel: ${channelName}`);

    await handler();
  }

  /**
   * Setup Telegram channel
   */
  async setupTelegram() {
    const telegramConfig = this.config.channels.telegram || {};

    const handler = async (message) => {
      return this.processChannelMessage(message, 'telegram');
    };

    this.agent.registerChannel('telegram', handler);
    this.channelConnections.set('telegram', {
      type: 'telegram',
      enabled: true,
      config: telegramConfig,
      status: 'connected'
    });

    this.emit('channel:setup', { channel: 'telegram', status: 'ready' });
  }

  /**
   * Setup WhatsApp channel
   */
  async setupWhatsApp() {
    const whatsappConfig = this.config.channels.whatsapp || {};

    const handler = async (message) => {
      return this.processChannelMessage(message, 'whatsapp');
    };

    this.agent.registerChannel('whatsapp', handler);
    this.channelConnections.set('whatsapp', {
      type: 'whatsapp',
      enabled: true,
      config: whatsappConfig,
      status: 'connected'
    });

    this.emit('channel:setup', { channel: 'whatsapp', status: 'ready' });
  }

  /**
   * Setup Discord channel
   */
  async setupDiscord() {
    const discordConfig = this.config.channels.discord || {};

    const handler = async (message) => {
      return this.processChannelMessage(message, 'discord');
    };

    this.agent.registerChannel('discord', handler);
    this.channelConnections.set('discord', {
      type: 'discord',
      enabled: true,
      config: discordConfig,
      status: 'connected'
    });

    this.emit('channel:setup', { channel: 'discord', status: 'ready' });
  }

  /**
   * Setup Slack channel
   */
  async setupSlack() {
    const slackConfig = this.config.channels.slack || {};

    const handler = async (message) => {
      return this.processChannelMessage(message, 'slack');
    };

    this.agent.registerChannel('slack', handler);
    this.channelConnections.set('slack', {
      type: 'slack',
      enabled: true,
      config: slackConfig,
      status: 'connected'
    });

    this.emit('channel:setup', { channel: 'slack', status: 'ready' });
  }

  /**
   * Setup Google Chat channel
   */
  async setupGoogleChat() {
    const googleChatConfig = this.config.channels['google-chat'] || {};

    const handler = async (message) => {
      return this.processChannelMessage(message, 'google-chat');
    };

    this.agent.registerChannel('google-chat', handler);
    this.channelConnections.set('google-chat', {
      type: 'google-chat',
      enabled: true,
      config: googleChatConfig,
      status: 'connected'
    });

    this.emit('channel:setup', { channel: 'google-chat', status: 'ready' });
  }

  /**
   * Process message from channel
   */
  async processChannelMessage(message, channelName) {
    const messageId = `msg_${Date.now()}`;

    console.log(`📨 Message received from ${channelName}: ${message.substring(0, 50)}...`);

    // Extract or create session
    const sessionId = message.metadata?.sessionId || `session_${channelName}_${message.userId}`;

    // Add to session
    this.agent.addMessageToSession(sessionId, message.text, 'user');

    // Queue message for processing
    this.messageQueue.push({
      id: messageId,
      channel: channelName,
      sessionId,
      message,
      received: new Date()
    });

    return { messageId, queued: true };
  }

  /**
   * Process message queue
   */
  startMessageQueueProcessor() {
    setInterval(async () => {
      if (this.messageQueue.length === 0) return;

      const queuedMessage = this.messageQueue.shift();

      try {
        // Generate response
        const response = await this.agent.generateResponse(
          queuedMessage.message.text,
          {
            userId: queuedMessage.message.userId,
            sessionId: queuedMessage.sessionId,
            channel: queuedMessage.channel
          }
        );

        // Add agent response to session
        this.agent.addMessageToSession(
          queuedMessage.sessionId,
          response,
          'assistant'
        );

        // Route response back through channel
        await this.agent.routeMessage(
          {
            text: response,
            userId: queuedMessage.message.userId,
            sessionId: queuedMessage.sessionId
          },
          queuedMessage.channel
        );

        this.emit('message:processed', {
          messageId: queuedMessage.id,
          channel: queuedMessage.channel,
          status: 'sent'
        });
      } catch (error) {
        console.error('Error processing message:', error);
        this.emit('message:error', {
          messageId: queuedMessage.id,
          error: error.message
        });
      }
    }, 100);
  }

  /**
   * Get gateway status
   */
  getStatus() {
    return {
      gateway: {
        port: this.config.gatewayPort,
        canvasPort: this.config.canvasPort,
        wsUrl: this.config.wsUrl,
        status: 'operational'
      },
      channels: {
        connected: Array.from(this.channelConnections.values()).map(ch => ({
          name: ch.type,
          status: ch.status
        }))
      },
      queue: {
        pending: this.messageQueue.length
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = OpenClawGateway;
