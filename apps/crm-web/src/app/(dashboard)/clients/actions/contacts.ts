"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import { type ContactFormValues, contactSchema } from "../schema";
import type { Contact } from "../types";

const invalid = (e: unknown): ServerActionState => ({
  success: false,
  message: INVALID_INPUT_MESSAGE,
  errors: (
    e as { flatten: () => { fieldErrors: Record<string, string[]> } }
  ).flatten().fieldErrors,
});

export async function createContact(
  clientId: number,
  _prev: ServerActionState,
  input: ContactFormValues
): Promise<ServerActionState> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const contact = await apiSend<Contact>("/contacts", "POST", {
      client_id: clientId,
      ...toBody(parsed.data),
    });
    revalidatePath(`/clients/${clientId}`);
    return {
      success: true,
      message: ACTION_MESSAGES.added(NOUNS.contact),
      data: contact,
    };
  } catch (error) {
    return errorState(error, ACTION_MESSAGES.addFailed(NOUNS.contact));
  }
}

export async function updateContact(
  id: number,
  clientId: number,
  _prev: ServerActionState,
  input: ContactFormValues
): Promise<ServerActionState> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const contact = await apiSend<Contact>(
      `/contacts/${id}`,
      "PATCH",
      toBody(parsed.data)
    );
    revalidatePath(`/clients/${clientId}`);
    return {
      success: true,
      message: ACTION_MESSAGES.updated(NOUNS.contact),
      data: contact,
    };
  } catch (error) {
    return errorState(error, ACTION_MESSAGES.updateFailed(NOUNS.contact));
  }
}

export async function deleteContact(
  id: number,
  clientId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend(`/contacts/${id}`, "DELETE");
    revalidatePath(`/clients/${clientId}`);
    return {
      success: true,
      message: ACTION_MESSAGES.deleted(NOUNS.contact),
      data: { id },
    };
  } catch (error) {
    return errorState(error, ACTION_MESSAGES.deleteFailed(NOUNS.contact));
  }
}

function errorState(error: unknown, fallback: string): ServerActionState {
  return {
    success: false,
    message: error instanceof Error ? error.message : fallback,
  };
}

// Backend @IsEmail rejects ""; send email only when non-empty.
function toBody(d: ContactFormValues) {
  const { email, ...rest } = d;
  return email ? { ...rest, email } : rest;
}
