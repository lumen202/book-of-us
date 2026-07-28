import Link from "next/link";
import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { getPartnerEmail } from "@/app/(app)/settings/actions";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { PartnerPasswordForm } from "@/components/settings/PartnerPasswordForm";

/** Same `notFound()` treatment as the archive page — this route doesn't exist for the other account. */
export default async function KeeperPasswordsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const partnerEmail = await getPartnerEmail();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 pb-24 pt-8">
      <Link
        href="/"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the shelf
      </Link>

      <header className="flex flex-col gap-2">
        <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Keeper only</span>
        <h1 className="ink-legible font-serif text-4xl leading-tight text-ink">Passwords</h1>
      </header>

      <section className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-7">
        <h2 className="font-serif text-2xl text-ink">Your password</h2>
        <ChangePasswordForm />
      </section>

      <section className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-7">
        <h2 className="font-serif text-2xl text-ink">Your partner&apos;s password</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Only you can see this. Use it if they&apos;ve forgotten theirs.
        </p>
        <PartnerPasswordForm partnerEmail={partnerEmail} />
      </section>
    </main>
  );
}
