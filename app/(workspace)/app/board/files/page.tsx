import { CommitteeUploadSection } from "@/components/workspace/committee-upload-section";

export const metadata = { title: "Executive Board Files - Ultra Shaheens" };

export default function CommitteeFilesPage() {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <header className="mx-4 mt-3 shrink-0 flex flex-col rounded-2xl border border-white/[0.06] bg-[var(--surface-mid)] px-5 py-4 md:mx-6">
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 shadow-lg shadow-indigo-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white" aria-hidden>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" x2="12" y1="3" y2="15" />
                        </svg>
                    </span>
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">
                            Executive Board Files
                        </h1>
                        <p className="mt-0.5 text-xs text-white/35">
                            Upload and access PDF/docs/sheets/images with context notes.
                        </p>
                    </div>
                </div>
            </header>
            <main className="flex min-h-0 flex-1 overflow-y-auto p-4 md:px-6 md:pb-6 md:pt-4">
                <div className="w-full">
                    <CommitteeUploadSection />
                </div>
            </main>
        </div>
    );
}
