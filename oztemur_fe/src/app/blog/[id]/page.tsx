import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata, absoluteMediaUrl, SITE_URL } from "@/lib/server/metadata";
import { getUiStrings } from "@/lib/server/siteContent";
import { fetchBlogPost } from "@/lib/server/entities";
import { breadcrumbSchema, blogPostingSchema } from "@/lib/server/schemas";
import JsonLd from "@/components/JsonLd";
import BlogDetailView from "./BlogDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await resolveLocale();
  const post = await fetchBlogPost(id, locale);

  if (!post) {
    const ui = await getUiStrings(locale);
    return buildMetadata(
      {
        title: ui["notfound.blog.title"] ?? "Essay not found",
        description: ui["notfound.blog.desc"] ?? "The requested essay could not be found.",
        path: `/blog/${id}`,
      },
      locale,
    );
  }

  return buildMetadata(
    {
      title: post.title,
      description: post.summary,
      path: `/blog/${post.slug ?? id}`,
      image: absoluteMediaUrl(post.imageUrl),
      type: "article",
    },
    locale,
  );
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const locale = await resolveLocale();
  const post = await fetchBlogPost(id, locale);
  const slug = post?.slug ?? id;
  const url = `${SITE_URL}/blog/${slug}`;
  const ui = post ? await getUiStrings(locale) : null;

  return (
    <>
      {post && ui && (
        <>
          <JsonLd
            data={blogPostingSchema({
              headline: post.title,
              description: post.summary,
              imageUrl: absoluteMediaUrl(post.imageUrl),
              datePublished: post.publishedAt,
              author: post.author,
              url,
            })}
          />
          <JsonLd
            data={breadcrumbSchema([
              { label: ui["nav.home"] ?? "Home", path: "/" },
              { label: ui["nav.blog"] ?? "Insights", path: "/blog" },
              { label: post.title, path: `/blog/${slug}` },
            ])}
          />
        </>
      )}
      <BlogDetailView />
    </>
  );
}
