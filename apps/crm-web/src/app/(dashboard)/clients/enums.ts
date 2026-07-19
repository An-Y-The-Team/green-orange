// Khách hàng — closed value sets. Values stay snake_case/lowercase to map 1:1
// onto the backend's ClientPublic schema.

export enum ClientStatus {
  ACTIVE = "active",
  LEAD = "lead",
  CHURNED = "churned",
}
