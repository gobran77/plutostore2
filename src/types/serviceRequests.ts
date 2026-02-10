export type ServiceRequestStatus = 
  | 'pending'     // معلق - في انتظار المراجعة
  | 'processing'  // جاري المعالجة
  | 'approved'    // تم القبول
  | 'rejected'    // مرفوض
  | 'activated'   // تم التفعيل
  | 'failed';     // فشل

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  pending: 'معلق',
  processing: 'جاري المعالجة',
  approved: 'مقبول',
  rejected: 'مرفوض',
  activated: 'تم التفعيل',
  failed: 'فشل',
};

export const SERVICE_REQUEST_STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  pending: 'warning',
  processing: 'info',
  approved: 'success',
  rejected: 'destructive',
  activated: 'primary',
  failed: 'destructive',
};
