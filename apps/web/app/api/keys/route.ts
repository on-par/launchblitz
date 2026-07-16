import {
  encryptProviderKey,
  maskProviderKey,
  MVP_PROVIDERS,
  parseSaveProviderKeyInput,
} from "@launchblitz/db";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { getProviderKeysRepository } from "../../../lib/provider-keys";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getProviderKeysRepository().list(session.userId);

  return NextResponse.json({
    providers: MVP_PROVIDERS.map((provider) => {
      const row = rows.find((r) => r.provider === provider);
      return {
        provider,
        saved: Boolean(row),
        keyHint: row?.keyHint ?? null,
        updatedAt: row?.updatedAt ?? null,
      };
    }),
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseSaveProviderKeyInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const secret = process.env.PROVIDER_KEY_ENCRYPTION_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Key vault is not configured." }, { status: 500 });
  }

  const { provider, key } = parsed.value;
  const encryptedKey = encryptProviderKey(key, secret);
  const keyHint = maskProviderKey(key);

  const row = await getProviderKeysRepository().upsert({
    userId: session.userId,
    provider,
    encryptedKey,
    keyHint,
  });

  return NextResponse.json({ provider: row.provider, keyHint: row.keyHint, updatedAt: row.updatedAt });
}
