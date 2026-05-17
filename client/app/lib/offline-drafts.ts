/**
 * @fileoverview IndexedDB-backed storage for offline calibration drafts.
 *
 * Each draft is keyed by a `localId` of the form `local-<uuid>`. Once the
 * draft is synced to the server, `serverId` is populated with the Mongo
 * `_id`. The draft remains keyed by `localId` so the editor URL stays stable
 * across the sync transition — a separate redirect map (see `useLocalIdRedirect`
 * in `useSyncQueue.ts`) handles the `/calibration/local-* → /calibration/<_id>`
 * navigation after sync.
 *
 * Why a dedicated IDB store (not idb-keyval's default): we want the drafts
 * isolated from the React-Query persisted cache so we can clear one without
 * the other.
 */

import { createStore, get, set, del, keys, values, update } from "idb-keyval";

export const LOCAL_ID_PREFIX = "local-";

export type OfflineDraft = {
  /** Stable client-generated ID. Always `local-<uuid>`. Primary key. */
  localId:       string;
  /** Server-assigned Mongo `_id`, populated after first successful POST sync. */
  serverId:      string | null;
  /** Full payload to POST (if isNew) or PUT to /calibration-report/:id. */
  payload:       unknown;
  /** True if local changes have not yet been pushed to the server. */
  dirty:         boolean;
  /** True until the first successful POST sync. After that, subsequent saves PUT instead. */
  isNew:         boolean;
  /** ISO timestamp of last local write. */
  lastModified:  string;
  /** ISO timestamp of last successful server sync, or null. */
  lastSyncedAt:  string | null;
  /** Last error returned by the server when sync was attempted. Cleared on success. */
  lastSyncError?: string | null;
};

const draftsStore = createStore("josts-offline-v1", "drafts");

/** Generate a new local ID. Prefers `crypto.randomUUID()` and falls back to a timestamp+rand. */
export function newLocalId(): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${LOCAL_ID_PREFIX}${uuid}`;
}

/** True if the given id was generated locally (not a real server _id). */
export function isLocalId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(LOCAL_ID_PREFIX);
}

/** Insert or replace a draft. */
export async function putDraft(draft: OfflineDraft): Promise<void> {
  await set(draft.localId, draft, draftsStore);
}

/** Read a draft by localId. */
export async function getDraft(localId: string): Promise<OfflineDraft | undefined> {
  return (await get(localId, draftsStore)) as OfflineDraft | undefined;
}

/** Read a draft by serverId. Linear scan — drafts are few (tens), not thousands. */
export async function getDraftByServerId(serverId: string): Promise<OfflineDraft | undefined> {
  const all = (await values(draftsStore)) as OfflineDraft[];
  return all.find((d) => d.serverId === serverId);
}

/** List all drafts (newest first). */
export async function listDrafts(): Promise<OfflineDraft[]> {
  const all = (await values(draftsStore)) as OfflineDraft[];
  return all.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

/** List drafts that still need to be pushed to the server. */
export async function listDirtyDrafts(): Promise<OfflineDraft[]> {
  const all = await listDrafts();
  return all.filter((d) => d.dirty);
}

/** Delete a draft by localId. */
export async function deleteDraft(localId: string): Promise<void> {
  await del(localId, draftsStore);
}

/** All localIds currently in the store. */
export async function listLocalIds(): Promise<string[]> {
  return (await keys(draftsStore)) as string[];
}

/** Create a fresh draft for offline-first creation. */
export async function createLocalDraft(payload: unknown): Promise<OfflineDraft> {
  const draft: OfflineDraft = {
    localId:       newLocalId(),
    serverId:      null,
    payload,
    dirty:         true,
    isNew:         true,
    lastModified:  new Date().toISOString(),
    lastSyncedAt:  null,
  };
  await putDraft(draft);
  return draft;
}

/** Patch the payload of an existing draft and mark it dirty. */
export async function updateLocalDraft(localId: string, payload: unknown): Promise<void> {
  await update(
    localId,
    (existing) => {
      if (!existing) {
        // First write for this localId — caller should have used createLocalDraft, but be lenient.
        return {
          localId,
          serverId:     null,
          payload,
          dirty:        true,
          isNew:        true,
          lastModified: new Date().toISOString(),
          lastSyncedAt: null,
        } satisfies OfflineDraft;
      }
      const e = existing as OfflineDraft;
      return {
        ...e,
        payload,
        dirty:        true,
        lastModified: new Date().toISOString(),
      } satisfies OfflineDraft;
    },
    draftsStore,
  );
}

/** Mark a draft as successfully synced. Pass the server-assigned `_id` if this was a POST. */
export async function markDraftSynced(localId: string, serverId?: string): Promise<void> {
  await update(
    localId,
    (existing) => {
      if (!existing) return existing;
      const e = existing as OfflineDraft;
      return {
        ...e,
        serverId:      serverId ?? e.serverId,
        isNew:         false,
        dirty:         false,
        lastSyncedAt:  new Date().toISOString(),
        lastSyncError: null,
      } satisfies OfflineDraft;
    },
    draftsStore,
  );
}

/** Record a sync failure on a draft (keeps it dirty so it'll be retried). */
export async function markDraftFailed(localId: string, error: string): Promise<void> {
  await update(
    localId,
    (existing) => {
      if (!existing) return existing;
      const e = existing as OfflineDraft;
      return { ...e, lastSyncError: error } satisfies OfflineDraft;
    },
    draftsStore,
  );
}
