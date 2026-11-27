export type Relation = "owner" | "editor" | "viewer" | "member" | "parent";

export interface RebacTuple {
  user: string;
  relation: Relation;
  object: string;
}

/**
 * Zanzibar / OpenFGA-inspired Relationship-Based Access Control (ReBAC) engine.
 * Supports:
 *   - Direct ownership (owner implies editor & viewer)
 *   - Group membership (user#member@group -> group#viewer@folder/doc)
 *   - Folder parent inheritance (folder#parent@doc)
 *   - SCIM de-provisioning (removeUser)
 */
export class RebacEngine {
  private readonly tuples: RebacTuple[] = [];

  addTuple(user: string, relation: Relation, object: string): void {
    const exists = this.tuples.some(
      (t) => t.user === user && t.relation === relation && t.object === object,
    );
    if (!exists) {
      this.tuples.push({ user, relation, object });
    }
  }

  /**
   * Simulates SCIM user offboarding: removes all direct & group tuples for user.
   */
  removeUser(user: string): void {
    for (let i = this.tuples.length - 1; i >= 0; i -= 1) {
      if (this.tuples[i].user === user) {
        this.tuples.splice(i, 1);
      }
    }
  }

  check(
    user: string,
    relation: "owner" | "editor" | "viewer",
    object: string,
    visited = new Set<string>(),
  ): boolean {
    const visitKey = `${user}#${relation}@${object}`;
    if (visited.has(visitKey)) {
      return false;
    }
    visited.add(visitKey);

    const impliedRelations: Relation[] =
      relation === "viewer"
        ? ["viewer", "editor", "owner"]
        : relation === "editor"
          ? ["editor", "owner"]
          : ["owner"];

    // 1. Direct tuple check
    if (
      this.tuples.some(
        (t) =>
          t.user === user &&
          t.object === object &&
          impliedRelations.includes(t.relation),
      )
    ) {
      return true;
    }

    // 2. Group membership check (user#member@group -> check(group, relation, object))
    const groups = this.tuples
      .filter((t) => t.user === user && t.relation === "member")
      .map((t) => t.object);

    for (const group of groups) {
      if (this.check(group, relation, object, visited)) {
        return true;
      }
    }

    // 3. Parent folder inheritance (folder#parent@object -> check(user, relation, folder))
    const parents = this.tuples
      .filter((t) => t.relation === "parent" && t.object === object)
      .map((t) => t.user);

    for (const parentFolder of parents) {
      if (this.check(user, relation, parentFolder, visited)) {
        return true;
      }
    }

    return false;
  }
}

