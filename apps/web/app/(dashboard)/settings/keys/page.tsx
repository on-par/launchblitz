import { KeyVault } from "../../../../components/KeyVault";
import { sanitizeRedirect } from "../../../../lib/auth";

interface KeysPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function KeysPage({ searchParams }: KeysPageProps) {
  const { returnTo } = await searchParams;
  return <KeyVault returnHref={returnTo ? sanitizeRedirect(returnTo) : null} />;
}
