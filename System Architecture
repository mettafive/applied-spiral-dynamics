# Section 3: System Architecture

**Version:** 1.0  
**Date:** October 30, 2025  
**Part of:** Developmental Companion Technical Specification

---

## 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │  Chat Interface │              │  3D Pixel Map   │       │
│  │  (Left Panel)   │              │  (Right Panel)  │       │
│  └────────┬────────┘              └────────▲────────┘       │
│           │                                 │                │
└───────────┼─────────────────────────────────┼────────────────┘
            │                                 │
            │ user_message                    │ pixel updates
            │ user_id                         │ activation states
            │ session_id                      │
            ▼                                 │
┌─────────────────────────────────────────────┴────────────────┐
│                    BACKEND (Prompt Chain)                     │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ INTERPRETER  │───▶│  PM HANDLER  │───▶│ INSIGHT MODEL │  │
│  │              │    │              │    │               │  │
│  │ Claude API   │    │ Search &     │    │ Claude API    │  │
│  │ (lighter)    │    │ Database     │    │ (full)        │  │
│  └──────────────┘    └──────────────┘    └───────┬───────┘  │
│                                                    │          │
│                                                    ▼          │
│                                          ┌───────────────┐   │
│                                          │   MAIN LLM    │   │
│                                          │               │   │
│                                          │  Claude API   │   │
│                                          │  (full)       │   │
│                                          └───────┬───────┘   │
│                                                  │           │
└──────────────────────────────────────────────────┼───────────┘
                                                   │
                                                   ▼
                                            response to user
```

## 3.2 Component Responsibilities

### Frontend Components

**Chat Interface**
- Render messages (user + assistant)
- Handle user input
- Display loading states during prompt chain
- Send messages to backend with user context

**3D Pixel Map**
- Render pixels as colored cubes (Three.js or similar)
- Handle user interaction (rotate, zoom, click)
- Display activation states (stroke/glow)
- Show pixel detail panel on click
- Render ghost pixels (archived beliefs)

### Backend Components

**Interpreter**
- **Purpose:** Extract belief pixels from conversation
- **Model:** Claude API (lighter/cheaper model acceptable)
- **Input:** User message + conversation context (last 3 messages or 1500 chars)
- **Processing:** 
  - Analyzes if message contains extractable belief
  - Checks quality thresholds (not too vague, sufficient confidence)
  - Determines Spiral Dynamics stage composition
  - Generates explanation
- **Output:** 
  - New pixel JSON OR
  - Update to existing pixel JSON OR
  - "No pixel should be created" message
- **Failure mode:** If returns neither pixel nor "no pixel" message → system knows something failed

**PM Handler (Pixel Map Handler)**
- **Purpose:** Manage pixel storage and retrieval
- **Components:**
  - Database operations (create/update/archive pixels)
  - Vector search for semantic similarity
  - Pixel family management (grouping related pixels)
- **Input:** 
  - User message (for search)
  - New/updated pixel from Interpreter (if any)
  - User ID
- **Processing:**
  - Search existing pixels for semantic matches
  - Calculate relevance scores
  - Retrieve pixel families (neighbors) for matched pixels
  - Create/update pixel in database
  - Mark activated pixels
- **Output:**
  - Array of relevant pixel JSONs (with context)
  - Activation states for frontend
  - Pixel family members for additional context

**Insight Model**
- **Purpose:** Provide developmental guidance based on pixel map
- **Model:** Claude API (full model, needs reasoning capability)
- **Input:**
  - Original user message
  - Activated pixel JSONs (with full context)
  - Instruction document (how to guide users developmentally)
  - New pixel from Interpreter (if created)
- **Processing:**
  - Analyzes belief patterns and contradictions
  - Identifies developmental tensions (e.g., Orange vs Green)
  - Determines if guidance is needed
  - Adjusts confidence scores based on user statements
  - Flags pixels for archiving if transcendence detected
- **Output:**
  - Coaching notes / developmental guidance
  - Context about user's worldview
  - Confidence score adjustments
  - Pixels to archive (if aha moment detected)

**Main LLM**
- **Purpose:** Generate final response to user
- **Model:** Claude API (full model)
- **Input:**
  - Original user message
  - Guidance from Insight Model
  - Activated pixel context
  - Conversation history
- **Processing:**
  - Crafts response that feels natural
  - Incorporates developmental guidance subtly
  - Demonstrates contextual awareness without being mechanical
  - **Constraint:** Does NOT generate code (prevented via system prompt)
- **Output:**
  - Final response to user

## 3.3 Detailed Sequence Flow

```
1. USER SENDS MESSAGE
   Frontend → Backend
   Payload: {
     message: "I'm sick of everyone acting like working 60 hours is a badge of honor",
     user_id: "user_123",
     session_id: "session_456",
     context: [last 3 messages or 1500 chars]
   }

