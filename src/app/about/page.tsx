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
  { name: "Vivek Kumar", role: "Director & Founder", photo: "vivek.webp", linkedIn: "https://www.linkedin.com/in/vivek2310sharma/" },
  { name: "Sourabh Sharma", role: "CEO & Co-Founder", photo: "raghav.webp", linkedIn: "https://www.linkedin.com/in/sourabh-sharma-6622071aa/" },
  { name: "Raghav Marwah", role: "CTO & Co-Founder", photo: "sourabh.webp", linkedIn: "https://www.linkedin.com/in/raghav-marwah-72b46b13a/" },
];

const teamSections = [
  {
    id: "leadership",
    title: "Leadership",
    members: [
      { name: "Rudra Tiwari", role: "Chief Marketing Officer" },
      { name: "Abhishek Sharma", role: "CFO" },
    ],
  },
  {
    id: "team",
    title: "The Team Behind FairSwap",
    members: [
      { name: "Tanvi Chawla", role: "Project Manager" },
      { name: "Riya Purohit", role: "People and Culture Manager" },
      { name: "Khushi Sharma", role: "Business Development Manager" },
      { name: "Gauri Bharatkumar Joshi", role: "Senior Developer", photo: "gauri.webp" },
      { name: "Saiesh Purohit", role: "Developer" },
      { name: "Nikhil Joshi", role: "QA Tester", photo: "nikhil.webp" },
    ],
  },
];

const sectionHeading = "text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl";

const memberGrid = "mt-6 grid gap-5 sm:grid-cols-3";

type Member = {
  name: string;
  role: string;
  photo?: string;
  linkedIn?: string;
};

function MemberCard({ name, role, photo, linkedIn }: Member) {
  return (
    <li className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative grid aspect-square place-items-center overflow-hidden bg-surface">
        {photo ? (
          <Image
            src={`/images/team/${photo}`}
            alt={`Portrait of ${name}`}
            fill
            sizes="(min-width: 1152px) 350px, (min-width: 640px) 33vw, calc(100vw - 32px)"
            className="object-cover object-top"
          />
        ) : (
          <span aria-hidden="true" className="text-5xl font-extrabold tracking-tight text-muted sm:text-6xl">
            {name.split(" ").map((part) => part[0]).join("")}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold text-foreground">{name}</h3>
        <p className="mt-1 text-sm text-muted">{role}</p>
        {linkedIn && (
          <a
            href={linkedIn}
            className="mt-3 inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {name} on LinkedIn
          </a>
        )}
      </div>
    </li>
  );
}

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
                FairSwap is building a safer, more trustworthy way to buy and
                sell locally in India. Our approach prioritises data privacy,
                account security and accountability, with identity verification
                in mind and one genuine account per user as a design goal.
              </p>
              <p>
                Our mission is to make local transactions simpler and safer.
                AI-assisted moderation is part of our approach to spotting
                potential fraud, spam and unsafe activity.
              </p>
            </div>
          </section>

          <section aria-labelledby="founders-heading">
            <h2 id="founders-heading" className={sectionHeading}>Meet Our Founders</h2>
            <ol role="list" className={memberGrid}>
              {founders.map((member) => <MemberCard key={member.name} {...member} />)}
            </ol>
          </section>

          {teamSections.map(({ id, title, members }) => (
            <section key={id} aria-labelledby={`${id}-heading`} className="border-t border-border pt-8 sm:pt-10">
              <h2 id={`${id}-heading`} className={sectionHeading}>{title}</h2>
              <ul role="list" className={memberGrid}>
                {members.map((member) => <MemberCard key={member.name} {...member} />)}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
