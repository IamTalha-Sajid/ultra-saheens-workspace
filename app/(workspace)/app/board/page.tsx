import { KanbanBoard } from "@/components/workspace/kanban-board";

export const metadata = { title: "Executive Committee - Ultra Shaheens" };

export default function BoardPage() {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <header className="mx-4 mt-3 shrink-0 flex flex-col rounded-2xl border border-white/[0.06] bg-[var(--surface-mid)] px-5 py-4 md:mx-6">
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white" aria-hidden>
                            <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
                            <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
                        </svg>
                    </span>
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">
                            Executive Committee
                        </h1>
                        <p className="mt-0.5 text-xs text-white/35">
                            Track tasks across <span className="text-indigo-300">Todo</span>, <span className="text-amber-300">In Progress</span>, <span className="text-rose-300">Blocked</span>, and <span className="text-emerald-300">Done</span>. Done tasks auto-archive after 1 week.
                        </p>
                    </div>
                </div>
            </header>
            <main className="flex min-h-0 flex-1 overflow-hidden p-4 md:px-6 md:pb-6 md:pt-4">
                <KanbanBoard />
            </main>
        </div>
    );
}
