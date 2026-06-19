// Khách hàng — closed value sets. Values stay snake_case/lowercase to map 1:1
// onto the backend's CustomerPublic schema.

export enum CustomerStatus {
  ACTIVE = "active",
  LEAD = "lead",
  CHURNED = "churned",
}
