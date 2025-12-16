# 🎬 AI Video Automation Platform - Architecture & Workflow

## System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│                    (Web Browser)                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS 15 APP                            │
│                  (App Router)                               │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard  │  │  Channels   │  │  Projects   │        │
│  │    Pages    │  │   Pages     │  │    Pages    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│  ┌────────────────────────────────────────────────┐        │
│  │         SERVER ACTIONS                         │        │
│  │  (channels.ts, projects.ts, generate*.ts)      │        │
│  └────────────────────────────────────────────────┘        │
└──────────────────┬──────────────────┬──────────────────────┘
                   │                  │
       ┌───────────┘                  └───────────┐
       ▼                                          ▼
┌─────────────────┐                    ┌─────────────────┐
│  PRISMA ORM     │                    │  GEMINI API     │
│                 │                    │  (@google/      │
│  ┌───────────┐  │                    │   generative-ai)│
│  │  SQLite   │  │                    └─────────────────┘
│  │ Database  │  │                             │
│  └───────────┘  │                             │
│                 │                             ▼
│  Models:        │                    ┌─────────────────┐
│  - SystemConfig │                    │  Google Gemini  │
│  - User         │                    │   1.5 Pro/Flash │
│  - Channel      │                    └─────────────────┘
│  - Project      │
└─────────────────┘
\`\`\`

## Data Flow - Complete Workflow

### Step 1: System Configuration
\`\`\`
Admin Settings Page
      │
      ├─ Select AI Model (Gemini 1.5 Pro, Flash, 1.0 Pro)
      ├─ Set Video Duration (min 600s)
      ├─ Set Scene Duration (avg 8s)
      └─ Configure VEO3 Template
      │
      ▼
  [Save to SystemConfig DB]
\`\`\`

### Step 2: Channel Creation
\`\`\`
Channel Form
      │
      ├─ Channel Name
      ├─ Character Description (persona)
      ├─ Tone (professional, casual, etc.)
      ├─ Style (cinematic, anime, etc.)
      └─ Background Theme
      │
      ▼
  [Save to Channel DB with persona JSON]
\`\`\`

### Step 3: Project Creation
\`\`\`
Project Form
      │
      ├─ Project Title
      ├─ Select Channel
      └─ Input Content (long-form text)
      │
      ▼
  [Create Project in DB - Status: DRAFT]
\`\`\`

### Step 4: Phase 1 - Outline Generation

\`\`\`
                    User clicks "Generate Outline"
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Generate Outline   │
                    │   Server Action     │
                    └──────────┬──────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            [Fetch Project]      [Fetch Channel]
            [Fetch Config]
                    │
                    └─────────┬─────────┘
                              │
                              ▼
            ┌──────────────────────────────────┐
            │   Build Context for Gemini       │
            │                                  │
            │  System Instruction:             │
            │  - Channel name & persona        │
            │  - Character description         │
            │  - Tone, Style, Background       │
            │                                  │
            │  Prompt:                         │
            │  - FULL input content            │
            │  - Target duration requirements  │
            │  - Chapter structure request     │
            └──────────────┬───────────────────┘
                          │
                          ▼
            ┌──────────────────────────────────┐
            │  Call Gemini API                 │
            │  (Single Large Context Request)  │
            │                                  │
            │  Model: gemini-1.5-pro           │
            │  Context Window: 2M tokens       │
            │  Response Format: JSON           │
            └──────────────┬───────────────────┘
                          │
                          ▼
            ┌──────────────────────────────────┐
            │  Gemini Returns JSON:            │
            │  {                               │
            │    "title": "Video Title",       │
            │    "chapters": [                 │
            │      {                           │
            │        "id": 1,                  │
            │        "title": "...",           │
            │        "content_summary": "...", │
            │        "duration_seconds": 120   │
            │      }, ...                      │
            │    ],                            │
            │    "veo3_assets": {              │
            │      "character": "...",         │
            │      "background_base": "...",   │
            │      "tone": "...",              │
            │      "style": "..."              │
            │    }                             │
            │  }                               │
            └──────────────┬───────────────────┘
                          │
                          ▼
            [Save to Project.outlineData]
            [Update Status: OUTLINE_GENERATED]
                          │
                          ▼
                [Return to Frontend]
                          │
                          ▼
            [Display Outline with Chapters]
\`\`\`

### Step 5: Phase 2 - Script Generation

\`\`\`
                User clicks "Generate Scripts"
                          │
                          ▼
              ┌─────────────────────┐
              │  Generate Scripts   │
              │   Server Action     │
              └──────────┬──────────┘
                        │
              [Fetch Project + Outline]
              [Fetch Channel Persona]
              [Fetch System Config]
                        │
                        ▼
        ┌────────────────────────────────┐
        │   Setup p-queue                │
        │   Concurrency: 2               │
        │   (Prevent Rate Limiting)      │
        └────────────┬───────────────────┘
                    │
                    ▼
        ┌────────────────────────────────┐
        │  For Each Chapter:             │
        │                                │
        │  Queue.add(async () => {       │
        │                                │
        │    Build Context:              │
        │    ├─ Chapter info             │
        │    ├─ VEO3 assets (consistency)│
        │    ├─ Target scene duration    │
        │    └─ Scene count calculation  │
        │                                │
        │    Call Gemini:                │
        │    ├─ System: "Video Writer"   │
        │    └─ Prompt: Chapter details  │
        │                                │
        │    Response: Chapter Script    │
        │    {                           │
        │      "chapter_id": 1,          │
        │      "chapter_title": "...",   │
        │      "scenes": [               │
        │        {                       │
        │          "id": 1,              │
        │          "duration_seconds": 8,│
        │          "voiceover": "...",   │
        │          "visual": "..."       │
        │        }, ...                  │
        │      ]                         │
        │    }                           │
        │                                │
        │    Post-Process:               │
        │    └─ Add VEO3 prompt to each  │
        │       scene using template     │
        │                                │
        │  })                            │
        └────────────┬───────────────────┘
                    │
                    ▼ (Process all chapters in parallel)
        ┌────────────────────────────────┐
        │   Wait for Queue to Complete   │
        │   (All chapters processed)     │
        └────────────┬───────────────────┘
                    │
                    ▼
        ┌────────────────────────────────┐
        │  Collect All Chapter Scripts   │
        │  Sort by Chapter ID            │
        └────────────┬───────────────────┘
                    │
                    ▼
        [Save to Project.fullScript as JSON Array]
        [Update Status: SCRIPT_GENERATED]
                    │
                    ▼
            [Return to Frontend]
                    │
                    ▼
        [Display All Scenes with Export Options]
\`\`\`

## VEO3 Prompt Assembly Logic

\`\`\`
Template from Config:
"[STYLE] of [CHARACTER] doing [ACTION], [BG], [LIGHTING]"

VEO3 Assets from Outline:
{
  "character": "An anime boy, silver hair...",
  "background_base": "Futuristic laboratory...",
  "style": "Cinematic shot",
  "tone": "dramatic"
}

Scene Visual Description:
"Character explaining AI concepts with hand gestures"

Assembly Process:
├─ [STYLE] → "Cinematic shot"
├─ [CHARACTER] → "An anime boy, silver hair..."
├─ [ACTION] → "explaining AI concepts with hand gestures"
├─ [BG] → "Futuristic laboratory..."
└─ [LIGHTING] → "dramatic lighting, 4K, ultra detailed"

Final VEO3 Prompt:
"Cinematic shot of An anime boy, silver hair... doing 
explaining AI concepts with hand gestures, Futuristic 
laboratory..., dramatic lighting, 4K, ultra detailed"
\`\`\`

## Database Schema Relationships

\`\`\`
┌─────────────────┐
│  SystemConfig   │  (Singleton: id="global_config")
│                 │
│ - defaultModelId├──► Model selection
│ - minVideoDuration
│ - avgSceneDuration
│ - veo3Template
└─────────────────┘


┌─────────────┐
│    User     │
│             │
│ - id        │
│ - email     │
│ - name      │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐
│   Channel   │
│             │
│ - id        │
│ - name      │
│ - userId    │
│ - personaSettings (JSON)
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐
│   Project   │
│             │
│ - id        │
│ - title     │
│ - channelId │
│ - status    │
│ - inputContent
│ - outlineData (JSON)
│ - fullScript (JSON[])
└─────────────┘
\`\`\`

## Status Flow

\`\`\`
DRAFT
  │
  │ (User clicks "Generate Outline")
  ▼
OUTLINE_GENERATED
  │
  │ (User clicks "Generate Scripts")
  ▼
SCRIPT_GENERATED
  │
  │ (Future: Video generation)
  ▼
COMPLETED
\`\`\`

## Key Technologies Explained

### Why Gemini 1.5 Pro?
- **2M Token Context**: Can process entire books in one request
- **JSON Mode**: Native structured output support
- **Multimodal**: Future support for images/video input
- **Cost Effective**: Better than GPT-4 for long context

### Why p-queue?
- **Rate Limit Protection**: Gemini has request limits
- **Concurrency Control**: Process 2 chapters simultaneously
- **Graceful Degradation**: Continues on individual failures

### Why SQLite?
- **Zero Config**: No server setup needed
- **Portable**: Single file database
- **Fast**: Sufficient for this use case
- **Easy Upgrade**: Simple migration to PostgreSQL later

### Why Server Actions?
- **Type Safety**: Full TypeScript support
- **Simplified API**: No need for separate API routes
- **Security**: Automatic protection against XSS/CSRF
- **Progressive Enhancement**: Works without JavaScript

## Performance Characteristics

### Outline Generation
- **Input Size**: Unlimited (up to 2M tokens)
- **Processing Time**: 10-30 seconds
- **API Calls**: 1 request
- **Cost**: ~$0.01-0.05 per request

### Script Generation
- **Input Size**: Chapter-level (smaller chunks)
- **Processing Time**: 1-3 minutes (parallel processing)
- **API Calls**: Number of chapters (processed in batches of 2)
- **Cost**: ~$0.10-0.30 per project

### Export
- **JSON**: Instant (client-side)
- **CSV**: Instant (client-side)
- **File Size**: Typically 50-500 KB

## Future Enhancements

1. **Authentication**: NextAuth.js integration
2. **Real-time Updates**: WebSocket progress streaming
3. **Video Generation**: Direct VEO3 API integration
4. **Audio**: TTS for voiceover generation
5. **Preview**: In-app video preview
6. **Collaboration**: Multi-user editing
7. **Templates**: Pre-built channel templates
8. **Analytics**: Track performance metrics

---

**Built with ❤️ using Next.js 15 and Google Gemini AI**
