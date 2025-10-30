# Section 2: User Experience

**Version:** 1.0  
**Date:** October 30, 2025  
**Part of:** Developmental Companion Technical Specification

---

## 2.1 User Flow Overview

```
Login → Chat Interface → Conversation → Pixel Extraction → Pixel Map Updates → Contextual Responses
```

## 2.2 Initial Session (First Conversation)

**What User Sees:**
- Left: Standard chat interface (similar to Claude/ChatGPT)
- Right: Empty 3D space labeled "Your Belief Map"
- User types naturally, receives responses

**What's Happening Behind the Scenes:**
- Each message runs through interpreter
- Early messages often too vague → no pixels extracted
- System waits for concrete belief statements
- User sees normal conversation (no indication of extraction)

**First Pixel Extracted:**
- User says something like: "I'm sick of everyone acting like working 60 hours a week is some badge of honor"
- Small colored cube appears in right panel
- Subtle animation draws attention
- Conversation continues naturally

**After 10 Minutes:**
- 5-10 pixels visible in 3D space
- Pixels cluster by topic (work, relationships, values)
- Colors indicate developmental stage (Red, Orange, Green, etc.)
- User can rotate/explore the map

## 2.3 Returning User Experience

**Opening the App:**
- User's existing pixel map loads immediately (right panel)
- 50+ pixels from previous conversations visible
- Clusters have formed organically

**During Conversation:**
- User mentions "my mother"
- Related pixels in the map **automatically stroke/highlight** (border glow)
- Their context is injected into the conversation based on relevance score
- Response demonstrates awareness: "Given what you've shared about family dynamics..."
- User never sees mechanical process, only contextual understanding

**Pixel Activation Example:**

```
User: "I had coffee with my mother today"

What Happens:
1. System matches "mother" to existing pixels semantically
2. 3-4 related pixels highlight with glowing stroke in map
3. Pixel context (statement + original conversation context) injected into LLM
4. Response reflects accumulated understanding

Response:
"How did that go? Last time you mentioned tension around her expectations..."

User Experience: "It actually remembers our past conversations"
```

**Clicking a Pixel:**
- User can click any pixel in the 3D map
- Detail panel appears showing:
  - Original statement
  - Context from conversation
  - Creation date
  - Pixel family
  - Stage breakdown (color scores)
  - Explanation from interpreter
  - Confidence score
  - **History tab** - Shows evolution of this belief over time (version history)

## 2.4 The "Aha" Moment

**Scenario: Belief Contradiction**

User has two pixels:
1. "Work should have clear boundaries" (Green - balance/wellbeing)
2. "Real success requires sacrifice" (Orange - achievement/hustle)

**When User Discusses Career:**
- Both pixels activate
- Insight model detects tension
- Response: "I notice you value both boundaries and ambitious success. What does success look like when it doesn't require sacrificing your wellbeing?"

**This demonstrates:** System isn't just remembering, it's guiding developmental growth

## 2.5 Interface States

**State 1: Empty (New User)**
- Chat: Active
- Map: Empty 3D space
- Status: "Building your belief map..."

**State 2: Building (5-20 pixels)**
- Chat: Active
- Map: Pixels appearing, beginning to cluster
- Status: No status message (seamless)

**State 3: Rich Context (50+ pixels)**
- Chat: Active with contextual awareness
- Map: Complex 3D structure, clear clusters
- Activation: Frequent pixel highlighting during conversation

**State 4: Long-term Use (200+ pixels)**
- Chat: Deeply personalized, developmental guidance
- Map: Dense constellation, reveals belief patterns
- Insight: System can surface contradictions, suggest growth edges

## 2.6 Key UX Principles for Developers

**Invisibility:**
- Pixel extraction happens silently
- No "analyzing your beliefs..." loading messages
- User should feel like natural conversation

**Progressive Disclosure:**
- Don't explain the system upfront
- Let users discover through use
- The map appearing naturally is more powerful than tutorial

**No Premature Transparency:**
- Don't say "I've extracted a belief pixel" during conversation
- The magic is in seamless awareness, not mechanical process
- Exception: When user clicks a pixel, show full data (statement, context, creation date, pixel family, stage, explanation)

