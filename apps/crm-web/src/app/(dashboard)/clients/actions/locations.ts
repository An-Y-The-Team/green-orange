"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import { type LocationFormValues, locationSchema } from "../schema";
import type { Location } from "../types";

const invalid = (e: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}): ServerActionState => ({
  success: false,
  message: INVALID_INPUT_MESSAGE,
  errors: e.flatten().fieldErrors,
});

const errorState = (error: unknown, fallback: string): ServerActionState => ({
  success: false,
  message: error instanceof Error ? error.message : fallback,
});

export async function createLocation(
  clientId: number,
  _prev: ServerActionState,
  input: LocationFormValues
): Promise<ServerActionState> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const location = await apiSend<Location>("/locations", "POST", {
      client_id: clientId,
      ...parsed.data,
    });
    revalidatePath(`/clients/${clientId}`);
    return {
      success: true,
      message: ACTION_MESSAGES.added(NOUNS.location),
      data: location,
    };
  } catch (error) {
    return errorState(error, ACTION_MESSAGES.addFailed(NOUNS.location));
  }
}

export async function updateLocation(
  id: number,
  clientId: number,
  _prev: ServerActionState,
  input: LocationFormValues
): Promise<ServerActionState> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const location = await apiSend<Location>(
      `/locations/${id}`,
      "PATCH",
      parsed.data
    );
    revalidatePath(`/clients/${clientId}`);
    return {
      success: true,
      message: ACTION_MESSAGES.updated(NOUNS.location),
      data: location,
    };
  } catch (error) {
    return errorState(error, ACTION_MESSAGES.updateFailed(NOUNS.location));
  }
}

export async function deleteLocation(
  id: number,
  clientId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend(`/locations/${id}`, "DELETE");
    revalidatePath(`/clients/${clientId}`);
    return {
      success: true,
      message: ACTION_MESSAGES.deleted(NOUNS.location),
      data: { id },
    };
  } catch (error) {
    return errorState(error, ACTION_MESSAGES.deleteFailed(NOUNS.location));
  }
}
