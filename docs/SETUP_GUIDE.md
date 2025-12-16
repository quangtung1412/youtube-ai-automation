# 🚀 Setup Guide - AI Video Automation Platform

## Prerequisites

- Node.js 18+ installed
- Google API Key for Gemini AI
- Basic understanding of Next.js and React

## Step-by-Step Setup

### 1. Install Dependencies

Open your terminal in the project directory and run:

\`\`\`bash
npm install
\`\`\`

This will install:
- Next.js 15
- React 19
- Google Generative AI SDK
- Prisma ORM
- TailwindCSS
- p-queue
- And all other dependencies

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory (or edit the existing one):

\`\`\`env
DATABASE_URL="file:./prisma/local.db"
GOOGLE_API_KEY="your_actual_google_api_key_here"
\`\`\`

**Get your Google API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in `.env.local`

### 3. Initialize Database

Run Prisma migrations to create your SQLite database:

\`\`\`bash
npx prisma generate
npx prisma migrate dev --name init
\`\`\`

This creates:
- `prisma/local.db` - Your SQLite database
- `prisma/migrations/` - Migration history
- Generated Prisma Client

### 4. Seed Database (Optional)

To create demo data for testing:

\`\`\`bash
npm install ts-node --save-dev
npm run seed
\`\`\`

This creates:
- Demo user account
- Sample channel "Tech Explained"
- Sample project about AI

### 5. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 First Steps After Setup

### 1. Configure System Settings

Navigate to: `http://localhost:3000/dashboard/settings`

Configure:
- **Default AI Model**: Choose between Gemini 1.5 Pro (best), Flash (fastest), or 1.0 Pro
- **Minimum Video Duration**: Set target video length (default: 600s = 10 minutes)
- **Average Scene Duration**: Set scene length (default: 8 seconds)
- **VEO3 Template**: Customize video prompt structure

### 2. Create Your First Channel

Navigate to: `http://localhost:3000/dashboard/channels/new`

Fill in:
- **Channel Name**: e.g., "Tech Tutorials", "Story Time"
- **Character Description**: Detailed physical description
  - Example: "An anime boy, silver hair, wearing blue hoodie, friendly expression"
- **Tone**: Professional, Casual, Humorous, etc.
- **Visual Style**: Cinematic, Anime, Realistic, etc.
- **Background Theme**: Describe your typical background setting

### 3. Create Your First Project

Navigate to: `http://localhost:3000/dashboard/projects/new`

Steps:
1. Enter a project title
2. Select your channel
3. Paste your long-form content (article, research paper, documentation)
   - **Tip**: The more content you provide, the better the AI output
   - **Note**: Gemini 1.5 Pro can handle up to 2 million tokens!
4. Click "Create Project"

### 4. Generate Video Outline (Phase 1)

On the project detail page:
1. Click "Generate Outline with AI"
2. Wait for AI to analyze your content (usually 10-30 seconds)
3. Review the generated:
   - Video title
   - Chapter breakdown with timing
   - Visual asset definitions (character, background, style)

### 5. Generate Detailed Scripts (Phase 2)

After outline approval:
1. Click "Generate Scripts with AI"
2. AI processes each chapter in parallel (may take 1-3 minutes depending on chapter count)
3. Review generated scenes with:
   - Voiceover text
   - Visual descriptions
   - VEO3 video prompts

### 6. Export Your Scripts

Options:
- **JSON Export**: For programmatic use or integration
- **CSV Export**: For spreadsheet analysis or manual editing

## 📁 Project Structure Overview

