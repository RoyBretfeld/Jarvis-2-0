# GEM Configuration Guide

## Environment Setup

### Required Variables

```
GROQ_API_KEY          - Groq API authentication key
NODE_ENV              - Environment mode (development/production)
```

### Optional Variables

```
TELEGRAM_BOT_TOKEN    - Telegram bot authentication
DISCORD_BOT_TOKEN     - Discord bot authentication
WHATSAPP_SESSION      - WhatsApp session identifier
SLACK_BOT_TOKEN       - Slack bot authentication
GOOGLE_CHAT_WEBHOOK   - Google Chat webhook URL
```

## Agent Configuration

### Model Parameters

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| temperature | 0.7 | 0-1 | Response creativity (0=deterministic, 1=random) |
| max_tokens | 2048 | 1-4096 | Maximum response length |

### Guidance

**For Configuration Tasks**: Use temperature 0.3-0.5 (more precise)
**For Creative Tasks**: Use temperature 0.7-0.9 (more varied)
**For Analysis**: Use temperature 0.5-0.7 (balanced)

## Memory Configuration

### Persistence Settings

```
MEMORY_PERSISTENCE_ENABLED=true   - Enable persistent storage
MEMORY_AUTOSAVE_INTERVAL=60000    - Auto-save frequency (ms)
MEMORY_STORAGE_BACKEND=filesystem - Storage type
```

### Best Practices

1. **Enable Persistence** - Always keep auto-save enabled in production
2. **Regular Backups** - Create backups every 24 hours
3. **Monitor Memory** - Check memory usage monthly
4. **Cleanup Old Data** - Archive memories older than 90 days

## Channel Configuration

### Setup Steps for Each Channel

#### Telegram
1. Talk to @BotFather
2. Create new bot
3. Copy bot token
4. Set `TELEGRAM_BOT_TOKEN`

#### Discord
1. Visit Discord Developer Portal
2. Create application
3. Create bot user
4. Copy bot token
5. Set `DISCORD_BOT_TOKEN`

#### WhatsApp
1. Requires Baileys integration
2. QR code pairing on first run
3. Set `WHATSAPP_SESSION`

#### Slack
1. Create Slack app
2. Enable OAuth
3. Copy bot token
4. Set `SLACK_BOT_TOKEN`

#### Google Chat
1. Create webhook
2. Copy webhook URL
3. Set `GOOGLE_CHAT_WEBHOOK`

## Security Configuration

### API Key Protection

- **Never commit .env to version control**
- **Use environment variables in production**
- **Rotate keys regularly**
- **Use secrets management in enterprise**

### Access Control

```
REQUIRE_PAIRING=true              - Require user pairing
ALLOWED_USERS=user1,user2,user3  - Whitelist users
ENABLE_SSL=true                   - Use HTTPS/TLS
```

## Performance Tuning

### Optimization Strategies

1. **Response Caching** - Cache frequent responses
2. **Batch Processing** - Process multiple messages together
3. **Connection Pooling** - Reuse API connections
4. **Memory Cleanup** - Regular maintenance

### Monitoring

- Track API response times
- Monitor memory usage
- Log error rates
- Measure throughput

## Troubleshooting Configuration

### Common Issues

**Issue**: Agent won't start
- Check GROQ_API_KEY is set
- Verify .env file exists
- Check Node.js version (≥22)

**Issue**: Channels not connecting
- Verify tokens are correct
- Check internet connection
- Review channel-specific logs

**Issue**: Memory issues
- Check available disk space
- Review memory cleanup settings
- Analyze memory files

**Issue**: Slow responses
- Check temperature setting
- Reduce max_tokens
- Monitor API latency
