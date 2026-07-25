/// <reference types="vite/client" />

import type { AgentAction } from "./runtime/input/AgentAction";
import type { BuffType } from "./runtime/buffs/BuffTypes";
import type { QaCaptureState } from "./runtime/qa/assetReadiness";

declare global {
  interface Window {
    agent_observe?: () => string;
    render_game_to_text?: () => string;
    __runtime_ready_state?: () => {
      mapLoaded: boolean;
      revealPhase: string;
      shotActive: boolean;
      shotId: string | null;
      qaCaptureReady: boolean;
      qaAssetPlanHash: string | null;
    };
    __debug_scene_perf?: () => unknown;
    __debug_render_perf?: () => unknown;
    __qa_performance_state?: () => unknown;
    __qa_capture_state?: () => QaCaptureState;
    __qa_render_frame?: () => void;
    __qa_route_state?: () => {
      gameplay: { alive: boolean };
      player: {
        pos: { x: number; y: number; z: number };
        withinPlayableBounds: boolean;
        zoneId: string | null;
        collision: { hitX: boolean; hitY: boolean; hitZ: boolean; grounded: boolean };
      };
    };
    __qa_heartbeat?: () => {
      timestamp: number;
      frameCounter: number;
      runtimePhase: string;
      mainLoopAdvancing: boolean;
      lastFrameAt: number | null;
      lastStateSerializationAt: number | null;
      stateSerializationInProgress: boolean;
      disposed: boolean;
      frozen: boolean;
    };
    __qa_visual_geometry_state?: () => {
      schemaVersion: number;
      generatedAt: number;
      placements: Array<{
        placementId: string;
        moduleId?: string;
        semanticClass: string;
        representation: string;
        groundingGapM: number;
        supportPlacementId?: string;
        backingPlacementId?: string;
        structurallyBacked?: boolean;
        bounds: {
          min: { x: number; y: number; z: number };
          max: { x: number; y: number; z: number };
        };
      }>;
    };
    __qa_framing_state?: () => {
      revealPhase: string;
      camera: {
        fovDeg: number;
        aspect: number;
      };
      landmarks: unknown;
      revealing: {
        camera: {
          fovDeg: number;
          aspect: number;
        };
        landmarks: unknown;
      } | null;
    };
    advanceTime?: (ms: number) => Promise<void>;
    agent_apply_action?: (action: AgentAction) => void;
    __debug_emit_combat_feedback?: (payload: {
      isHeadshot?: boolean;
      didKill?: boolean;
      damage?: number;
      enemyName?: string;
    }) => void;
    __debug_trigger_hit_vignette?: (damage?: number) => void;
    __debug_eliminate_all_bots?: () => number;
    __debug_set_buff_orbs?: (payload: {
      count?: number;
    }) => number;
    __debug_set_buff_vignette?: (payload: {
      action?: "activate" | "deactivate" | "clear";
      type?: BuffType | "rallying_cry";
      exclusive?: boolean;
    }) => {
      buffs: BuffType[];
      rallyingCryActive: boolean;
      visual: {
        dominantBuff: BuffType | null;
        colorRgb: string | null;
        activeBuffCount: number;
        visibility: number;
        baseOpacity: number;
        pulseOpacity: number;
        flashOpacity: number;
      };
    };
    __debug_set_player_pose?: (payload: {
      x: number;
      y: number;
      z: number;
      yawDeg?: number;
    }) => void;
    __debug_pick_scene?: (payload: {
      xPx: number;
      yPx: number;
    }) => unknown[];
    __debug_reset_bot_knowledge?: () => void;
    __debug_suppress_bot_intel_ms?: (durationMs: number) => void;
    __vt_pending?: unknown;
  }
}

export {};
