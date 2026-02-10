import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supportedCurrencies } from '@/types/currency';
import { PlusCircle } from 'lucide-react';

interface AddCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { amount: number; currency: string; reason: string; notes?: string }) => void;
}

const commonReasons = [
  'رأس مال ابتدائي',
  'إيداع نقدي',
  'تحويل من حساب آخر',
  'أرباح خارجية',
  'استرداد مبلغ',
  'أخرى',
];

export const AddCashModal = ({ isOpen, onClose, onAdd }: AddCashModalProps) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const finalReason = reason === 'أخرى' ? customReason : reason;
    if (!finalReason.trim()) return;

    onAdd({
      amount: parsedAmount,
      currency,
      reason: finalReason,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setAmount('');
    setCurrency('SAR');
    setReason('');
    setCustomReason('');
    setNotes('');
    onClose();
  };

  const isValid = parseFloat(amount) > 0 && (reason && (reason !== 'أخرى' || customReason.trim()));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-success" />
            زيادة الصندوق
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="amount">المبلغ</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold"
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">العملة</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">السبب</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="اختر سبب الزيادة" />
              </SelectTrigger>
              <SelectContent>
                {commonReasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason */}
          {reason === 'أخرى' && (
            <div>
              <Label htmlFor="customReason">سبب مخصص</Label>
              <Input
                id="customReason"
                placeholder="اكتب السبب..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                required
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              placeholder="أي تفاصيل إضافية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={!isValid}>
              <PlusCircle className="w-4 h-4 ml-2" />
              إضافة للصندوق
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
