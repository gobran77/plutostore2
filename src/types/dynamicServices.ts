// Dynamic Service Builder Types
// نظام الخدمات الديناميكية المرنة

// أنواع حقول الإدخال
export type FieldType = 
  | 'text'           // نص عادي
  | 'email'          // بريد إلكتروني
  | 'phone'          // رقم هاتف/واتساب
  | 'username'       // اسم مستخدم/حساب
  | 'amount'         // مبلغ مع عملة
  | 'country'        // اختيار دولة
  | 'city'           // اختيار مدينة
  | 'file'           // رفع ملف
  | 'image'          // رفع صورة
  | 'textarea'       // ملاحظات/نص طويل
  | 'select'         // اختيار من قائمة
  | 'number'         // رقم
  | 'date'           // تاريخ
  | 'checkbox';      // صح/خطأ

// حقل إدخال مخصص
export interface CustomField {
  id: string;
  name: string;           // اسم الحقل
  label: string;          // العنوان الظاهر
  type: FieldType;
  required: boolean;      // إجباري أم لا
  placeholder?: string;
  defaultValue?: string;
  options?: string[];     // للقوائم المنسدلة
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;     // regex
    min?: number;         // للأرقام
    max?: number;
  };
  showCondition?: {       // إظهار الحقل بشرط
    fieldId: string;
    value: string;
  };
}

// إجراءات الإدمن
export type AdminActionType = 
  | 'send_email'          // إرسال بريد
  | 'send_whatsapp'       // إرسال واتساب
  | 'review_approve'      // مراجعة وموافقة/رفض
  | 'manual_execution'    // تنفيذ يدوي
  | 'enter_delivery_data' // إدخال بيانات التسليم
  | 'close_order';        // إغلاق الطلب

export interface AdminAction {
  id: string;
  type: AdminActionType;
  label: string;
  description?: string;
  required: boolean;
  order: number;          // ترتيب العرض
}

// الإجراءات التلقائية
export type AutoActionTrigger = 
  | 'on_order_created'      // عند إنشاء الطلب
  | 'on_payment_received'   // عند استلام الدفع
  | 'on_payment_requested'  // عند طلب الدفع
  | 'on_order_approved'     // عند الموافقة
  | 'on_order_rejected'     // عند الرفض
  | 'on_order_completed'    // عند الاكتمال
  | 'on_status_change';     // عند تغيير الحالة

export type AutoActionType = 
  | 'send_message'          // إرسال رسالة
  | 'send_payment_request'  // إرسال طلب دفع
  | 'create_invoice'        // إنشاء فاتورة
  | 'send_notification'     // إرسال إشعار
  | 'schedule_reminder';    // جدولة تذكير

export interface AutoAction {
  id: string;
  trigger: AutoActionTrigger;
  type: AutoActionType;
  enabled: boolean;
  config?: {
    messageTemplateId?: string;
    delayMinutes?: number;
    channel?: 'email' | 'whatsapp' | 'both';
  };
}

// إعدادات الدفع
export type PaymentTiming = 'before' | 'after' | 'optional';
export type PaymentType = 'full' | 'partial' | 'flexible';

export interface PaymentConfig {
  required: boolean;
  timing: PaymentTiming;      // قبل/بعد التنفيذ
  type: PaymentType;          // كامل/جزئي/مرن
  methods: string[];          // طرق الدفع المتاحة
  allowProofUpload: boolean;  // رفع إثبات الدفع
  allowManualEntry: boolean;  // تسجيل يدوي
  blockWithoutPayment: boolean; // منع الاستكمال بدون دفع
  partialMinAmount?: number;
  partialMinPercent?: number;
}

// إعدادات التحويل/السحب
export type TransferType = 'local' | 'international' | 'both';

export interface TransferConfig {
  enabled: boolean;
  type: TransferType;
  requireRecipientData: boolean;
  fixedFee?: number;
  percentageFee?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  requireApproval: boolean;
}

// مراحل سير العمل
export type WorkflowStage = 
  | 'created'           // تم الإنشاء
  | 'data_entry'        // إدخال البيانات
  | 'pending_payment'   // في انتظار الدفع
  | 'payment_received'  // تم استلام الدفع
  | 'pending_review'    // في انتظار المراجعة
  | 'approved'          // تمت الموافقة
  | 'rejected'          // مرفوض
  | 'in_progress'       // قيد التنفيذ
  | 'pending_delivery'  // في انتظار التسليم
  | 'completed'         // مكتمل
  | 'cancelled';        // ملغي

export interface WorkflowStep {
  stage: WorkflowStage;
  enabled: boolean;
  order: number;
  autoProgress?: boolean; // الانتقال تلقائياً للمرحلة التالية
}

// قالب رسالة
export interface MessageTemplate {
  id: string;
  name: string;
  channel: 'email' | 'whatsapp' | 'both';
  subject?: string;       // للبريد
  body: string;           // يحتوي على {{variables}}
  variables: string[];    // المتغيرات المستخدمة
}

// تصنيف الخدمة
export interface ServiceCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

// نوع التسعير
export type PricingType = 'fixed' | 'dynamic' | 'quote';

