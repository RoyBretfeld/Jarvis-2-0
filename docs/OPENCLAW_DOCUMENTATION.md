# OpenClaw - Complete Documentation

> OpenClaw: A messaging gateway that connects AI agents to multiple communication platforms

**Documentation Source:** https://docs.openclaw.ai/

---

## Table of Contents

1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [Supported Chat Channels](#supported-chat-channels)
4. [Key Features](#key-features)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [Agents & Integration](#agents--integration)
8. [Advanced Topics](#advanced-topics)

---

## Overview

OpenClaw is a sophisticated messaging gateway designed to connect AI agents to multiple communication platforms simultaneously. It enables users to "send a message, get an agent response — from your pocket" across various chat platforms.

### Purpose

- **Multi-Channel Integration**: Connect to WhatsApp, Telegram, Discord, iMessage, Slack, and 15+ other platforms
- **Agent Communication**: Route messages to AI agents for intelligent responses
- **Session Management**: Unified session handling across different channels
- **Scalability**: Support for multiple agents and workspaces

---

## Core Architecture

### System Design

OpenClaw operates through a **Gateway** process that serves as the central connection point between messaging channels and AI agents.

```
┌─────────────────────────────────────────────┐
│         Messaging Channels                  │
│  (WhatsApp, Telegram, Discord, iMessage)   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   OpenClaw Gateway   │
        │   (Central Hub)      │
        └──────────────────────┘
                   │
        ┌──────────┴──────────────┬──────────┐
        ▼                         ▼          ▼
    ┌────────┐            ┌──────────┐  ┌────────┐
    │ Pi     │            │   Agents │  │  CLI   │
    │Agents  │            │          │  │ Tools  │
    └────────┘            └──────────┘  └────────┘
```

### Network Configuration

- **Primary Gateway**: One per host (recommended)
- **Default WebSocket**: `ws://127.0.0.1:18789`
- **Canvas Host HTTP**: Port `18793` (file server)
- **Remote Access**: SSH tunneling or Tailscale support
- **Loopback-First**: Secure by default with local-first design

### Key Architectural Concepts

1. **Gateway**: Central message routing hub
2. **Sessions**: Consolidated conversations per user/channel
3. **Channels**: Individual platform connections
4. **Agents**: AI or automation responders
5. **Workspaces**: Isolated agent environments

---

## Supported Chat Channels

### Primary Built-in Channels

#### WhatsApp
- **Protocol**: Baileys (QR-code based)
- **Status**: Built-in
- **Setup**: Requires QR code pairing
- **Features**: Text, images, documents
- **Popularity**: Most widely used

#### Telegram
- **Framework**: grammY Bot API
- **Status**: Built-in
- **Setup**: Simple bot token (fastest setup)
- **Features**: Groups, commands, inline keyboards
- **Advantage**: Easiest to set up

#### Discord
- **Library**: channels.discord.js + Discord Bot API
- **Status**: Built-in
- **Support**: Servers, channels, DMs, threads
- **Features**: Rich embeds, reactions, file attachments
- **Audience**: Developer and gaming communities

#### Slack
- **SDK**: Bolt SDK
- **Status**: Built-in
- **Scope**: Workspace apps
- **Features**: Threads, reactions, file uploads
- **Enterprise**: Full workspace integration

#### Google Chat
- **API**: Google Chat API
- **Protocol**: HTTP webhook
- **Status**: Built-in
- **Use**: Team collaboration, enterprise deployments

### Secondary Channels (Plugin/Additional)

The following channels are available but may require separate installation:

- **Mattermost** - Self-hosted Slack alternative
- **Signal** - Encrypted messaging
- **BlueBubbles** - iMessage alternative (Android)
- **iMessage** - Apple messaging (macOS)
- **Microsoft Teams** - Enterprise communication
- **LINE** - Asian messaging platform
- **Nextcloud Talk** - Self-hosted video/chat
- **Matrix** - Decentralized communication
- **Nostr** - Decentralized social network
- **Tlon** - Urbit native communication
- **Twitch** - Streaming chat integration
- **Zalo** - Vietnamese messaging
- **WebChat** - Browser-based interface

### Channel Selection Guide

| Use Case | Recommended Channel | Reason |
|----------|-------------------|--------|
| Fastest Setup | Telegram | Simple bot token, minimal config |
| Most Popular | WhatsApp | Largest user base |
| Developer Community | Discord | Rich feature set, active community |
| Enterprise | Slack/Teams | Full workspace integration |
| Privacy-Focused | Signal/Matrix | End-to-end encryption |
| Self-Hosted | Mattermost/Matrix | Full control |

---

## Key Features

### 1. Multi-Channel Simultaneous Operation
- Run multiple channels at once from a single Gateway
- Automatic message routing based on channel
- Unified response handling

### 2. Session Management
- **Consolidation**: Direct chats merged into "main" session
- **Group Support**: Separate sessions per group
- **Context Preservation**: Session history maintained
- **Cross-Channel**: Unified conversation context

### 3. Media Support

**Text**: All channels
**Images**: WhatsApp, Telegram, Discord, Slack
**Audio**: WhatsApp, Telegram (via transcription)
**Documents**: WhatsApp, Telegram, Discord, Slack
**Voice Messages**: WhatsApp, Telegram
**Reactions**: Discord, Slack (emoji reactions)

### 4. Group Chat Functionality
- **Telegram**: Full group support
- **Discord**: Server and channel support
- **WhatsApp**: Group chat support
- **Slack**: Channel support
- **Mention-Based**: Activate agents with @mentions

### 5. Security Features
- **DM Pairing**: Verify users before interaction
- **Allowlists**: Restrict access to specific users/groups
- **Session Isolation**: Workspace-based separation
- **OAuth Support**: Secure authentication
- **SSL/TLS**: Encrypted communication

### 6. Streaming Responses
- Real-time message streaming
- Progressive disclosure of agent responses
- Reduced latency for user experience

### 7. Agent Routing
- **Multiple Agents**: Run several agents simultaneously
- **Workspace Isolation**: Separate agent instances
- **Auto-Routing**: Intelligent message distribution
- **Fallback Handling**: Error recovery and escalation

---

## Installation & Setup

### System Requirements

- **Node.js**: Version ≥ 22 (required)
- **OS**: Linux, macOS, Windows
- **RAM**: Minimum 512MB, recommended 2GB+
- **Storage**: Varies by channel (logs, sessions)

### Installation Methods

#### 1. NPM Installation (Recommended)

```bash
# Install globally
npm install -g openclaw

# Initialize
openclaw init

# Start gateway
openclaw start
```

#### 2. Docker Installation

```bash
# Pull image
docker pull openclaw/openclaw:latest

# Run container
docker run -d \
  -p 18789:18789 \
  -p 18793:18793 \
  -v openclaw-data:/data \
  openclaw/openclaw:latest
```

#### 3. Nix Installation

```bash
# Add to flake.nix
inputs.openclaw.url = "github:openclaw/openclaw";

# Install
nix flake update
```

#### 4. Ansible Deployment

```yaml
- name: Deploy OpenClaw
  hosts: servers
  roles:
    - openclaw
  vars:
    openclaw_version: latest
    openclaw_port: 18789
```

### Quick Start

1. **Install**: `npm install -g openclaw`
2. **Initialize**: `openclaw init` (interactive setup)
3. **Configure**: Add channel credentials in config
4. **Start**: `openclaw start`
5. **Verify**: Check Gateway at `http://localhost:18793`

---

## Configuration

### Configuration File Structure

```yaml
# openclaw.config.yml
gateway:
  port: 18789
  canvas_port: 18793
  ssl: false

channels:
  telegram:
    enabled: true
    token: "your_bot_token"

  whatsapp:
    enabled: true
    pairing_timeout: 300

  discord:
    enabled: true
    token: "your_bot_token"

agents:
  default:
    type: "pi-agent"
    model: "groq/llama-3-70b-versatile"

security:
  allowlist_mode: false
  require_pairing: true

sessions:
  timeout: 3600
  consolidate_dm: true
```

### Channel Configuration Details

#### Telegram Setup
```yaml
channels:
  telegram:
    token: "YOUR_BOT_TOKEN"
    polling: true
    timeout: 30
```

#### WhatsApp Setup
```yaml
channels:
  whatsapp:
    baileys_timeout: 300
    auto_reply: false
    group_prefix: "GRP:"
```

#### Discord Setup
```yaml
channels:
  discord:
    token: "YOUR_BOT_TOKEN"
    intents:
      - message_content
      - guild_messages
      - direct_messages
```

---

## Agents & Integration

### Agent Types

#### 1. Pi Agents
- **Purpose**: General-purpose AI agents
- **Models**: Multiple LLM provider support
- **Features**: Streaming, function calling, memory

#### 2. CLI Agents
- **Purpose**: System automation
- **Capabilities**: Execute scripts, system commands
- **Security**: Sandboxed execution

#### 3. Custom Agents
- **Framework**: Custom integration pattern
- **Protocol**: WebSocket-based communication
- **Flexibility**: Full customization

### LLM Model Providers

#### Groq (Recommended for GEM)
```javascript
const agent = new Agent({
  model: "groq/llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
  maxTokens: 2048
});
```

#### OpenAI
```javascript
const agent = new Agent({
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY
});
```

#### Anthropic Claude
```javascript
const agent = new Agent({
  model: "claude-3-opus",
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

#### OpenRouter
```javascript
const agent = new Agent({
  model: "openrouter/auto",
  apiKey: process.env.OPENROUTER_API_KEY
});
```

### Agent Configuration Example

```javascript
// agent-config.js
module.exports = {
  name: "GEM-Configurator",
  description: "Intelligent GEM configuration agent",

  llm: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 2048
  },

  channels: ["telegram", "discord", "whatsapp"],

  memory: {
    enabled: true,
    type: "persistent",
    ttl: 86400
  },

  tools: [
    "web_search",
    "file_system",
    "api_call",
    "database_query"
  ]
};
```

---

## Advanced Topics

### Session Management

**Session Types:**
- `main`: Default DM session for all users
- `group`: Per-group session
- `thread`: Discord thread-specific session

**Session Data:**
```javascript
{
  id: "session_123",
  user: "user_456",
  channel: "telegram",
  created: "2026-02-03T10:00:00Z",
  lastMessage: "2026-02-03T11:30:00Z",
  messages: [...],
  metadata: {}
}
```

### Memory Systems

**Types:**
1. **Short-term**: Current conversation context
2. **Long-term**: User history and preferences
3. **Semantic**: Knowledge embeddings
4. **Episodic**: Specific event memories

### OAuth & Authentication

```javascript
// OAuth Configuration
oauth: {
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scopes: ["email", "profile"]
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scopes: ["user:email"]
    }
  }
}
```

### Webhooks & Automation

```javascript
// Webhook for external integrations
webhook: {
  enabled: true,
  path: "/api/webhook",
  secret: process.env.WEBHOOK_SECRET,
  events: [
    "message.received",
    "message.sent",
    "user.joined",
    "session.created"
  ]
}
```

### CLI Tools & Skills

**Available Tools:**
- `browser_automation`: Headless browser control
- `code_execution`: Safe code execution
- `file_operations`: File system access
- `api_calls`: HTTP request handling
- `database_queries`: DB connectivity

---

## Troubleshooting & Resources

### Common Issues

1. **Gateway Connection Failed**
   - Check if port 18789 is available
   - Verify WebSocket connectivity
   - Check firewall rules

2. **Channel Authentication Issues**
   - Verify API tokens
   - Check rate limits
   - Review OAuth permissions

3. **Message Not Routing**
   - Check channel enabled status
   - Verify agent assignment
   - Review session configuration

### Support & Documentation

- **Main Docs**: https://docs.openclaw.ai/
- **GitHub**: https://github.com/openclaw/openclaw
- **Community**: Discord/Slack community channels
- **Issues**: GitHub Issues for bug reports

---

## Integration with GEM Configuration Manager

This documentation serves as the foundation for integrating OpenClaw with the GEM Configuration Manager system. The agent-based architecture aligns with:

- **Memory + Soul System**: Persistent agent context
- **Multi-Channel Communication**: Unified interface
- **Intelligent Routing**: Smart message distribution
- **Workspace Isolation**: Separate GEM configurations

---

**Last Updated**: February 2026
**Documentation Version**: 1.0
**OpenClaw Version**: Latest
