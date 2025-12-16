# Quick Start - AI Video Automation Platform

## ⚡ 5-Minute Setup

### 1. Install Dependencies (30 seconds)
\`\`\`bash
npm install
\`\`\`

### 2. Get Google API Key (2 minutes)
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### 3. Configure Environment (30 seconds)
Create `.env.local`:
\`\`\`bash
echo 'DATABASE_URL="file:./prisma/local.db"' > .env.local
echo 'GOOGLE_API_KEY="paste_your_key_here"' >> .env.local
\`\`\`

Or manually create `.env.local` with:
\`\`\`
DATABASE_URL="file:./prisma/local.db"
GOOGLE_API_KEY="your_actual_key_here"
\`\`\`

### 4. Setup Database (30 seconds)
\`\`\`bash
npx prisma generate
npx prisma migrate dev --name init
\`\`\`

### 5. Start Server (10 seconds)
\`\`\`bash
npm run dev
\`\`\`

Visit: http://localhost:3000

## 🎯 First Video Script in 5 Minutes

### Step 1: Configure Settings (30s)
1. Go to `/dashboard/settings`
2. Keep defaults or customize
3. Click "Save Settings"

### Step 2: Create Channel (1 min)
1. Go to `/dashboard/channels/new`
2. Fill in:
   - Name: "Tech Tutorials"
   - Character: "A friendly tech expert"
   - Tone: "Educational"
   - Style: "Professional"
3. Click "Create Channel"

### Step 3: Create Project (30s)
1. Go to `/dashboard/projects/new`
2. Enter title: "Introduction to AI"
3. Select your channel
4. Paste this sample content:

\`\`\`
Artificial Intelligence is transforming our world. Machine learning 
algorithms power everything from smartphone assistants to self-driving 
cars. Deep learning uses neural networks to recognize patterns in data.

Natural language processing enables computers to understand human speech. 
Computer vision allows machines to interpret images and videos. These 
technologies are revolutionizing healthcare, finance, and education.

The future of AI holds incredible potential, but also raises important 
ethical questions about privacy, bias, and job displacement that we must 
carefully address.
\`\`\`

4. Click "Create Project"

### Step 4: Generate Outline (1 min)
1. Click "Generate Outline with AI"
2. Wait ~20 seconds
3. Review chapters and visual assets

### Step 5: Generate Scripts (2 min)
1. Click "Generate Scripts with AI"
2. Wait ~1-2 minutes
3. Review scene-by-scene scripts
4. Export as JSON or CSV

## 🎉 Done!

You now have a complete video script with:
- ✅ Structured chapters
- ✅ Scene breakdowns
- ✅ Voiceover text
- ✅ Visual descriptions
- ✅ VEO3 prompts ready for video generation

## 📚 Next Steps

- Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed documentation
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Experiment with different content types
- Customize VEO3 templates for your style

## 🆘 Common Issues

**"Environment variable not found"**
→ Make sure `.env.local` exists and contains GOOGLE_API_KEY

**"Cannot find module @prisma/client"**
→ Run: `npx prisma generate`

**Gemini API errors**
→ Verify your API key is correct and active

**Port 3000 in use**
→ Run: `npm run dev -- -p 3001`

---

Happy creating! 🚀
