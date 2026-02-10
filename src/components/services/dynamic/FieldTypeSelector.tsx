import { FieldType } from '@/types/dynamicServices';
import { 
  Mail, Phone, User, DollarSign, Globe, MapPin, 
  Upload, Image, AlignLeft, List, Hash, Calendar, CheckSquare, Type
} from 'lucide-react';

interface FieldTypeSelectorProps {
  value: FieldType;
  onChange: (type: FieldType) => void;
}

const fieldTypes: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: 'text', label: 'نص', icon: Type },
  { type: 'email', label: 'بريد إلكتروني', icon: Mail },
  { type: 'phone', label: 'هاتف/واتساب', icon: Phone },
  { type: 'username', label: 'اسم مستخدم', icon: User },
  { type: 'amount', label: 'مبلغ', icon: DollarSign },
  { type: 'country', label: 'دولة', icon: Globe },
  { type: 'city', label: 'مدينة', icon: MapPin },
  { type: 'file', label: 'ملف', icon: Upload },
  { type: 'image', label: 'صورة', icon: Image },
  { type: 'textarea', label: 'ملاحظات', icon: AlignLeft },
  { type: 'select', label: 'قائمة', icon: List },
  { type: 'number', label: 'رقم', icon: Hash },
  { type: 'date', label: 'تاريخ', icon: Calendar },
  { type: 'checkbox', label: 'صح/خطأ', icon: CheckSquare },
];

export const FieldTypeSelector = ({ value, onChange }: FieldTypeSelectorProps) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {fieldTypes.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
            value === type
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
};

export const getFieldTypeIcon = (type: FieldType) => {
  const fieldType = fieldTypes.find(f => f.type === type);
  return fieldType?.icon || Type;
};

export const getFieldTypeLabel = (type: FieldType) => {
  const fieldType = fieldTypes.find(f => f.type === type);
  return fieldType?.label || type;
};
