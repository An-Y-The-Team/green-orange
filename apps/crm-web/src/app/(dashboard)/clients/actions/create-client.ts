"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import { type CreateClientFormValues, createClientSchema } from "../schema";
import type { Client } from "../types";

export async function createClient(
  _prev: ServerActionState,
  input: CreateClientFormValues
): Promise<ServerActionState> {
  const parsed = createClientSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // Drop empty email — backend @IsEmail rejects "".
    const { email, ...rest } = parsed.data;
    const client = await apiSend<Client>(
      "/clients",
      "POST",
      email ? { ...rest, email } : rest
    );

    revalidatePath("/clients");

    return {
      success: true,
      message: `Đã tạo khách hàng "${client.name}".`,
      data: client,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.createFailed(NOUNS.client),
    };
  }
}
