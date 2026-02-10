import { useState, useEffect } from 'react';
import { X, Save, Loader2, Zap, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerFieldEditor } from './CustomerFieldEditor';
import { AdminActionsEditor } from './AdminActionsEditor';
import { AutoActionsEditor } from './AutoActionsEditor';
import { PaymentConfigEditor } from './PaymentConfigEditor';
import { TransferConfigEditor } from './TransferConfigEditor';
import { WorkflowEditor } from './WorkflowEditor';
import { 
  DynamicService, 
  CustomField, 
  AdminAction, 
  AutoAction,
  PaymentConfig,
  TransferConfig,
  WorkflowStep,
  PricingType,
  MessageTemplate,
} from '@/types/dynamicServices';
import { supportedCurrencies } from '@/types/currency';

interface AddDynamicServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Omit<DynamicService, 'id' | 'createdAt' | 'updatedAt'>) => void;
  existingService?: DynamicService;
  paymentMethods: string[];
}

const initialPaymentConfig: PaymentConfig = {
  required: false,
  timing: 'before',
  type: 'full',
  methods: [],
  allowProofUpload: true,
  allowManualEntry: true,
  blockWithoutPayment: false,
};

const initialTransferConfig: TransferConfig = {
  enabled: false,
  type: 'local',
  requireRecipientData: true,
  requireApproval: true,
};

