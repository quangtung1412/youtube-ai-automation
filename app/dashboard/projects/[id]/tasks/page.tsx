import { prisma } from "@/lib/db";
import TaskMonitor from "./TaskMonitor";
import { redirect } from "next/navigation";

export default async function TasksPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const project = await prisma.project.findUnique({
        where: { id },
    });

    if (!project) {
        redirect("/dashboard/projects");
    }

    return (
        <TaskMonitor
            projectId={project.id}
            projectTitle={project.title}
        />
    );
}
