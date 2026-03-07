/// <reference types="vite/client" />

import type { AgentAction } from "./runtime/input/AgentAction";

declare global {
  interface Window {
    agent_observe?: () => string;
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
    agent_apply_action?: (action: AgentAction) => void;
    __debug_emit_combat_feedback?: (payload: {
      isHeadshot?: boolean;
      didKill?: boolean;
      damage?: number;
      enemyName?: string;
    }) => void;
    __vt_pending?: unknown;
  }
}

export {};