export const AddDynamicServiceModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  existingService,
  paymentMethods 
}: AddDynamicServiceModalProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Pricing
  const [pricingType, setPricingType] = useState<PricingType>('fixed');
  const [fixedPrice, setFixedPrice] = useState<number | undefined>();
  const [fixedCost, setFixedCost] = useState<number | undefined>();
  const [currency, setCurrency] = useState('SAR');
  
  // Duration
  const [estimatedDuration, setEstimatedDuration] = useState<number | undefined>();
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  // Customer Fields
  const [customerFields, setCustomerFields] = useState<CustomField[]>([]);
  
  // Admin Actions
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  
  // Auto Actions
  const [autoActions, setAutoActions] = useState<AutoAction[]>([]);
  
  // Payment Config
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(initialPaymentConfig);
  
  // Transfer Config
  const [transferConfig, setTransferConfig] = useState<TransferConfig>(initialTransferConfig);
  
  // Workflow Steps
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  // Message Templates
  const [messageTemplates] = useState<MessageTemplate[]>([]);

  // Settings
  const [showInCatalog, setShowInCatalog] = useState(true);
  const [allowCancellation, setAllowCancellation] = useState(true);

  // Reset form when modal opens/closes or editing different service
  useEffect(() => {
    if (isOpen) {
      if (existingService) {
        setName(existingService.name);
        setDescription(existingService.description || '');
        setIsActive(existingService.isActive);
        setPricingType(existingService.pricingType);
        setFixedPrice(existingService.fixedPrice);
        setFixedCost(existingService.fixedCost);
        setCurrency(existingService.currency);
        setEstimatedDuration(existingService.estimatedDuration);
        setDurationUnit(existingService.estimatedDurationUnit || 'hours');
        setCustomerFields(existingService.customerFields);
        setAdminActions(existingService.adminActions);
        setAutoActions(existingService.autoActions);
        setPaymentConfig(existingService.paymentConfig);
        setTransferConfig(existingService.transferConfig || initialTransferConfig);
        setWorkflowSteps(existingService.workflowSteps);
        setShowInCatalog(existingService.settings.showInCatalog);
        setAllowCancellation(existingService.settings.allowCancellation);
      } else {
        resetForm();
      }
    }
  }, [isOpen, existingService]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsActive(true);
    setPricingType('fixed');
    setFixedPrice(undefined);
    setFixedCost(undefined);
    setCurrency('SAR');
    setEstimatedDuration(undefined);
    setDurationUnit('hours');
    setCustomerFields([]);
    setAdminActions([]);
    setAutoActions([]);
    setPaymentConfig(initialPaymentConfig);
    setTransferConfig(initialTransferConfig);
    setWorkflowSteps([]);
    setShowInCatalog(true);
    setAllowCancellation(true);
    setActiveTab('basic');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    
    try {
      const serviceData: Omit<DynamicService, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        isActive,
        pricingType,
        fixedPrice,
        fixedCost,
        currency,
        estimatedDuration,
        estimatedDurationUnit: durationUnit,
        customerFields,
        adminActions,
        autoActions,
        paymentConfig,
        transferConfig,
        workflowSteps,
        messageTemplates,
        settings: {
          showInCatalog,
          allowCancellation,
        },
      };

      onSave(serviceData);
      resetForm();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {existingService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">مفعّلة</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-6 mt-4 grid grid-cols-6 w-auto">
            <TabsTrigger value="basic" className="text-xs">الأساسيات</TabsTrigger>
            <TabsTrigger value="fields" className="text-xs">الحقول</TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">الإجراءات</TabsTrigger>
            <TabsTrigger value="payment" className="text-xs">الدفع</TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs">سير العمل</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">الإعدادات</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="basic" className="mt-0 space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>اسم الخدمة <span className="text-destructive">*</span></Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: تفعيل حساب ChatGPT Plus"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>وصف الخدمة</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="وصف مختصر للخدمة يظهر للعملاء..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>نوع التسعير</Label>
                    <Select value={pricingType} onValueChange={(v) => setPricingType(v as PricingType)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">سعر ثابت</SelectItem>
                        <SelectItem value="dynamic">حسب الإدخال</SelectItem>
                        <SelectItem value="quote">عرض سعر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>العملة</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedCurrencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {pricingType === 'fixed' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>سعر البيع</Label>
                      <Input
                        type="number"
                        value={fixedPrice || ''}
                        onChange={(e) => setFixedPrice(parseFloat(e.target.value) || undefined)}
                        placeholder="0"
                        min={0}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>تكلفة الخدمة</Label>
                      <Input
                        type="number"
                        value={fixedCost || ''}
                        onChange={(e) => setFixedCost(parseFloat(e.target.value) || undefined)}
                        placeholder="0"
                        min={0}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>مدة التنفيذ المتوقعة</Label>
                    <Input
                      type="number"
                      value={estimatedDuration || ''}
                      onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || undefined)}
                      placeholder="0"
                      min={0}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>الوحدة</Label>
                    <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">دقائق</SelectItem>
                        <SelectItem value="hours">ساعات</SelectItem>
                        <SelectItem value="days">أيام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fields" className="mt-0">
              <CustomerFieldEditor 
                fields={customerFields} 
                onChange={setCustomerFields} 
              />
            </TabsContent>

            <TabsContent value="actions" className="mt-0 space-y-6">
              <AdminActionsEditor 
                actions={adminActions} 
                onChange={setAdminActions} 
              />
              <div className="border-t border-border pt-6">
                <AutoActionsEditor 
                  actions={autoActions} 
                  onChange={setAutoActions} 
                />
              </div>
            </TabsContent>

            <TabsContent value="payment" className="mt-0 space-y-6">
              <PaymentConfigEditor 
                config={paymentConfig} 
                onChange={setPaymentConfig}
                paymentMethods={paymentMethods}
              />
              <div className="border-t border-border pt-6">
                <TransferConfigEditor 
                  config={transferConfig} 
                  onChange={setTransferConfig} 
                />
              </div>
            </TabsContent>

            <TabsContent value="workflow" className="mt-0">
              <WorkflowEditor 
                steps={workflowSteps} 
                onChange={setWorkflowSteps} 
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div>
                    <p className="font-medium">إظهار في كتالوج الخدمات</p>
                    <p className="text-sm text-muted-foreground">عرض الخدمة للعملاء</p>
                  </div>
                  <Switch checked={showInCatalog} onCheckedChange={setShowInCatalog} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div>
                    <p className="font-medium">السماح بإلغاء الطلب</p>
                    <p className="text-sm text-muted-foreground">السماح للعميل بإلغاء الطلب</p>
                  </div>
                  <Switch checked={allowCancellation} onCheckedChange={setAllowCancellation} />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                {existingService ? 'حفظ التعديلات' : 'إضافة الخدمة'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
