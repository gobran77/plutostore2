import { useState } from 'react';
import {
  MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle,
  User, Calendar, Filter, RefreshCw, Trash2, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { TicketChat } from './TicketChat';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function AdminTicketsManager() {
  const { tickets, isLoading, updateTicketStatus, deleteTicket, refetch } = useSupportTickets();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredTickets = tickets.filter(t => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const statusCounts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
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
          <Badge className="bg-muted text-muted-foreground border-border gap-1">
            <XCircle className="w-3 h-3" />
            مغلقة
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">عاجل</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-500">مرتفع</Badge>;
      case 'normal':
        return <Badge variant="outline">عادي</Badge>;
      case 'low':
        return <Badge variant="secondary">منخفض</Badge>;
      default:
        return null;
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTicket(id);
    setDeleteConfirmId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.open}</p>
              <p className="text-xs text-muted-foreground">مفتوحة</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.in_progress}</p>
              <p className="text-xs text-muted-foreground">قيد المعالجة</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.resolved}</p>
              <p className="text-xs text-muted-foreground">تم الحل</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <XCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.closed}</p>
              <p className="text-xs text-muted-foreground">مغلقة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="فلترة حسب الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل ({tickets.length})</SelectItem>
              <SelectItem value="open">مفتوحة ({statusCounts.open})</SelectItem>
              <SelectItem value="in_progress">قيد المعالجة ({statusCounts.in_progress})</SelectItem>
              <SelectItem value="resolved">تم الحل ({statusCounts.resolved})</SelectItem>
              <SelectItem value="closed">مغلقة ({statusCounts.closed})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4 ml-1" />
          تحديث
        </Button>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تذاكر</h3>
          <p className="text-muted-foreground">
            {statusFilter === 'all'
              ? 'لم يتم استلام أي تذاكر دعم بعد'
              : 'لا توجد تذاكر بهذه الحالة'
            }
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">رقم التذكرة</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">العميل</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">الموضوع</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">الأولوية</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">التاريخ</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                      ticket.status === 'open' ? 'bg-warning/5' : ''
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td className="p-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {ticket.ticket_number}
                      </code>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{ticket.customer?.name || 'عميل'}</p>
                          <p className="text-xs text-muted-foreground">{ticket.customer?.whatsapp_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-foreground max-w-48 truncate">{ticket.subject}</p>
                    </td>
                    <td className="p-4">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(ticket.created_at), {
                            addSuffix: true,
                            locale: ar,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(ticket.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Chat Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              تذكرة: {selectedTicket?.ticket_number}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <TicketChat
              ticket={selectedTicket}
              isAdmin={true}
              onStatusChange={(status) => {
                updateTicketStatus(selectedTicket.id, status);
                setSelectedTicket({ ...selectedTicket, status });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              حذف التذكرة
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            هل أنت متأكد من حذف هذه التذكرة؟ سيتم حذف جميع الرسائل المرتبطة بها.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
