import { TicketDetail } from "@/components/workspace/ticket-detail";

export const metadata = { title: "Ticket Detail - Ultra Shaheens" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <main className="flex min-h-0 flex-1 overflow-hidden p-4 md:px-6 md:pb-6 md:pt-4">
                <TicketDetail ticketId={id} />
            </main>
        </div>
    );
}
