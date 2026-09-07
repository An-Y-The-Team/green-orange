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

import { createLocation } from "../../../../../clients/actions/locations";
import type { Location } from "../../../../../clients/types";
import { InsetPanel } from "../inset-panel/inset-panel";
import { toLocation } from "../quick-create-client/quick-create-client";

/**
 * Inline "tạo nhanh địa điểm" block for an already-selected client — repeat
 * business at a new site. Creates the location and reports it back so the
 * intake form can append + pre-select it.
 */
export function QuickCreateLocation({
  clientId,
  onCreated,
}: {
  clientId: number;
  onCreated: (location: Location) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    try {
      const res = await createLocation(clientId, INITIAL_ACTION_STATE, {
        name: name.trim(),
        address: address.trim(),
      });
      const location = res.success ? toLocation(res.data, clientId) : null;
      if (!location) {
        toast.error("Lỗi", {
          description: res.message ?? ACTION_MESSAGES.addFailed(NOUNS.location),
        });
        return;
      }
      onCreated(location);
    } finally {
      setPending(false);
    }
  };

  return (
    <InsetPanel>
      <div className="space-y-1">
        <FormLabel>Tên địa điểm/Toà nhà</FormLabel>
        <Input
          placeholder="Chi nhánh Quận 7"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <FormLabel>{FIELDS.location}</FormLabel>
        <Input
          placeholder={PLACEHOLDERS.address}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={pending || !name.trim() || !address.trim()}
          onClick={() => void save()}
        >
          {pending ? ACTIONS.adding : "Thêm địa điểm thi công"}
        </Button>
      </div>
    </InsetPanel>
  );
}
