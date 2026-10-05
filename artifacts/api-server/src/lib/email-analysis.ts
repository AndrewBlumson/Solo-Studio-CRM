import type { EmailProvider } from "@workspace/db";

export type EmailAnalysisSignal =
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
  signals: EmailAnalysisSignal[];
};

export type EmailAnalysisPage = {
  candidates: EmailAnalysisCandidate[];
  cursor: string | null;
  scannedCount: number;
  totalCount: number | null;
  complete: boolean;
};

type Participant = { email: string; name: string };
type AnalysisMessage = {
  from: Participant[];
  recipients: Participant[];
  subject: string;
  sentAt: string;
  text: string;
};

const PAGE_SIZE = 25;
const MAX_MESSAGE_TEXT = 12_000;

const signalRules: Array<[EmailAnalysisSignal, RegExp]> = [
  ["enquiry", /\b(enquir(?:y|ies)|interested in|looking for|can you help|request(?:ing)? a)\b/i],
  ["budget", /\b(quote|quotation|estimate|budget|pricing|price|cost|rate|proposal)\b/i],
  ["project", /\b(project|brief|campaign|website|brand(?:ing)?|launch|design)\b/i],
  ["meeting", /\b(meet(?:ing)?|call|book|schedule|availability|calendar)\b/i],
  ["invoice", /\b(invoice|payment|paid|overdue|receipt|purchase order)\b/i],
  ["follow_up", /\b(follow(?:ing)? up|checking in|reminder|next steps|circling back)\b/i],
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlToText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|tr)>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE_TEXT);
}

function parseAddressList(value: string): Participant[] {
  const addresses: Participant[] = [];
  const pattern =
    /(?:"?([^"<,;]*)"?\s*)?<([^<>\s]+@[^<>\s]+)>|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  for (const match of value.matchAll(pattern)) {
    const email = (match[2] || match[3] || "").trim().toLowerCase();
    if (!email) continue;
    const name = (match[1] || "").trim().replace(/^["']|["']$/g, "");
    addresses.push({
      email,
      name: name || email.split("@")[0],
    });
  }
  return addresses;
}

function classifyText(value: string): EmailAnalysisSignal[] {
  return signalRules
    .filter(([, pattern]) => pattern.test(value))
    .map(([signal]) => signal);
}

function addMessage(
  candidates: Map<string, EmailAnalysisCandidate>,
  message: AnalysisMessage,
  ownEmail: string,
): void {
  const content = `${message.subject} ${message.text}`;
  const signals = classifyText(content);
  const messageTime = Date.parse(message.sentAt);
  if (!Number.isFinite(messageTime)) return;

  const participants = new Map<string, Participant>();
  for (const participant of [...message.from, ...message.recipients]) {
    if (
      !participant.email ||
      participant.email.toLowerCase() === ownEmail.toLowerCase() ||
      /(^|[._+-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?)([._+-]|@)/i.test(
        participant.email,
      )
    ) {
      continue;
    }
    participants.set(participant.email.toLowerCase(), participant);
  }

  for (const [email, participant] of participants) {
    let candidate = candidates.get(email);
    if (!candidate) {
      candidate = {
        email,
        name: participant.name || email.split("@")[0],
        messageCount: 0,
        lastMessageAt: message.sentAt,
        latestSubject: message.subject,
        signals: [],
      };
      candidates.set(email, candidate);
    }

    candidate.messageCount += 1;
    if (!candidate.name && participant.name) candidate.name = participant.name;
    if (messageTime >= Date.parse(candidate.lastMessageAt)) {
      candidate.lastMessageAt = message.sentAt;
      candidate.latestSubject = message.subject;
    }
    candidate.signals = [...new Set([...candidate.signals, ...signals])];
  }
}

function finishCandidates(
  candidates: Map<string, EmailAnalysisCandidate>,
): EmailAnalysisCandidate[] {
  return [...candidates.values()].sort(
    (a, b) =>
      Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt) ||
      b.messageCount - a.messageCount,
  );
}

function readHeader(
  headers: Array<{ name?: unknown; value?: unknown }> | undefined,
  name: string,
): string {
  const header = headers?.find(
    (item) =>
      typeof item.name === "string" &&
      item.name.toLowerCase() === name.toLowerCase(),
  );
  return typeof header?.value === "string" ? header.value : "";
}

