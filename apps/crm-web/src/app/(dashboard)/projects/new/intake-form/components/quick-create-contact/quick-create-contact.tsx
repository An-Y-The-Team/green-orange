"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";
import { FormLabel } from "@yan/ui/components/form";
import { Input } from "@yan/ui/components/input";

import { ACTIONS, FIELDS, PLACEHOLDERS } from "@/constants/labels";
import {
  ACTION_MESSAGES,
  INITIAL_ACTION_STATE,
  NOUNS,
} from "@/constants/server-action";

import { createContact } from "../../../../../clients/actions/contacts";
import type { Contact } from "../../../../../clients/types";
import { InsetPanel } from "../inset-panel/inset-panel";
import { toContact } from "../quick-create-client/quick-create-client";

/**
 * Inline "tạo nhanh người liên hệ" block for an already-selected client — a new
 * contact person on a repeat job. Creates the contact and reports it back so
 * the intake form can append + pre-select it.
 */
export function QuickCreateContact({
  clientId,
  onCreated,
}: {
  clientId: number;
  onCreated: (contact: Contact) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    try {
      const res = await createContact(clientId, INITIAL_ACTION_STATE, {
        name: name.trim(),
        phone: phone.trim(),
        email: "",
        title: "",
      });
      const contact = res.success ? toContact(res.data, clientId) : null;
      if (!contact) {
        toast.error("Lỗi", {
          description: res.message ?? ACTION_MESSAGES.addFailed(NOUNS.contact),
        });
        return;
      }
      onCreated(contact);
    } finally {
      setPending(false);
    }
  };

  return (
    <InsetPanel>
      <div className="space-y-1">
        <FormLabel>{FIELDS.contactPerson}</FormLabel>
        <Input
          placeholder={PLACEHOLDERS.personName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <FormLabel>Số điện thoại liên hệ</FormLabel>
        <Input
          placeholder="0901234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={pending || !name.trim()}
          onClick={() => void save()}
        >
          {pending ? ACTIONS.adding : "Thêm người liên hệ"}
        </Button>
      </div>
    </InsetPanel>
  );
}