// تعريف الخدمة الديناميكية
export interface DynamicService {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  isActive: boolean;
  
  // التسعير
  pricingType: PricingType;
  fixedPrice?: number;
  fixedCost?: number;
  currency: string;
  
  // المدة
  estimatedDuration?: number;    // بالدقائق
  estimatedDurationUnit?: 'minutes' | 'hours' | 'days';
  
  // الحقول المطلوبة من العميل
  customerFields: CustomField[];
  
  // إجراءات الإدمن
  adminActions: AdminAction[];
  
  // الإجراءات التلقائية
  autoActions: AutoAction[];
  
  // إعدادات الدفع
  paymentConfig: PaymentConfig;
  
  // إعدادات التحويل
  transferConfig?: TransferConfig;
  
  // مراحل سير العمل
  workflowSteps: WorkflowStep[];
  
  // قوالب الرسائل
  messageTemplates: MessageTemplate[];
  
  // الإعدادات العامة
  settings: {
    showInCatalog: boolean;       // إظهار للعملاء
    maxActiveOrders?: number;     // الحد الأقصى للطلبات النشطة
    allowCancellation: boolean;   // السماح بالإلغاء
    cancellationPeriod?: number;  // مدة الإلغاء بالساعات
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// طلب خدمة
export interface ServiceOrder {
  id: string;
  serviceId: string;
  serviceName: string;
  customerId?: string;
  customerName: string;
  
  // البيانات المدخلة
  fieldValues: Record<string, any>;
  
  // المبلغ
  amount: number;
  currency: string;
  cost?: number;
  
  // الحالة
  currentStage: WorkflowStage;
  stageHistory: {
    stage: WorkflowStage;
    timestamp: Date;
    userId?: string;
    note?: string;
  }[];
  
  // الدفع
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  payments: {
    id: string;
    amount: number;
    method: string;
    proof?: string;
    timestamp: Date;
  }[];
  
  // المراجعة
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  
  // التسليم
  deliveryData?: Record<string, any>;
  deliveredAt?: Date;
  
  // التعليقات
  notes: {
    id: string;
    content: string;
    userId?: string;
    timestamp: Date;
    isInternal: boolean;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

// القيم الافتراضية للحقول
export const defaultCustomerFields: Partial<CustomField>[] = [
  { name: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'example@email.com' },
  { name: 'phone', label: 'رقم الهاتف/واتساب', type: 'phone', placeholder: '+966 5xx xxx xxxx' },
  { name: 'username', label: 'اسم المستخدم/الحساب', type: 'username', placeholder: '@username' },
  { name: 'amount', label: 'المبلغ', type: 'amount' },
  { name: 'country', label: 'الدولة', type: 'country' },
  { name: 'city', label: 'المدينة', type: 'city' },
  { name: 'file', label: 'رفع ملف', type: 'file' },
  { name: 'image', label: 'رفع صورة', type: 'image' },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', placeholder: 'أضف ملاحظاتك هنا...' },
];

// الإجراءات الافتراضية للإدمن
export const defaultAdminActions: Partial<AdminAction>[] = [
  { type: 'send_email', label: 'إرسال بريد إلكتروني' },
  { type: 'send_whatsapp', label: 'إرسال رسالة واتساب' },
  { type: 'review_approve', label: 'مراجعة وموافقة/رفض' },
  { type: 'manual_execution', label: 'تنفيذ يدوي' },
  { type: 'enter_delivery_data', label: 'إدخال بيانات التسليم' },
  { type: 'close_order', label: 'إغلاق الطلب' },
];

// المتغيرات المتاحة للقوالب
export const templateVariables = [
  { key: 'customer_name', label: 'اسم العميل' },
  { key: 'customer_email', label: 'بريد العميل' },
  { key: 'order_id', label: 'رقم الطلب' },
  { key: 'service_name', label: 'اسم الخدمة' },
  { key: 'amount', label: 'المبلغ' },
  { key: 'currency', label: 'العملة' },
  { key: 'order_date', label: 'تاريخ الطلب' },
  { key: 'status', label: 'حالة الطلب' },
  { key: 'execution_date', label: 'تاريخ التنفيذ' },
];

// ترجمة مراحل سير العمل
export const workflowStageLabels: Record<WorkflowStage, string> = {
  created: 'تم الإنشاء',
  data_entry: 'إدخال البيانات',
  pending_payment: 'في انتظار الدفع',
  payment_received: 'تم استلام الدفع',
  pending_review: 'في انتظار المراجعة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
  in_progress: 'قيد التنفيذ',
  pending_delivery: 'في انتظار التسليم',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

// ألوان مراحل سير العمل
export const workflowStageColors: Record<WorkflowStage, string> = {
  created: 'bg-muted text-muted-foreground',
  data_entry: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending_payment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  payment_received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending_review: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  pending_delivery: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

// Storage keys
export const DYNAMIC_SERVICES_KEY = 'app_dynamic_services';
export const SERVICE_ORDERS_KEY = 'app_service_orders';
export const SERVICE_CATEGORIES_KEY = 'app_service_categories';