2. INTERPRETER (First API Call)
   Input: message + context
   Process: Analyze for belief extraction
   Output: {
     pixel: {
       statement: "I'm sick of everyone acting like working 60 hours...",
       context: "Kelly is venting after a friend bragged...",
       explanation: "This belief shows strong Green valuation...",
       color_stage: {
         orange: -0.2,
         green: 0.5,
         ...
       },
       confidence_score: 0.4,
       too_nuanced: false,
       absolute_thinking: false
     }
   }
   OR: { no_pixel: true, reason: "Statement too vague" }

3. PM HANDLER (Database Operations)
   Input: user_message + pixel (if created) + user_id
   
   A. If new pixel created:
      - Generate pixel_id
      - Assign family_id (or create new family)
      - Store in database
   
   B. Vector Search:
      - Embed user message
      - Search user's pixel database
      - Calculate cosine similarity
      - Return top N matches (e.g., top 5 above 0.7 threshold)
      - Include pixel families for matched pixels
   
   Output: {
     new_pixel_id: "px_202510_00124" (if created),
     activated_pixels: [
       { pixel_id: "px_...", statement: "...", context: "...", ... },
       { pixel_id: "px_...", statement: "...", context: "...", ... },
       ...
     ],
     family_members: [additional related pixels],
     activation_states: { "px_001": true, "px_042": true, ... }
   }

