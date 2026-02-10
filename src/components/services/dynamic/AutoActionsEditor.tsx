import { AutoAction, AutoActionTrigger, AutoActionType } from '@/types/dynamicServices';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, Send, Receipt, Clock, Mail, MessageCircle
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AutoActionsEditorProps {
  actions: AutoAction[];
  onChange: (actions: AutoAction[]) => void;
}

const triggerLabels: Record<AutoActionTrigger, string> = {
  on_order_created: 'عند إنشاء الطلب',
  on_payment_received: 'عند استلام الدفع',
  on_payment_requested: 'عند طلب الدفع',
  on_order_approved: 'عند الموافقة',
  on_order_rejected: 'عند الرفض',
  on_order_completed: 'عند اكتمال الخدمة',
  on_status_change: 'عند تغيير الحالة',
};

const actionTypeLabels: Record<AutoActionType, string> = {
  send_message: 'إرسال رسالة',
  send_payment_request: 'إرسال طلب دفع',
  create_invoice: 'إنشاء فاتورة',
  send_notification: 'إرسال إشعار',
  schedule_reminder: 'جدولة تذكير',
};

const actionTypeIcons: Record<AutoActionType, React.ElementType> = {
  send_message: MessageCircle,
  send_payment_request: Receipt,
  create_invoice: Receipt,
  send_notification: Bell,
  schedule_reminder: Clock,
};

const defaultAutoActions: Partial<AutoAction>[] = [
  { trigger: 'on_order_created', type: 'send_message', enabled: false },
  { trigger: 'on_order_created', type: 'send_payment_request', enabled: false },
  { trigger: 'on_payment_received', type: 'send_notification', enabled: false },
  { trigger: 'on_payment_received', type: 'create_invoice', enabled: false },
  { trigger: 'on_order_completed', type: 'send_message', enabled: false },
  { trigger: 'on_order_rejected', type: 'send_message', enabled: false },
];

export const AutoActionsEditor = ({ actions, onChange }: AutoActionsEditorProps) => {
  // Initialize if empty
  if (actions.length === 0) {
    const initialActions = defaultAutoActions.map((da, index) => ({
      id: `auto_${da.trigger}_${da.type}_${Date.now()}_${index}`,
      trigger: da.trigger!,
      type: da.type!,
      enabled: false,
    }));
    onChange(initialActions);
    return null;
  }

  const toggleAction = (id: string) => {
    onChange(actions.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const updateActionConfig = (id: string, config: AutoAction['config']) => {
    onChange(actions.map(a => 
      a.id === id ? { ...a, config: { ...a.config, ...config } } : a
    ));
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">الإجراءات التلقائية</Label>
      <p className="text-sm text-muted-foreground">
        إجراءات ينفذها النظام تلقائياً عند أحداث معينة
      </p>

      <div className="grid gap-3">
        {actions.map(action => {
          const Icon = actionTypeIcons[action.type] || Bell;
          
          return (
            <div
              key={action.id}
              className={`p-4 rounded-xl border transition-all ${
                action.enabled 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  action.enabled ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <Icon className={`w-5 h-5 ${action.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{actionTypeLabels[action.type]}</p>
                      <p className="text-sm text-muted-foreground">
                        {triggerLabels[action.trigger]}
                      </p>
                    </div>
                    <Switch
                      checked={action.enabled}
                      onCheckedChange={() => toggleAction(action.id)}
                    />
                  </div>

                  {action.enabled && action.type === 'send_message' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Label className="text-xs">طريقة الإرسال</Label>
                      <Select
                        value={action.config?.channel || 'email'}
                        onValueChange={(value) => updateActionConfig(action.id, { channel: value as 'email' | 'whatsapp' | 'both' })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              بريد إلكتروني
                            </div>
                          </SelectItem>
                          <SelectItem value="whatsapp">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              واتساب
                            </div>
                          </SelectItem>
                          <SelectItem value="both">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4" />
                              كلاهما
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
