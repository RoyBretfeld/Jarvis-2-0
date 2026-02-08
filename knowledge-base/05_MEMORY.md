# Memory System - Conversation History

Rolling memory of the last 14 days of interactions, automatically rotating daily.

## Memory Architecture

### Current Status
- **Memory Span**: 14 days (rolling window)
- **Daily Rotation**: Oldest day removed, newest added
- **Total Conversations**: [Auto-updated by system]
- **Archive Status**: Previous 14-day cycles archived

## Daily Conversation Index

### Day 1 (Today)
**Date**: [Current date]
**Sessions**: [Number of sessions]
**Messages**: [Number of messages]
**Key Topics**: [Extracted topics]

### Day 2 (Yesterday)
**Date**: [Date]
**Sessions**: [Count]
**Messages**: [Count]
**Key Topics**: [Extracted topics]

### Day 3-14
[Previous days in same format]

---

## Conversation Entries Format

Each conversation follows this structure:

```
### Session [ID]
**Time**: [Timestamp]
**Duration**: [Minutes]
**Channel**: [Telegram/Discord/Console/etc]

**User Input**:
[User message text]

**Agent Response**:
[Full agent response]

**Topics**: [Extracted topics]
**Resolution**: [If resolved]
**Sentiment**: [Positive/Neutral/Negative]
```

## Memory Search Guide

When searching the memory, the LLM should:

1. **Check Current Day First** - Start with Day 1 for recent context
2. **Expand Backward** - Move to older days if needed
3. **Topic Matching** - Use key topics to narrow search
4. **Full-Text Search** - If needed, read entire file to find specific information

## Rotation Mechanism

### Daily Rotation Process
1. **At Midnight**: System checks memory file
2. **Archive Old Data**: If >14 days, move to archive
3. **Create New Day**: Add new Day 1 entry
4. **Shift Days**: All other days increment number
5. **Update Index**: Refresh the index above

### Example Rotation
```
Before rotation:
Day 1, Day 2, Day 3, ... Day 14

After rotation:
[NEW] Day 1, Day 2, Day 3, ... Day 14
(Old Day 1 moved to archive)
```

## Information Retention

### What Gets Stored
- ✅ User questions
- ✅ Agent responses
- ✅ Problem solutions
- ✅ Configuration changes
- ✅ User preferences discovered
- ✅ Important decisions
- ✅ Learnings and insights

### What Gets Pruned
- ❌ Redundant information after 14 days
- ❌ Resolved issues (kept in archives)
- ❌ Temporary debug messages
- ❌ Testing conversations (if marked)

## Access Pattern

### For Agent LLM
The agent can access this memory by:
1. **Direct Read** - Load entire file when needed
2. **Quick Search** - Read specific day sections
3. **Pattern Recognition** - Identify recurring topics
4. **User Profiling** - Build user model from conversation history

### Example Query
```
User: "What did we discuss about authentication yesterday?"

LLM Process:
1. Check Day 2 (yesterday)
2. Search for "authentication" keywords
3. Return relevant conversation excerpts
4. Provide context and summary
```

## Memory Analytics

### Automatically Tracked
- **Conversation Frequency**: Messages per day
- **Common Topics**: Most discussed subjects
- **Resolution Rate**: Problems solved vs. ongoing
- **User Patterns**: Time of day active, communication style
- **Preferences Evolution**: How preferences change over time

### Usage Examples
- Personalize responses based on conversation history
- Predict user needs from patterns
- Identify recurring issues
- Build user trust through contextual awareness

---

**System Note**: This memory file is designed to be lightweight (14 days only) while providing rich context. For historical analysis, archived files should be consulted. The rolling nature prevents the file from becoming too large while maintaining relevant context.

**Last Rotation**: [System maintains this timestamp]
**Next Rotation**: [System maintains this timestamp]
