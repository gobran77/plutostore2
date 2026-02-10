import { useState } from 'react';
import {
  MessageSquare, Plus, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { TicketChat } from '@/components/admin/TicketChat';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CustomerTicketsProps {
  customerId: string;
}

export function CustomerTickets({ customerId }: CustomerTicketsProps) {
  const { tickets, isLoading, createTicket } = useSupportTickets(customerId);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTicket = async () => {
    if (!newSubject.trim()) return;

    setIsSubmitting(true);
    const ticket = await createTicket(newSubject.trim(), newMessage.trim() || undefined);
    if (ticket) {
      setNewSubject('');
      setNewMessage('');
      setIsCreating(false);
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
            <AlertCircle className="w-3 h-3" />
            مفتوحة
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-info/20 text-info border-info/30 gap-1">
            <Clock className="w-3 h-3" />
            قيد المعالجة
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className="bg-success/20 text-success border-success/30 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            تم الحل
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="gap-1">
            مغلقة
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Ticket Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">تذاكر الدعم</h3>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="w-4 h-4 ml-1" />
          تذكرة جديدة
        </Button>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="bg-muted/50 rounded-xl p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground mb-2">لا توجد تذاكر</h3>
          <p className="text-sm text-muted-foreground mb-4">
            يمكنك إنشاء تذكرة دعم للتواصل معنا
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 ml-1" />
            إنشاء تذكرة
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-card rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">
                      {ticket.ticket_number}
                    </code>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <h4 className="font-medium text-foreground truncate">{ticket.subject}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar })}
                  </p>
                </div>
                <MessageSquare className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              إنشاء تذكرة دعم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">الموضوع</Label>
              <Input
                id="subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="اكتب موضوع التذكرة..."
              />
            </div>
            <div>
              <Label htmlFor="message">الرسالة (اختياري)</Label>
              <Textarea
                id="message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="اكتب رسالتك..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={!newSubject.trim() || isSubmitting}
            >
              {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Chat Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <TicketChat
              ticket={selectedTicket}
              isAdmin={false}
              senderId={customerId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
