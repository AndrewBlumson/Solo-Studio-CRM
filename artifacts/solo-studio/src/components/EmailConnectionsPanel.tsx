import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Mail, Unplug } from "lucide-react";
import {
  EmailProviderSetupGuide,
  type EmailProvider,
} from "./EmailProviderSetupGuide";

type ProviderInfo = {
  provider: EmailProvider;
  configured: boolean;
  redirectUri: string;
};

type EmailConnection = {
  provider: EmailProvider;
  email: string;
  connectedAt: string;
};

type EmailSignal =
  | "enquiry"
  | "budget"
  | "project"
  | "meeting"
  | "invoice"
  | "follow_up";

export type EmailAnalysisCandidate = {
  email: string;
  name: string;
  messageCount: number;
  lastMessageAt: string;
  latestSubject: string;
  signals: EmailSignal[];
};

type ScanProgress = {
  running: boolean;
  complete: boolean;
  scanned: number;
  total: number | null;
  error: string;
};

type Props = {
  onImportCandidate: (candidate: EmailAnalysisCandidate) => void;
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const endpoint = `${basePath}/api/email`;
const providerLabels: Record<EmailProvider, string> = {
  google: "Gmail",
  microsoft: "Outlook",
};
const signalLabels: Record<EmailSignal, string> = {
  enquiry: "Enquiry",
  budget: "Pricing",
  project: "Project",
  meeting: "Meeting",
  invoice: "Invoice",
  follow_up: "Follow-up",
};
const emptyProgress = (): ScanProgress => ({
  running: false,
  complete: false,
  scanned: 0,
  total: null,
  error: "",
});

function responseError(value: unknown, fallback: string): string {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return fallback;
}

async function loadConnectionStatus(): Promise<{
  providers: ProviderInfo[];
  connections: EmailConnection[];
}> {
  const response = await fetch(`${endpoint}/connections`, {
    credentials: "include",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      responseError(payload, "Mailbox connection status could not be loaded."),
    );
  }
  return {
    providers: Array.isArray(payload?.providers) ? payload.providers : [],
    connections: Array.isArray(payload?.connections)
      ? payload.connections
      : [],
  };
}

function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(date);
}

function mergeCandidate(
  candidates: Map<string, EmailAnalysisCandidate>,
  incoming: EmailAnalysisCandidate,
): void {
  const key = incoming.email.toLowerCase();
  const existing = candidates.get(key);
  if (!existing) {
    candidates.set(key, incoming);
    return;
  }

  const incomingIsNewer =
    Date.parse(incoming.lastMessageAt) > Date.parse(existing.lastMessageAt);
  candidates.set(key, {
    ...existing,
    name: existing.name || incoming.name,
    messageCount: existing.messageCount + incoming.messageCount,
    lastMessageAt: incomingIsNewer
      ? incoming.lastMessageAt
      : existing.lastMessageAt,
    latestSubject: incomingIsNewer
      ? incoming.latestSubject
      : existing.latestSubject,
    signals: [...new Set([...existing.signals, ...incoming.signals])],
  });
}