type GmailPart = {
  mimeType?: unknown;
  body?: { data?: unknown };
  parts?: GmailPart[];
};

function collectGmailBodies(
  part: GmailPart | undefined,
  mimeType: string,
  output: string[],
): void {
  if (!part) return;
  if (
    part.mimeType === mimeType &&
    typeof part.body?.data === "string"
  ) {
    output.push(Buffer.from(part.body.data, "base64url").toString("utf8"));
  }
  for (const child of part.parts ?? []) {
    collectGmailBodies(child, mimeType, output);
  }
}

function gmailText(payload: GmailPart | undefined, snippet: unknown): string {
  const plainParts: string[] = [];
  collectGmailBodies(payload, "text/plain", plainParts);
  if (plainParts.length) {
    return plainParts.join(" ").replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_TEXT);
  }

  const htmlParts: string[] = [];
  collectGmailBodies(payload, "text/html", htmlParts);
  if (htmlParts.length) return htmlToText(htmlParts.join(" "));
  return typeof snippet === "string" ? snippet.slice(0, MAX_MESSAGE_TEXT) : "";
}

async function mapLimit<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let index = 0;
  const workers = Array.from(
    { length: Math.min(limit, values.length) },
    async () => {
      while (index < values.length) {
        const current = index++;
        results[current] = await mapper(values[current]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

async function checkedJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error("email_provider_mail_request_failed");
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error("email_provider_mail_response_invalid");
  }
}

function parseGmailMessage(
  value: Record<string, unknown>,
): AnalysisMessage | null {
  const payload = value.payload as
    | { headers?: Array<{ name?: unknown; value?: unknown }>; parts?: GmailPart[]; mimeType?: unknown; body?: { data?: unknown } }
    | undefined;
  const headers = payload?.headers;
  const from = parseAddressList(readHeader(headers, "from"));
  if (!from.length) return null;
  const recipients = [
    ...parseAddressList(readHeader(headers, "to")),
    ...parseAddressList(readHeader(headers, "cc")),
  ];
  const internalDate =
    typeof value.internalDate === "string" ? Number(value.internalDate) : NaN;
  const date = new Date(internalDate);
  if (!Number.isFinite(internalDate) || Number.isNaN(date.getTime())) return null;

  const subject = readHeader(headers, "subject").trim().slice(0, 500);
  const text = gmailText(payload, value.snippet);
  return {
    from,
    recipients,
    subject,
    sentAt: date.toISOString(),
    text,
  };
}

function parseGraphParticipant(value: unknown): Participant[] {
  if (!value || typeof value !== "object") return [];
  const emailAddress = (value as { emailAddress?: unknown }).emailAddress;
  if (!emailAddress || typeof emailAddress !== "object") return [];
  const record = emailAddress as { address?: unknown; name?: unknown };
  if (typeof record.address !== "string" || !record.address.includes("@")) {
    return [];
  }
  return [
    {
      email: record.address.toLowerCase(),
      name:
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : record.address.split("@")[0],
    },
  ];
}

function parseGraphMessage(value: unknown): AnalysisMessage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const from = parseGraphParticipant(record.from);
  const sentAt =
    typeof record.receivedDateTime === "string"
      ? record.receivedDateTime
      : typeof record.sentDateTime === "string"
        ? record.sentDateTime
        : "";
  if (!from.length || !Number.isFinite(Date.parse(sentAt))) return null;

  const recipients = [
    ...(Array.isArray(record.toRecipients) ? record.toRecipients : []),
    ...(Array.isArray(record.ccRecipients) ? record.ccRecipients : []),
  ].flatMap(parseGraphParticipant);
  const body = record.body as
    | { content?: unknown; contentType?: unknown }
    | undefined;
  const bodyText =
    typeof body?.content === "string"
      ? body.contentType === "html"
        ? htmlToText(body.content)
        : body.content.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_TEXT)
      : "";

  return {
    from,
    recipients,
    subject: typeof record.subject === "string" ? record.subject.slice(0, 500) : "",
    sentAt: new Date(sentAt).toISOString(),
    text:
      bodyText ||
      (typeof record.bodyPreview === "string"
        ? record.bodyPreview.slice(0, MAX_MESSAGE_TEXT)
        : ""),
  };
}

