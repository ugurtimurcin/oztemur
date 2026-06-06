import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata, SITE_URL } from "@/lib/server/metadata";
import { getUiStrings } from "@/lib/server/siteContent";
import { fetchJob } from "@/lib/server/entities";
import { breadcrumbSchema, jobPostingSchema } from "@/lib/server/schemas";
import JsonLd from "@/components/JsonLd";
import CareerDetailView from "./CareerDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await resolveLocale();
  const job = await fetchJob(id, locale);

  if (!job) {
    const ui = await getUiStrings(locale);
    return buildMetadata(
      {
        title: ui["notfound.career.title"] ?? "Position not found",
        description: ui["notfound.career.desc"] ?? "The requested position could not be found.",
        path: `/careers/${id}`,
      },
      locale,
    );
  }

  const description =
    job.description.length > 160 ? `${job.description.slice(0, 157)}…` : job.description;

  return buildMetadata(
    {
      title: `${job.title} · ${job.department}`,
      description,
      path: `/careers/${id}`,
    },
    locale,
  );
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const locale = await resolveLocale();
  const job = await fetchJob(id, locale);
  const url = `${SITE_URL}/careers/${id}`;
  const ui = job ? await getUiStrings(locale) : null;

  return (
    <>
      {job && ui && (
        <>
          <JsonLd
            data={jobPostingSchema({
              title: job.title,
              description: job.description,
              department: job.department,
              location: job.location,
              type: job.type,
              identifier: job.referenceCode,
              url,
            })}
          />
          <JsonLd
            data={breadcrumbSchema([
              { label: ui["nav.home"] ?? "Home", path: "/" },
              { label: ui["nav.careers"] ?? "Careers", path: "/careers" },
              { label: job.title, path: `/careers/${id}` },
            ])}
          />
        </>
      )}
      <CareerDetailView />
    </>
  );
}
