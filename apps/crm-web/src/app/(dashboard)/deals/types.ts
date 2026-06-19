// Deal — domain types.
import type { DealStage } from "./enums";

export interface Deal {
  id: number;
  title: string;
  company: string;
  stage: DealStage;
  amount: number;
  close_date: string;
}
