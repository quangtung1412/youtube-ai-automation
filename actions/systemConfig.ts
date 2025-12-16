'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSystemConfig() {
    try {
        let config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        if (!config) {
            config = await prisma.systemConfig.create({
                data: {
                    id: "global_config",
                    defaultModelId: "gemini-2.5-pro",
                    minVideoDuration: 630,
                    avgSceneDuration: 8,
                    speechRate: 2.5,
                    maxWordsPerScene: 20,
                    veo3Template: "**Scene:** Klay, a claymation teenage boy, introduces the historical complexity of Santa Claus by narrating against a backdrop of a modern Santa figure and a whimsical Arctic landscape, transitioning to a direct address to the viewer. **Visuals:** A cinematic, ultra-detailed 9:16 vertical medium close-up shot of Klay, a cute and intelligent teenage boy character meticulously crafted from matte plasticine clay, embodying a professional and educational tone similar to Veritasium. Klay, approximately 16-18 years old, slender, with a friendly and approachable posture, is entirely made of high-quality matte plasticine clay with a smooth, non-glossy finish. His messy brown clay hair, styled in short, tousled layers, features prominent, visible thumbprint textures. He wears small, round, wire-rimmed glasses (incredibly thin black or silver wire frames, clear lenses). His youthful face shows a curious and engaged expression, with simple black clay bead eyes and a gentle, expressive mouth. He wears a crisp, professional white clay lab coat (realistic folds, seams, sharp collar, worn open) over a simple, plain black clay t-shirt, and simple dark blue or grey clay jeans. His hair and clothing feature subtle, realistic imperfections like visible thumbprints and faint tool marks, giving him an authentic, handcrafted, stop-motion aesthetic. The character design is a blend of charming simplicity and detailed realism, focusing on the tangible, sculpted quality of the clay, presented in a clean, modern, and professional style.Klay stands in the lower corner of the frame. The scene opens on a perfectly rendered, familiar modern Santa Claus figure, crafted from plush red felt (suit), combed merino wool (beard), rosy clay (cheeks), and a generous belly, occupying the majority of the screen. This Santa stands against a whimsical, exaggerated Arctic landscape where steampunk-inspired machinery is subtly integrated into snowy peaks and cozy Alpine-style structures.Klay's background is a minimalist, conceptual archivist's study, a timeless space with a dark, textured charcoal-grey background fading into deep shadow. Flanking the central vertical axis, out of focus due to a very shallow depth of field, are tall, dark wooden shelves holding an ancient Byzantine icon, a clay pipe, a 19th-century ledger, and a vintage glass bottle. **Lighting:** Cinematic three-point lighting for Klay: a soft key light illuminates his face, a subtle fill light softens shadows, and a gentle rim light from behind highlights his textured clay hair and coat. The Santa figure and Arctic landscape are brightly lit with a magical, crisp winter light. Klay's study background features a single, soft, high-contrast spotlight creating a dramatic vignette effect and deep, soft shadows, with a predominantly monochromatic and desaturated color palette of aged parchment tones and muted sepia. **Color Palette:** For Klay: clean, academic white, black, and blue/grey, with warm brown hair. For Santa: vibrant red, white, and rosy pink. For Arctic: crisp whites, blues, and metallic accents. For Klay's study background: predominantly monochromatic and desaturated aged parchment and muted sepia tones.**Aesthetic:** High fidelity, hyper-detailed claymation character with a stop-motion aesthetic, combined with sophisticated 3D animation for the Santa figure and Arctic environment. Professional, clean, modern, and educational cartoon style. **Camera:** **Shot Type:** Medium close-up (MCU) on Klay, framed from the chest up, at eye-level, dynamically cutting between Klay and the Santa figure. **Angle:** Eye-level, direct and engaging. **Movement:** The scene opens with a slow, continuous dolly-in on the detailed Santa figure, emphasizing its global icon status. As Klay begins speaking, the camera smoothly and quickly cuts to Klay in an MCU shot, positioned in the lower corner of the frame. Klay initially looks towards the Santa figure (off-camera from his perspective), then turns his head and body to face the camera directly, adopting a skeptical, intrigued expression. His mouth moves precisely, articulating the spoken words, with visible thumbprint textures on his clay face. The camera maintains a shallow depth of field, keeping Klay in sharp focus while softly blurring the background elements. **Audio:** **SFX:** Gentle *whirring* and *hissing* of subtle steampunk machinery in the Arctic background; a soft *click* as Klay shifts his weight slightly; subtle ambient studio hum. **Music:** Understated, curious orchestral theme with a hint of mystery, utilizing pizzicato strings and a light, inquisitive piano melody. **Style and Mood:** Educational, intriguing, and slightly skeptical, building anticipation for the historical deconstruction, maintaining a high-energy, dynamic pace. **Character Spoken Words:** You think you know Santa Claus, right? Jolly, red suit, North Pole, flying sleigh... He’s a global icon, etched into our collective memory."
                }
            });
        }

        return config;
    } catch (error) {
        console.error("Error getting system config:", error);
        throw error;
    }
}

