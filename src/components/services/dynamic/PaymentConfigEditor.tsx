import { PaymentConfig, PaymentTiming, PaymentType } from '@/types/dynamicServices';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CreditCard, Clock, DollarSign, Upload, Keyboard, Ban
} from 'lucide-react';

interface PaymentConfigEditorProps {
  config: PaymentConfig;
  onChange: (config: PaymentConfig) => void;
  paymentMethods: string[];
}

const timingOptions: { value: PaymentTiming; label: string; description: string }[] = [
  { value: 'before', label: 'قبل التنفيذ', description: 'يجب الدفع قبل بدء تنفيذ الخدمة' },
  { value: 'after', label: 'بعد التنفيذ', description: 'الدفع بعد اكتمال الخدمة' },
  { value: 'optional', label: 'اختياري', description: 'العميل يختار وقت الدفع' },
];

const typeOptions: { value: PaymentType; label: string; description: string }[] = [
  { value: 'full', label: 'كامل', description: 'دفع المبلغ كاملاً' },
  { value: 'partial', label: 'جزئي', description: 'السماح بدفع جزء من المبلغ' },
  { value: 'flexible', label: 'مرن', description: 'العميل يحدد المبلغ' },
];

export const PaymentConfigEditor = ({ config, onChange, paymentMethods }: PaymentConfigEditorProps) => {
  const updateConfig = (updates: Partial<PaymentConfig>) => {
    onChange({ ...config, ...updates });
  };

  const togglePaymentMethod = (method: string) => {
    const methods = config.methods.includes(method)
      ? config.methods.filter(m => m !== method)
      : [...config.methods, method];
    updateConfig({ methods });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">إعدادات الدفع</Label>
        <div className="flex items-center gap-2">
          <Label className="text-sm">تفعيل الدفع</Label>
          <Switch
            checked={config.required}
            onCheckedChange={(required) => updateConfig({ required })}
          />
        </div>
      </div>

      {config.required && (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
          {/* Timing */}
          <div>
            <Label className="text-sm font-medium mb-2 block">توقيت الدفع</Label>
            <div className="grid grid-cols-3 gap-2">
              {timingOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateConfig({ timing: option.value })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    config.timing === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Clock className={`w-5 h-5 mx-auto mb-1 ${
                    config.timing === option.value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <Label className="text-sm font-medium mb-2 block">نوع الدفع</Label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateConfig({ type: option.value })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    config.type === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <DollarSign className={`w-5 h-5 mx-auto mb-1 ${
                    config.type === option.value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Partial Payment Options */}
          {config.type === 'partial' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">الحد الأدنى (مبلغ)</Label>
                <Input
                  type="number"
                  value={config.partialMinAmount || ''}
                  onChange={(e) => updateConfig({ partialMinAmount: parseFloat(e.target.value) || undefined })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">الحد الأدنى (%)</Label>
                <Input
                  type="number"
                  value={config.partialMinPercent || ''}
                  onChange={(e) => updateConfig({ partialMinPercent: parseFloat(e.target.value) || undefined })}
                  placeholder="0"
                  min={0}
                  max={100}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div>
            <Label className="text-sm font-medium mb-2 block">طرق الدفع المتاحة</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {paymentMethods.map(method => (
                <label
                  key={method}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    config.methods.includes(method)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Checkbox
                    checked={config.methods.includes(method)}
                    onCheckedChange={() => togglePaymentMethod(method)}
                  />
                  <span className="text-sm">{method}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3 pt-3 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={config.allowProofUpload}
                onCheckedChange={(checked) => updateConfig({ allowProofUpload: !!checked })}
              />
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">السماح برفع إثبات الدفع</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={config.allowManualEntry}
                onCheckedChange={(checked) => updateConfig({ allowManualEntry: !!checked })}
              />
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">السماح بتسجيل الدفع يدوياً</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={config.blockWithoutPayment}
                onCheckedChange={(checked) => updateConfig({ blockWithoutPayment: !!checked })}
              />
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">منع استكمال الطلب قبل تأكيد الدفع</span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
