# Streaming Parallel Chain Dataflow

This document visualizes the complete data flow for the Developmental Companion's Streaming Parallel Chain architecture.

## System Architecture Overview

```mermaid
flowchart TD
    User[User Message] --> API[Chat API Route]
    API --> Auth{Authenticated?}
    Auth -->|No| Error[401 Unauthorized]
    Auth -->|Yes| RateCheck{Rate Limit OK?}
    RateCheck -->|No| RateLimitError[429 Rate Limited]
    RateCheck -->|Yes| SaveMsg[Save User Message to DB]
    SaveMsg --> FastPath[Fast Path: RAG Context Retrieval]
    
    FastPath --> PMHandler[PM Handler]
    PMHandler --> VectorSearch[ChromaDB Vector Search]
    VectorSearch --> ActivatedPixels[Retrieve Activated Pixels]
    ActivatedPixels --> CachedGuidance{Has Cached Guidance?}
    CachedGuidance -->|Yes| LoadCache[Load from Memory Cache]
    CachedGuidance -->|No| DefaultGuidance[Use Default Principles]
    
    LoadCache --> BuildPrompt[Build Enriched System Prompt]
    DefaultGuidance --> BuildPrompt
    
    BuildPrompt --> MainLLM[Main LLM Stream]
    MainLLM --> StreamResponse[Stream Response to User]
    
    SaveMsg --> ParallelPath[Parallel Path: Pixel Extraction]
    ParallelPath --> Interpreter[Interpreter LLM]
    Interpreter --> PixelCheck{Pixel Extracted?}
    PixelCheck -->|Yes| SavePixel[Save to PostgreSQL]
    SavePixel --> UpsertChroma[Upsert to ChromaDB]
    UpsertChroma --> Callback[Trigger Callback]
    PixelCheck -->|No| NoPixel[Log No Pixel]
    
    StreamResponse --> OnFinish[On Finish Handler]
    OnFinish --> WaitInterpreter[Await Interpreter Result]
    WaitInterpreter --> InsightAnalysis[Background: Insight Model]
    
    InsightAnalysis --> GenerateGuidance[Generate Developmental Guidance]
    GenerateGuidance --> CacheNewGuidance[Cache Guidance for Next Turn]
    CacheNewGuidance --> ApplySideEffects[Apply Side Effects]
    
    ApplySideEffects --> ConfidenceAdj{Confidence Adjustments?}
    ConfidenceAdj -->|Yes| UpdateConfidence[Update Pixel Confidence]
    UpdateConfidence --> LogHistory1[Log to PixelHistory]
    
    ApplySideEffects --> ArchiveCheck{Pixels to Archive?}
    ArchiveCheck -->|Yes| ArchivePixels[Archive Pixels]
    ArchivePixels --> LogHistory2[Log to PixelHistory]
    
    LogHistory1 --> Complete[Background Work Complete]
    LogHistory2 --> Complete
    ConfidenceAdj -->|No| Complete
    ArchiveCheck -->|No| Complete
```

## Detailed Component Flows

### 1. RAG Context Retrieval (Fast Path - 200-500ms)

```mermaid
sequenceDiagram
    participant API as Chat API
    participant PM as PM Handler
    participant Cache as Memory Cache
    participant Chroma as ChromaDB
    participant PG as PostgreSQL
    participant LLM as Main LLM

    API->>PM: retrieveContextForTurn(userMessage, userId, chatId)
    
    par Parallel Operations
        PM->>Chroma: Query similar pixels (cosine similarity)
        PM->>Cache: getCachedGuidance(chatId)
    end
    
    Chroma-->>PM: Return pixel IDs + distances
    Cache-->>PM: Return cached guidance or undefined
    
    PM->>PG: getPixelsByIds(pixelIds)
    PG-->>PM: Return full pixel objects
    
    PM->>PM: Merge similarity scores with pixels
    PM->>PM: Sort by similarity descending
    PM-->>API: activatedPixels + cachedGuidance
    
    API->>API: buildSystemPrompt(activatedPixels, guidance)
    API->>LLM: streamText with enriched prompt
    LLM-->>API: Stream chunks to user
```

### 2. Pixel Extraction (Parallel Path - Non-blocking)

```mermaid
sequenceDiagram
    participant API as Chat API
    participant Interp as Interpreter
    participant Validate as Validation
    participant PG as PostgreSQL
    participant Chroma as ChromaDB

    API->>Interp: runInterpreterParallel(userMessage, userId)
    
    Interp->>Validate: checkRateLimit(userId)
    alt Rate limit exceeded
        Validate-->>Interp: Log warning (continue)
    else Rate limit OK
        Validate-->>Interp: Allow
    end
    
    Interp->>Interp: generateObject with Zod schema
    
    alt Pixel extracted
        Interp->>API: onPixelExtracted callback
        API->>API: Generate UUID for chromaId
        
        par Save to both stores
            API->>PG: savePixel(detailed SD scoring)
            API->>Chroma: upsertPixel(embedding + metadata)
        end
        
        PG-->>API: Success or log error
        Chroma-->>API: Success or log error
    else No pixel found
        Interp-->>API: Return no_pixel with reason
    end
```

