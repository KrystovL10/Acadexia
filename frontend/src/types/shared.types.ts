export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AuditLogDto {
  id: number;
  action: string;
  userId: number | null;
  userRole: string | null;
  entityType: string | null;
  entityId: number | null;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
}
