import type { Metadata } from "next";
import Image from "next/image";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "About FairSwap | India’s Local Classifieds Marketplace",
  description:
    "Learn about FairSwap’s mission to make local buying and selling simpler and safer in India, and meet the founders and team.",
  alternates: { canonical: "https://fairswap.in/about" },
};

const founders = [
  { name: "Vivek", role: "Director & Founder", photo: "vivek.webp", linkedIn: "https://www.linkedin.com/in/vivek2310sharma/" },
  { name: "Sourabh", role: "CEO & Co-Founder", photo: "sourabh.webp", linkedIn: "https://www.linkedin.com/in/sourabh-sharma-6622071aa/" },
  { name: "Raghav", role: "CTO & Co-Founder", photo: "raghav.webp", linkedIn: "https://www.linkedin.com/in/raghav-marwah-72b46b13a/" },
];

const teamSections = [
  {
    id: "leadership",
    title: "Leadership",
    members: [
      { name: "Rudra", role: "Chief Marketing Officer" },
      { name: "Abhishek", role: "CFO" },
    ],
  },
  {
    id: "team",
    title: "The Team Behind FairSwap",
    members: [
      { name: "Tanvi", role: "Project Manager" },
      { name: "Riya", role: "People and Culture Manager" },
      { name: "Khushi", role: "Business Development Manager" },
      { name: "Gauri", role: "Senior Developer" },
      { name: "Saiesh", role: "Developer" },
      { name: "Nikhil", role: "QA Tester" },
    ],
  },
];

const sectionHeading = "text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="fs-surface-cream">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              About FairSwap
            </h1>
            <span className="fs-rule" aria-hidden="true" />
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              FairSwap is a local classifieds marketplace for India, where people
              can discover listings nearby and connect to buy and sell.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl space-y-12 px-4 pb-16 sm:space-y-16 sm:px-6 lg:px-8 lg:pb-24">
          <section aria-labelledby="story-heading" className="grid gap-4 border-t border-border pt-8 sm:pt-10 md:grid-cols-[1fr_2fr] md:gap-10">
            <h2 id="story-heading" className={sectionHeading}>Our Story and Mission</h2>
            <div className="max-w-2xl space-y-4 leading-relaxed text-muted">
              <p>
                FairSwap started with a simple idea: useful things can find a
                second home close by. Local classifieds can help people pass on
                things they no longer need and find what they need nearby.
              </p>
              <p>
                Our mission is to make buying and selling locally simpler and
                safer across India. We encourage buyers and sellers to meet in
                public, inspect items in person and agree on payment directly.
              </p>
            </div>
          </section>

          <section aria-labelledby="founders-heading">
            <h2 id="founders-heading" className={sectionHeading}>Meet Our Founders</h2>
            <ol role="list" className="mt-6 grid gap-5 sm:grid-cols-3">
              {founders.map(({ name, role, photo, linkedIn }) => (
                <li key={name} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                  <div className="relative aspect-square bg-surface">
                    <Image
                      src={`/images/team/${photo}`}
                      alt={`Portrait of ${name}`}
                      fill
                      sizes="(min-width: 1152px) 350px, (min-width: 640px) 33vw, calc(100vw - 32px)"
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-foreground">{name}</h3>
                    <p className="mt-1 text-sm text-muted">{role}</p>
                    <a
                      href={linkedIn}
                      className="mt-3 inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                      {name} on LinkedIn
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {teamSections.map(({ id, title, members }) => (
            <section key={id} aria-labelledby={`${id}-heading`} className="border-t border-border pt-8 sm:pt-10">
              <h2 id={`${id}-heading`} className={sectionHeading}>{title}</h2>
              <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {members.map(({ name, role }) => (
                  <li key={name} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                    <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-lg font-bold text-foreground ring-1 ring-border">
                      {name[0]}
                    </span>
                    <div>
                      <h3 className="font-bold text-foreground">{name}</h3>
                      <p className="mt-1 text-sm text-muted">{role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
