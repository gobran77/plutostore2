import { TransferConfig, TransferType } from '@/types/dynamicServices';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Globe, MapPin, ArrowLeftRight, DollarSign, Percent, 
  Calendar, CheckCircle, User
} from 'lucide-react';

interface TransferConfigEditorProps {
  config: TransferConfig;
  onChange: (config: TransferConfig) => void;
}

const transferTypes: { value: TransferType; label: string; icon: React.ElementType }[] = [
  { value: 'local', label: 'محلي', icon: MapPin },
  { value: 'international', label: 'دولي', icon: Globe },
  { value: 'both', label: 'كلاهما', icon: ArrowLeftRight },
];

export const TransferConfigEditor = ({ config, onChange }: TransferConfigEditorProps) => {
  const updateConfig = (updates: Partial<TransferConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">إعدادات التحويل/السحب</Label>
        <div className="flex items-center gap-2">
          <Label className="text-sm">تفعيل</Label>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </div>

      {config.enabled && (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
          {/* Transfer Type */}
          <div>
            <Label className="text-sm font-medium mb-2 block">نوع التحويل</Label>
            <div className="grid grid-cols-3 gap-2">
              {transferTypes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateConfig({ type: value })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    config.type === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${
                    config.type === value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <p className="font-medium text-sm">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Fees */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                رسوم ثابتة
              </Label>
              <Input
                type="number"
                value={config.fixedFee || ''}
                onChange={(e) => updateConfig({ fixedFee: parseFloat(e.target.value) || undefined })}
                placeholder="0"
                min={0}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Percent className="w-3 h-3" />
                نسبة مئوية
              </Label>
              <Input
                type="number"
                value={config.percentageFee || ''}
                onChange={(e) => updateConfig({ percentageFee: parseFloat(e.target.value) || undefined })}
                placeholder="0"
                min={0}
                max={100}
                step={0.1}
                className="mt-1"
              />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                الحد اليومي
              </Label>
              <Input
                type="number"
                value={config.dailyLimit || ''}
                onChange={(e) => updateConfig({ dailyLimit: parseFloat(e.target.value) || undefined })}
                placeholder="بدون حد"
                min={0}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                الحد الشهري
              </Label>
              <Input
                type="number"
                value={config.monthlyLimit || ''}
                onChange={(e) => updateConfig({ monthlyLimit: parseFloat(e.target.value) || undefined })}
                placeholder="بدون حد"
                min={0}
                className="mt-1"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-3 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={config.requireRecipientData}
                onCheckedChange={(checked) => updateConfig({ requireRecipientData: !!checked })}
              />
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">طلب بيانات المستلم</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={config.requireApproval}
                onCheckedChange={(checked) => updateConfig({ requireApproval: !!checked })}
              />
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">اشتراط موافقة الإدمن قبل التنفيذ</span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