### 3. Insight Analysis (Background - Async)

```mermaid
sequenceDiagram
    participant API as Chat API onFinish
    participant Insight as Insight Model
    participant Cache as Memory Cache
    participant PG as PostgreSQL

    API->>API: Await interpreter result
    API->>Insight: runInsightAnalysisAsync(context)
    
    Note over Insight: Analyzes: user message, assistant response,<br/>activated pixels, new pixel
    
    Insight->>Insight: generateObject with guidance schema
    
    Insight->>Cache: cacheGuidance(chatId, guidance)
    Cache->>Cache: Store with 5min TTL
    Cache->>Cache: Schedule cleanup task
    
    Insight->>Insight: applySideEffects(guidance)
    
    par Process adjustments
        loop Each confidence adjustment
            Insight->>PG: updatePixelConfidence(pixelId, newScore)
            PG->>PG: Log to PixelHistory
            PG-->>Insight: Success or error
        end
    and Process archives
        loop Each pixel to archive
            Insight->>PG: archivePixel(pixelId)
            PG->>PG: Set archived=true, confidence=0
            PG->>PG: Log to PixelHistory
            PG-->>Insight: Success or error
        end
    end
    
    Insight->>Insight: Log aggregated results
    Insight-->>API: Complete (fire and forget)
```

## Data Models

### Pixel Structure (Database)

```mermaid
erDiagram
    Pixel {
        uuid id PK
        uuid chatId FK
        uuid messageId FK
        uuid userId FK
        text statement
        text context
        text explanation
        jsonb colorStage
        real confidenceScore
        boolean tooNuanced
        boolean absoluteThinking
        boolean archived
        text chromaId
        timestamp createdAt
        timestamp updatedAt
    }
    
    PixelHistory {
        uuid id PK
        uuid pixelId FK
        text statement
        jsonb colorStage
        real confidenceScore
        text changeReason
        timestamp timestamp
    }
    
    PixelFamily {
        uuid id PK
        uuid userId FK
        text name
        timestamp createdAt
    }
    
    PixelFamilyMember {
        uuid familyId FK
        uuid pixelId FK
    }
    
    Pixel ||--o{ PixelHistory : "has history"
    Pixel ||--o{ PixelFamilyMember : "belongs to families"
    PixelFamily ||--o{ PixelFamilyMember : "contains pixels"
```

### Spiral Dynamics Color Stage Scoring

```mermaid
flowchart LR
    Input[User Message] --> Interpreter[Interpreter LLM]
    
    Interpreter --> Beige[Beige: -1 to 1]
    Interpreter --> Purple[Purple: -1 to 1]
    Interpreter --> Red[Red: -1 to 1]
    Interpreter --> Blue[Blue: -1 to 1]
    Interpreter --> Orange[Orange: -1 to 1]
    Interpreter --> Green[Green: -1 to 1]
    Interpreter --> Yellow[Yellow: -1 to 1]
    Interpreter --> Turquoise[Turquoise: -1 to 1]
    Interpreter --> Coral[Coral: -1 to 1]
    Interpreter --> Teal[Teal: -1 to 1]
    
    Beige --> Pixel[Pixel Object]
    Purple --> Pixel
    Red --> Pixel
    Blue --> Pixel
    Orange --> Pixel
    Green --> Pixel
    Yellow --> Pixel
    Turquoise --> Pixel
    Coral --> Pixel
    Teal --> Pixel
    
    Pixel --> Confidence[Confidence Score: 0.1-1.0]
    Pixel --> Flags[Flags: tooNuanced, absoluteThinking]
```

## Error Handling & Resilience

```mermaid
flowchart TD
    Start[Request Starts] --> TryCatch1{Try: RAG Context}
    TryCatch1 -->|Success| ContextOK[Use Activated Pixels]
    TryCatch1 -->|ChromaDB Down| Fallback1[Graceful Degradation: Empty Context]
    
    ContextOK --> Stream[Main LLM Streams]
    Fallback1 --> Stream
    
    Stream --> TryCatch2{Try: Interpreter}
    TryCatch2 -->|Success| PixelOK[Pixel Extracted]
    TryCatch2 -->|LLM Fails| Fallback2[Log Error: Continue]
    
    PixelOK --> TryCatch3{Try: Save Pixel}
    TryCatch3 -->|DB Success| SaveOK[Pixel Saved]
    TryCatch3 -->|DB Fails| Fallback3[Log Error: Continue]
    TryCatch3 -->|Chroma Fails| Fallback3
    
    SaveOK --> TryCatch4{Try: Insight Analysis}
    Fallback2 --> TryCatch4
    Fallback3 --> TryCatch4
    
    TryCatch4 -->|Success| InsightOK[Guidance Cached]
    TryCatch4 -->|LLM Fails| Fallback4[Use Default Guidance Next Turn]
    
    InsightOK --> TryCatch5{Try: Side Effects}
    TryCatch5 -->|All Success| Complete[All Operations Complete]
    TryCatch5 -->|Some Fail| PartialSuccess[Partial Success: Log Errors]
    Fallback4 --> Complete
    
    PartialSuccess --> Complete
    Complete --> End[Request Complete]
```

