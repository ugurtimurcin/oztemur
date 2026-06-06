import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata, absoluteMediaUrl } from "@/lib/server/metadata";
import { getUiStrings } from "@/lib/server/siteContent";
import { fetchProjectBySlug } from "@/lib/server/entities";
import { breadcrumbSchema } from "@/lib/server/schemas";
import JsonLd from "@/components/JsonLd";
import ProjectDetailView from "./ProjectDetailView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function pickLocalized(field: Record<string, string> | undefined, locale: string): string {
  if (!field) return "";
  return field[locale] || field.en || field.tr || Object.values(field)[0] || "";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveLocale();
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    const ui = await getUiStrings(locale);
    return buildMetadata(
      {
        title: ui["notfound.project.title"] ?? "Project not found",
        description: ui["notfound.project.desc"] ?? "The requested project could not be found.",
        path: `/projects/${slug}`,
      },
      locale,
    );
  }

  const title = pickLocalized(project.title, locale);
  const description = pickLocalized(project.description, locale);

  return buildMetadata(
    {
      title,
      description,
      path: `/projects/${slug}`,
      image: absoluteMediaUrl(project.imageUrl),
    },
    locale,
  );
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const locale = await resolveLocale();
  const project = await fetchProjectBySlug(slug);
  const projectTitle = project ? pickLocalized(project.title, locale) : "";
  const ui = project ? await getUiStrings(locale) : null;

  return (
    <>
      {project && ui && (
        <JsonLd
          data={breadcrumbSchema([
            { label: ui["nav.home"] ?? "Home", path: "/" },
            { label: ui["nav.projects"] ?? "Projects", path: "/projects" },
            { label: projectTitle, path: `/projects/${slug}` },
          ])}
        />
      )}
      <ProjectDetailView params={Promise.resolve({ slug })} />
    </>
  );
}
