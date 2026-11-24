import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

type Area = { title: string; href: string; body: string; membersOnly?: boolean };

const AREAS: Area[] = [
  {
    title: "Board",
    href: "/app/board",
    body: "Our shared task board. Create tickets, assign them, set deadlines, comment, and move work from idea to done.",
  },
  {
    title: "Pages",
    href: "/app",
    body: "Our shared notebook. Write plans, notes and guides, and nest pages inside each other. Everyone can read and edit them.",
  },
  {
    title: "Files",
    href: "/app/board/files",
    body: "Upload and organise documents, designs and photos in folders. Files are kept for 28 days after archiving.",
  },
  {
    title: "Links",
    href: "/app/board/links",
    body: "A shared list of the links we all need: forms, sheets, accounts, references. Add one once and everybody has it.",
  },
  {
    title: "Merch",
    href: "/app/merch",
    body: "Orders and fulfilment for Ultra Shaheens merchandise.",
    membersOnly: true,
  },
  {
    title: "Members",
    href: "/app/members",
    body: "Everyone in the workspace, with their role and the tasks they are working on.",
    membersOnly: true,
  },
];

const STEPS = [
  {
    title: "Set up your profile",
    body: "Add your name and your designation, the role you hold at Ultra Shaheens, so people know who they are working with.",
    href: "/app/profile",
    cta: "Open profile",
  },
  {
    title: "Find your tasks",
    body: "Open the Board and look for tickets assigned to you. Each ticket has a description, a deadline and a comment thread.",
    href: "/app/board",
    cta: "Open board",
  },
  {
    title: "Write things down",
    body: "If it is worth remembering, put it in a Page. If it is a file or a link, put it in Files or Links. Do not leave it in a chat.",
    href: "/app",
    cta: "Go to pages",
  },
];

const HABITS = [
  "Every task lives on the Board. If it is not there, it is not happening.",
  "Assign a task to one person and give it a deadline.",
  "Use comments on a ticket to discuss it. Mention a teammate with @ to notify them.",
  "Keep your tickets up to date: move them forward when the status changes.",
  "Be kind and be clear. We are volunteers building something for the fans.",
];

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isTeamMember = session.user.role === "director";
  const firstName = session.user.name?.trim().split(/\s+/)[0] || "there";
  const areas = AREAS.filter((a) => !(a.membersOnly && isTeamMember));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="mx-4 mt-3 border border-[var(--glass-border)] bg-[var(--surface-mid)] px-6 py-8 md:mx-6 md:px-10 md:py-12">
        <p className="eyebrow text-[var(--accent)]">Welcome, {firstName}</p>
        <h1 className="mt-3 max-w-3xl text-4xl leading-none md:text-6xl">
          One place to run Ultra Shaheens
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">
          Ultra Shaheens is a football fan community that brings supporters together to watch,
          cheer and travel with the national team. This workspace is where the people behind it
          plan the work: tasks, notes, files and links, all in one place.
        </p>
      </header>

      <main className="flex flex-col gap-10 p-4 md:p-6 md:pt-8">
        <section aria-labelledby="start-here">
          <p className="eyebrow mb-1 text-[var(--text-faint)]">Start here</p>
          <h2 id="start-here" className="mb-4 text-2xl">
            Your first three steps
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="glass-card flex flex-col gap-3 p-5">
                <span className="font-display text-3xl text-[var(--accent)]">0{i + 1}</span>
                <h3 className="text-lg">{s.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-[var(--text-muted)]">{s.body}</p>
                <Link href={s.href} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                  {s.cta} →
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="whats-inside">
          <p className="eyebrow mb-1 text-[var(--text-faint)]">What is inside</p>
          <h2 id="whats-inside" className="mb-4 text-2xl">
            Where everything lives
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((a) => (
              <Link key={a.title} href={a.href} className="glass-card flex flex-col gap-2 p-5">
                <h3 className="text-lg">{a.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">{a.body}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-we-work" className="max-w-3xl">
          <p className="eyebrow mb-1 text-[var(--text-faint)]">How we work</p>
          <h2 id="how-we-work" className="mb-4 text-2xl">
            A few simple habits
          </h2>
          <ul className="divide-y divide-[var(--glass-border)] border border-[var(--glass-border)] bg-[var(--surface-mid)]">
            {HABITS.map((h) => (
              <li key={h} className="flex gap-3 px-5 py-3 text-sm text-[var(--text-primary)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[var(--accent)]" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </section>

        <p className="pb-6 text-sm text-[var(--text-muted)]">
          Stuck, or something not working? Ask in the team chat, or message the person who invited you.
        </p>
      </main>
    </div>
  );
}
