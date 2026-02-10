import { useState } from 'react';
import { Bell, Package, Clock, Check, X, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServiceRequests, ServiceRequest } from '@/hooks/useServiceRequests';
import { getCurrencySymbol } from '@/types/currency';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export function ServiceRequestsNotification() {
  const { requests, pendingCount, updateRequestStatus, isLoading } = useServiceRequests();
  const [open, setOpen] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const recentRequests = requests.slice(0, 10);

  const handleApprove = async (request: ServiceRequest) => {
    await updateRequestStatus(request.id, 'approved');
  };

  const handleReject = async (request: ServiceRequest) => {
    await updateRequestStatus(request.id, 'rejected');
  };

  const openWhatsApp = (request: ServiceRequest) => {
    if (!request.customer) return;
    
    const message = encodeURIComponent(
      `مرحباً ${request.customer.name}،\n\n` +
      `بخصوص طلبك لخدمة ${request.service_name} (${request.period_name}):\n` +
      `سيتم التواصل معك قريباً.`
    );
    
    window.open(`https://wa.me/${request.customer.whatsapp_number}?text=${message}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/20 text-warning">قيد الانتظار</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-success/20 text-success">تمت الموافقة</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-destructive/20 text-destructive">مرفوض</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-primary/20 text-primary">مكتمل</Badge>;
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 md:p-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <Bell className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1">
              {pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-3 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            طلبات الخدمات
          </h3>
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} جديد</Badge>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-pulse">جاري التحميل...</div>
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>لا توجد طلبات</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className={`p-3 hover:bg-muted/50 transition-colors ${
                    request.status === 'pending' ? 'bg-warning/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {request.customer?.name || 'عميل'}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.service_name} - {request.period_name}
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        {request.price} {getCurrencySymbol(request.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(request.created_at), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </div>
                  </div>

                  {/* Actions for pending requests */}
                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs bg-success/10 hover:bg-success/20 text-success border-success/30"
                        onClick={() => handleApprove(request)}
                      >
                        <Check className="w-3 h-3 ml-1" />
                        موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
                        onClick={() => handleReject(request)}
                      >
                        <X className="w-3 h-3 ml-1" />
                        رفض
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => openWhatsApp(request)}
                      >
                        <MessageCircle className="w-3 h-3 text-success" />
                      </Button>
                    </div>
                  )}

                  {/* Customer balance info */}
                  {request.customer && request.status === 'pending' && (
                    <div className="mt-2 text-xs flex items-center gap-2 text-muted-foreground">
                      <span>رصيد العميل:</span>
                      <span className={request.customer.balance >= request.price ? 'text-success' : 'text-warning'}>
                        {request.customer.balance} {getCurrencySymbol(request.currency)}
                      </span>
                      {request.customer.balance >= request.price && (
                        <Badge variant="outline" className="text-xs py-0">كافي للخصم</Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {recentRequests.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="w-3 h-3 ml-1" />
              عرض كل الطلبات
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
