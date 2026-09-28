import { handleSharedChampionStatsDailyRequest } from "../../../server/highScoreAdminApi.js";
import {
  createPostgresSharedChampionStore,
  hasConfiguredSharedChampionDatabase,
} from "../../../server/highScoreStoreImpl.js";

const sharedChampionStore = hasConfiguredSharedChampionDatabase("write")
  && hasConfiguredSharedChampionDatabase("read")
  ? createPostgresSharedChampionStore()
  : null;

export async function GET(request: Request): Promise<Response> {
  return handleSharedChampionStatsDailyRequest(request, sharedChampionStore);
}