4. INSIGHT MODEL (Second API Call)
   Input: {
     original_message: "I'm sick of everyone acting...",
     new_pixel: {...},
     activated_pixels: [...],
     instruction_doc: [developmental guidance principles],
     user_history: [relevant context about user's journey]
   }
   
   Process:
   - Read instruction document
   - Analyze belief patterns
   - Detect contradictions or tensions
   - Determine if developmental guidance needed
   - Adjust confidence scores
   - Flag pixels for archiving if transcendence detected
   
   Output: {
     guidance: "Notice tension between achievement and wellbeing...",
     context_summary: "User values balance, resisting hustle culture...",
     confidence_adjustments: [
       { pixel_id: "px_042", new_score: 0.3, reason: "contradicted" }
     ],
     pixels_to_archive: ["px_017"]
   }

5. MAIN LLM (Third API Call)
   Input: {
     original_message: "I'm sick of everyone acting...",
     guidance: "Notice tension between...",
     activated_pixels: [...],
     conversation_history: [...],
     system_constraints: "Do not generate code"
   }
   
   Process:
   - Generate natural response
   - Incorporate guidance subtly
   - Demonstrate contextual awareness
   - Maintain conversational tone
   
   Output: {
     response: "It sounds like you're pushing back against the idea that overwork is virtuous. That's a meaningful shift..."
   }

6. BACKEND → FRONTEND
   - Update database with any changes
   - Return response + pixel updates
   
   Response: {
     message: "It sounds like you're pushing back...",
     new_pixel: {...} (if created),
     activated_pixels: ["px_042", "px_017", ...],
     map_updates: {
       new: [{...}],
       updated: [{...}],
       archived: [{...}]
     }
   }

7. FRONTEND UPDATES
   - Display assistant message
   - Add new pixel to 3D map (fade in animation)
   - Highlight activated pixels
   - Update pixel detail panel if open
```

## 3.4 Technology Stack Options

### LLM Wrapper (Choose One)
- **Agno** - Developer-friendly, good for rapid prototyping
- **CopilotKit** - React-focused, good UI components
- Both wrappers are viable; choose based on team preference

### Database Options
**Requirements:** Vector embeddings, JSON storage, fast similarity search

**Options:**
- **PostgreSQL + pgvector** - Open source, full control
- **Supabase** - PostgreSQL + auth + real-time built-in
- **Pinecone** - Purpose-built for vector search, managed service
- **Weaviate** - Open source vector database

**Recommendation:** Keep flexible, choose based on team experience

### Hosting Options
- **Frontend:** Vercel, Netlify, Cloudflare Pages
- **Backend:** Vercel functions, Railway, Render, fly.io
- Can be monorepo or separate repos

### Real-time Updates
- **WebSockets** - For instant pixel map updates
- **Polling** - Simpler, acceptable for MVP
- **SSE (Server-Sent Events)** - Good middle ground

### LLM API Strategy
**Cost Optimization:**
- **Interpreter:** Can use cheaper model (Claude Haiku or GPT-4o-mini)
- **Insight Model:** Needs full reasoning (Claude Sonnet 4.5 or GPT-4)
- **Main LLM:** Needs full capability (Claude Sonnet 4.5 or GPT-4)

**Rate Limiting:**
- Implement per-user rate limits to prevent abuse
- Example: 50 messages per hour per user
- Consider Edge City demo needs (may need higher limits)

## 3.5 Context Window Management

### Challenge
Each pixel with full context is ~500-1000 tokens. Loading 50 pixels = 25k-50k tokens, which exceeds context limits.

### Solution: Relevance-Based Injection
1. **Search Phase:** Find top N most relevant pixels (e.g., top 10)
2. **Ranking:** Score by:
   - Semantic similarity to current message
   - Recency (recently activated pixels rank higher)
   - Confidence score (higher confidence = more relevant)
   - Family relationships (include 1-2 family members per activated pixel)
3. **Summarization:** If too many matches, Insight Model can summarize themes rather than include every pixel verbatim
4. **Dynamic Adjustment:** Relevance changes per conversation - recalculate each message

### Practical Limits (for MVP)
- Max 10-15 pixels in Insight Model context
- Max 5-7 pixels in Main LLM context (most relevant only)
- Total context budget: ~20k tokens per request

## 3.6 Database Schema Preview

**Full schema in Section 5, but key entities:**

```javascript
// Simplified schema
{
  users: {
    user_id: string,
    created_at: timestamp,
    // auth fields
  },
  
  pixels: {
    pixel_id: string,
    user_id: string,
    family_id: string,
    statement: text,
    context: text,
    explanation: text,
    color_stage: jsonb, // {red: 0.0, orange: -0.2, green: 0.5, ...}
    confidence_score: float,
    too_nuanced: boolean,
    absolute_thinking: boolean,
    created_at: timestamp,
    updated_at: timestamp,
    archived: boolean,
    embedding: vector(1536), // for semantic search
    version: integer
  },
  
  pixel_history: {
    history_id: string,
    pixel_id: string,
    statement: text,
    color_stage: jsonb,
    confidence_score: float,
    timestamp: timestamp,
    change_reason: text
  },
  
  sessions: {
    session_id: string,
    user_id: string,
    messages: jsonb[],
    created_at: timestamp
  }
}
```

## 3.7 Failure Modes & Error Handling

### Interpreter Timeout
- **Scenario:** Interpreter takes >30 seconds
- **Action:** Timeout, skip pixel extraction, proceed with conversation
- **User Experience:** Normal response, no new pixel

### No Pixels Found (PM Handler)
- **Scenario:** Search returns 0 matches
- **Action:** Skip Insight Model, go straight to Main LLM
- **User Experience:** Normal response without contextual depth

### Insight Model Fails
- **Scenario:** API error or timeout
- **Action:** Fallback to Main LLM with just activated pixels (no guidance)
- **User Experience:** Contextual response but no developmental coaching

### Database Connection Issues
- **Scenario:** Cannot read/write pixels
- **Action:** Queue operations for retry, continue with in-memory state for session
- **User Experience:** Conversation continues, pixels sync when connection restored

### Rate Limit Hit
- **Scenario:** User exceeds message limit
- **Action:** Return friendly error message
- **User Experience:** "You've reached the message limit. Try again in [X minutes]."

## 3.8 Edge City Demo Considerations

### Pre-Demo Setup
- Pre-seeded demo account with 30-50 diverse pixels
- Shows both active and archived (ghost) pixels
- Covers multiple topics and SD stages
- Demonstrates contradiction and evolution

### Live Demo Flow
1. Show pixel map (already populated)
2. User types message about "work"
3. Watch pixels activate in real-time
4. Response demonstrates contextual awareness
5. New pixel appears (fade in animation)
6. Click pixel to show detail panel with history

### Technical Needs
- Stable hosting with low latency
- Rate limits disabled for demo account
- Logging for debugging during presentation
- Fallback responses if APIs are slow
