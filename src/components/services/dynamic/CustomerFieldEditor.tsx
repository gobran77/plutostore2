import { useState } from 'react';
import { CustomField, FieldType } from '@/types/dynamicServices';
import { FieldTypeSelector, getFieldTypeIcon, getFieldTypeLabel } from './FieldTypeSelector';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CustomerFieldEditorProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

export const CustomerFieldEditor = ({ fields, onChange }: CustomerFieldEditorProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  const addField = () => {
    const newField: CustomField = {
      id: Date.now().toString(),
      name: `field_${Date.now()}`,
      label: '',
      type: newFieldType,
      required: false,
      placeholder: '',
    };
    onChange([...fields, newField]);
    setExpandedId(newField.id);
    setIsAddingField(false);
    setNewFieldType('text');
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    onChange(newFields);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">حقول الإدخال المطلوبة من العميل</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddingField(true)}
        >
          <Plus className="w-4 h-4 ml-1" />
          إضافة حقل
        </Button>
      </div>

      {isAddingField && (
        <div className="p-4 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 space-y-3">
          <p className="text-sm font-medium">اختر نوع الحقل:</p>
          <FieldTypeSelector value={newFieldType} onChange={setNewFieldType} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setIsAddingField(false)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={addField}>
              إضافة
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {fields.map((field, index) => {
          const Icon = getFieldTypeIcon(field.type);
          const isExpanded = expandedId === field.id;

          return (
            <Collapsible key={field.id} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? field.id : null)}>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="عنوان الحقل"
                      className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0"
                    />
                    <p className="text-xs text-muted-foreground">{getFieldTypeLabel(field.type)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">إجباري</Label>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                      />
                    </div>

                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </CollapsibleTrigger>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">اسم الحقل (للنظام)</Label>
                        <Input
                          value={field.name}
                          onChange={(e) => updateField(field.id, { name: e.target.value.replace(/\s/g, '_') })}
                          placeholder="field_name"
                          dir="ltr"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">نص توضيحي</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          placeholder="مثال: أدخل بريدك الإلكتروني"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {field.type === 'select' && (
                      <div>
                        <Label className="text-xs">الخيارات (كل خيار في سطر)</Label>
                        <textarea
                          value={field.options?.join('\n') || ''}
                          onChange={(e) => updateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                          placeholder="الخيار الأول&#10;الخيار الثاني&#10;الخيار الثالث"
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                        />
                      </div>
                    )}

                    {(field.type === 'text' || field.type === 'textarea') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">الحد الأدنى للأحرف</Label>
                          <Input
                            type="number"
                            value={field.validation?.minLength || ''}
                            onChange={(e) => updateField(field.id, { 
                              validation: { ...field.validation, minLength: parseInt(e.target.value) || undefined }
                            })}
                            min={0}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">الحد الأقصى للأحرف</Label>
                          <Input
                            type="number"
                            value={field.validation?.maxLength || ''}
                            onChange={(e) => updateField(field.id, { 
                              validation: { ...field.validation, maxLength: parseInt(e.target.value) || undefined }
                            })}
                            min={0}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}

                    {field.type === 'number' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">الحد الأدنى</Label>
                          <Input
                            type="number"
                            value={field.validation?.min ?? ''}
                            onChange={(e) => updateField(field.id, { 
                              validation: { ...field.validation, min: parseFloat(e.target.value) || undefined }
                            })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">الحد الأقصى</Label>
                          <Input
                            type="number"
                            value={field.validation?.max ?? ''}
                            onChange={(e) => updateField(field.id, { 
                              validation: { ...field.validation, max: parseFloat(e.target.value) || undefined }
                            })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {fields.length === 0 && !isAddingField && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <p>لا توجد حقول مضافة</p>
            <p className="text-sm mt-1">اضغط "إضافة حقل" لإضافة حقول الإدخال</p>
          </div>
        )}
      </div>
    </div>
  );
};
