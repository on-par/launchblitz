import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MarketingLandingPage } from "./MarketingLandingPage";

const AUTH_COOKIE_MARKERS = ["__session", "__client_uat", "clerk", "launchblitz_session"];

function hasAuthenticatedSession(cookieNames: string[]) {
  return cookieNames.some((name) =>
    AUTH_COOKIE_MARKERS.some((marker) => name.toLowerCase().includes(marker.toLowerCase())),
  );
}

export default async function MarketingPage() {
  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);

  if (hasAuthenticatedSession(cookieNames)) {
    redirect("/builds");
  }

  return <MarketingLandingPage />;
}
