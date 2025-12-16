# AI Prompt Customization Guide

## Overview

The AI Video Automation Platform now allows you to customize all AI prompts used throughout the system. This gives you full control over how AI generates content for your videos.

## Accessing Prompt Settings

1. Navigate to **Dashboard → Settings**
2. Click on the **AI Prompts** tab
3. You'll see 6 expandable prompt templates

## Available Prompt Templates

### 1. Outline Generation Prompt
**Used for:** Creating video outlines from input content

**Available Variables:**
- `${project.inputContent}` - Main content to analyze
- `${config.minVideoDuration}` - Minimum video duration in seconds
- `${config.channelName}` - Channel name
- `${config.language}` - Primary language
- `${persona.character}` - Channel character
- `${persona.tone}` - Channel tone
- `${persona.style}` - Channel style
- `${persona.background}` - Background theme

**Example Use Case:** Add specific requirements like "Always include a summary chapter at the end" or "Focus on educational content structure"

### 2. Scripts Generation Prompt
**Used for:** Generating scene-by-scene scripts for each chapter

**Available Variables:**
- `${chapter.title}` - Chapter title
- `${chapter.content_summary}` - Chapter content
- `${chapter.duration_seconds}` - Target duration
- `${outline.veo3_assets.character}` - Character description
- `${outline.veo3_assets.background_base}` - Background description
- `${outline.veo3_assets.tone}` - Visual tone
- `${outline.veo3_assets.style}` - Visual style
- `${config.avgSceneDuration}` - Average scene duration
- `${project.channel.name}` - Channel name
- `${persona.character_desc}` - Character description
- `${persona.tone}` - Tone
- `${persona.style}` - Style

**Example Use Case:** Add instructions like "Always start scenes with an engaging hook" or "Include call-to-action in the last scene"

### 3. VEO3 Prompt Generation
**Used for:** Creating VEO3 video prompts for each scene

**Available Variables:**
- `${context.projectTitle}` - Project title
- `${context.channelName}` - Channel name
- `${context.character.description}` - Character description
- `${context.character.tone}` - Character tone
- `${context.character.style}` - Character style
- `${context.character.background}` - Character background
- `${context.characterVisual}` - Character visual details
- `${context.backgroundVisual}` - Background visual details
- `${context.items}` - Array of items with name and visualDesc
- `${context.veo3Template}` - VEO3 template structure
- `${scene.chapter.title}` - Chapter title
- `${scene.sceneNumber}` - Scene number
- `${scene.durationSeconds}` - Scene duration
- `${scene.voiceover}` - Scene voiceover text
- `${scene.visualDesc}` - Scene visual description

**Example Use Case:** Customize cinematography style like "Always use wide-angle shots" or "Prefer closeup shots for emotional scenes"

### 4. Character Visual Description
**Used for:** Generating character visual descriptions for image prompts

**Available Variables:**
- `${project.inputContent}` - Project content to analyze
- `${project.mainCharacterDesc}` - Main character hint
- `${project.styleStorytelling}` - Storytelling style
- `${config.language}` - Primary language
- `${persona.tone}` - Channel tone
- `${persona.style}` - Channel style

**Example Use Case:** Add specific visual requirements like "Always include facial expressions" or "Focus on clothing details"

### 5. Background/Environment Description
**Used for:** Generating background and environment visual descriptions

**Available Variables:**
- `${project.inputContent}` - Project content to analyze
- `${project.videoRatio}` - Video aspect ratio
- `${config.language}` - Primary language
- `${persona.background}` - Background theme preference
- `${persona.tone}` - Channel tone
- `${persona.style}` - Channel style

**Example Use Case:** Specify environment preferences like "Always include natural lighting" or "Prefer minimalist backgrounds"

### 6. Items Visual Description
**Used for:** Generating visual descriptions for items/props in videos

**Available Variables:**
- `${project.inputContent}` - Project content
- `${project.items[].name}` - Item name
- `${project.items[].description}` - Item description
- `${project.items[].context}` - Item context
- `${config.language}` - Primary language

**Example Use Case:** Add detail requirements like "Include material texture details" or "Specify exact dimensions"

## How to Edit Prompts

1. **Expand a prompt section** by clicking on it
2. **Edit the textarea** with your custom instructions
3. **Use variables** (format: `${variable.name}`) to inject dynamic values
4. **Click "Save Changes"** to update that specific prompt
5. **Click "Reset to Default"** to restore the original prompt

## Tips for Customizing Prompts

1. **Start Small:** Begin by making small adjustments to see how they affect output
2. **Use Variables:** Leverage available variables to make prompts dynamic and context-aware
3. **Be Specific:** Clear, detailed instructions produce better results
4. **Test Changes:** Generate content after changing prompts to verify improvements
5. **Keep Backups:** Note down your custom prompts before major changes
6. **Reset if Needed:** Use "Reset to Default" if custom prompts don't work as expected

## Bilingual Support

If your primary language is NOT Vietnamese, prompts will automatically:
- Request both original language and Vietnamese translations
- Use `_vi` suffix for Vietnamese fields (e.g., `title_vi`, `content_summary_vi`)
- Ensure bilingual output in all generated content

## Example Customizations

### More Detailed Outlines
Add to Outline Prompt:
```
ADDITIONAL REQUIREMENTS:
- Each chapter must have at least 5 key points
- Include learning objectives for educational content
- Add estimated difficulty level for each chapter
```

### Cinematic VEO3 Prompts
Add to VEO3 Prompt:
```
CINEMATOGRAPHY STYLE:
- Use shallow depth of field for emphasis
- Prefer golden hour lighting when applicable
- Include smooth camera movements (dolly, pan, zoom)
- 4K quality, cinematic aspect ratio
```

### Detailed Character Descriptions
Add to Character Prompt:
```
FOCUS AREAS:
- Detailed facial features and expressions
- Specific clothing brands and styles
- Accessories and their significance
- Body language and posture
```

## Troubleshooting

**Problem:** AI doesn't follow custom instructions
- **Solution:** Make instructions more explicit and detailed

**Problem:** Generated content quality decreased
- **Solution:** Reset to default and try smaller, incremental changes

**Problem:** Variables not working
- **Solution:** Check variable syntax: `${exact.variable.name}` (case-sensitive)

**Problem:** Bilingual output missing
- **Solution:** Ensure primary language is set correctly in Channel settings

## Advanced: Understanding Prompt Structure

Each prompt template consists of:

1. **System Instructions** - Define AI's role and capabilities
2. **Context Variables** - Dynamic values injected at runtime
3. **Requirements** - Specific guidelines for output
4. **Format Instructions** - Expected output structure (usually JSON)
5. **Custom Instructions** - Your additions from Settings

The system combines these elements to create the final prompt sent to AI.

## Best Practices

✅ **DO:**
- Keep prompts clear and concise
- Use variables for dynamic content
- Test changes on small projects first
- Document your custom prompts
- Share successful prompts with your team

❌ **DON'T:**
- Make too many changes at once
- Use conflicting instructions
- Forget to save after editing
- Remove critical format instructions
- Ignore variable syntax

## Support

For more help with prompt customization:
1. Check default prompts for examples
2. Review "Available Variables" in each prompt
3. Experiment with small modifications
4. Reset to default if issues occur

---

**Note:** Custom prompts are stored in the database and persist across sessions. Changes affect all future content generation until modified again.
