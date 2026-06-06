/**
 * Localizes the raw <c>ProjectStatus</c> enum value coming from the API
 * (Planning, InProgress, Operational, Completed, OnHold) using the
 * <c>project.status.*</c> UiString catalog. Falling back to the raw enum
 * value keeps the UI showing something if a new status appears server-side
 * before its label is seeded.
 *
 * Pass the resolved UI string dictionary (the same one views get from
 * <c>useUiStrings</c> / <c>getUiStrings</c>) so adding a new language no
 * longer requires a code change here.
 */
export function projectStatusLabel(
  status: string | null | undefined,
  uiStrings: Record<string, string>,
): string {
  if (!status) return "";
  const key = `project.status.${status}`;
  const label = uiStrings[key];
  return label && label.length > 0 ? label : status;
}
