import { KanbanBoard } from "@/components/workspace/kanban-board";
import { getSessionBoard } from "@/lib/auth-api";
import { boardLabel } from "@/lib/board";

import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Board - Ultra Shaheens" };

export default async function BoardPage() {
    const access = await getSessionBoard();
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <PageHeader
                title={`${boardLabel(access?.board ?? "team")} Board`}
                description={<>
                    Track tasks across <span className="text-neutral">Todo</span>, <span className="text-warn">In Progress</span>, <span className="text-danger">Blocked</span>, and <span className="text-ok">Done</span>. Done tasks auto-archive after 1 week.
                </>}
            />
            <main className="flex min-h-0 flex-1 overflow-hidden p-4 md:px-6 md:pb-6 md:pt-4">
                <KanbanBoard />
            </main>
        </div>
    );
}