export async function updateSystemConfig(data: {
    defaultModelId?: string;
    minVideoDuration?: number;
    avgSceneDuration?: number;
    speechRate?: number;
    maxWordsPerScene?: number;
    veo3Template?: string;
    apiKey?: string;
    channelName?: string;
    language?: string;
    personaSettings?: string;
}) {
    try {
        const config = await prisma.systemConfig.upsert({
            where: { id: "global_config" },
            update: data,
            create: {
                id: "global_config",
                defaultModelId: data.defaultModelId || "gemini-2.5-pro",
                minVideoDuration: data.minVideoDuration || 630,
                avgSceneDuration: data.avgSceneDuration || 8,
                speechRate: data.speechRate || 2.5,
                maxWordsPerScene: data.maxWordsPerScene || 20,
                veo3Template: data.veo3Template || "**Scene:** Klay, a claymation teenage boy, introduces the historical complexity of Santa Claus by narrating against a backdrop of a modern Santa figure and a whimsical Arctic landscape, transitioning to a direct address to the viewer. **Visuals:** A cinematic, ultra-detailed 9:16 vertical medium close-up shot of Klay, a cute and intelligent teenage boy character meticulously crafted from matte plasticine clay, embodying a professional and educational tone similar to Veritasium. Klay, approximately 16-18 years old, slender, with a friendly and approachable posture, is entirely made of high-quality matte plasticine clay with a smooth, non-glossy finish. His messy brown clay hair, styled in short, tousled layers, features prominent, visible thumbprint textures. He wears small, round, wire-rimmed glasses (incredibly thin black or silver wire frames, clear lenses). His youthful face shows a curious and engaged expression, with simple black clay bead eyes and a gentle, expressive mouth. He wears a crisp, professional white clay lab coat (realistic folds, seams, sharp collar, worn open) over a simple, plain black clay t-shirt, and simple dark blue or grey clay jeans. His hair and clothing feature subtle, realistic imperfections like visible thumbprints and faint tool marks, giving him an authentic, handcrafted, stop-motion aesthetic. The character design is a blend of charming simplicity and detailed realism, focusing on the tangible, sculpted quality of the clay, presented in a clean, modern, and professional style.Klay stands in the lower corner of the frame. The scene opens on a perfectly rendered, familiar modern Santa Claus figure, crafted from plush red felt (suit), combed merino wool (beard), rosy clay (cheeks), and a generous belly, occupying the majority of the screen. This Santa stands against a whimsical, exaggerated Arctic landscape where steampunk-inspired machinery is subtly integrated into snowy peaks and cozy Alpine-style structures.Klay's background is a minimalist, conceptual archivist's study, a timeless space with a dark, textured charcoal-grey background fading into deep shadow. Flanking the central vertical axis, out of focus due to a very shallow depth of field, are tall, dark wooden shelves holding an ancient Byzantine icon, a clay pipe, a 19th-century ledger, and a vintage glass bottle. **Lighting:** Cinematic three-point lighting for Klay: a soft key light illuminates his face, a subtle fill light softens shadows, and a gentle rim light from behind highlights his textured clay hair and coat. The Santa figure and Arctic landscape are brightly lit with a magical, crisp winter light. Klay's study background features a single, soft, high-contrast spotlight creating a dramatic vignette effect and deep, soft shadows, with a predominantly monochromatic and desaturated color palette of aged parchment tones and muted sepia. **Color Palette:** For Klay: clean, academic white, black, and blue/grey, with warm brown hair. For Santa: vibrant red, white, and rosy pink. For Arctic: crisp whites, blues, and metallic accents. For Klay's study background: predominantly monochromatic and desaturated aged parchment and muted sepia tones.**Aesthetic:** High fidelity, hyper-detailed claymation character with a stop-motion aesthetic, combined with sophisticated 3D animation for the Santa figure and Arctic environment. Professional, clean, modern, and educational cartoon style. **Camera:** **Shot Type:** Medium close-up (MCU) on Klay, framed from the chest up, at eye-level, dynamically cutting between Klay and the Santa figure. **Angle:** Eye-level, direct and engaging. **Movement:** The scene opens with a slow, continuous dolly-in on the detailed Santa figure, emphasizing its global icon status. As Klay begins speaking, the camera smoothly and quickly cuts to Klay in an MCU shot, positioned in the lower corner of the frame. Klay initially looks towards the Santa figure (off-camera from his perspective), then turns his head and body to face the camera directly, adopting a skeptical, intrigued expression. His mouth moves precisely, articulating the spoken words, with visible thumbprint textures on his clay face. The camera maintains a shallow depth of field, keeping Klay in sharp focus while softly blurring the background elements. **Audio:** **SFX:** Gentle *whirring* and *hissing* of subtle steampunk machinery in the Arctic background; a soft *click* as Klay shifts his weight slightly; subtle ambient studio hum. **Music:** Understated, curious orchestral theme with a hint of mystery, utilizing pizzicato strings and a light, inquisitive piano melody. **Style and Mood:** Educational, intriguing, and slightly skeptical, building anticipation for the historical deconstruction, maintaining a high-energy, dynamic pace. **Character Spoken Words:** You think you know Santa Claus, right? Jolly, red suit, North Pole, flying sleigh... He’s a global icon, etched into our collective memory.",
                apiKey: data.apiKey,
                channelName: data.channelName || "My Channel",
                language: data.language || "Vietnamese",
                personaSettings: data.personaSettings || "{}"
            }
        });

        revalidatePath('/dashboard/settings');
        return { success: true, config };
    } catch (error) {
        console.error("Error updating system config:", error);
        return { success: false, error: "Failed to update config" };
    }
}
