# Section 4: Technical Components

**Version:** 1.0  
**Date:** October 30, 2025  
**Part of:** Developmental Companion Technical Specification

---

## 4.1 Overview

This section contains the detailed instruction documents (prompts) for each component. These are pseudo-docs that will be refined by Lukas (Tessus) who has 8 years of Spiral Dynamics experience. Each doc will be tested with unit tests to ensure consistent extraction and guidance quality.

**Status:** Draft - requires refinement and testing

---

## 4.2 Interpreter Guide (Pixel Extraction)

**Purpose:** Tell Claude what makes a pixel and provide compressed SD rules  
**Recommended length:** 800-1200 words  
**Model:** Claude (lighter model acceptable, e.g., Haiku)

---

### INTERPRETER INSTRUCTION DOCUMENT (DRAFT)

Interpreter document moved to: [https://github.com/mettafive/applied-spiral-dynamics/tree/main](url)


---

## 4.3 Insight Model Guide (Developmental Coaching)

**Purpose:** How to digest pixel map data and guide developmental transitions  
**Recommended length:** 1000-1500 words  
**Model:** Claude (full model, needs reasoning capability)

---

# INSIGHT MODEL INSTRUCTION DOCUMENT

Insight model is moved to:
[https://github.com/mettafive/applied-spiral-dynamics/blob/main/insight%20model](url)

---

## 4.4 PM Handler (Database & Search)

### Vector Search Implementation

**Embedding Model Options:**
- OpenAI: `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens)
- OpenAI: `text-embedding-ada-002` (1536 dimensions, older but proven)
- Open source: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)

**Recommendation:** Start with `text-embedding-3-small` for quality/cost balance

### Search Strategy

**When user message arrives:**

1. **Embed user message** using chosen model
2. **Query database** for user's pixels using cosine similarity
3. **Apply filters:**
   - Only active pixels (not archived)
   - Cosine similarity > 0.7 threshold
   - Limit to top 10 results
4. **Include pixel families** for matched pixels (1-2 family members each)
5. **Return ranked results** with similarity scores

### Pixel Family Creation

**Families created by:**
- Semantic clustering during initial creation
- Manual grouping if user explicitly connects topics
- Post-processing: run periodic clustering on all user's pixels

**Family size:** 3-7 pixels per family (not too large)

**Family benefits:**
- When one pixel activates, family provides additional context
- Shows how beliefs cluster together
- Helps user see patterns in their worldview

### Database Operations

**Create Pixel:**
```sql
INSERT INTO pixels (
  pixel_id, user_id, family_id, statement, context,
  explanation, color_stage, confidence_score,
  embedding, created_at
) VALUES (...)
```

**Search Pixels:**
```sql
SELECT *, 1 - (embedding <=> query_embedding) as similarity
FROM pixels
WHERE user_id = $1 
  AND archived = false
  AND 1 - (embedding <=> $2) > 0.7
ORDER BY similarity DESC
LIMIT 10
```

**Update Confidence:**
```sql
UPDATE pixels
SET confidence_score = $1, updated_at = NOW()
WHERE pixel_id = $2
```

**Archive Pixel:**
```sql
UPDATE pixels
SET archived = true, confidence_score = 0, updated_at = NOW()
WHERE pixel_id = $1
```

**Create History Version:**
```sql
INSERT INTO pixel_history (
  pixel_id, statement, color_stage, confidence_score,
  timestamp, change_reason
) VALUES (...)
```

---

## 4.5 Main LLM System Prompt



Main LLM System Prompt is moved to: [https://github.com/mettafive/applied-spiral-dynamics/tree/main](url)


---

## 4.6 Chat Interface (Fork Implementation)

### Option 1: Agno

**Pros:**
- Developer-friendly
- Good for custom backend
- Flexible architecture

**Implementation:**
```typescript
// Example fork structure
import { Agno } from '@agno/sdk'

const agno = new Agno({
  apiKey: process.env.AGNO_KEY
})

// Intercept before sending to LLM
agno.on('beforeCompletion', async (message) => {
  // Run prompt chain
  const pixel = await runInterpreter(message)
  const activated = await searchPixels(message)
  const guidance = await runInsight(pixel, activated)
  
  // Inject into context
  return enrichedMessage
})
```

### Option 2: CopilotKit

**Pros:**
- React-focused
- Good UI components out of box
- Built-in streaming

**Implementation:**
```typescript
import { CopilotKit } from "@copilotkit/react-core"

<CopilotKit
  publicApiKey={apiKey}
  middleware={{
    onMessage: async (message) => {
      // Run prompt chain
      // Return enriched context
    }
  }}
>
  <ChatInterface />
  <PixelMap />
</CopilotKit>
```

### Loading States

**While prompt chain runs (2-10 seconds):**

**Option A: Generic**
- Display: "Thinking..."
- User sees typing indicator

**Option B: Progressive**
- Phase 1: "Understanding..." (Interpreter running)
- Phase 2: "Considering context..." (PM Handler + Insight)
- Phase 3: Response streams in

**Recommendation:** Option A for MVP (simpler), Option B for polish

### Rate Limiting

**Per-user limits:**
- 50 messages per hour
- 500 messages per day
- Adjustable for Edge City demo

**Error message:**
```
"You've reached the message limit. This helps us provide quality responses to everyone. Try again in [X minutes]."
```

---

## 4.7 Integration Testing

### Unit Tests (To Be Written by Lukas/Tessus)

**Interpreter Tests:**
1. Extract clear belief statement → valid pixel
2. Reject vague statement → no pixel
3. Reject question → no pixel
4. Assign correct SD stage scores
5. Calculate appropriate confidence score

**Insight Model Tests:**
1. Detect contradiction between pixels → surface gently
2. Orange + emerging Green → ask about cost, don't push
3. Aha moment → recommend archiving
4. No relevant pixels → skip guidance
5. Confidence adjustments → correct logic

**PM Handler Tests:**
1. Search returns semantically similar pixels
2. Pixel families retrieved correctly
3. Archived pixels excluded from results
4. Confidence updates persist
5. History versions created on significant changes

### Integration Test Scenarios

**Scenario 1: New User, First Pixel**
- User: "I believe hard work always pays off"
- Expected: Pixel created (Orange dominant), no other pixels to activate
- Response: Natural conversation, no contextual depth yet

**Scenario 2: Returning User, Contradiction**
- User: "I'm exhausted and need a break"
- Existing pixels: "Success requires sacrifice" (Orange, 0.7)
- Expected: Pixel activates, Insight detects tension, asks about cost
- Response: "What's driving this need to push so hard?"

**Scenario 3: Aha Moment**
- User: "I realized I don't need to prove anything anymore"
- Existing pixel: "I need to be the best" (Orange, 0.8)
- Expected: Confidence drops, pixel archived, celebrate insight
- Response: "That's significant. What opened up when you saw that?"

---

## 4.8 Developer Checklist

For each component, developers should implement:

**Interpreter:**
- [ ] Read instruction document (this section)
- [ ] Create prompt template with SD stage descriptions
- [ ] Implement JSON parsing for pixel extraction
- [ ] Handle "no pixel" responses
- [ ] Add error handling for malformed responses
- [ ] Test with unit tests (written by Lukas)

**PM Handler:**
- [ ] Choose vector database
- [ ] Implement embedding generation
- [ ] Create cosine similarity search
- [ ] Implement pixel family logic
- [ ] Add database CRUD operations
- [ ] Create history versioning

**Insight Model:**
- [ ] Read instruction document (this section)
- [ ] Create prompt template with guidance principles
- [ ] Implement pixel context injection
- [ ] Parse guidance output JSON
- [ ] Handle confidence adjustments
- [ ] Flag pixels for archiving

**Main LLM:**
- [ ] Create system prompt with constraints
- [ ] Inject enriched context from Insight
- [ ] Implement streaming (optional for MVP)
- [ ] Add code generation prevention
- [ ] Handle rate limiting

**Frontend:**
- [ ] Fork chosen LLM wrapper
- [ ] Implement 3D pixel map
- [ ] Add activation visual effects
- [ ] Create pixel detail panel
- [ ] Add loading states
- [ ] Implement history view

---

