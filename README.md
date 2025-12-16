# AI Video Automation Platform - Gemini Edition

A powerful Next.js application that leverages Google Gemini AI to automatically generate comprehensive video scripts from long-form content.

## 🚀 Features

- **Authentication**: Secure sign-in with Google OAuth (NextAuth.js)
- **Long Context Processing**: Utilizes Gemini 1.5 Pro's 2M token context window
- **Channel Management**: Create multiple channels with unique personas and styles
- **AI-Powered Outline Generation**: Automatically breaks down content into structured chapters
- **Scene-by-Scene Scripting**: Generates detailed scripts with voiceovers and visual descriptions
- **VEO3 Integration**: Automated prompt generation for video creation
- **Export Capabilities**: Download scripts as JSON or CSV

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: NextAuth.js v5 with Google OAuth
- **AI Engine**: Google Gemini API (@google/generative-ai)
- **Database**: SQLite with Prisma ORM
- **UI**: TailwindCSS
- **Queue Management**: p-queue (Rate limit handling)

## 📦 Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd AIVideoAutomationPlatform
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` and add your keys:
\`\`\`
DATABASE_URL="file:./prisma/local.db"
GOOGLE_API_KEY="your_google_api_key_here"

# NextAuth Configuration
AUTH_SECRET="generate-with-openssl-or-crypto"
AUTH_GOOGLE_ID="your_google_oauth_client_id"
AUTH_GOOGLE_SECRET="your_google_oauth_client_secret"
NEXTAUTH_URL="http://localhost:3000"
\`\`\`

**Get your Google API Key:**
- Visit: https://makersuite.google.com/app/apikey

**Setup Google OAuth:**
- Follow the detailed guide: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

**Generate AUTH_SECRET:**
\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
\`\`\`

4. Initialize the database:
\`\`\`bash
npx prisma generate
npx prisma migrate dev --name init
\`\`\`

## 🏃 Running the Application

Development mode:
\`\`\`bash
npm run dev
\`\`\`

Build for production:
\`\`\`bash
npm run build
npm start
\`\`\`

## 📖 Usage

### 0. Sign In
Visit http://localhost:3000 and sign in with your Google account.

### 1. Configure System Settings
Navigate to `/dashboard/settings` to:
- Select default AI model (Gemini 1.5 Pro, Flash, or 1.0 Pro)
- Set minimum video duration
- Configure average scene duration
- Customize VEO3 prompt templates

### 2. Create a Channel
Go to `/dashboard/channels/new` to create a channel with:
- Channel name
- Character description
- Visual style and tone
- Background themes

### 3. Create a Project
From `/dashboard/projects/new`:
- Select a channel
- Input your long-form content (articles, research papers, etc.)
- Let AI analyze and structure it

### 4. Generate Outline (Phase 1)
- AI analyzes your content using full context
- Creates chapter breakdown with timing
- Defines consistent visual assets

### 5. Generate Scripts (Phase 2)
- Processes each chapter in parallel (rate-limited)
- Creates scene-by-scene scripts
- Generates voiceover text
- Produces VEO3 video prompts

### 6. Export
Download your complete scripts as:
- JSON (for programmatic use)
- CSV (for spreadsheet analysis)

## 🗂️ Project Structure

\`\`\`
AIVideoAutomationPlatform/
├── app/
│   ├── dashboard/
│   │   ├── channels/          # Channel management
│   │   ├── projects/          # Project creation & detail
│   │   └── settings/          # Admin settings
│   ├── layout.tsx
│   └── page.tsx
├── actions/
│   ├── channels.ts            # Channel CRUD operations
│   ├── projects.ts            # Project CRUD operations
│   ├── systemConfig.ts        # System configuration
│   ├── generateOutline.ts     # Phase 1: Outline generation
│   └── generateScript.ts      # Phase 2: Script generation
├── lib/
│   ├── db.ts                  # Prisma client
│   └── gemini.ts              # Gemini API integration
├── prisma/
│   └── schema.prisma          # Database schema
└── package.json
\`\`\`

## 🔑 Key Concepts

### Workflow

1. **Master Plan (Outline Generation)**
   - Single large context request to Gemini
   - Analyzes entire input content
   - Creates structured chapter breakdown
   - Defines visual consistency rules

2. **Detailed Scripting**
   - Parallel processing with p-queue
   - Chapter-by-chapter script generation
   - Scene breakdown (5-10s each)
   - VEO3 prompt assembly

3. **VEO3 Prompt Assembly**
   - Template-based prompt generation
   - Consistent character/background usage
   - Customizable via admin settings

## 🎯 Models Supported

- **gemini-1.5-pro**: Best quality, 2M context window (recommended)
- **gemini-1.5-flash**: Fastest, 1M context window
- **gemini-1.0-pro**: Standard, 32K context window

## 📝 Database Schema

- **SystemConfig**: Global settings (model selection, constraints, templates)
- **User**: User accounts (ready for NextAuth integration)
- **Channel**: Channel configurations with persona settings
- **Project**: Projects with input content, outlines, and scripts

## 🚧 Roadmap

- [ ] NextAuth.js integration for user authentication
- [ ] Real-time progress updates during generation
- [ ] Advanced prompt customization
- [ ] Multi-language support
- [ ] Direct VEO3 API integration
- [ ] Audio voiceover generation
- [ ] Video preview functionality

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💡 Tips

- Use Gemini 1.5 Pro for best results with long content
- Provide detailed character descriptions for consistent visuals
- Longer input content (1000+ words) yields better structured videos
- Adjust scene duration based on content complexity
- Test different VEO3 templates for your style

## 🆘 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js and Google Gemini AI**
