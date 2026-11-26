import { CommitteeLinkSection } from "@/components/workspace/committee-link-section";
import { getSessionBoard } from "@/lib/auth-api";
import { boardLabel } from "@/lib/board";

import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Board Links - Ultra Shaheens" };

export default async function CommitteeLinksPage() {
    const label = boardLabel((await getSessionBoard())?.board ?? "team");
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <PageHeader
                title={`${label} Board Links`}
                description={"Share links to Canva designs, Google Drive, reports, and more."}
            />
            <main className="flex min-h-0 flex-1 overflow-y-auto p-4 md:px-6 md:pb-6 md:pt-4">
                <div className="w-full">
                    <CommitteeLinkSection label={label} />
                </div>
            </main>
        </div>
    );
}
