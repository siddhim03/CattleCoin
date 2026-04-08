const FAQS = [
  {
    question: "What is CattleCoin?",
    answer:
      "CattleCoin is a platform that helps ranchers, feedlots, and investors work together around real cattle lots. It shows herd information in one place and lets investors fund the open investor portion through tokens.",
  },
  {
    question: "What does a token mean here?",
    answer:
      "A token represents a small piece of the investor-open portion of a real cattle lot. It is a way to divide a larger investment into smaller parts so more people can participate.",
  },
  {
    question: "Why does the feedlot commit first?",
    answer:
      "The feedlot takes part first so the deal is not entirely dependent on outside investors. That initial commitment helps define how much of the lot remains open for investors and signals that the herd has already been reviewed by an operating partner.",
  },
  {
    question: "What do investors fund?",
    answer:
      "Investors fund the remaining portion that the feedlot opens to the marketplace. They are not expected to cover the entire herd by themselves.",
  },
  {
    question: "What do ranchers do on the platform?",
    answer:
      "Ranchers create herd listings, register cattle, and provide the information needed for review. They are the starting point for bringing real animals into the marketplace.",
  },
  {
    question: "What do feedlots do on the platform?",
    answer:
      "Feedlots review listed herds, decide how much they will keep, choose the investor allocation, and publish the remaining open portion to investors.",
  },
  {
    question: "What can investors see before investing?",
    answer:
      "Investors can review herd information, pricing, health-related records, and other marketplace data that the platform surfaces for each opportunity.",
  },
  {
    question: "Does buying a token mean I physically own a cow?",
    answer:
      "No. The platform is designed around fractional exposure to a cattle lot, not around moving a specific animal into an investor's personal possession.",
  },
  {
    question: "Why use tokens instead of buying a whole herd?",
    answer:
      "Whole herds can require a lot of capital. Tokens make it easier to split the open investor portion into smaller pieces so participation is more accessible.",
  },
  {
    question: "How do I know which dashboard to use?",
    answer:
      "Use the dashboard that matches your account role. Investors browse and invest, ranchers create and manage herd listings, feedlots review and publish opportunities, and admins manage platform-wide settings and records.",
  },
];

export function FAQPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          FAQ
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          This page explains the main ideas behind the platform, including who
          uses it, why the feedlot commits first, and what investors are
          actually funding.
        </p>
      </div>

      <div className="grid gap-4">
        {FAQS.map((faq) => (
          <section key={faq.question} className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">{faq.question}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {faq.answer}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

export default FAQPage;