export function EmailConnectionsPanel({ onImportCandidate }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingSetup, setCheckingSetup] = useState(false);
  const [busyProvider, setBusyProvider] = useState<EmailProvider | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<
    Partial<Record<EmailProvider, EmailAnalysisCandidate[]>>
  >({});
  const [progress, setProgress] = useState<
    Partial<Record<EmailProvider, ScanProgress>>
  >({});
  const scanControllers = useRef(new Map<EmailProvider, AbortController>());

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const connectionResult = params.get("emailConnection");
    const provider = params.get("provider");
    if (connectionResult === "connected") {
      setNotice(
        `${provider === "microsoft" ? "Outlook" : "Gmail"} is connected. You can analyse its mailbox when ready.`,
      );
      params.delete("emailConnection");
      params.delete("provider");
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    } else if (connectionResult === "error") {
      setError("Mailbox connection was cancelled or could not be completed.");
      params.delete("emailConnection");
      params.delete("provider");
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    }

    void (async () => {
      try {
        const status = await loadConnectionStatus();
        if (active) {
          setProviders(status.providers);
          setConnections(status.connections);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Mailbox connection status could not be loaded.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      for (const controller of scanControllers.current.values()) {
        controller.abort();
      }
      scanControllers.current.clear();
    };
  }, []);

  const checkSetup = async (provider: EmailProvider) => {
    setError("");
    setCheckingSetup(true);
    try {
      const status = await loadConnectionStatus();
      setProviders(status.providers);
      setConnections(status.connections);
      const providerStatus = status.providers.find(
        (item) => item.provider === provider,
      );
      setNotice(
        providerStatus?.configured
          ? `${providerLabels[provider]} is ready. Users can now connect their own accounts.`
          : `${providerLabels[provider]} still needs setup. Check Replit Secrets and restart the API Server workflow.`,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Mailbox setup status could not be checked.",
      );
    } finally {
      setCheckingSetup(false);
    }
  };

  const connect = async (provider: EmailProvider) => {
    setError("");
    setBusyProvider(provider);
    try {
      const response = await fetch(
        `${endpoint}/connections/${provider}/authorization`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.authorizationUrl !== "string") {
        throw new Error(
          responseError(payload, `Could not connect ${providerLabels[provider]}.`),
        );
      }
      window.location.assign(payload.authorizationUrl);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : `Could not connect ${providerLabels[provider]}.`,
      );
      setBusyProvider(null);
    }
  };

  const disconnect = async (provider: EmailProvider) => {
    if (
      !window.confirm(
        `Disconnect ${providerLabels[provider]} and remove its saved access from Solo Studio?`,
      )
    ) {
      return;
    }
    setError("");
    setBusyProvider(provider);
    scanControllers.current.get(provider)?.abort();
    try {
      const response = await fetch(`${endpoint}/connections/${provider}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          responseError(payload, `Could not disconnect ${providerLabels[provider]}.`),
        );
      }
      setConnections((current) =>
        current.filter((connection) => connection.provider !== provider),
      );
      setInsights((current) => ({ ...current, [provider]: [] }));
      setProgress((current) => ({ ...current, [provider]: emptyProgress() }));
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : `Could not disconnect ${providerLabels[provider]}.`,
      );
    } finally {
      setBusyProvider(null);
    }
  };

  const stopAnalysis = (provider: EmailProvider) => {
    scanControllers.current.get(provider)?.abort();
  };

  const analyseMailbox = async (provider: EmailProvider) => {
    const controller = new AbortController();
    scanControllers.current.set(provider, controller);
    const candidates = new Map<string, EmailAnalysisCandidate>();
    let cursor: string | null = null;
    let scanned = 0;
    let total: number | null = null;
    setInsights((current) => ({ ...current, [provider]: [] }));
    setProgress((current) => ({
      ...current,
      [provider]: { ...emptyProgress(), running: true },
    }));
    setError("");

    try {
      while (true) {
        const response: Response = await fetch(
          `${endpoint}/connections/${provider}/analysis-batch`,
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cursor }),
            signal: controller.signal,
          },
        );
        const payload: {
          candidates?: unknown;
          scannedCount?: unknown;
          totalCount?: unknown;
          complete?: unknown;
          cursor?: unknown;
        } | null = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            responseError(payload, "Mailbox analysis could not continue."),
          );
        }
        if (
          !payload ||
          !Array.isArray(payload.candidates) ||
          typeof payload.scannedCount !== "number" ||
          typeof payload.complete !== "boolean"
        ) {
          throw new Error("The mailbox analysis returned an unexpected response.");
        }

        for (const candidate of payload.candidates as EmailAnalysisCandidate[]) {
          mergeCandidate(candidates, candidate);
        }
        scanned += payload.scannedCount;
        if (typeof payload.totalCount === "number") total = payload.totalCount;
        setInsights((current) => ({
          ...current,
          [provider]: [...candidates.values()].sort(
            (a, b) =>
              Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt) ||
              b.messageCount - a.messageCount,
          ),
        }));
        setProgress((current) => ({
          ...current,
          [provider]: {
            running: true,
            complete: false,
            scanned,
            total,
            error: "",
          },
        }));

        if (payload.complete) break;
        if (typeof payload.cursor !== "string" || !payload.cursor) {
          throw new Error("Mailbox paging stopped before the scan was complete.");
        }
        cursor = payload.cursor;
      }

      setProgress((current) => ({
        ...current,
        [provider]: {
          running: false,
          complete: true,
          scanned,
          total,
          error: "",
        },
      }));
    } catch (scanError) {
      const wasStopped = controller.signal.aborted;
      setProgress((current) => ({
        ...current,
        [provider]: {
          running: false,
          complete: false,
          scanned,
          total,
          error: wasStopped
            ? "Analysis stopped. The partial results are still available."
            : scanError instanceof Error
              ? scanError.message
              : "Mailbox analysis could not continue.",
        },
      }));
    } finally {
      if (scanControllers.current.get(provider) === controller) {
        scanControllers.current.delete(provider);
      }
    }
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setNotice(`Copy the ${label.toLowerCase()} shown on this screen.`);
    }
  };

  return (
    <section
      className="card section"
      style={{ maxWidth: 700 }}
      data-testid="section-email-connections"
    >
      <div className="eyebrow">Mailbox insights</div>
      <h2 className="card-title">Find conversations worth following up</h2>
      <p className="small-muted">
        Connect Gmail or Outlook with read-only access. Solo Studio checks the
        whole mailbox for contact details and useful conversation signals.
        Message content is analysed in memory and is not saved.
      </p>
      <p className="small-muted">
        Disconnect removes Solo Studio’s saved token. To remove provider consent
        as well, remove Solo Studio from your Google or Microsoft account’s
        connected apps.
      </p>
      <p className="small-muted">
        Analysis candidates are not saved. Import a contact as a lead if you
        want to keep it in Solo Studio.
      </p>

      {notice && (
        <div className="small-muted" role="status" style={{ marginBottom: 12 }}>
          {notice}
        </div>
      )}
      {error && (
        <div
          className="small-muted"
          role="alert"
          style={{ color: "hsl(var(--destructive))", marginBottom: 12 }}
          data-testid="email-connection-error"
        >
          {error}
        </div>
      )}
      {loading ? (
        <div className="small-muted" role="status">
          Checking mailbox connections…
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {providers.map((providerInfo) => {
            const provider = providerInfo.provider;
            const connection = connections.find(
              (item) => item.provider === provider,
            );
            const scan = progress[provider] ?? emptyProgress();
            const candidates = insights[provider] ?? [];
            return (
              <div
                className="card"
                key={provider}
                style={{ padding: 16, boxShadow: "none" }}
                data-testid={`email-provider-${provider}`}
              >
                <div className="card-heading">
                  <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                    <Mail size={16} aria-hidden="true" />
                    <strong style={{ fontSize: 13 }}>
                      {providerLabels[provider]}
                    </strong>
                  </div>
                  {connection ? (
                    <span
                      className="badge good"
                      data-testid={`email-status-${provider}`}
                    >
                      Connected
                    </span>
                  ) : !providerInfo.configured ? (
                    <span
                      className="badge warn"
                      data-testid={`email-status-${provider}`}
                    >
                      Setup needed
                    </span>
                  ) : null}
                </div>

                {connection ? (
                  <>
                    <div className="setting-line" style={{ padding: "11px 0" }}>
                      <div>
                        <strong style={{ fontSize: 12 }}>{connection.email}</strong>
                        <div className="small-muted">
                          Connected {displayDate(connection.connectedAt)}
                        </div>
                      </div>
                      <button
                        className="button small"
                        onClick={() => void disconnect(provider)}
                        disabled={busyProvider === provider || scan.running}
                        data-testid={`button-disconnect-${provider}`}
                      >
                        <Unplug size={13} /> Disconnect
                      </button>
                    </div>
                    {providerInfo.configured ? (
                      <>
                        <div className="small-muted" style={{ marginBottom: 10 }}>
                          The scan checks every mailbox page, then keeps only
                          contact names, addresses, message counts, dates,
                          subjects and conversation signals in this screen.
                        </div>
                        <div className="button-row">
                          {scan.running ? (
                            <button
                              className="button"
                              onClick={() => stopAnalysis(provider)}
                              data-testid={`button-stop-analysis-${provider}`}
                            >
                              Stop analysis
                            </button>
                          ) : (
                            <button
                              className="button primary"
                              onClick={() => void analyseMailbox(provider)}
                              disabled={busyProvider === provider}
                              data-testid={`button-analyse-${provider}`}
                            >
                              {scan.complete
                                ? "Analyse mailbox again"
                                : "Analyse whole mailbox"}
                            </button>
                          )}
                        </div>
                        {(scan.running || scan.complete || scan.error) && (
                          <div
                            className="small-muted"
                            role="status"
                            aria-live="polite"
                            style={{ marginTop: 10 }}
                            data-testid={`email-analysis-progress-${provider}`}
                          >
                            {scan.running ? (
                              <>
                                <LoaderCircle
                                  size={13}
                                  style={{
                                    verticalAlign: "middle",
                                    marginRight: 5,
                                  }}
                                />
                                Scanned {scan.scanned.toLocaleString("en-GB")}
                                {scan.total !== null
                                  ? ` of about ${scan.total.toLocaleString("en-GB")} messages`
                                  : " messages"}
                                …
                              </>
                            ) : scan.complete ? (
                              <>
                                <Check
                                  size={13}
                                  style={{
                                    verticalAlign: "middle",
                                    marginRight: 5,
                                  }}
                                />
                                Finished: {scan.scanned.toLocaleString("en-GB")}{" "}
                                messages checked.
                              </>
                            ) : (
                              scan.error
                            )}
                          </div>
                        )}
                        {candidates.length > 0 && (
                          <div
                            style={{
                              display: "grid",
                              gap: 9,
                              marginTop: 14,
                              maxHeight: 440,
                              overflow: "auto",
                            }}
                          >
                            {candidates.map((candidate) => (
                              <article
                                className="card"
                                key={candidate.email}
                                style={{
                                  padding: 12,
                                  background: "hsl(var(--muted) / .3)",
                                  boxShadow: "none",
                                }}
                                data-testid={`email-candidate-${provider}-${candidate.email}`}
                              >
                                <div className="card-heading">
                                  <div>
                                    <strong style={{ fontSize: 12 }}>
                                      {candidate.name}
                                    </strong>
                                    <div className="small-muted">
                                      {candidate.email}
                                    </div>
                                  </div>
                                  <span className="card-meta">
                                    {displayDate(candidate.lastMessageAt)}
                                  </span>
                                </div>
                                <div
                                  className="small-muted"
                                  style={{ marginTop: 6 }}
                                >
                                  {candidate.messageCount} message
                                  {candidate.messageCount === 1 ? "" : "s"}
                                  {candidate.latestSubject
                                    ? ` · “${candidate.latestSubject}”`
                                    : ""}
                                </div>
                                {candidate.signals.length > 0 && (
                                  <div
                                    className="button-row"
                                    style={{ marginTop: 8 }}
                                    aria-label="Conversation signals"
                                  >
                                    {candidate.signals.map((signal) => (
                                      <span className="badge" key={signal}>
                                        {signalLabels[signal]}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <button
                                  className="button small"
                                  style={{ marginTop: 9 }}
                                  onClick={() =>
                                    onImportCandidate(candidate)
                                  }
                                  data-testid={`button-import-email-lead-${provider}-${candidate.email}`}
                                >
                                  Add as lead
                                </button>
                              </article>
                            ))}
                          </div>
                        )}
                        {scan.complete && candidates.length === 0 && (
                          <p className="small-muted" style={{ marginTop: 12 }}>
                            No external contacts were found in the messages
                            checked.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="small-muted">
                          This mailbox is still connected, but the Remix’s
                          provider credentials are missing. Restore its
                          configuration before analysing the mailbox.
                        </p>
                        <EmailProviderSetupGuide
                          provider={provider}
                          redirectUri={providerInfo.redirectUri}
                          checking={checkingSetup}
                          onCopy={copyText}
                          onCheck={() => void checkSetup(provider)}
                        />
                      </>
                    )}
                  </>
                ) : (
                  providerInfo.configured ? (
                    <>
                      <p className="small-muted" style={{ margin: "8px 0 12px" }}>
                        Connect a {providerLabels[provider]} account to find
                        contacts and follow-up signals.
                      </p>
                      <button
                        className="button primary"
                        onClick={() => void connect(provider)}
                        disabled={busyProvider === provider}
                        data-testid={`button-connect-${provider}`}
                      >
                        {busyProvider === provider
                          ? "Opening authorisation…"
                          : `Connect ${providerLabels[provider]}`}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="small-muted" style={{ margin: "8px 0 12px" }}>
                        The Remix owner must add its own{" "}
                        {providerLabels[provider]} app credentials before
                        anyone can connect a mailbox.
                      </p>
                      <EmailProviderSetupGuide
                        provider={provider}
                        redirectUri={providerInfo.redirectUri}
                        checking={checkingSetup}
                        onCopy={copyText}
                        onCheck={() => void checkSetup(provider)}
                      />
                    </>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}