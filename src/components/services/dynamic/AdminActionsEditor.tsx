import { AdminAction, AdminActionType, defaultAdminActions } from '@/types/dynamicServices';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Mail, MessageCircle, CheckCircle, Wrench, Package, XCircle
} from 'lucide-react';

interface AdminActionsEditorProps {
  actions: AdminAction[];
  onChange: (actions: AdminAction[]) => void;
}

const actionIcons: Record<AdminActionType, React.ElementType> = {
  send_email: Mail,
  send_whatsapp: MessageCircle,
  review_approve: CheckCircle,
  manual_execution: Wrench,
  enter_delivery_data: Package,
  close_order: XCircle,
};

const actionDescriptions: Record<AdminActionType, string> = {
  send_email: 'إرسال بريد إلكتروني للعميل من داخل النظام',
  send_whatsapp: 'إرسال رسالة واتساب للعميل',
  review_approve: 'مراجعة بيانات العميل والموافقة أو الرفض مع كتابة السبب',
  manual_execution: 'تنفيذ إجراء يدوي ثم تأكيد التنفيذ',
  enter_delivery_data: 'إدخال بيانات تسليم أو نتيجة الخدمة',
  close_order: 'إغلاق الطلب بعد الانتهاء',
};

export const AdminActionsEditor = ({ actions, onChange }: AdminActionsEditorProps) => {
  // Ensure all default actions exist
  const ensureAllActions = () => {
    const existingTypes = new Set(actions.map(a => a.type));
    const missingActions = defaultAdminActions
      .filter(da => !existingTypes.has(da.type!))
      .map((da, index) => ({
        id: `action_${da.type}_${Date.now()}`,
        type: da.type!,
        label: da.label!,
        required: false,
        order: actions.length + index,
      }));
    
    if (missingActions.length > 0) {
      onChange([...actions, ...missingActions]);
    }
  };

  // Initialize if empty
  if (actions.length === 0) {
    const initialActions = defaultAdminActions.map((da, index) => ({
      id: `action_${da.type}_${Date.now()}_${index}`,
      type: da.type!,
      label: da.label!,
      required: false,
      order: index,
    }));
    onChange(initialActions);
    return null;
  }

  const toggleAction = (actionType: AdminActionType) => {
    const existingAction = actions.find(a => a.type === actionType);
    if (existingAction) {
      onChange(actions.map(a => 
        a.type === actionType 
          ? { ...a, required: !a.required }
          : a
      ));
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">إجراءات الإدمن داخل الخدمة</Label>
      <p className="text-sm text-muted-foreground">
        حدد الإجراءات التي يجب على الإدمن تنفيذها لهذه الخدمة
      </p>

      <div className="grid gap-3">
        {actions.map(action => {
          const Icon = actionIcons[action.type] || Wrench;
          
          return (
            <div
              key={action.id}
              className={`p-4 rounded-xl border transition-all ${
                action.required 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  action.required ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <Icon className={`w-5 h-5 ${action.required ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{action.label}</p>
                    <Switch
                      checked={action.required}
                      onCheckedChange={() => toggleAction(action.type)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {actionDescriptions[action.type]}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
