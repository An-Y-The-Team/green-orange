"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { locations } from "@/data/mock/locations";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { type LocationFormValues, locationSchema } from "../schema";
import type { Location } from "../types";

const invalid = (e: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}): ServerActionState => ({
  success: false,
  message: "Vui lòng kiểm tra lại thông tin đã nhập.",
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
    let location: Location;
    if (API_URL) {
      location = await apiSend<Location>("/locations", "POST", {
        client_id: clientId,
        ...parsed.data,
      });
    } else {
      location = {
        id: nextId(locations),
        client_id: clientId,
        name: parsed.data.name,
        address: parsed.data.address,
        manager_contact_id: parsed.data.manager_contact_id ?? null,
      };
    }
    revalidatePath(`/clients/${clientId}`);
    return { success: true, message: "Đã thêm địa điểm.", data: location };
  } catch (error) {
    return errorState(error, "Không thể thêm địa điểm.");
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
    let location: Location;
    if (API_URL) {
      location = await apiSend<Location>(
        `/locations/${id}`,
        "PATCH",
        parsed.data
      );
    } else {
      location = {
        id,
        client_id: clientId,
        name: parsed.data.name,
        address: parsed.data.address,
        manager_contact_id: parsed.data.manager_contact_id ?? null,
      };
    }
    revalidatePath(`/clients/${clientId}`);
    return { success: true, message: "Đã cập nhật địa điểm.", data: location };
  } catch (error) {
    return errorState(error, "Không thể cập nhật địa điểm.");
  }
}

export async function deleteLocation(
  id: number,
  clientId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    if (API_URL) await apiSend(`/locations/${id}`, "DELETE");
    revalidatePath(`/clients/${clientId}`);
    return { success: true, message: "Đã xóa địa điểm.", data: { id } };
  } catch (error) {
    return errorState(error, "Không thể xóa địa điểm.");
  }
}
