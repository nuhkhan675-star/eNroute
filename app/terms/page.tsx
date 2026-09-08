import type { Metadata } from "next";
import Link from "next/link";
import { Database, FileText, Lock, Mail, ShieldCheck, TriangleAlert, UserCog } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & privacy · eNroute",
  description: "The agreement for using eNroute, and what happens to the information you give it.",
};

const THIRD_PARTIES: { who: string; why: string }[] = [
  {
    who: "Our hosting and database provider",
    why: "Stores your account and profile so the site can serve them back to you, and keeps your analyses so revisiting a university is instant rather than re-run from scratch.",
  },
  {
    who: "The AI provider that writes your assessment",
    why: "Producing a written analysis means sending the relevant academic and activity details to a model. Your name and email are not attached when we do.",
  },
  {
    who: "Our email provider",
    why: "Delivers sign-in codes, confirmation emails and password resets. It sees your address and nothing else about you.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Terms &amp; privacy</h1>
      <p className="mt-2 text-muted-foreground">
        Plain language, because you should be able to read this without a lawyer. Last updated{" "}
        {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium">The short version</p>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
          <li>It&apos;s free, and it&apos;s a planning tool &mdash; not an admissions decision.</li>
          <li>We collect what the product needs and nothing else. No address, phone or payment details.</li>
          <li>We don&apos;t sell your data or hand it to universities, agents or advertisers.</li>
          <li>Ask us and we&apos;ll delete your account and everything in it.</li>
        </ul>
      </div>

      <Section icon={<FileText className="size-4 text-sky-400" />} title="Using eNroute">
        <p>
          eNroute is a study tool for people applying to university. You may use it for your own
          applications, or to help someone you&apos;re advising. Don&apos;t use it to scrape the
          catalogue, resell the estimates, or hammer the service with automated traffic.
        </p>
        <p className="mt-3">
          You need an account, and the email on it has to be one you control. One person, one account.
          You&apos;re responsible for keeping your password to yourself.
        </p>
      </Section>

      <Section icon={<TriangleAlert className="size-4 text-amber-400" />} title="What we are not">
        <p>
          We are not your school, your counsellor, or any admissions office. Nothing here is an offer, a
          promise of admission, or professional advice about your future. The estimates are exactly that
          &mdash; estimates, produced from published data and the details you enter.
        </p>
        <p className="mt-3">
          Decisions belong to universities, and they weigh things this tool cannot see. Use the numbers to
          shape a balanced list, and check deadlines, fees and entry requirements against the
          university&apos;s own website before relying on them. We keep our data as current as we can, and
          it will still sometimes be out of date. How we produce a figure, and how much weight it deserves,
          is set out on the{" "}
          <Link href="/data-sources" className="text-primary underline underline-offset-4">
            data sources and methodology
          </Link>{" "}
          page.
        </p>
      </Section>

      <Section icon={<Database className="size-4 text-emerald-400" />} title="What we collect">
        <p>
          Only what the product needs to work: the email address and name you sign up with, and the
          profile you enter &mdash; curriculum, subjects and grades, test scores, extracurricular
          activities, target countries and field of interest. We also keep the analyses generated for you.
        </p>
        <p className="mt-3">
          We don&apos;t ask for your address, phone number, date of birth or payment details, because we
          don&apos;t need them.
        </p>
      </Section>

      <Section icon={<UserCog className="size-4 text-violet-400" />} title="Who else sees it">
        <p>Three companies, for three specific jobs, and nobody else:</p>
        <div className="mt-4 flex flex-col gap-3">
          {THIRD_PARTIES.map((p) => (
            <div key={p.who} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">{p.who}</p>
              <p className="mt-1 text-sm">{p.why}</p>
            </div>
          ))}
        </div>
        <p className="mt-4">
          We do not sell your information. We do not pass it to universities, agents, consultants or
          advertisers, and we don&apos;t run advertising on this site.
        </p>
      </Section>

      <Section icon={<ShieldCheck className="size-4 text-sky-400" />} title="Your data is yours">
        <p>
          You can edit or re-run your profile at any time, and change your name or password from{" "}
          <Link href="/account" className="text-primary underline underline-offset-4">
            account settings
          </Link>
          . If you want your account and everything attached to it deleted, email us from the address you
          signed up with and we&apos;ll remove it. There isn&apos;t a self-serve delete button yet, so this
          is handled by hand.
        </p>
        <p className="mt-3">
          If you stop using eNroute, your data stays until you ask us to remove it &mdash; we don&apos;t
          quietly purge accounts, and we don&apos;t quietly repurpose them either.
        </p>
      </Section>

      <Section icon={<Lock className="size-4 text-amber-400" />} title="Security, honestly stated">
        <p>
          Accounts sit behind email verification and a human check at sign-up, passwords are never stored
          in a form we or anyone else can read, and access to your data is restricted to your own account.
          Changing your password requires your current one, so a borrowed laptop isn&apos;t enough to take
          an account over.
        </p>
        <p className="mt-3">
          No service can promise perfect security, and we won&apos;t. If something goes wrong that affects
          your information, we&apos;ll tell you.
        </p>
      </Section>

      <Section icon={<Mail className="size-4 text-emerald-400" />} title="Changes, and getting in touch">
        <p>
          If we change something here that actually affects you, the date at the top changes with it. For
          anything at all &mdash; a deletion request, a correction, a complaint, or a question about how a
          number was produced &mdash; write to{" "}
          <a
            href="mailto:enrouteuniadvisor@gmail.com"
            className="text-primary underline underline-offset-4"
          >
            enrouteuniadvisor@gmail.com
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