## Performance Characteristics

### Latency Profile

```mermaid
gantt
    title Request Timeline (Target: 2-3s perceived latency)
    dateFormat X
    axisFormat %Ls

    section User Experience
    User sends message           :0, 0
    First token arrives          :milestone, 2000
    Full response complete       :0, 3000
    
    section Fast Path (Critical)
    RAG context retrieval        :0, 400
    Build enriched prompt        :400, 100
    Main LLM TTFT                :500, 1500
    Stream to completion         :2000, 1000
    
    section Parallel Path (Non-blocking)
    Interpreter starts           :100, 2000
    Pixel extraction complete    :2100, 0
    Save to DB and Chroma        :2100, 300
    
    section Background (Async)
    Insight analysis starts      :3000, 3000
    Guidance generated           :6000, 0
    Side effects applied         :6000, 500
    All background work done     :6500, 0
```

## Cache Strategy

```mermaid
flowchart TD
    Turn1[Turn 1: User Message] --> NoCache{Cached Guidance?}
    NoCache -->|No| Default1[Use Default Principles]
    Default1 --> Response1[LLM Response 1]
    
    Response1 --> BG1[Background: Insight Analysis]
    BG1 --> Cache1[Cache Guidance in Memory]
    Cache1 --> TTL1[Set 5min TTL]
    
    Turn2[Turn 2: User Message] --> HasCache{Cached Guidance?}
    HasCache -->|Yes| Load2[Load Cached Guidance]
    HasCache -->|No| Default2[Use Default]
    
    Load2 --> Check{TTL Valid?}
    Check -->|Yes| Use2[Use Cached Guidance]
    Check -->|No| Expired[Delete Expired]
    Expired --> Default2
    
    Use2 --> Response2[LLM Response 2 - Informed]
    Default2 --> Response2
    
    Response2 --> BG2[Background: New Analysis]
    BG2 --> Cache2[Update Cache]
    
    Cache2 --> Cleanup{Cleanup Scheduled?}
    Cleanup -->|No| Schedule[Schedule Cleanup in 10min]
    Cleanup -->|Yes| Wait[Wait for Next Write]
    
    Schedule --> CleanupTask[Remove Expired Entries]
```

## Security & Validation

```mermaid
flowchart TD
    Input[User Input] --> V1{Valid UUID?}
    V1 -->|No| Reject1[400 Bad Request]
    V1 -->|Yes| V2{Rate Limit OK?}
    
    V2 -->|No| Warn[Log Warning]
    Warn --> Continue[Continue with Warning]
    V2 -->|Yes| Continue
    
    Continue --> V3{Auth Valid?}
    V3 -->|No| Reject2[401 Unauthorized]
    V3 -->|Yes| Process[Process Request]
    
    Process --> PixelOps[Pixel Operations]
    PixelOps --> V4{Valid Pixel ID?}
    V4 -->|No| Reject3[400 Invalid UUID]
    V4 -->|Yes| V5{Valid Confidence?}
    
    V5 -->|No| Reject4[400 Invalid Range]
    V5 -->|Yes| Execute[Execute DB Operation]
    
    Execute --> ErrorBoundary{Operation Success?}
    ErrorBoundary -->|Success| Return[Return Result]
    ErrorBoundary -->|DB Error| Catch[Catch and Log]
    Catch --> GracefulFail[Return Error Response]
```

## Production Deployment Considerations

### Required Environment Variables

```mermaid
flowchart LR
    Required[Required for Basic Operation]
    Recommended[Recommended for Production]
    Optional[Optional Enhancements]
    
    Required --> POSTGRES[POSTGRES_URL]
    Required --> OPENAI[OPENAI_API_KEY]
    
    Recommended --> CHROMA[CHROMA_URL]
    Recommended --> REDIS[REDIS_URL]
    Recommended --> CHROMA_KEY[CHROMA_API_KEY]
    
    Optional --> VERCEL[VERCEL Environment]
    Optional --> TELEMETRY[Telemetry Config]
    
    POSTGRES --> DB[Database Operations]
    CHROMA --> RAG[RAG Context]
    REDIS --> Cache[Distributed Cache]
    OPENAI --> LLM[LLM Operations]
```

---

## Legend

- **Solid lines**: Synchronous operations (blocking)
- **Dashed lines**: Asynchronous operations (non-blocking)
- **Diamonds**: Decision points
- **Rectangles**: Process steps
- **Parallelograms**: Input/Output
- **Cylinders**: Data stores (not shown in all diagrams due to Mermaid limitations)

## Notes on Implementation

1. **Fast Path Priority**: RAG context retrieval is optimized for speed (200-500ms target) to minimize TTFT
2. **Graceful Degradation**: All external dependencies (ChromaDB, Redis) fail gracefully
3. **Fire and Forget**: Background analysis doesn't block user experience
4. **Cache Strategy**: In-memory with TTL for demo; Redis recommended for production
5. **Error Boundaries**: Every async operation wrapped in try-catch with appropriate fallbacks
6. **Rate Limiting**: In-memory tracking; move to Redis for multi-instance deployments