async function analyzeGmailPage(
  accessToken: string,
  ownEmail: string,
  cursor: string | null,
  fetcher: typeof fetch,
): Promise<EmailAnalysisPage> {
  const listUrl = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );
  listUrl.searchParams.set("maxResults", String(PAGE_SIZE));
  if (cursor) listUrl.searchParams.set("pageToken", cursor);

  const list = await checkedJson(
    await fetcher(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  const messages = Array.isArray(list.messages)
    ? list.messages.filter(
        (message): message is { id: string } =>
          Boolean(message) &&
          typeof message === "object" &&
          typeof (message as { id?: unknown }).id === "string",
      )
    : [];

  const fullMessages = await mapLimit(messages, 5, async ({ id }) => {
    const messageUrl = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`,
    );
    messageUrl.searchParams.set("format", "full");
    return checkedJson(
      await fetcher(messageUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
  });
  const candidates = new Map<string, EmailAnalysisCandidate>();
  for (const fullMessage of fullMessages) {
    const message = parseGmailMessage(fullMessage);
    if (message) addMessage(candidates, message, ownEmail);
  }

  return {
    candidates: finishCandidates(candidates),
    cursor: typeof list.nextPageToken === "string" ? list.nextPageToken : null,
    scannedCount: messages.length,
    totalCount:
      typeof list.resultSizeEstimate === "number"
        ? list.resultSizeEstimate
        : null,
    complete: typeof list.nextPageToken !== "string",
  };
}

async function analyzeMicrosoftPage(
  accessToken: string,
  ownEmail: string,
  cursor: string | null,
  fetcher: typeof fetch,
): Promise<EmailAnalysisPage> {
  const messagesUrl = new URL("https://graph.microsoft.com/v1.0/me/messages");
  messagesUrl.searchParams.set(
    "$select",
    "from,toRecipients,ccRecipients,subject,receivedDateTime,sentDateTime,body,bodyPreview,isDraft",
  );
  messagesUrl.searchParams.set("$top", String(PAGE_SIZE));
  if (cursor) {
    const separator = cursor.indexOf(":");
    const cursorType = separator > -1 ? cursor.slice(0, separator) : "";
    const cursorValue = separator > -1 ? cursor.slice(separator + 1) : "";
    if (
      !cursorValue ||
      (cursorType !== "skip" && cursorType !== "skiptoken")
    ) {
      throw new Error("email_provider_pagination_invalid");
    }
    messagesUrl.searchParams.set(
      cursorType === "skip" ? "$skip" : "$skiptoken",
      cursorValue,
    );
  }

  const page = await checkedJson(
    await fetcher(messagesUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
    }),
  );
  const messages = Array.isArray(page.value) ? page.value : [];
  const candidates = new Map<string, EmailAnalysisCandidate>();
  for (const value of messages) {
    if (
      value &&
      typeof value === "object" &&
      (value as { isDraft?: unknown }).isDraft !== true
    ) {
      const message = parseGraphMessage(value);
      if (message) addMessage(candidates, message, ownEmail);
    }
  }

  let nextCursor: string | null = null;
  if (typeof page["@odata.nextLink"] === "string") {
    try {
      const next = new URL(page["@odata.nextLink"]);
      if (
        next.hostname === "graph.microsoft.com" &&
        next.pathname === "/v1.0/me/messages"
      ) {
        const skipToken = next.searchParams.get("$skiptoken");
        const skip = next.searchParams.get("$skip");
        if (skipToken && skip) {
          throw new Error("email_provider_pagination_invalid");
        }
        nextCursor = skipToken
          ? `skiptoken:${skipToken}`
          : skip
            ? `skip:${skip}`
            : null;
      }
    } catch {
      throw new Error("email_provider_pagination_invalid");
    }
  }

  return {
    candidates: finishCandidates(candidates),
    cursor: nextCursor,
    scannedCount: messages.length,
    totalCount: null,
    complete: nextCursor === null,
  };
}

export function analyzeMailboxPage(
  provider: EmailProvider,
  accessToken: string,
  ownEmail: string,
  cursor: string | null,
  fetcher: typeof fetch = fetch,
): Promise<EmailAnalysisPage> {
  return provider === "google"
    ? analyzeGmailPage(accessToken, ownEmail, cursor, fetcher)
    : analyzeMicrosoftPage(accessToken, ownEmail, cursor, fetcher);
}