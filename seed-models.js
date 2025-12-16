const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedModels() {
    try {
        console.log('🌱 Seeding default AI models...');

        const models = [
            {
                modelId: 'gemini-2.5-pro',
                displayName: 'Gemini 2.5 Pro',
                rpm: 2,
                tpm: 125000,
                rpd: 50,
                priority: 1,
                enabled: true,
                currentMinuteRequests: 0,
                currentMinuteTokens: 0,
                currentDayRequests: 0,
                lastResetMinute: new Date(),
                lastResetDay: new Date()
            },
            {
                modelId: 'gemini-2.5-flash',
                displayName: 'Gemini 2.5 Flash',
                rpm: 10,
                tpm: 250000,
                rpd: 250,
                priority: 2,
                enabled: true,
                currentMinuteRequests: 0,
                currentMinuteTokens: 0,
                currentDayRequests: 0,
                lastResetMinute: new Date(),
                lastResetDay: new Date()
            },
            {
                modelId: 'gemini-2.0-flash-lite',
                displayName: 'Gemini 2.0 Flash Lite',
                rpm: 30,
                tpm: 1000000,
                rpd: 200,
                priority: 3,
                enabled: true,
                currentMinuteRequests: 0,
                currentMinuteTokens: 0,
                currentDayRequests: 0,
                lastResetMinute: new Date(),
                lastResetDay: new Date()
            },
            {
                modelId: 'gemini-2.5-flash-lite',
                displayName: 'Gemini 2.5 Flash Lite',
                rpm: 15,
                tpm: 250000,
                rpd: 1000,
                priority: 4,
                enabled: true,
                currentMinuteRequests: 0,
                currentMinuteTokens: 0,
                currentDayRequests: 0,
                lastResetMinute: new Date(),
                lastResetDay: new Date()
            },
            {
                modelId: 'gemini-2.0-flash',
                displayName: 'Gemini 2.0 Flash',
                rpm: 15,
                tpm: 1000000,
                rpd: 200,
                priority: 5,
                enabled: true,
                currentMinuteRequests: 0,
                currentMinuteTokens: 0,
                currentDayRequests: 0,
                lastResetMinute: new Date(),
                lastResetDay: new Date()
            }
        ];

        for (const model of models) {
            const existing = await prisma.aIModel.findUnique({
                where: { modelId: model.modelId }
            });

            if (!existing) {
                await prisma.aIModel.create({ data: model });
                console.log(`✅ Created model: ${model.displayName}`);
            } else {
                console.log(`⏭️  Model already exists: ${model.displayName}`);
            }
        }

        console.log('✨ Seeding completed!');
    } catch (error) {
        console.error('❌ Error seeding models:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedModels();
