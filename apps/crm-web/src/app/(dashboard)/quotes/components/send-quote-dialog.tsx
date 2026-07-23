"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { quoteChannel } from "@/lib/labels";

import { sendQuote } from "../actions/send-quote";
import { QuoteChannel } from "../enums";

const CHANNELS = [QuoteChannel.ZALO, QuoteChannel.EMAIL, QuoteChannel.PRINT];

/**
 * Gửi báo giá — tiny confirm. Channel multi-select (one QuoteSendLog per
 * channel), who sent, optional follow-up reference. Reused by the stage-3
 * panel and the "Lưu & gửi ngay" builder flow.
 */
export function SendQuoteDialog({
  quoteId,
  open,
  onOpenChange,
  onSent,
}: {
  quoteId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}) {
  const [channels, setChannels] = useState<QuoteChannel[]>([QuoteChannel.ZALO]);
  const [sentBy, setSentBy] = useState("Thư ký");
  const [followUpRef, setFollowUpRef] = useState("");

  const [state, formAction] = useActionState(sendQuote.bind(null, quoteId), {
    success: false,
  } as ServerActionState);
  const [isPending, startTransition] = useTransition();

  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => {
      onOpenChange(false);
      onSent?.();
    },
  });

  const toggle = (c: QuoteChannel) =>
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const submit = () =>
    startTransition(() =>
      formAction({
        channels,
        sent_by: sentBy.trim(),
        follow_up_ref: followUpRef.trim() || undefined,
      })
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gửi báo giá</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Kênh gửi</Label>
            <div className="flex flex-wrap gap-3">
              {CHANNELS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={channels.includes(c)}
                    onChange={() => toggle(c)}
                  />
                  {quoteChannel[c]}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sent_by">Người gửi</Label>
            <Input
              id="sent_by"
              value={sentBy}
              onChange={(e) => setSentBy(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="follow_up_ref">
              Tham chiếu theo dõi (tùy chọn)
            </Label>
            <Input
              id="follow_up_ref"
              placeholder="Zalo chị Lan (BQL)"
              value={followUpRef}
              onChange={(e) => setFollowUpRef(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || channels.length === 0 || !sentBy.trim()}
          >
            {isPending ? "Đang gửi…" : "Gửi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