**Automatic Pixel Activation:**
- Pixels activate based on conversation topic automatically
- User talks about "dogs" → animal/dog pixels activate and highlight
- Activated pixels inject their context into conversation based on match score
- Search algorithm determines relevance hierarchy
- Insight model uses this hierarchy to prioritize most relevant context

## 2.7 To Build (UX Layer)

1. **Chat Interface** - Standard message input/output (can fork existing)
2. **3D Pixel Map** - Three.js or similar, displays in main panel
3. **Pixel Rendering** - Cubes colored by SD stage, with opacity for archived pixels
4. **Activation State** - Stroke/glow effect on relevant pixels (automatic based on topic)
5. **Smooth Transitions** - Pixels fade in, don't pop; color shifts for evolution
6. **Map Interaction** - Rotate, zoom, click pixel to view details
7. **Pixel Detail Panel** - Text fields showing: statement, context, creation date, pixel family, stage, explanation, confidence score
8. **History/Version Tab** - Timeline view of pixel evolution with timestamps and stage shifts
9. **Ghost Pixel Rendering** - Low opacity archived pixels remain visible in map

## 2.8 Pixel Lifecycle

**Creation:**
- Pixel appears when belief statement extracted and passes quality threshold
- Initial confidence score assigned

**Activation:**
- Automatic highlighting when conversation topic matches pixel content
- No manual activation needed

**Evolution:**
- Confidence score adjusts over time based on reinforcement or contradiction
- Insight model tracks developmental shifts
- **Version History:** Each significant change creates a new version
  - Original belief preserved with timestamp
  - New interpretation added as version
  - User can see progression: "I believed X (Orange, 2024) → Now I believe Y (Green, 2025)"
  - Demonstrates spiral dynamics movement in real-time
- Stage scores can shift (e.g., Orange decreases, Green increases)
- Pixel color updates to reflect current dominant stage

**Deletion/Transcendence:**
- NOT user-initiated (no delete button)
- Handled by Insight model when user has "aha moment" or transcends belief
- Confidence score decreases with contradictory evidence
- When confidence drops below threshold → pixel becomes **archived/faded** (not fully deleted)
- Archived pixels:
  - Fade to low opacity in map (ghost pixels)
  - No longer activate in conversations
  - History preserved for developmental record
  - User can see: "You used to hold this belief strongly"
- Example: User realizes "hustle culture belief" was conditioning → Orange pixel fades to ghost, Green replacement emerges
- **Why preserve history:** Shows developmental journey, prevents data loss, demonstrates growth path

## 2.9 Developmental Progression Through History

**Tracking Growth Over Time:**
- Pixel history reveals how beliefs evolve through spiral dynamics stages
- Users can visualize their developmental journey
- System can identify patterns: "You've been moving from Orange achievement focus toward Green collective wellbeing"

**History Use Cases:**

**Case 1: Belief Evolution**
```
Week 1: "Success means making six figures" (Orange: 0.8)
Week 4: "Success means balance and impact" (Orange: 0.3, Green: 0.7)
Week 8: "Success is subjective and personal" (Green: 0.9)

Visualization: Same pixel, color shifting from Orange → Green
History shows the transformation with timestamps and contexts
```

**Case 2: Transcendence & Replacement**
```
Month 1: "I need to work harder than everyone" (Orange, high confidence)
Month 2: Aha moment → pixel fades to ghost
Month 2: New pixel emerges: "Rest is productive" (Green, growing confidence)

User can see both in history: the old belief (ghosted) and what replaced it
```

**Case 3: Stage Integration**
```
User holds: "Structure is essential" (Blue: 0.8)
Later adds: "But flexibility matters too" (Orange: 0.5, Green: 0.6)
Eventually: "Structure serves purpose, not the other way around" (Yellow: 0.7)

History shows healthy integration of earlier stages into Yellow systemic thinking
```

**For Developers:**
- History stored as versions/snapshots with timestamps
- Each version includes: statement, context, stage scores, confidence, date
- UI can show timeline view or comparison view
- Archived pixels stored separately but linked to current map
- Consider: history compression for users with 1000+ pixels over years
