import { getAuth } from "@clerk/express";
import { and, eq, lt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import {
  Router,
  type IRouter,
  type Request,
  type RequestHandler,
} from "express";
import {
  AnalyzeEmailMailboxBatchBody,
  AnalyzeEmailMailboxBatchParams,
  AnalyzeEmailMailboxBatchResponse,
  CompleteGoogleEmailAuthorizationQueryParams,
  CompleteMicrosoftEmailAuthorizationQueryParams,
  CreateEmailAuthorizationParams,
  CreateEmailAuthorizationResponse,
  DisconnectEmailConnectionParams,
  GetEmailConnectionsResponse,
} from "@workspace/api-zod";
import {
  db,
  emailConnectionsTable,
  emailOAuthTransactionsTable,
  type EmailProvider,
} from "@workspace/db";
import {
  analyzeMailboxPage,
  type EmailAnalysisPage,
} from "../lib/email-analysis";
import {
  createEmailAuthorizationUrl,
  createPkceChallenge,
  createPkceVerifier,
  decryptEmailSecret,
  emailCallbackUri,
  encryptEmailSecret,
  exchangeEmailAuthorizationCode,
  getAllowedEmailOrigin,
  getEmailProviderAddress,
  getProviderScopes,
  hashOAuthState,
  isEmailProvider,
  isProviderConfigured,
  refreshEmailAccessToken,
} from "../lib/email-oauth";

type EmailConnectionRow = {
  userId: string;
  provider: EmailProvider;
  email: string;
  encryptedRefreshToken: string;
  scopes: string[];
  connectedAt: Date;
};

type OAuthTransactionRow = {
  stateHash: string;
  userId: string;
  provider: EmailProvider;
  codeVerifier: string;
  redirectUri: string;
  createdAt: Date;
  expiresAt: Date;
};

export interface EmailRepository {
  listConnections(
    userId: string,
  ): Promise<Array<Pick<EmailConnectionRow, "provider" | "email" | "connectedAt">>>;
  findConnection(
    userId: string,
    provider: EmailProvider,
  ): Promise<EmailConnectionRow | undefined>;
  saveConnection(
    userId: string,
    provider: EmailProvider,
    email: string,
    encryptedRefreshToken: string,
    scopes: string[],
    now: Date,
  ): Promise<void>;
  updateRefreshToken(
    userId: string,
    provider: EmailProvider,
    encryptedRefreshToken: string,
    scopes: string[],
    now: Date,
  ): Promise<void>;
  disconnect(userId: string, provider: EmailProvider): Promise<void>;
  deleteExpiredTransactions(now: Date): Promise<void>;
  saveTransaction(transaction: OAuthTransactionRow): Promise<void>;
  consumeTransaction(stateHash: string): Promise<OAuthTransactionRow | undefined>;
}

interface EmailRouterOptions {
  repository?: EmailRepository;
  resolveUserId?: (request: Request) => string | null | undefined;
  fetcher?: typeof fetch;
  now?: () => Date;
}

const providers: EmailProvider[] = ["google", "microsoft"];

const databaseRepository: EmailRepository = {
  async listConnections(userId) {
    return db
      .select({
        provider: emailConnectionsTable.provider,
        email: emailConnectionsTable.email,
        connectedAt: emailConnectionsTable.connectedAt,
      })
      .from(emailConnectionsTable)
      .where(eq(emailConnectionsTable.userId, userId));
  },
  async findConnection(userId, provider) {
    const [connection] = await db
      .select()
      .from(emailConnectionsTable)
      .where(
        and(
          eq(emailConnectionsTable.userId, userId),
          eq(emailConnectionsTable.provider, provider),
        ),
      )
      .limit(1);
    return connection;
  },
  async saveConnection(
    userId,
    provider,
    email,
    encryptedRefreshToken,
    scopes,
    now,
  ) {
    await db
      .insert(emailConnectionsTable)
      .values({
        userId,
        provider,
        email,
        encryptedRefreshToken,
        scopes,
        connectedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          emailConnectionsTable.userId,
          emailConnectionsTable.provider,
        ],
        set: {
          email,
          encryptedRefreshToken,
          scopes,
          updatedAt: now,
        },
      });
  },
  async updateRefreshToken(
    userId,
    provider,
    encryptedRefreshToken,
    scopes,
    now,
  ) {
    await db
      .update(emailConnectionsTable)
      .set({
        encryptedRefreshToken,
        ...(scopes.length ? { scopes } : {}),
        updatedAt: now,
      })
      .where(
        and(
          eq(emailConnectionsTable.userId, userId),
          eq(emailConnectionsTable.provider, provider),
        ),
      );
  },
  async disconnect(userId, provider) {
    await db
      .delete(emailConnectionsTable)
      .where(
        and(
          eq(emailConnectionsTable.userId, userId),
          eq(emailConnectionsTable.provider, provider),
        ),
      );
  },
  async deleteExpiredTransactions(now) {
    await db
      .delete(emailOAuthTransactionsTable)
      .where(lt(emailOAuthTransactionsTable.expiresAt, now));
  },
  async saveTransaction(transaction) {
    await db.insert(emailOAuthTransactionsTable).values(transaction);
  },
  async consumeTransaction(stateHash) {
    const [transaction] = await db
      .delete(emailOAuthTransactionsTable)
      .where(eq(emailOAuthTransactionsTable.stateHash, stateHash))
      .returning();
    return transaction;
  },
};

