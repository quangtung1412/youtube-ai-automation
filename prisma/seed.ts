import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default AI models (userId = null)
    const defaultModels = [
        {
            modelId: "gemini-2.5-pro",
            displayName: "Gemini 2.5 Pro",
            rpm: 2,
            tpm: 125_000,
            rpd: 50,
            priority: 1,
            enabled: true,
            userId: null
        },
        {
            modelId: "gemini-2.5-flash",
            displayName: "Gemini 2.5 Flash",
            rpm: 10,
            tpm: 250_000,
            rpd: 250,
            priority: 2,
            enabled: true,
            userId: null
        },
        {
            modelId: "gemini-2.0-flash-lite",
            displayName: "Gemini 2.0 Flash Lite",
            rpm: 30,
            tpm: 1_000_000,
            rpd: 200,
            priority: 3,
            enabled: true,
            userId: null
        },
        {
            modelId: "gemini-2.5-flash-lite",
            displayName: "Gemini 2.5 Flash Lite",
            rpm: 15,
            tpm: 250_000,
            rpd: 1000,
            priority: 4,
            enabled: true,
            userId: null
        },
        {
            modelId: "gemini-2.0-flash",
            displayName: "Gemini 2.0 Flash",
            rpm: 15,
            tpm: 1_000_000,
            rpd: 200,
            priority: 5,
            enabled: true,
            userId: null
        }
    ];

    for (const model of defaultModels) {
        const existing = await prisma.aIModel.findFirst({
            where: {
                modelId: model.modelId,
                userId: null
            }
        });

        if (!existing) {
            await prisma.aIModel.create({
                data: model
            });
        }
    }
    console.log('✅ Default AI models created');

    // Create system config
    const systemConfig = await prisma.systemConfig.upsert({
        where: { id: 'global_config' },
        update: {},
        create: {
            id: 'global_config',
            defaultModelId: 'gemini-2.5-pro',
            minVideoDuration: 600,
            avgSceneDuration: 8,
            veo3Template: 'Cinematic shot of [CHARACTER] doing [ACTION], [BG], dramatic lighting, 4K, ultra detailed'
        }
    });
    console.log('✅ System config created:', systemConfig.defaultModelId);

    // Create a demo user
    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            name: 'Demo User'
        }
    });
    console.log('✅ User created:', user.email);

    // Create user's models (copy from default)
    for (const model of defaultModels) {
        const existing = await prisma.aIModel.findFirst({
            where: {
                modelId: model.modelId,
                userId: user.id
            }
        });

        if (!existing) {
            await prisma.aIModel.create({
                data: {
                    ...model,
                    userId: user.id
                }
            });
        }
    }
    console.log('✅ User AI models created');

    // Create a demo channel
    const channel = await prisma.channel.upsert({
        where: { id: 'demo_channel_1' },
        update: {},
        create: {
            id: 'demo_channel_1',
            name: 'Tech Explained',
            userId: user.id,
            personaSettings: JSON.stringify({
                character_desc: 'An anime boy, silver hair, wearing blue hoodie, friendly expression, young adult, tech enthusiast',
                tone: 'educational',
                style: 'anime',
                veo3_character_template: 'Animated tech presenter with modern aesthetics',
                background_theme: 'Futuristic clean laboratory with holographic displays'
            })
        }
    });
    console.log('✅ Channel created:', channel.name);

    // Create a demo project
    const project = await prisma.project.create({
        data: {
            title: 'Introduction to Artificial Intelligence',
            channelId: channel.id,
            status: 'DRAFT',
            inputContent: `Artificial Intelligence (AI) is revolutionizing the way we live and work. From virtual assistants like Siri and Alexa to self-driving cars and medical diagnosis systems, AI is everywhere.

Machine Learning is a subset of AI that enables computers to learn from data without being explicitly programmed. Deep Learning, a more advanced form of machine learning, uses neural networks with multiple layers to process complex patterns.

Natural Language Processing (NLP) allows computers to understand and generate human language. This technology powers chatbots, translation services, and content generation tools.

Computer Vision enables machines to interpret and understand visual information from the world, used in facial recognition, autonomous vehicles, and medical imaging.

The future of AI holds immense potential, from solving climate change to advancing healthcare and education. However, it also raises important ethical questions about privacy, bias, and job displacement that society must address.`
        }
    });
    console.log('✅ Project created:', project.title);

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
