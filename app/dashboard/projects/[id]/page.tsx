import { getProject } from "@/actions/projects";
import { notFound } from "next/navigation";
import ProjectDetailNew from "./ProjectDetailNew";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export default async function ProjectPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const session = await auth();
    if (!session?.user?.id) {
        notFound();
    }

    const { id } = await params;
    const project = await getProject(id);

    if (!project) {
        notFound();
    }

    // Check if user owns this project (through channel)
    if (project.channel.userId !== session.user.id) {
        notFound();
    }

    // Load all related data
    const chapters = await prisma.chapter.findMany({
        where: { projectId: id },
        include: {
            scenes: {
                orderBy: { sceneNumber: 'asc' }
            }
        },
        orderBy: { chapterNumber: 'asc' }
    });

    const items = await prisma.projectItem.findMany({
        where: { projectId: id }
    });

    // Get system config for language setting
    const config = await prisma.systemConfig.findUnique({
        where: { id: "global_config" }
    });

    return <ProjectDetailNew
        project={project}
        initialChapters={chapters}
        items={items}
        language={config?.language || 'Vietnamese'}
    />;
}
