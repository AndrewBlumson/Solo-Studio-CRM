import { getAuth } from "@clerk/express";
import { and, eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type RequestHandler } from "express";
import {
  GetStudioWorkspaceResponse,
  SaveStudioWorkspaceBody,
  SaveStudioWorkspaceResponse,
} from "@workspace/api-zod";
import { db, studioWorkspacesTable } from "@workspace/db";

type WorkspaceState = Record<string, unknown>;
type WorkspaceRow = { state: WorkspaceState; version: number };
type WorkspaceSaveResult = { saved?: WorkspaceRow; current?: WorkspaceRow };

interface StudioWorkspaceRepository {
  findByUserId(userId: string): Promise<WorkspaceRow | undefined>;
  saveForUser(
    userId: string,
    state: WorkspaceState,
    expectedVersion: number | null,
  ): Promise<WorkspaceSaveResult>;
}

interface StudioWorkspaceRouterOptions {
  repository?: StudioWorkspaceRepository;
  resolveUserId?: (request: Request) => string | null | undefined;
}

const databaseRepository: StudioWorkspaceRepository = {
  async findByUserId(userId) {
    const [workspace] = await db
      .select({
        state: studioWorkspacesTable.state,
        version: studioWorkspacesTable.version,
      })
      .from(studioWorkspacesTable)
      .where(eq(studioWorkspacesTable.userId, userId))
      .limit(1);

    return workspace;
  },
  async saveForUser(userId, state, expectedVersion) {
    const returning = {
      state: studioWorkspacesTable.state,
      version: studioWorkspacesTable.version,
    };
    let saved: WorkspaceRow | undefined;

    if (expectedVersion === null) {
      [saved] = await db
        .insert(studioWorkspacesTable)
        .values({ userId, state, version: 1, updatedAt: new Date() })
        .onConflictDoNothing({ target: studioWorkspacesTable.userId })
        .returning(returning);
    } else {
      [saved] = await db
        .update(studioWorkspacesTable)
        .set({
          state,
          version: sql`${studioWorkspacesTable.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(studioWorkspacesTable.userId, userId),
            eq(studioWorkspacesTable.version, expectedVersion),
          ),
        )
        .returning(returning);
    }

    if (saved) return { saved };
    return { current: await this.findByUserId(userId) };
  },
};

export function createStudioWorkspaceRouter(
  options: StudioWorkspaceRouterOptions = {},
): IRouter {
  const repository = options.repository ?? databaseRepository;
  const resolveUserId = options.resolveUserId ?? ((request) => getAuth(request).userId);
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

  router.get(
    "/studio/workspace",
    requireAuth,
    async (req, res): Promise<void> => {
      const userId = res.locals.userId as string;

      try {
        const workspace = await repository.findByUserId(userId);

        if (!workspace) {
          res.status(404).json({ error: "Workspace not found" });
          return;
        }

        res.json(GetStudioWorkspaceResponse.parse(workspace));
      } catch (error) {
        req.log.error({ err: error }, "Failed to load Solo Studio workspace");
        res.status(500).json({ error: "Unable to load workspace" });
      }
    },
  );

  router.put(
    "/studio/workspace",
    requireAuth,
    async (req, res): Promise<void> => {
      const userId = res.locals.userId as string;
      const parsedBody = SaveStudioWorkspaceBody.safeParse(req.body);

      if (!parsedBody.success) {
        req.log.warn(
          { errors: parsedBody.error.message },
          "Rejected invalid Solo Studio workspace data",
        );
        res.status(400).json({ error: "Invalid workspace data" });
        return;
      }

      try {
        const result = await repository.saveForUser(
          userId,
          parsedBody.data.state,
          parsedBody.data.expectedVersion,
        );

        if (result.current) {
          res.status(409).json({
            error: "This workspace changed in another tab.",
            current: SaveStudioWorkspaceResponse.parse(result.current),
          });
          return;
        }

        if (!result.saved) {
          res.status(500).json({ error: "Unable to save workspace" });
          return;
        }

        res.json(SaveStudioWorkspaceResponse.parse(result.saved));
      } catch (error) {
        req.log.error({ err: error }, "Failed to save Solo Studio workspace");
        res.status(500).json({ error: "Unable to save workspace" });
      }
    },
  );

  return router;
}

export default createStudioWorkspaceRouter();