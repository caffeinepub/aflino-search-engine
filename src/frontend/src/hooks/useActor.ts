import { createActorWithConfig } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { backendInterface } from "../backend.d";

export interface UseActorResult {
  actor: backendInterface | null;
  isFetching: boolean;
}

// Singleton actor — created once and reused across all hook calls
let _cachedActor: backendInterface | null = null;
let _actorPromise: Promise<backendInterface> | null = null;

async function getOrCreateActor(): Promise<backendInterface> {
  if (_cachedActor) return _cachedActor;
  if (_actorPromise) return _actorPromise;

  _actorPromise = createActorWithConfig(
    createActor as Parameters<typeof createActorWithConfig>[0],
  ).then((actor) => {
    _cachedActor = actor as unknown as backendInterface;
    return _cachedActor;
  });
  return _actorPromise;
}

export function useActor(): UseActorResult {
  const { data: actor = null, isFetching } = useQuery<backendInterface | null>({
    queryKey: ["__actor__"],
    queryFn: () => getOrCreateActor(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 3,
  });

  return { actor, isFetching };
}
