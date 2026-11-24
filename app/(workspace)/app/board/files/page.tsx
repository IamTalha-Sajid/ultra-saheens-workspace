import { CommitteeUploadSection } from "@/components/workspace/committee-upload-section";

import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Executive Board Files - Ultra Shaheens" };

export default function CommitteeFilesPage() {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <PageHeader
                title="Executive Board Files"
                description={"Upload and access PDF/docs/sheets/images with context notes."}
            />
            <main className="flex min-h-0 flex-1 overflow-y-auto p-4 md:px-6 md:pb-6 md:pt-4">
                <div className="w-full">
                    <CommitteeUploadSection />
                </div>
            </main>
        </div>
    );
}
