import Header from "@/components/Header";

/**
 * Reusable layout for legal documents (privacy, terms, KVKK).
 * Renders a calm typographic page; long text is split on blank-line
 * boundaries so each paragraph stands on its own.
 */
export default function LegalPage({
  title,
  lastUpdated,
  content,
}: {
  title: string;
  lastUpdated: string;
  content: string;
}) {
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="solid" />

      <section className="bg-cream pt-44 pb-16 border-b border-border">
        <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-14">
          <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] text-charcoal leading-[1.1] mb-4">
            {title}
          </h1>
          {lastUpdated && (
            <p className="text-[11px] uppercase tracking-[0.28em] text-on-muted">{lastUpdated}</p>
          )}
        </div>
      </section>

      <article className="bg-cream py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-14 prose-editorial">
          {paragraphs.map((p, i) => {
            // First line of a paragraph is rendered as a sub-heading if
            // it looks numbered (e.g. "1. Topladığımız Veriler\n…").
            const lines = p.split("\n");
            const first = lines[0];
            const rest = lines.slice(1).join("\n").trim();
            const isHeading = /^\d+\./.test(first.trim()) && rest.length > 0;

            if (isHeading) {
              return (
                <div key={i}>
                  <h2 className="font-display text-2xl md:text-[1.7rem] text-charcoal mt-12 mb-4 leading-snug not-prose">
                    {first}
                  </h2>
                  <p>{rest}</p>
                </div>
              );
            }
            return <p key={i}>{p}</p>;
          })}
        </div>
      </article>
    </main>
  );
}
