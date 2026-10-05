import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import {
  Router,
  type IRouter,
  type Request,
  type RequestHandler,
} from "express";
import {
  GetStudioLegalProfileResponse,
  SaveStudioLegalProfileBody,
} from "@workspace/api-zod";
import { db, studioLegalProfilesTable } from "@workspace/db";

type StudioLegalProfileData = {
  registeredName: string;
  tradingName: string;
  country: string;
  registeredAddress: string;
  privacyEmail: string;
  website: string;
};

type StoredStudioLegalProfile = StudioLegalProfileData & {
  profileKey: string;
  ownerUserId: string | null;
  updatedAt: Date;
};

interface StudioLegalProfileRepository {
  find(): Promise<StoredStudioLegalProfile | undefined>;
  save(
    userId: string,
    profile: StudioLegalProfileData,
  ): Promise<StoredStudioLegalProfile | undefined>;
}

interface StudioLegalProfileRouterOptions {
  repository?: StudioLegalProfileRepository;
  resolveUserId?: (request: Request) => string | null | undefined;
}

const emptyProfile: StudioLegalProfileData = {
  registeredName: "",
  tradingName: "",
  country: "",
  registeredAddress: "",
  privacyEmail: "",
  website: "",
};

const databaseRepository: StudioLegalProfileRepository = {
  async find() {
    const [profile] = await db
      .select()
      .from(studioLegalProfilesTable)
      .where(eq(studioLegalProfilesTable.profileKey, "default"))
      .limit(1);

    return profile;
  },
  async save(userId, profile) {
    const [saved] = await db
      .insert(studioLegalProfilesTable)
      .values({ profileKey: "default", ownerUserId: userId, ...profile })
      .onConflictDoUpdate({
        target: studioLegalProfilesTable.profileKey,
        set: { ...profile, updatedAt: new Date() },
        setWhere: eq(studioLegalProfilesTable.ownerUserId, userId),
      })
      .returning();

    return saved;
  },
};

function toResponse(
  profile: StoredStudioLegalProfile | undefined,
  userId: string | null | undefined,
) {
  const data = profile ?? emptyProfile;
  return GetStudioLegalProfileResponse.parse({
    registeredName: data.registeredName,
    tradingName: data.tradingName,
    country: data.country,
    registeredAddress: data.registeredAddress,
    privacyEmail: data.privacyEmail,
    website: data.website,
    updatedAt: profile?.updatedAt.toISOString() ?? null,
    isComplete: Boolean(
      data.registeredName.trim() &&
        data.country.trim() &&
        data.privacyEmail.trim(),
    ),
    canEdit: Boolean(userId && (!profile?.ownerUserId || profile.ownerUserId === userId)),
  });
}

export function createStudioLegalProfileRouter(
  options: StudioLegalProfileRouterOptions = {},
): IRouter {
  const repository = options.repository ?? databaseRepository;
  const resolveUserId =
    options.resolveUserId ?? ((request) => getAuth(request).userId);
  const router: IRouter = Router();

  router.get(
    "/studio/legal-profile",
    async (req, res): Promise<void> => {
      res.setHeader("Cache-Control", "private, no-store");

      try {
        const profile = await repository.find();
        res.json(toResponse(profile, resolveUserId(req)));
      } catch (error) {
        req.log.error({ err: error }, "Failed to load Solo Studio legal profile");
        res.status(500).json({ error: "Unable to load company details" });
      }
    },
  );

  const requireAuth: RequestHandler = (req, res, next) => {
    const userId = resolveUserId(req);

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    res.locals.userId = userId;
    next();
  };

  router.put(
    "/studio/legal-profile",
    requireAuth,
    async (req, res): Promise<void> => {
      const parsed = SaveStudioLegalProfileBody.safeParse(req.body);
      if (!parsed.success) {
        req.log.warn(
          { errors: parsed.error.message },
          "Rejected invalid Solo Studio legal profile",
        );
        res.status(400).json({ error: "Invalid company details" });
        return;
      }

      const userId = res.locals.userId as string;
      try {
        const saved = await repository.save(userId, parsed.data);
        if (!saved) {
          res.status(403).json({
            error: "Another account manages this Remix's company details.",
          });
          return;
        }
        res.json(toResponse(saved, userId));
      } catch (error) {
        req.log.error({ err: error }, "Failed to save Solo Studio legal profile");
        res.status(500).json({ error: "Unable to save company details" });
      }
    },
  );

  return router;
}

export default createStudioLegalProfileRouter();
