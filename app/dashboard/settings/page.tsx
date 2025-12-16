import { getSystemConfig } from "@/actions/systemConfig";
import { getPromptSettings } from "@/actions/updatePromptSettings";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
    const config = await getSystemConfig();
    const promptsResult = await getPromptSettings();

    const prompts = promptsResult.success && promptsResult.prompts ? {
        outlinePrompt: promptsResult.prompts.outlinePrompt,
        scriptsPrompt: promptsResult.prompts.scriptsPrompt,
        veo3Prompt: promptsResult.prompts.veo3Prompt,
        characterPrompt: promptsResult.prompts.characterPrompt,
        backgroundPrompt: promptsResult.prompts.backgroundPrompt,
        itemsPrompt: promptsResult.prompts.itemsPrompt,
        veo3Template: promptsResult.prompts.veo3Template
    } : undefined;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <SettingsForm initialConfig={config} initialPrompts={prompts} />
        </div>
    );
}
