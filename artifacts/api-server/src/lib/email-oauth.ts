import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { EmailProvider } from "@workspace/db";

type ProviderCredentials = {
  clientId: string;
  clientSecret: string;
};

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
};

type TokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  error?: unknown;
};

const PROVIDERS: EmailProvider[] = ["google", "microsoft"];

export function isEmailProvider(value: unknown): value is EmailProvider {
  return PROVIDERS.includes(value as EmailProvider);
}

export function getProviderScopes(provider: EmailProvider): string[] {
  return provider === "google"
    ? ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly"]
    : ["openid", "profile", "email", "offline_access", "User.Read", "Mail.Read"];
}

function credentialsFor(provider: EmailProvider): ProviderCredentials | null {
  const prefix = provider === "google" ? "GOOGLE" : "MICROSOFT";
  const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function encryptionKey(): Buffer {
  const encoded = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("email_encryption_key_not_configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("email_encryption_key_must_be_32_bytes_base64");
  }
  return key;
}

export function isTokenEncryptionConfigured(): boolean {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function isProviderConfigured(provider: EmailProvider): boolean {
  return Boolean(credentialsFor(provider)) && isTokenEncryptionConfigured();
}

export function encryptEmailSecret(plaintext: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptEmailSecret(encrypted: string, context: string): string {
  const [version, ivPart, tagPart, ciphertextPart] = encrypted.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !ciphertextPart) {
    throw new Error("email_token_ciphertext_invalid");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function createPkceVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function createPkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function getAllowedEmailOrigin(
  forwardedHost: string | undefined,
  hostHeader: string | undefined,
): string | null {
  const allowedHosts = (process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const hostCandidates = [forwardedHost, hostHeader]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  let localOrigin: string | null = null;

  for (const candidate of hostCandidates) {
    let parsed: URL;
    try {
      parsed = new URL(`https://${candidate}`);
    } catch {
      continue;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (allowedHosts.includes(hostname)) {
      return `https://${hostname}`;
    }
    if (
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(hostname)
    ) {
      const protocol = hostHeader?.startsWith("localhost:") ||
        hostHeader?.startsWith("127.0.0.1:")
        ? "http"
        : "https";
      localOrigin ??= `${protocol}://${parsed.host}`;
    }
  }

  return allowedHosts[0] ? `https://${allowedHosts[0]}` : localOrigin;
}

export function emailCallbackUri(
  provider: EmailProvider,
  origin: string,
  basePath = "",
): string {
  const prefix = basePath.replace(/\/+$/, "");
  return `${origin}${prefix}/api/email/oauth/${provider}/callback`;
}

export function createEmailAuthorizationUrl(
  provider: EmailProvider,
  state: string,
  codeChallenge: string,
  redirectUri: string,
): string {
  const credentials = credentialsFor(provider);
  if (!credentials) throw new Error("email_provider_credentials_not_configured");
  encryptionKey();

  const authorizationUrl =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  authorizationUrl.searchParams.set("client_id", credentials.clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", getProviderScopes(provider).join(" "));
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  if (provider === "google") {
    authorizationUrl.searchParams.set("access_type", "offline");
    authorizationUrl.searchParams.set("prompt", "consent");
  } else {
    authorizationUrl.searchParams.set("response_mode", "query");
  }

  return authorizationUrl.toString();
}

async function readTokenResponse(
  response: Response,
): Promise<{ json: TokenResponse; scopes: string[] }> {
  let json: TokenResponse;
  try {
    json = (await response.json()) as TokenResponse;
  } catch {
    throw new Error("email_provider_token_response_invalid");
  }

  if (!response.ok || typeof json.access_token !== "string") {
    throw new Error("email_provider_token_request_failed");
  }

  const scopes =
    typeof json.scope === "string"
      ? json.scope.split(/\s+/).filter(Boolean)
      : [];
  return { json, scopes };
}

export async function exchangeEmailAuthorizationCode(
  provider: EmailProvider,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  fetcher: typeof fetch = fetch,
): Promise<OAuthTokens> {
  const credentials = credentialsFor(provider);
  if (!credentials) throw new Error("email_provider_credentials_not_configured");
  encryptionKey();

  const endpoint =
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const form = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const { json, scopes } = await readTokenResponse(response);

  return {
    accessToken: json.access_token as string,
    refreshToken:
      typeof json.refresh_token === "string" ? json.refresh_token : null,
    scopes,
  };
}

export async function refreshEmailAccessToken(
  provider: EmailProvider,
  refreshToken: string,
  fetcher: typeof fetch = fetch,
): Promise<OAuthTokens> {
  const credentials = credentialsFor(provider);
  if (!credentials) throw new Error("email_provider_credentials_not_configured");
  encryptionKey();

  const endpoint =
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const form = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  if (provider === "google") {
    form.set("scope", getProviderScopes(provider).join(" "));
  }

  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const { json, scopes } = await readTokenResponse(response);

  return {
    accessToken: json.access_token as string,
    refreshToken:
      typeof json.refresh_token === "string" ? json.refresh_token : null,
    scopes,
  };
}

export async function getEmailProviderAddress(
  provider: EmailProvider,
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const profileUrl =
    provider === "google"
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const response = await fetcher(profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("email_provider_profile_request_failed");

  const profile = (await response.json()) as {
    email?: unknown;
    mail?: unknown;
    userPrincipalName?: unknown;
  };
  const address =
    provider === "google"
      ? profile.email
      : profile.mail || profile.userPrincipalName;
  if (typeof address !== "string" || !address.includes("@")) {
    throw new Error("email_provider_address_missing");
  }
  return address;
}