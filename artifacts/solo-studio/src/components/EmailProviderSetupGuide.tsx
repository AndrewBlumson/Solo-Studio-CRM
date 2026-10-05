export type EmailProvider = "google" | "microsoft";

type Props = {
  provider: EmailProvider;
  redirectUri: string;
  checking: boolean;
  onCopy: (value: string, label: string) => void;
  onCheck: () => void;
};

const labels: Record<EmailProvider, string> = {
  google: "Gmail",
  microsoft: "Outlook",
};

export function EmailProviderSetupGuide({
  provider,
  redirectUri,
  checking,
  onCopy,
  onCheck,
}: Props) {
  const providerSecrets =
    provider === "google"
      ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
      : ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"];
  const secretNames = [...providerSecrets, "EMAIL_TOKEN_ENCRYPTION_KEY"];
  const secretNameList = secretNames.join("\n");
  const isGoogle = provider === "google";

  return (
    <div data-testid={`email-setup-guide-${provider}`}>
      <p className="small-muted" style={{ margin: "8px 0" }}>
        One-time setup by the person running this Remix. Everyone else just
        connects their own mailbox.
      </p>
      <details>
        <summary
          style={{
            cursor: "pointer",
            color: "hsl(var(--foreground))",
            fontSize: 12,
            fontWeight: 650,
          }}
          data-testid={`details-email-setup-${provider}`}
        >
          Show the {labels[provider]} setup steps
        </summary>
        <div
          style={{
            borderTop: "1px solid hsl(var(--border))",
            marginTop: 10,
            padding: "10px 0 0 4px",
          }}
        >
          <ol
            className="small-muted"
            style={{ paddingLeft: 22, display: "grid", gap: 12 }}
          >
            <li>
              <strong>Create the provider app.</strong>{" "}
              {isGoogle ? (
                <>
                  In{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    data-testid="link-google-cloud-credentials"
                  >
                    Google Cloud
                  </a>
                  , enable Gmail API, set up the consent screen, add testers,
                  and create a web OAuth client with Gmail read-only access.
                </>
              ) : (
                <>
                  In{" "}
                  <a
                    href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                    target="_blank"
                    rel="noreferrer"
                    data-testid="link-microsoft-app-registration"
                  >
                    Microsoft Entra
                  </a>
                  , register an app for personal, work, and school accounts.
                  Add delegated <code>Mail.Read</code> and <code>User.Read</code>.
                </>
              )}
            </li>
            <li>
                  <strong>Add this callback URL.</strong> Register it as a Web
                  redirect URI. Add the published URL as well after you publish.
              {redirectUri ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  <code
                    style={{ fontSize: 11, overflowWrap: "anywhere", flex: 1 }}
                    data-testid={`text-email-callback-${provider}`}
                  >
                    {redirectUri}
                  </code>
                  <button
                    className="button small"
                    type="button"
                    onClick={() => void onCopy(redirectUri, "Callback URL")}
                    data-testid={`button-copy-email-callback-${provider}`}
                  >
                    Copy
                  </button>
                </div>
              ) : (
                <p className="small-muted">
                  The callback URL is not available in this preview yet.
                </p>
              )}
            </li>
            <li>
              <strong>Add these Secrets in this Remix’s Replit workspace.</strong>{" "}
              Enter their values in Replit, never on this page.
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <code
                  style={{ fontSize: 11, whiteSpace: "pre-wrap", flex: 1 }}
                  data-testid={`text-email-secret-names-${provider}`}
                >
                  {secretNameList}
                </code>
                <button
                  className="button small"
                  type="button"
                  onClick={() => void onCopy(secretNameList, "Secret names")}
                  data-testid={`button-copy-email-secret-names-${provider}`}
                >
                  Copy names
                </button>
              </div>
              <p className="small-muted" style={{ marginTop: 8 }}>
                For the encryption key, run{" "}
                <code>openssl rand -base64 32</code> in the Replit Shell and
                save the output as <code>EMAIL_TOKEN_ENCRYPTION_KEY</code>.
                Keep the key private.
                <button
                  className="button small"
                  type="button"
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    void onCopy("openssl rand -base64 32", "Key-generation command")
                  }
                  data-testid={`button-copy-email-key-command-${provider}`}
                >
                  Copy command
                </button>
              </p>
            </li>
          </ol>
          {isGoogle && (
            <p className="small-muted">
              Google may require verification and a security assessment before
              a public app can request Gmail read-only access.
            </p>
          )}
          <div className="button-row" style={{ marginTop: 10 }}>
            <a
              className="button small"
              href="https://docs.replit.com/core-concepts/project-editor/app-setup/secrets"
              target="_blank"
              rel="noreferrer"
              data-testid={`link-replit-secrets-help-${provider}`}
            >
              How to add Secrets
            </a>
            <button
              className="button small"
              type="button"
              onClick={onCheck}
              disabled={checking}
              data-testid={`button-check-email-setup-${provider}`}
            >
              {checking ? "Checking…" : "Check setup"}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}