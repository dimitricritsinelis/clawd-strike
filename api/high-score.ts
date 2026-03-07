import { handleSharedChampionRequest } from "../server/highScoreApi.js";
import {
  createPostgresSharedChampionStore,
  hasConfiguredSharedChampionDatabase,
} from "../server/highScoreStore.js";

const sharedChampionStore = hasConfiguredSharedChampionDatabase()
  ? createPostgresSharedChampionStore()
  : null;

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleSharedChampionRequest(request, sharedChampionStore);
}

export async function POST(request: Request): Promise<Response> {
  return handleSharedChampionRequest(request, sharedChampionStore);
}