\`\`\`
AIVideoAutomationPlatform/
│
├── app/                          # Next.js App Router
│   ├── dashboard/
│   │   ├── channels/            # Channel management pages
│   │   ├── projects/            # Project creation & detail
│   │   └── settings/            # Admin settings
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
│
├── actions/                      # Server Actions
│   ├── channels.ts              # Channel CRUD
│   ├── projects.ts              # Project CRUD
│   ├── systemConfig.ts          # Settings management
│   ├── generateOutline.ts       # AI outline generation
│   └── generateScript.ts        # AI script generation
│
├── lib/                          # Utilities
│   ├── db.ts                    # Prisma client singleton
│   └── gemini.ts                # Gemini API wrapper
│
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── seed.ts                  # Seed script
│   └── migrations/              # Migration history
│
├── .env.local                   # Environment variables (create this!)
├── .env.example                 # Environment template
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies
├── README.md                    # Project documentation
└── SETUP_GUIDE.md              # This file
\`\`\`

## 🔧 Common Issues & Solutions

### Issue: "Environment variable not found: DATABASE_URL"

**Solution**: Make sure `.env.local` exists and contains:
\`\`\`
DATABASE_URL="file:./prisma/local.db"
\`\`\`

### Issue: "Cannot find module '@prisma/client'"

**Solution**: Run:
\`\`\`bash
npx prisma generate
\`\`\`

### Issue: Gemini API returns 429 (Rate Limit)

**Solution**: 
- The app uses p-queue with concurrency:2 to prevent this
- If it still happens, check your API quota in Google AI Studio
- Consider upgrading to paid tier for higher limits

### Issue: AI generates empty or invalid responses

**Solution**:
- Check your GOOGLE_API_KEY is valid
- Ensure your input content is substantial (100+ words recommended)
- Try using Gemini 1.5 Pro instead of Flash for better quality

### Issue: Port 3000 already in use

**Solution**: Either:
- Kill the process using port 3000
- Or run on different port: `npm run dev -- -p 3001`

## 🎓 Understanding the Workflow

### Phase 1: Master Plan Generation

The system sends your **entire input content** to Gemini in one request:

**Input**:
- Full article/content
- Channel persona settings
- Target video duration

**Output**:
- Structured chapter breakdown
- Duration estimates
- Visual asset definitions (character, background)

**Why full context?** Gemini 1.5 Pro's 2M token window allows it to understand the complete narrative arc and create coherent structure.

### Phase 2: Detailed Script Generation

For each chapter, the system:

1. **Queues Processing**: Uses p-queue (concurrency: 2) to avoid rate limits
2. **Generates Scenes**: Breaks chapter into 5-10 second scenes
3. **Creates Content**:
   - Voiceover narration
   - Visual descriptions
   - Camera directions
4. **Assembles VEO3 Prompts**: Uses template + assets for consistency

**Result**: Complete scene-by-scene scripts ready for video production.

## 🚀 Production Deployment

### Option 1: Vercel (Recommended for Next.js)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `GOOGLE_API_KEY`
   - `DATABASE_URL` (use proper DB for production, not SQLite)
4. Deploy

**Note**: For production, consider upgrading from SQLite to PostgreSQL.

### Option 2: Docker + VPS

1. Create Dockerfile
2. Build image: `docker build -t ai-video-platform .`
3. Run container with volume mount for SQLite database
4. Use nginx as reverse proxy

### Production Considerations

- **Database**: Migrate from SQLite to PostgreSQL/MySQL for better concurrency
- **Authentication**: Implement NextAuth.js (user model already exists)
- **Rate Limiting**: Implement user-level quotas
- **Caching**: Add Redis for session/result caching
- **Monitoring**: Implement error tracking (Sentry) and analytics

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

## 🆘 Getting Help

If you encounter issues:

1. Check this guide thoroughly
2. Review error messages in browser console and terminal
3. Check `.env.local` configuration
4. Verify database migrations are applied
5. Ensure Node.js version is 18+

## 🎉 You're Ready!

Your AI Video Automation Platform is now set up and ready to use. Start by:

1. ✅ Visiting http://localhost:3000
2. ✅ Configuring system settings
3. ✅ Creating your first channel
4. ✅ Generating your first video script

Happy automating! 🚀🎬