function appBasePath(request: Request, origin: string): string {
  const referer = request.get("referer");
  if (!referer) return "";
  try {
    const parsed = new URL(referer);
    if (parsed.origin !== origin) return "";
    const pathname = parsed.pathname.replace(/\/+$/, "");
    if (pathname === "/settings") return "";
    if (pathname.endsWith("/settings")) {
      return pathname.slice(0, -"/settings".length);
    }
  } catch {
    return "";
  }
  return "";
}

function callbackSettingsUrl(
  transaction: OAuthTransactionRow,
  provider: EmailProvider,
  result: "connected" | "error",
): string {
  const callback = new URL(transaction.redirectUri);
  const callbackSuffix = `/api/email/oauth/${provider}/callback`;
  if (!callback.pathname.endsWith(callbackSuffix)) {
    throw new Error("email_oauth_redirect_uri_invalid");
  }
  const basePath = callback.pathname.slice(0, -callbackSuffix.length);
  const settings = new URL(`${basePath}/settings`, callback.origin);
  settings.searchParams.set("emailConnection", result);
  settings.searchParams.set("provider", provider);
  return settings.toString();
}

function queryValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeErrorCode(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 100)
    : "unknown_error";
}

export function createEmailRouter(
  options: EmailRouterOptions = {},
): IRouter {
  const repository = options.repository ?? databaseRepository;
  const resolveUserId = options.resolveUserId ?? ((request) => getAuth(request).userId);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const router: IRouter = Router();

  const requireAuth: RequestHandler = (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    const userId = resolveUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.locals.userId = userId;
    next();
  };

  router.get("/email/connections", requireAuth, async (req, res): Promise<void> => {
    const userId = res.locals.userId as string;
    const origin = getAllowedEmailOrigin(
      req.get("x-forwarded-host"),
      req.get("host"),
    );
    try {
      const connections = await repository.listConnections(userId);
      const body = {
        providers: providers.map((provider) => ({
          provider,
          configured: Boolean(origin) && isProviderConfigured(provider),
          redirectUri: origin
            ? emailCallbackUri(provider, origin, appBasePath(req, origin))
            : "",
        })),
        connections: connections.map((connection) => ({
          provider: connection.provider,
          email: connection.email,
          connectedAt: connection.connectedAt,
        })),
      };
      res.json(GetEmailConnectionsResponse.parse(body));
    } catch (error) {
      req.log.error(
        { userId, errorCode: safeErrorCode(error) },
        "Failed to read Solo Studio mailbox connections",
      );
      res.status(500).json({ error: "Unable to load mailbox connections" });
    }
  });

  router.post(
    "/email/connections/:provider/authorization",
    requireAuth,
    async (req, res): Promise<void> => {
      const parsed = CreateEmailAuthorizationParams.safeParse(req.params);
      if (!parsed.success || !isEmailProvider(parsed.data?.provider)) {
        res.status(400).json({ error: "Unsupported email provider" });
        return;
      }

      const provider = parsed.data.provider;
      const userId = res.locals.userId as string;
      const origin = getAllowedEmailOrigin(
        req.get("x-forwarded-host"),
        req.get("host"),
      );
      if (!origin || !isProviderConfigured(provider)) {
        res.status(503).json({
          error: "This mailbox provider is not configured yet",
        });
        return;
      }

      const state = randomBytes(32).toString("base64url");
      const verifier = createPkceVerifier();
      const redirectUri = emailCallbackUri(
        provider,
        origin,
        appBasePath(req, origin),
      );
      const transaction: OAuthTransactionRow = {
        stateHash: hashOAuthState(state),
        userId,
        provider,
        codeVerifier: encryptEmailSecret(
          verifier,
          `oauth:${provider}:${userId}`,
        ),
        redirectUri,
        createdAt: now(),
        expiresAt: new Date(now().getTime() + 10 * 60 * 1000),
      };

      try {
        await repository.deleteExpiredTransactions(now());
        await repository.saveTransaction(transaction);
        const authorizationUrl = createEmailAuthorizationUrl(
          provider,
          state,
          createPkceChallenge(verifier),
          redirectUri,
        );
        res.json(CreateEmailAuthorizationResponse.parse({ authorizationUrl }));
      } catch (error) {
        req.log.error(
          { userId, provider, errorCode: safeErrorCode(error) },
          "Failed to start Solo Studio mailbox authorization",
        );
        res.status(503).json({
          error: "Unable to start mailbox authorization",
        });
      }
    },
  );

  router.delete(
    "/email/connections/:provider",
    requireAuth,
    async (req, res): Promise<void> => {
      const parsed = DisconnectEmailConnectionParams.safeParse(req.params);
      if (!parsed.success || !isEmailProvider(parsed.data?.provider)) {
        res.status(400).json({ error: "Unsupported email provider" });
        return;
      }

      try {
        await repository.disconnect(
          res.locals.userId as string,
          parsed.data.provider,
        );
        res.status(204).end();
      } catch (error) {
        req.log.error(
          {
            userId: res.locals.userId,
            provider: parsed.data.provider,
            errorCode: safeErrorCode(error),
          },
          "Failed to disconnect Solo Studio mailbox",
        );
        res.status(500).json({ error: "Unable to disconnect mailbox" });
      }
    },
  );

  router.post(
    "/email/connections/:provider/analysis-batch",
    requireAuth,
    async (req, res): Promise<void> => {
      const parsedParams = AnalyzeEmailMailboxBatchParams.safeParse(req.params);
      const parsedBody = AnalyzeEmailMailboxBatchBody.safeParse(req.body);
      if (!parsedParams.success || !isEmailProvider(parsedParams.data?.provider)) {
        res.status(400).json({ error: "Unsupported email provider" });
        return;
      }
      if (
        !parsedBody.success ||
        (typeof parsedBody.data.cursor === "string" &&
          parsedBody.data.cursor.length > 8_192)
      ) {
        res.status(400).json({ error: "Invalid mailbox page cursor" });
        return;
      }

      const provider = parsedParams.data.provider;
      const userId = res.locals.userId as string;
      try {
        const connection = await repository.findConnection(userId, provider);
        if (!connection) {
          res.status(404).json({ error: "No mailbox is connected" });
          return;
        }

        const storedRefreshToken = decryptEmailSecret(
          connection.encryptedRefreshToken,
          `refresh:${provider}:${userId}`,
        );
        const refreshed = await refreshEmailAccessToken(
          provider,
          storedRefreshToken,
          fetcher,
        );
        if (refreshed.refreshToken) {
          await repository.updateRefreshToken(
            userId,
            provider,
            encryptEmailSecret(
              refreshed.refreshToken,
              `refresh:${provider}:${userId}`,
            ),
            refreshed.scopes.length ? refreshed.scopes : connection.scopes,
            now(),
          );
        }

        const page: EmailAnalysisPage = await analyzeMailboxPage(
          provider,
          refreshed.accessToken,
          connection.email,
          parsedBody.data.cursor ?? null,
          fetcher,
        );
        res.json(AnalyzeEmailMailboxBatchResponse.parse(page));
      } catch (error) {
        req.log.warn(
          { userId, provider, errorCode: safeErrorCode(error) },
          "Solo Studio mailbox analysis request failed",
        );
        res.status(502).json({
          error:
            "The mailbox could not be analysed. Reconnect the account and try again.",
        });
      }
    },
  );

  const finishAuthorization = async (
    req: Request,
    res: Parameters<RequestHandler>[1],
    provider: EmailProvider,
  ): Promise<void> => {
    res.setHeader("Cache-Control", "private, no-store");
    const querySchema =
      provider === "google"
        ? CompleteGoogleEmailAuthorizationQueryParams
        : CompleteMicrosoftEmailAuthorizationQueryParams;
    const parsedQuery = querySchema.safeParse(req.query);
    const state = parsedQuery.success
      ? queryValue(parsedQuery.data.state)
      : null;
    if (!state || state.length > 256) {
      res.status(400).send("Invalid mailbox authorisation response.");
      return;
    }

    let transaction: OAuthTransactionRow | undefined;
    try {
      transaction = await repository.consumeTransaction(
        hashOAuthState(state),
      );
      if (
        !transaction ||
        transaction.provider !== provider ||
        transaction.expiresAt.getTime() <= now().getTime()
      ) {
        res.status(400).send("This mailbox authorisation has expired.");
        return;
      }

      if (!parsedQuery.success || parsedQuery.data.error) {
        res.redirect(callbackSettingsUrl(transaction, provider, "error"));
        return;
      }
      const code = queryValue(parsedQuery.data.code);
      if (!code || code.length > 4_096) {
        res.redirect(callbackSettingsUrl(transaction, provider, "error"));
        return;
      }

      const verifier = decryptEmailSecret(
        transaction.codeVerifier,
        `oauth:${provider}:${transaction.userId}`,
      );
      const tokens = await exchangeEmailAuthorizationCode(
        provider,
        code,
        verifier,
        transaction.redirectUri,
        fetcher,
      );
      const email = await getEmailProviderAddress(
        provider,
        tokens.accessToken,
        fetcher,
      );
      let refreshToken = tokens.refreshToken;
      let scopes = tokens.scopes;
      if (!refreshToken) {
        const previous = await repository.findConnection(
          transaction.userId,
          provider,
        );
        if (previous) {
          refreshToken = decryptEmailSecret(
            previous.encryptedRefreshToken,
            `refresh:${provider}:${transaction.userId}`,
          );
          if (!scopes.length) scopes = previous.scopes;
        }
      }
      if (!refreshToken) {
        throw new Error("email_provider_refresh_token_missing");
      }

      await repository.saveConnection(
        transaction.userId,
        provider,
        email,
        encryptEmailSecret(
          refreshToken,
          `refresh:${provider}:${transaction.userId}`,
        ),
        scopes.length ? scopes : getProviderScopes(provider),
        now(),
      );
      res.redirect(callbackSettingsUrl(transaction, provider, "connected"));
    } catch (error) {
      req.log.warn(
        {
          provider,
          errorCode: safeErrorCode(error),
        },
        "Solo Studio mailbox authorisation did not complete",
      );
      if (transaction) {
        res.redirect(callbackSettingsUrl(transaction, provider, "error"));
      } else {
        res.status(400).send(
          "Mailbox authorisation could not be completed. Return to Settings and try again.",
        );
      }
    }
  };

  router.get("/email/oauth/google/callback", (req, res) =>
    finishAuthorization(req, res, "google"),
  );
  router.get("/email/oauth/microsoft/callback", (req, res) =>
    finishAuthorization(req, res, "microsoft"),
  );

  return router;
}

export default createEmailRouter();