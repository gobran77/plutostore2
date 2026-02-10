import { useState } from 'react';
import { 
  Package, Clock, Check, X, MessageCircle, Trash2, 
  Filter, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  User, Calendar, DollarSign, Mail, Loader2, Zap
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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useServiceRequests, ServiceRequest } from '@/hooks/useServiceRequests';
import { ServiceRequestStatus, SERVICE_REQUEST_STATUS_LABELS } from '@/types/serviceRequests';
import { getCurrencySymbol } from '@/types/currency';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function ServiceRequestsManager() {
  const { 
    requests, 
    isLoading, 
    pendingCount, 
    updateRequestStatus, 
    deleteRequest,
    refetch 
  } = useServiceRequests();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState<ServiceRequestStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteRequest_, setDeleteRequest_] = useState<ServiceRequest | null>(null);

  // Get unique service names
  const serviceNames = [...new Set(requests.map(r => r.service_name))];

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesService = serviceFilter === 'all' || r.service_name === serviceFilter;
    return matchesStatus && matchesService;
  });

  // Status counts
  const statusCounts = {
    pending: requests.filter(r => r.status === 'pending').length,
    processing: requests.filter(r => r.status === 'processing').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    activated: requests.filter(r => r.status === 'activated').length,
    failed: requests.filter(r => r.status === 'failed').length,
  };

  const handleStatusChange = async () => {
    if (!selectedRequest || !targetStatus) return;
    
    setIsProcessing(true);
    const success = await updateRequestStatus(
      selectedRequest.id, 
      targetStatus, 
      adminNotes || undefined,
      selectedRequest
    );
    
    if (success) {
      setSelectedRequest(null);
      setAdminNotes('');
      setTargetStatus(null);
    }
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteRequest(deleteConfirmId, deleteRequest_ || undefined);
    setDeleteConfirmId(null);
    setDeleteRequest_(null);
  };

  const openWhatsApp = (request: ServiceRequest) => {
    if (!request.customer) return;
    
    const statusText = SERVICE_REQUEST_STATUS_LABELS[request.status];
    
    const message = encodeURIComponent(
      `مرحباً ${request.customer.name}،\n\n` +
      `بخصوص طلبك لخدمة ${request.service_name} (${request.period_name}):\n` +
      `الحالة: ${statusText}\n\n` +
      (request.admin_notes ? `ملاحظات: ${request.admin_notes}` : '')
    );
    
    window.open(`https://wa.me/${request.customer.whatsapp_number}?text=${message}`, '_blank');
  };

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
            <AlertCircle className="w-3 h-3" />
            معلق
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-info/20 text-info border-info/30 gap-1">
            <Loader2 className="w-3 h-3" />
            جاري المعالجة
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-success/20 text-success border-success/30 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            مقبول
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
            <XCircle className="w-3 h-3" />
            مرفوض
          </Badge>
        );
      case 'activated':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
            <Zap className="w-3 h-3" />
            تم التفعيل
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
            <XCircle className="w-3 h-3" />
            فشل
          </Badge>
        );
      default:
        return null;
    }
  };

  const openStatusModal = (request: ServiceRequest, status: ServiceRequestStatus) => {
    setSelectedRequest(request);
    setTargetStatus(status);
    setAdminNotes('');
  };

  const getStatusActions = (request: ServiceRequest) => {
    switch (request.status) {
      case 'pending':
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 bg-info/10 hover:bg-info/20 text-info border-info/30"
              onClick={() => openStatusModal(request, 'processing')}
            >
              <Loader2 className="w-3 h-3 ml-1" />
              معالجة
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 bg-success/10 hover:bg-success/20 text-success border-success/30"
              onClick={() => openStatusModal(request, 'approved')}
            >
              <Check className="w-3 h-3 ml-1" />
              قبول
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
              onClick={() => openStatusModal(request, 'rejected')}
            >
              <X className="w-3 h-3 ml-1" />
              رفض
            </Button>
          </>
        );
      case 'processing':
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 bg-success/10 hover:bg-success/20 text-success border-success/30"
              onClick={() => openStatusModal(request, 'approved')}
            >
              <Check className="w-3 h-3 ml-1" />
              قبول
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
              onClick={() => openStatusModal(request, 'failed')}
            >
              <X className="w-3 h-3 ml-1" />
              فشل
            </Button>
          </>
        );
      case 'approved':
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
              onClick={() => openStatusModal(request, 'activated')}
            >
              <Zap className="w-3 h-3 ml-1" />
              تفعيل
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
              onClick={() => openStatusModal(request, 'failed')}
            >
              <X className="w-3 h-3 ml-1" />
              فشل
            </Button>
          </>
        );
      default:
        return null;
    }
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
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{statusCounts.pending}</p>
              <p className="text-[10px] text-muted-foreground">معلق</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-info" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{statusCounts.processing}</p>
              <p className="text-[10px] text-muted-foreground">معالجة</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{statusCounts.approved}</p>
              <p className="text-[10px] text-muted-foreground">مقبول</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{statusCounts.activated}</p>
              <p className="text-[10px] text-muted-foreground">مفعّل</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
              <X className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{statusCounts.rejected}</p>
              <p className="text-[10px] text-muted-foreground">مرفوض</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{statusCounts.failed}</p>
              <p className="text-[10px] text-muted-foreground">فشل</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل ({requests.length})</SelectItem>
              <SelectItem value="pending">معلق ({statusCounts.pending})</SelectItem>
              <SelectItem value="processing">معالجة ({statusCounts.processing})</SelectItem>
              <SelectItem value="approved">مقبول ({statusCounts.approved})</SelectItem>
              <SelectItem value="activated">مفعّل ({statusCounts.activated})</SelectItem>
              <SelectItem value="rejected">مرفوض ({statusCounts.rejected})</SelectItem>
              <SelectItem value="failed">فشل ({statusCounts.failed})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الخدمة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الخدمات</SelectItem>
            {serviceNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4 ml-1" />
          تحديث
        </Button>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد طلبات</h3>
          <p className="text-muted-foreground">
            {statusFilter === 'all' 
              ? 'لم يتم استلام أي طلبات خدمات بعد'
              : 'لا توجد طلبات بهذه الحالة'
            }
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">العميل</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">الخدمة</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">المدة</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">السعر</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">التاريخ</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.map((request) => (
                  <tr 
                    key={request.id} 
                    className={`hover:bg-muted/30 transition-colors ${
                      request.status === 'pending' ? 'bg-warning/5' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{request.customer?.name || 'عميل'}</p>
                          <p className="text-xs text-muted-foreground">{request.customer?.whatsapp_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-foreground">{request.service_name}</p>
                      {request.customer_email && (
                        <p className="text-xs text-primary flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          {request.customer_email}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{request.period_name}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{request.period_days} يوم</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-success" />
                        <span className="font-semibold text-foreground">
                          {request.price} {getCurrencySymbol(request.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(request.status)}
                      {request.admin_notes && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-32 truncate" title={request.admin_notes}>
                          {request.admin_notes}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(request.created_at), {
                            addSuffix: true,
                            locale: ar,
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(request.created_at), 'yyyy/MM/dd HH:mm')}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {getStatusActions(request)}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => openWhatsApp(request)}
                          title="تواصل عبر واتساب"
                        >
                          <MessageCircle className="w-4 h-4 text-success" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteConfirmId(request.id);
                            setDeleteRequest_(request);
                          }}
                          title="حذف الطلب"
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

      {/* Status Change Modal */}
      <Dialog open={!!selectedRequest && !!targetStatus} onOpenChange={() => {
        setSelectedRequest(null);
        setTargetStatus(null);
        setAdminNotes('');
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {targetStatus && getStatusBadge(targetStatus)}
              تغيير حالة الطلب
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العميل:</span>
                  <span className="font-medium">{selectedRequest.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الخدمة:</span>
                  <span className="font-medium">{selectedRequest.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">السعر:</span>
                  <span className="font-medium text-primary">
                    {selectedRequest.price} {getCurrencySymbol(selectedRequest.currency)}
                  </span>
                </div>
                {selectedRequest.customer_email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      إيميل التفعيل:
                    </span>
                    <span className="font-medium text-primary" dir="ltr">
                      {selectedRequest.customer_email}
                    </span>
                  </div>
                )}
              </div>
              
              {(targetStatus === 'rejected' || targetStatus === 'failed') && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                  <p className="text-sm text-warning">
                    ⚠️ سيتم استرداد مبلغ {selectedRequest.price} {getCurrencySymbol(selectedRequest.currency)} لرصيد العميل
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">ملاحظات (اختياري)</label>
                <Textarea
                  placeholder="أضف ملاحظة..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setTargetStatus(null);
                setAdminNotes('');
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => {
        setDeleteConfirmId(null);
        setDeleteRequest_(null);
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              حذف الطلب
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            هل أنت متأكد من حذف هذا الطلب؟
          </p>
          {deleteRequest_ && deleteRequest_.status !== 'activated' && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <p className="text-sm text-warning">
                ⚠️ سيتم استرداد مبلغ {deleteRequest_.price} {getCurrencySymbol(deleteRequest_.currency)} لرصيد العميل
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setDeleteConfirmId(null);
              setDeleteRequest_(null);
            }}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
