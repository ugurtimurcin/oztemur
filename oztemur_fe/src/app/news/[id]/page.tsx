import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata, absoluteMediaUrl, SITE_URL } from "@/lib/server/metadata";
import { getUiStrings } from "@/lib/server/siteContent";
import { fetchNewsArticle } from "@/lib/server/entities";
import { breadcrumbSchema, newsArticleSchema } from "@/lib/server/schemas";
import JsonLd from "@/components/JsonLd";
import NewsDetailView from "./NewsDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await resolveLocale();
  const article = await fetchNewsArticle(id, locale);

  if (!article) {
    const ui = await getUiStrings(locale);
    return buildMetadata(
      {
        title: ui["notfound.news.title"] ?? "Article not found",
        description: ui["notfound.news.desc"] ?? "The requested article could not be found.",
        path: `/news/${id}`,
      },
      locale,
    );
  }

  return buildMetadata(
    {
      title: article.title,
      description: article.summary,
      path: `/news/${article.slug ?? id}`,
      image: absoluteMediaUrl(article.imageUrl),
      type: "article",
    },
    locale,
  );
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const locale = await resolveLocale();
  const article = await fetchNewsArticle(id, locale);
  const slug = article?.slug ?? id;
  const url = `${SITE_URL}/news/${slug}`;
  const ui = article ? await getUiStrings(locale) : null;

  return (
    <>
      {article && ui && (
        <>
          <JsonLd
            data={newsArticleSchema({
              headline: article.title,
              description: article.summary,
              imageUrl: absoluteMediaUrl(article.imageUrl),
              datePublished: article.publishedAt,
              url,
            })}
          />
          <JsonLd
            data={breadcrumbSchema([
              { label: ui["nav.home"] ?? "Home", path: "/" },
              { label: ui["nav.news"] ?? "Newsroom", path: "/news" },
              { label: article.title, path: `/news/${slug}` },
            ])}
          />
        </>
      )}
      <NewsDetailView />
    </>
  );
}
