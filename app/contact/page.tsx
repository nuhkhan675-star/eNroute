import type { Metadata } from "next";
import Link from "next/link";
import { CopyEmail } from "@/components/contact/CopyEmail";
import { BookOpen, Bug, GraduationCap, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact · eNroute",
  description: "How to reach eNroute — corrections, missing universities, account deletion and feedback.",
};

const EMAIL = "enrouteuniadvisor@gmail.com";

const TOPICS: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <GraduationCap className="size-4 text-sky-400" />,
    title: "A university is missing",
    body: "Tell us its name and country and we'll look at adding it. Try searching its short form first — NUS, HKU, LSE and similar all work.",
  },
  {
    icon: <Bug className="size-4 text-amber-400" />,
    title: "A number looks wrong",
    body: "Send the university and what you were expecting. If an estimate moved a long way from a small profile edit, that's worth reporting — it usually means something needs fixing.",
  },
  {
    icon: <Trash2 className="size-4 text-red-400" />,
    title: "Delete my account",
    body: "Email from the address you signed up with and we'll remove your account and everything attached to it. There's no self-serve button for this yet, so it's done by hand.",
  },
  {
    icon: <BookOpen className="size-4 text-emerald-400" />,
    title: "Anything else",
    body: "Questions about how a figure was produced, corrections to a university's data, or feedback on the product. All of it is read.",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
      <p className="mt-2 text-muted-foreground">
        eNroute is built and run by{" "}
        <span className="font-semibold text-primary">one person</span> &mdash; so this goes straight to
        a real inbox, and gets a real reply.
      </p>

      {/* Who "one person" is. The homepage says this at the bottom, but someone
          arriving straight at /contact from the footer never sees that. */}
      <div className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
          NK
        </div>
        <div>
          <p className="text-sm font-semibold">Nuh Khan</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            A student and founder who believes the choices we make today shape the opportunities we
            have tomorrow. I built eNroute to help students move forward with clarity, not
            uncertainty &mdash; and I read everything that comes in.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <CopyEmail email={EMAIL} />
        <p className="mt-2 text-xs text-muted-foreground">
          Or{" "}
          <a href={`mailto:${EMAIL}`} className="text-primary underline underline-offset-4">
            open it in your mail app
          </a>{" "}
          if you have one set up.
        </p>
      </div>

      <h2 className="mt-12 text-lg font-semibold">What to include</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <div key={t.title} className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              {t.icon}
              {t.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Before writing in, the{" "}
        <Link href="/faqs" className="text-primary underline underline-offset-4">
          FAQs
        </Link>{" "}
        cover how the estimates are read, and the{" "}
        <Link href="/data-sources" className="text-primary underline underline-offset-4">
          methodology page
        </Link>{" "}
        explains where each figure comes from.
      </p>
    </div>
  );
}
