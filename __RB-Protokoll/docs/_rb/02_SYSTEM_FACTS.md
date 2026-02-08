# System Facts

## Tech Stack
- **Runtime:** Node.js (Latest stable)
- **Module System:** ES Modules (`type: "module"`)
- **Framework:** Express.js
- **Architecture:** True AI Agent (Body/Soul/Mind model)
- **Dependencies:** `openai` (or compatible), `dotenv`, `express`

## Project Structure
```
src/
├── server.js            # Entry point
├── main.js              # CLI entry
└── ...
```

## Critical Commands

### Development
```bash
# Check System Status
node scripts/status.js

# Initialize System
node scripts/initialize.js

# Start Agent
npm start
```

## Safety Rules
- **NEVER** auto-delete without user confirmation
- **Scan-Action Separation:** Always scan first, show preview, then execute
- **Error Handling:** Catch errors gracefully - log but don't crash
