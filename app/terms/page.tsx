import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & privacy · eNroute",
  description: "The agreement for using eNroute, and what happens to the information you give it.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Terms &amp; privacy</h1>
      <p className="mt-2 text-muted-foreground">
        Plain language, because you should be able to read this without a lawyer. Last updated{" "}
        {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.
      </p>

      <Section title="Using eNroute">
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

      <Section title="What we are not">
        <p>
          We are not your school, your counsellor, or any admissions office. Nothing here is an offer, a
          promise of admission, or professional advice about your future. The estimates are exactly that
          — estimates, produced from published data and the details you enter.
        </p>
        <p className="mt-3">
          Decisions belong to universities, and they weigh things this tool cannot see. Please use the
          numbers to shape a balanced list, and please check deadlines, fees and entry requirements
          against the university&apos;s own website before you rely on them. We keep our data as current
          as we can, and it will still sometimes be out of date.
        </p>
      </Section>

      <Section title="What we collect">
        <p>
          Only what the product needs to work: the email address and name you sign up with, and the
          profile you enter — curriculum, subjects and grades, test scores, extracurricular activities,
          target countries and field of interest. We also keep the analyses generated for you, so
          revisiting a university is instant rather than re-running the work.
        </p>
        <p className="mt-3">
          We don&apos;t ask for your address, phone number, date of birth or payment details, because we
          don&apos;t need them.
        </p>
      </Section>

      <Section title="Who else sees it">
        <p>Three categories of company, and nobody else:</p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong className="text-foreground">Our hosting and database providers</strong>, which store
            your account and profile so the site can serve it back to you.
          </li>
          <li>
            <strong className="text-foreground">The AI providers that generate your analysis.</strong>{" "}
            Producing a written assessment means sending the relevant parts of your academic and activity
            profile to a model. It is not sent with your name or email attached.
          </li>
          <li>
            <strong className="text-foreground">Our email provider</strong>, to deliver sign-in codes and
            confirmations.
          </li>
        </ul>
        <p className="mt-3">
          We do not sell your information. We do not pass it to universities, agents, consultants or
          advertisers, and we don&apos;t run advertising on this site.
        </p>
      </Section>

      <Section title="Your data is yours">
        <p>
          You can edit or re-run your profile at any time, and change your password from account
          settings. If you want your account and everything attached to it deleted, email us from the
          address you signed up with and we&apos;ll remove it. There isn&apos;t a self-serve delete button
          yet, so this is handled by hand.
        </p>
        <p className="mt-3">
          If you stop using eNroute, your data stays until you ask us to remove it — we don&apos;t quietly
          purge accounts, and we don&apos;t quietly repurpose them either.
        </p>
      </Section>

      <Section title="Security, honestly stated">
        <p>
          Accounts sit behind email verification and a human check at sign-up, passwords are never stored
          in a form we or anyone else can read, and access to your data is restricted to your own account.
          No service can promise perfect security, and we won&apos;t. If something goes wrong that affects
          your information, we&apos;ll tell you.
        </p>
      </Section>

      <Section title="Changes, and getting in touch">
        <p>
          If we change something here that actually affects you, the date at the top changes with it. For
          anything at all — a deletion request, a correction, a complaint, or a question about how a
          number was produced — write to{" "}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
