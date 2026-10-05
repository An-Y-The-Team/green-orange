/**
 * Button props for an action inside a gate row. The next row's action is the
 * stage's single primary — solid green, default size, so it reads as "press
 * this" without hunting; every other row's action is a small outline button
 * (crm-ui-redesign.md, "Buttons vs badges").
 */
export function gateButtonProps(primary: boolean) {
  return primary
    ? ({ variant: "default", size: "default" } as const)
    : ({ variant: "outline", size: "sm" } as const);
}
