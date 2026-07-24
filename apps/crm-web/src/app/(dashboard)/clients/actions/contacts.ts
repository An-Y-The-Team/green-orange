"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { contacts } from "@/data/mock/contacts";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { type ContactFormValues, contactSchema } from "../schema";
import type { Contact } from "../types";

const invalid = (e: unknown): ServerActionState => ({
  success: false,
  message: "Vui lòng kiểm tra lại thông tin đã nhập.",
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
    let contact: Contact;
    if (API_URL) {
      contact = await apiSend<Contact>("/contacts", "POST", {
        client_id: clientId,
        ...toBody(parsed.data),
      });
    } else {
      contact = {
        id: nextId(contacts),
        client_id: clientId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        title: parsed.data.title || null,
        note: null,
      };
    }
    revalidatePath(`/clients/${clientId}`);
    return { success: true, message: "Đã thêm liên hệ.", data: contact };
  } catch (error) {
    return errorState(error, "Không thể thêm liên hệ.");
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
    let contact: Contact;
    if (API_URL) {
      contact = await apiSend<Contact>(
        `/contacts/${id}`,
        "PATCH",
        toBody(parsed.data)
      );
    } else {
      const found = contacts.find((c) => c.id === id);
      contact = {
        id,
        client_id: clientId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        title: parsed.data.title || null,
        note: found?.note ?? null,
      };
    }
    revalidatePath(`/clients/${clientId}`);
    return { success: true, message: "Đã cập nhật liên hệ.", data: contact };
  } catch (error) {
    return errorState(error, "Không thể cập nhật liên hệ.");
  }
}

export async function deleteContact(
  id: number,
  clientId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    if (API_URL) await apiSend(`/contacts/${id}`, "DELETE");
    revalidatePath(`/clients/${clientId}`);
    return { success: true, message: "Đã xóa liên hệ.", data: { id } };
  } catch (error) {
    return errorState(error, "Không thể xóa liên hệ.");
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
