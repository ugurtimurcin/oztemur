/**
 * Renders a JSON-LD <script> tag — used for Schema.org structured
 * data (Organization, BreadcrumbList, NewsArticle, JobPosting…).
 *
 * Server-renders the JSON inline so search engine crawlers parse it
 * on first byte without waiting for client JS.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}
