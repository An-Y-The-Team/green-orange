import { ClientType } from "../../../clients/enums";
import type { QuickClientFormValues } from "../../schema";

export const DEFAULT_QUICK_CLIENT_VALUES: QuickClientFormValues = {
  name: "",
  type: ClientType.COMPANY,
  address: "",
  contact_name: "",
  contact_phone: "",
  location_name: "",
  location_address: "",
};
