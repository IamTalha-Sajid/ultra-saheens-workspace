import { CommitteeLinkSection } from "@/components/workspace/committee-link-section";

export const metadata = { title: "Executive Board Links - Ultra Shaheens" };

export default function CommitteeLinksPage() {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <header className="mx-4 mt-3 shrink-0 flex flex-col rounded-2xl border border-white/[0.06] bg-[var(--surface-mid)] px-5 py-4 md:mx-6">
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white" aria-hidden>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                    </span>
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">
                            Executive Board Links
                        </h1>
                        <p className="mt-0.5 text-xs text-white/35">
                            Share links to Canva designs, Google Drive, reports, and more.
                        </p>
                    </div>
                </div>
            </header>
            <main className="flex min-h-0 flex-1 overflow-y-auto p-4 md:px-6 md:pb-6 md:pt-4">
                <div className="w-full">
                    <CommitteeLinkSection />
                </div>
            </main>
        </div>
    );
}
