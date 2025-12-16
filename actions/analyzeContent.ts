'use server'

import { generateWithGemini } from "@/lib/gemini";
import { prisma } from "@/lib/db";

export async function analyzeContent(projectId: string) {
    try {
        // 1. Lấy thông tin project và config
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { channel: true }
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        if (!config) {
            return { success: false, error: "System config not found" };
        }

        const minVideoDuration = config.minVideoDuration || 600; // seconds
        const persona = JSON.parse(config.personaSettings || '{}');

        // 2. Tính toán số từ cần thiết (WPM = 130)
        const WPM = 130;
        const targetMinutes = Math.ceil(minVideoDuration / 60);
        const requiredWords = targetMinutes * WPM;
        const actualWords = project.inputContent.trim().split(/\s+/).filter(w => w).length;

        // ===== AI PROMPT 1: OUTLINE & STRUCTURE =====
        const outlineSystemInstruction = `Bạn là chuyên gia phân tích nội dung và video structure.
Nhiệm vụ: Chia nội dung thành các chương (chapters) để tạo video có thời lượng phù hợp.`;

        const outlinePrompt = `Phân tích nội dung và tạo cấu trúc video:

NỘI DUNG:
${project.inputContent}

YÊU CẦU:
1. Video phải dài tối thiểu ${targetMinutes} phút (${minVideoDuration} giây)
2. Giả định tốc độ nói: ${WPM} từ/phút
3. Nội dung hiện có: ${actualWords} từ (${actualWords < requiredWords ? 'CẦN MỞ RỘNG' : 'ĐỦ'})
4. Chia thành các chương (chapters) hợp lý
5. Mỗi chương có mục tiêu (goal) rõ ràng
6. Trích xuất các items/đồ vật quan trọng xuất hiện trong nội dung

ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "estimated_duration": ${minVideoDuration},
  "word_count_analysis": {
    "current_words": ${actualWords},
    "required_words": ${requiredWords},
    "status": "${actualWords >= requiredWords ? 'sufficient' : 'needs_expansion'}"
  },
  "chapters": [
    {
      "id": 1,
      "title": "Tên chapter",
      "goal": "Mục tiêu của chapter này (ví dụ: Hook the audience)",
      "duration": 60,
      "key_points": ["Điểm 1", "Điểm 2"]
    }
  ],
  "important_items": [
    {
      "name": "Tên vật phẩm/đồ vật",
      "description": "Mô tả ngắn gọn",
      "context": "Ngữ cảnh xuất hiện"
    }
  ]
}

LƯU Ý:
- Tổng duration của tất cả chapters phải >= ${minVideoDuration} giây
- Mỗi chapter nên 60-180 giây
- Nếu nội dung ngắn, đề xuất cách mở rộng`;

        const outlineResult = await generateWithGemini(`${outlineSystemInstruction}

${outlinePrompt}`, {
            userId: project.channel.userId,
            operation: 'ANALYZE_CONTENT'
        });

        if (!outlineResult.text) {
            return { success: false, error: "No response from AI for outline" };
        }

        const outlineData = JSON.parse(outlineResult.text);

        // ===== AI PROMPT 2: CHARACTER & ASSETS VISUAL DESCRIPTION =====
        const assetsSystemInstruction = `Bạn là chuyên gia Visual Design cho video production.
Nhiệm vụ: Tạo mô tả ngoại hình (Visual Description) cố định cho nhân vật và các đồ vật để dùng xuyên suốt video.`;

        const itemsList = outlineData.important_items
            ?.map((item: any) => `- ${item.name}: ${item.description}`)
            .join('\n') || 'Không có items cụ thể';

        const assetsPrompt = `Tạo Visual Description cho nhân vật và assets:

PERSONA SETTINGS:
- Character: ${persona.character || "Not specified"}
- Visual Style: ${persona.visualStyle || persona.style || "cinematic"}
- Tone: ${persona.tone || "professional"}
- Background: ${persona.background || persona.background_theme || "minimal"}

ITEMS CẦN MÔ TẢ:
${itemsList}

YÊU CẦU:
1. Tạo mô tả visual CỐ ĐỊNH cho nhân vật chính (để dùng xuyên suốt video với VEO3)
2. Tạo mô tả visual cho từng item/đồ vật quan trọng
3. Mô tả phải chi tiết, cụ thể về:
   - Hình dáng, màu sắc, chất liệu
   - Style art (realistic, anime, cartoon, etc.)
   - Lighting và atmosphere
4. Đảm bảo tính nhất quán visual xuyên suốt

ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "character_visual_base": "Mô tả chi tiết nhân vật chính (ví dụ: A young sci-fi storyteller wearing a silver jacket, short blue hair, cyberpunk style glasses, standing in a neon-lit room...)",
  "background_base": "Mô tả môi trường/background chung",
  "assets": {
    "item_name_1": "Mô tả visual chi tiết của item 1 (ví dụ: A battered cyberpunk laptop with holographic display...)",
    "item_name_2": "Mô tả visual chi tiết của item 2"
  },
  "visual_style_guide": {
    "color_palette": "Bảng màu chủ đạo",
    "lighting": "Phong cách ánh sáng",
    "art_style": "Phong cách nghệ thuật tổng thể"
  }
}`;

        const assetsResult = await generateWithGemini(`${assetsSystemInstruction}

${assetsPrompt}`, {
            userId: project.channel.userId,
            operation: 'ANALYZE_CONTENT'
        });

        if (!assetsResult.text) {
            return { success: false, error: "No response from AI for assets" };
        }

        const assetsData = JSON.parse(assetsResult.text);

        // 3. Kết hợp kết quả từ 2 prompts
        const finalAnalysis: AnalysisResult = {
            estimated_duration: outlineData.estimated_duration,
            word_count_analysis: outlineData.word_count_analysis,
            character_visual_base: assetsData.character_visual_base,
            background_base: assetsData.background_base,
            chapters: outlineData.chapters,
            assets: assetsData.assets || {},
            important_items: outlineData.important_items || [],
            visual_style_guide: assetsData.visual_style_guide || {}
        };

        // 4. Có thể lưu vào DB để dùng lại
        // await updateProject(projectId, { 
        //     outlineData: JSON.stringify(finalAnalysis)
        // });

        return {
            success: true,
            analysis: finalAnalysis
        };

    } catch (error: any) {
        console.error("Error analyzing content:", error);
        return {
            success: false,
            error: error.message || "Failed to analyze content"
        };
    }
}

// Types
export interface AnalysisResult {
    estimated_duration: number;
    word_count_analysis: {
        current_words: number;
        required_words: number;
        status: 'sufficient' | 'needs_expansion';
    };
    character_visual_base: string;
    background_base: string;
    chapters: Array<{
        id: number;
        title: string;
        goal: string;
        duration: number;
        key_points: string[];
    }>;
    assets: {
        [key: string]: string;
    };
    important_items: Array<{
        name: string;
        description: string;
        context: string;
    }>;
    visual_style_guide: {
        color_palette?: string;
        lighting?: string;
        art_style?: string;
    };
}

// Keep old interface for backward compatibility
export interface ContentAnalysis {
    summary: string;
    main_topics: string[];
    strengths: string[];
    suggested_structure: {
        chapters: number;
        reasoning: string;
    };
    visual_approach: string;
    suggested_duration_minutes: number;
    target_audience: string;
    key_takeaways: string[];
    storytelling_approach: string;
    engagement_tips: string[];
}
