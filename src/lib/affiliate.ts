import type { FDRate } from "@/lib/fd-data";

const DEFAULT_SOURCE = "nivesh_saathi";

export function buildAffiliateBookingUrl(
  rate: Pick<FDRate, "id" | "officialUrl">,
  context: string = "app"
) {
  const url = new URL(rate.officialUrl);
  url.searchParams.set("utm_source", DEFAULT_SOURCE);
  url.searchParams.set("utm_medium", "fd_advisory");
  url.searchParams.set("utm_campaign", "fd_booking");
  url.searchParams.set("utm_content", `${context}_${rate.id}`);
  return url.toString();
}
