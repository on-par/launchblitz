import { describe, expect, it } from "vitest";
import {
  INITIAL_BUILD_STAGE,
  INITIAL_BUILD_STATUS,
  InMemoryBuildsRepository,
} from "./repository";

describe("InMemoryBuildsRepository", () => {
  it("creates a build tied to the user with initial status and stage", async () => {
    const repo = new InMemoryBuildsRepository();
    const build = await repo.create({
      userId: "user-a",
      seedIdea: "A hot sauce subscription box",
    });

    expect(build.id).toBeTruthy();
    expect(build.userId).toBe("user-a");
    expect(build.status).toBe(INITIAL_BUILD_STATUS);
    expect(build.currentStage).toBe(INITIAL_BUILD_STAGE);
    expect(build.seedIdea).toBe("A hot sauce subscription box");
  });

  it("returns a build to its owner", async () => {
    const repo = new InMemoryBuildsRepository();
    const build = await repo.create({ userId: "user-a", seedIdea: "idea one for testing" });

    const fetched = await repo.getByIdForUser(build.id, "user-a");
    expect(fetched?.id).toBe(build.id);
  });

  it("does not return a build to a different user (ownership)", async () => {
    const repo = new InMemoryBuildsRepository();
    const build = await repo.create({ userId: "user-a", seedIdea: "idea one for testing" });

    const fetched = await repo.getByIdForUser(build.id, "user-b");
    expect(fetched).toBeNull();
  });

  it("lists only the requesting user's builds", async () => {
    const repo = new InMemoryBuildsRepository();
    await repo.create({ userId: "user-a", seedIdea: "idea a-one here" });
    await repo.create({ userId: "user-b", seedIdea: "idea b-one here" });
    await repo.create({ userId: "user-a", seedIdea: "idea a-two here" });

    const forA = await repo.listByUser("user-a");
    expect(forA).toHaveLength(2);
    expect(forA.every((build) => build.userId === "user-a")).toBe(true);
  });
});
