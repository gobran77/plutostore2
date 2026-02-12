import { useMemo, useState } from 'react';
import {
  Package,
  Clock,
  Check,
  X,
  MessageCircle,
  Trash2,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  DollarSign,
  Mail,
  Loader2,
  Zap,
  ArrowRightLeft,
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
import { useServiceRequests, ServiceRequest, ActivationCredentials } from '@/hooks/useServiceRequests';
import { ServiceRequestStatus, SERVICE_REQUEST_STATUS_LABELS } from '@/types/serviceRequests';
import { getCurrencySymbol } from '@/types/currency';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { fixTextEncoding } from '@/lib/textEncoding';

interface ActivationSlotOption {
  id: string;
  email: string;
  password?: string;
  slotName?: string;
  usersCount: number;
}

const loadJsonArray = (key: string): any[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveJsonArray = (key: string, value: any[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export function ServiceRequestsManager() {
  const {
    requests,
    isLoading,
    updateRequestStatus,
    deleteRequest,
    refetch,
  } = useServiceRequests();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState<ServiceRequestStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteRequest_, setDeleteRequest_] = useState<ServiceRequest | null>(null);

  const [activationSlots, setActivationSlots] = useState<ActivationSlotOption[]>([]);
  const [selectedActivationSlotId, setSelectedActivationSlotId] = useState<string>('');

  const [transferRequest, setTransferRequest] = useState<ServiceRequest | null>(null);
  const [transferSlots, setTransferSlots] = useState<ActivationSlotOption[]>([]);
  const [transferTargetSlotId, setTransferTargetSlotId] = useState<string>('');
  const [isTransfering, setIsTransfering] = useState(false);

  const serviceNames = useMemo(() => [...new Set(requests.map((r) => r.service_name))], [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesService = serviceFilter === 'all' || r.service_name === serviceFilter;
      return matchesStatus && matchesService;
    });
  }, [requests, statusFilter, serviceFilter]);

  const statusCounts = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    processing: requests.filter((r) => r.status === 'processing').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    activated: requests.filter((r) => r.status === 'activated').length,
    failed: requests.filter((r) => r.status === 'failed').length,
  }), [requests]);

  const loadActivationSlots = (request: ServiceRequest): ActivationSlotOption[] => {
    const services = loadJsonArray('app_services');
    const service = services.find((s: any) => String(s?.id || '') === String(request.service_id));
    if (!service) return [];

    const accounts = Array.isArray(service?.accounts) ? service.accounts : [];
    const sharedAccounts = accounts.filter((a: any) => String(a?.type || '') === 'shared');

    const slots: ActivationSlotOption[] = sharedAccounts.flatMap((acc: any) => {
      const sharedEmails = Array.isArray(acc?.sharedEmails) ? acc.sharedEmails : [];
      return sharedEmails
        .filter((e: any) => String(e?.email || '').trim().length > 0)
        .map((e: any) => ({
          id: String(e?.id || ''),
          email: String(e?.email || ''),
          password: e?.password ? String(e.password) : undefined,
          slotName: acc?.name ? String(acc.name) : undefined,
          usersCount: Array.isArray(e?.users) ? e.users.length : 0,
        }))
        .filter((x: ActivationSlotOption) => x.id.length > 0);
    });

    slots.sort((a, b) => a.usersCount - b.usersCount);
    return slots;
  };

  const toActivationPayload = (): ActivationCredentials | undefined => {
    const slot = activationSlots.find((s) => s.id === selectedActivationSlotId);
    if (!slot) return undefined;
    return {
      slotId: slot.id,
      loginEmail: slot.email,
      loginPassword: slot.password,
      loginSlotName: slot.slotName,
    };
  };

  const handleStatusChange = async () => {
    if (!selectedRequest || !targetStatus) return;

    if (targetStatus === 'activated' && activationSlots.length > 0 && !selectedActivationSlotId) {
      toast.error('Ø§Ø®ØªØ± Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„/Ø§Ù„Ø³Ù„ÙˆØª Ù‚Ø¨Ù„ Ø§Ù„ØªÙØ¹ÙŠÙ„');
      return;
    }

    setIsProcessing(true);
    const success = await updateRequestStatus(
      selectedRequest.id,
      targetStatus,
      adminNotes || undefined,
      selectedRequest,
      toActivationPayload()
    );

    if (success) {
      setSelectedRequest(null);
      setAdminNotes('');
      setTargetStatus(null);
      setActivationSlots([]);
      setSelectedActivationSlotId('');
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
      `Ù…Ø±Ø­Ø¨Ø§Ù‹ ${request.customer.name}ØŒ\n\n` +
      `Ø¨Ø®ØµÙˆØµ Ø·Ù„Ø¨Ùƒ Ù„Ø®Ø¯Ù…Ø© ${request.service_name} (${request.period_name}):\n` +
      `Ø§Ù„Ø­Ø§Ù„Ø©: ${statusText}\n\n` +
      (request.admin_notes ? `Ù…Ù„Ø§Ø­Ø¸Ø§Øª: ${request.admin_notes}` : '')
    );

    window.open(`https://wa.me/${request.customer.whatsapp_number}?text=${message}`, '_blank');
  };

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning/20 text-warning border-warning/30 gap-1"><AlertCircle className="w-3 h-3" />Ù…Ø¹Ù„Ù‚</Badge>;
      case 'processing':
        return <Badge className="bg-info/20 text-info border-info/30 gap-1"><Loader2 className="w-3 h-3" />Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©</Badge>;
      case 'approved':
        return <Badge className="bg-success/20 text-success border-success/30 gap-1"><CheckCircle2 className="w-3 h-3" />Ù…Ù‚Ø¨ÙˆÙ„</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1"><XCircle className="w-3 h-3" />Ù…Ø±ÙÙˆØ¶</Badge>;
      case 'activated':
        return <Badge className="bg-primary/20 text-primary border-primary/30 gap-1"><Zap className="w-3 h-3" />ØªÙ… Ø§Ù„ØªÙØ¹ÙŠÙ„</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1"><XCircle className="w-3 h-3" />ÙØ´Ù„</Badge>;
      default:
        return null;
    }
  };

  const openStatusModal = (request: ServiceRequest, status: ServiceRequestStatus) => {
    setSelectedRequest(request);
    setTargetStatus(status);
    setAdminNotes('');

    if (status === 'activated') {
      const slots = loadActivationSlots(request);
      setActivationSlots(slots);
      const preferred = slots.find((s) => s.id === String(request.linked_slot_id || ''))?.id || '';
      setSelectedActivationSlotId(preferred);
    } else {
      setActivationSlots([]);
      setSelectedActivationSlotId('');
    }
  };

  const openTransferModal = (request: ServiceRequest) => {
    const slots = loadActivationSlots(request);
    setTransferRequest(request);
    setTransferSlots(slots);
    setTransferTargetSlotId('');
  };

  const handleTransferSlot = async () => {
    if (!transferRequest || !transferTargetSlotId) return;

    setIsTransfering(true);
    try {
      const target = transferSlots.find((s) => s.id === transferTargetSlotId);
      if (!target) {
        toast.error('Ø§Ù„Ø³Ù„ÙˆØª ØºÙŠØ± ØµØ§Ù„Ø­');
        return;
      }

      const services = loadJsonArray('app_services');
      const serviceIdx = services.findIndex((s: any) => String(s?.id || '') === String(transferRequest.service_id));
      if (serviceIdx === -1) {
        toast.error('Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø¯Ù…Ø©');
        return;
      }

      const service = services[serviceIdx];
      const accounts = Array.isArray(service?.accounts) ? service.accounts : [];
      const customerName = transferRequest.customer?.name || 'Ø¹Ù…ÙŠÙ„';
      const customerEmail = transferRequest.customer_email || target.email;

      const updatedAccounts = accounts.map((acc: any) => {
        const sharedEmails = Array.isArray(acc?.sharedEmails) ? acc.sharedEmails : [];
        const nextSharedEmails = sharedEmails.map((se: any) => {
          const users = Array.isArray(se?.users) ? se.users : [];
          const usersWithoutCustomer = users.filter((u: any) => String(u?.customerId || '') !== String(transferRequest.customer_id));

          if (String(se?.id || '') === String(transferTargetSlotId)) {
            const exists = usersWithoutCustomer.some((u: any) => String(u?.customerId || '') === String(transferRequest.customer_id));
            if (!exists) {
              usersWithoutCustomer.push({
                id: `slot_user_${Date.now()}`,
                customerId: transferRequest.customer_id,
                name: customerName,
                email: customerEmail,
                linkedAt: new Date().toISOString(),
              });
            }
          }

          return { ...se, users: usersWithoutCustomer };
        });
        return { ...acc, sharedEmails: nextSharedEmails };
      });

      services[serviceIdx] = { ...service, accounts: updatedAccounts };
      saveJsonArray('app_services', services);

      const subscriptions = loadJsonArray('app_subscriptions');
      const subIdx = subscriptions.findIndex((s: any) =>
        String(s?.id || '') === String(transferRequest.linked_subscription_id || '') ||
        String(s?.sourceRequestId || '') === String(transferRequest.id)
      );
      if (subIdx !== -1) {
        subscriptions[subIdx] = {
          ...subscriptions[subIdx],
          slotId: target.id,
          loginEmail: target.email,
          loginPassword: target.password || subscriptions[subIdx]?.loginPassword,
          loginSlotName: target.slotName || subscriptions[subIdx]?.loginSlotName,
          loginUpdatedAt: new Date().toISOString(),
        };
        saveJsonArray('app_subscriptions', subscriptions);
      }

      const reqs = loadJsonArray('app_service_requests');
      const reqIdx = reqs.findIndex((r: any) => String(r?.id || '') === String(transferRequest.id));
      if (reqIdx !== -1) {
        const prevNotes = String(reqs[reqIdx]?.admin_notes || '');
        const moveNote = `ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¥Ù„Ù‰ Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„: ${target.email}`;
        reqs[reqIdx] = {
          ...reqs[reqIdx],
          linked_slot_id: target.id,
          linked_login_email: target.email,
          admin_notes: [prevNotes, moveNote].filter(Boolean).join(' | '),
          updated_at: new Date().toISOString(),
        };
        saveJsonArray('app_service_requests', reqs);
      }

      toast.success('ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¥Ù„Ù‰ Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ø¨Ù†Ø¬Ø§Ø­');
      setTransferRequest(null);
      setTransferSlots([]);
      setTransferTargetSlotId('');
      refetch();
    } catch {
      toast.error('ØªØ¹Ø°Ø± Ù†Ù‚Ù„ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨ÙŠÙ† Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„Ø§Øª');
    } finally {
      setIsTransfering(false);
    }
  };

  const getStatusActions = (request: ServiceRequest) => {
    switch (request.status) {
      case 'pending':
        return (
          <>
            <Button size="sm" variant="outline" className="h-8 px-2 bg-info/10 hover:bg-info/20 text-info border-info/30" onClick={() => openStatusModal(request, 'processing')}>
              <Loader2 className="w-3 h-3 ml-1" />Ù…Ø¹Ø§Ù„Ø¬Ø©
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2 bg-success/10 hover:bg-success/20 text-success border-success/30" onClick={() => openStatusModal(request, 'approved')}>
              <Check className="w-3 h-3 ml-1" />Ù‚Ø¨ÙˆÙ„
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30" onClick={() => openStatusModal(request, 'rejected')}>
              <X className="w-3 h-3 ml-1" />Ø±ÙØ¶
            </Button>
          </>
        );
      case 'processing':
        return (
          <>
            <Button size="sm" variant="outline" className="h-8 px-2 bg-success/10 hover:bg-success/20 text-success border-success/30" onClick={() => openStatusModal(request, 'approved')}>
              <Check className="w-3 h-3 ml-1" />Ù‚Ø¨ÙˆÙ„
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30" onClick={() => openStatusModal(request, 'failed')}>
              <X className="w-3 h-3 ml-1" />ÙØ´Ù„
            </Button>
          </>
        );
      case 'approved':
        return (
          <>
            <Button size="sm" variant="outline" className="h-8 px-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30" onClick={() => openStatusModal(request, 'activated')}>
              <Zap className="w-3 h-3 ml-1" />ØªÙØ¹ÙŠÙ„
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30" onClick={() => openStatusModal(request, 'failed')}>
              <X className="w-3 h-3 ml-1" />ÙØ´Ù„
            </Button>
          </>
        );
      case 'activated':
        return (
          <Button size="sm" variant="outline" className="h-8 px-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30" onClick={() => openTransferModal(request)}>
            <ArrowRightLeft className="w-3 h-3 ml-1" />Ù†Ù‚Ù„ Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„
          </Button>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-card rounded-xl border border-border p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center"><Clock className="w-4 h-4 text-warning" /></div><div><p className="text-xl font-bold text-foreground">{statusCounts.pending}</p><p className="text-[10px] text-muted-foreground">Ù…Ø¹Ù„Ù‚</p></div></div></div>
        <div className="bg-card rounded-xl border border-border p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center"><Loader2 className="w-4 h-4 text-info" /></div><div><p className="text-xl font-bold text-foreground">{statusCounts.processing}</p><p className="text-[10px] text-muted-foreground">Ù…Ø¹Ø§Ù„Ø¬Ø©</p></div></div></div>
        <div className="bg-card rounded-xl border border-border p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center"><Check className="w-4 h-4 text-success" /></div><div><p className="text-xl font-bold text-foreground">{statusCounts.approved}</p><p className="text-[10px] text-muted-foreground">Ù…Ù‚Ø¨ÙˆÙ„</p></div></div></div>
        <div className="bg-card rounded-xl border border-border p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"><Zap className="w-4 h-4 text-primary" /></div><div><p className="text-xl font-bold text-foreground">{statusCounts.activated}</p><p className="text-[10px] text-muted-foreground">Ù…ÙØ¹Ù„</p></div></div></div>
        <div className="bg-card rounded-xl border border-border p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center"><X className="w-4 h-4 text-destructive" /></div><div><p className="text-xl font-bold text-foreground">{statusCounts.rejected}</p><p className="text-[10px] text-muted-foreground">Ù…Ø±ÙÙˆØ¶</p></div></div></div>
        <div className="bg-card rounded-xl border border-border p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center"><XCircle className="w-4 h-4 text-destructive" /></div><div><p className="text-xl font-bold text-foreground">{statusCounts.failed}</p><p className="text-[10px] text-muted-foreground">ÙØ´Ù„</p></div></div></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Ø§Ù„Ø­Ø§Ù„Ø©" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ø§Ù„ÙƒÙ„ ({requests.length})</SelectItem>
              <SelectItem value="pending">Ù…Ø¹Ù„Ù‚ ({statusCounts.pending})</SelectItem>
              <SelectItem value="processing">Ù…Ø¹Ø§Ù„Ø¬Ø© ({statusCounts.processing})</SelectItem>
              <SelectItem value="approved">Ù…Ù‚Ø¨ÙˆÙ„ ({statusCounts.approved})</SelectItem>
              <SelectItem value="activated">Ù…ÙØ¹Ù„ ({statusCounts.activated})</SelectItem>
              <SelectItem value="rejected">Ù…Ø±ÙÙˆØ¶ ({statusCounts.rejected})</SelectItem>
              <SelectItem value="failed">ÙØ´Ù„ ({statusCounts.failed})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Ø§Ù„Ø®Ø¯Ù…Ø©" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø®Ø¯Ù…Ø§Øª</SelectItem>
            {serviceNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4 ml-1" />ØªØ­Ø¯ÙŠØ«</Button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª</h3>
          <p className="text-muted-foreground">{statusFilter === 'all' ? 'Ù„Ù… ÙŠØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø£ÙŠ Ø·Ù„Ø¨Ø§Øª Ø®Ø¯Ù…Ø§Øª Ø¨Ø¹Ø¯' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø­Ø§Ù„Ø©'}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ø§Ù„Ø¹Ù…ÙŠÙ„</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ø§Ù„Ø®Ø¯Ù…Ø©</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ø§Ù„Ù…Ø¯Ø©</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ø§Ù„Ø³Ø¹Ø±</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className={`hover:bg-muted/30 transition-colors ${request.status === 'pending' ? 'bg-warning/5' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                        <div>
                          <p className="font-medium text-foreground">{request.customer?.name || 'Ø¹Ù…ÙŠÙ„'}</p>
                          <p className="text-xs text-muted-foreground">{request.customer?.whatsapp_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-foreground">{request.service_name}</p>
                      {(request.linked_login_email || request.customer_email) && (
                        <p className="text-xs text-primary flex items-center gap-1 mt-1"><Mail className="w-3 h-3" />{fixTextEncoding(request.linked_login_email || request.customer_email || '')}</p>
                      )}
                    </td>
                    <td className="p-4"><Badge variant="outline">{request.period_name}</Badge><p className="text-xs text-muted-foreground mt-1">{request.period_days} ÙŠÙˆÙ…</p></td>
                    <td className="p-4"><div className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-success" /><span className="font-semibold text-foreground">{request.price} {getCurrencySymbol(request.currency)}</span></div></td>
                    <td className="p-4">{getStatusBadge(request.status)}{request.admin_notes && <p className="text-xs text-muted-foreground mt-1 max-w-40 truncate" title={fixTextEncoding(request.admin_notes)}>{fixTextEncoding(request.admin_notes)}</p>}</td>
                    <td className="p-4"><div className="flex items-center gap-1 text-muted-foreground"><Calendar className="w-3 h-3" /><span className="text-sm">{formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ar })}</span></div><p className="text-xs text-muted-foreground mt-1">{format(new Date(request.created_at), 'yyyy/MM/dd HH:mm')}</p></td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {getStatusActions(request)}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openWhatsApp(request)} title="ÙˆØ§ØªØ³Ø§Ø¨">
                          <MessageCircle className="w-4 h-4 text-success" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => { setDeleteConfirmId(request.id); setDeleteRequest_(request); }} title="Ø­Ø°Ù">
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

      <Dialog open={!!selectedRequest && !!targetStatus} onOpenChange={() => {
        setSelectedRequest(null);
        setTargetStatus(null);
        setAdminNotes('');
        setActivationSlots([]);
        setSelectedActivationSlotId('');
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{targetStatus && getStatusBadge(targetStatus)}ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Ø§Ù„Ø¹Ù…ÙŠÙ„:</span><span className="font-medium">{selectedRequest.customer?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ø§Ù„Ø®Ø¯Ù…Ø©:</span><span className="font-medium">{selectedRequest.service_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ø§Ù„Ø³Ø¹Ø±:</span><span className="font-medium text-primary">{selectedRequest.price} {getCurrencySymbol(selectedRequest.currency)}</span></div>
                {selectedRequest.customer_email && <div className="flex justify-between"><span className="text-muted-foreground">Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„ØªÙØ¹ÙŠÙ„:</span><span className="font-medium text-primary" dir="ltr">{selectedRequest.customer_email}</span></div>}
              </div>

              {(targetStatus === 'rejected' || targetStatus === 'failed') && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3"><p className="text-sm text-warning">Ø³ÙŠØªÙ… Ø§Ø³ØªØ±Ø¯Ø§Ø¯ Ù…Ø¨Ù„Øº {selectedRequest.price} {getCurrencySymbol(selectedRequest.currency)} Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¹Ù…ÙŠÙ„</p></div>
              )}

              {targetStatus === 'activated' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ø§Ø®ØªØ± Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„/Ø§Ù„Ø³Ù„ÙˆØª Ø§Ù„Ù…ØªØ§Ø­ Ù„Ù„ØªÙØ¹ÙŠÙ„</label>
                  {activationSlots.length === 0 ? (
                    <div className="text-sm rounded-lg border border-border bg-muted/40 p-3 text-muted-foreground">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ù„ÙˆØªØ§Øª Ù…Ø´ØªØ±ÙƒØ© Ù…ØªØ§Ø­Ø©. Ø³ÙŠØªÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨ Ø¥Ù† ÙˆØ¬Ø¯.</div>
                  ) : (
                    <select className="input-field" value={selectedActivationSlotId} onChange={(e) => setSelectedActivationSlotId(e.target.value)}>
                      <option value="">Ø§Ø®ØªØ± Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„/Ø§Ù„Ø³Ù„ÙˆØª</option>
                      {activationSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>{slot.email} {slot.slotName ? `- ${slot.slotName}` : ''} ({slot.usersCount})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Ù…Ù„Ø§Ø­Ø¸Ø§Øª (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</label>
                <Textarea placeholder="Ø£Ø¶Ù Ù…Ù„Ø§Ø­Ø¸Ø©..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSelectedRequest(null); setTargetStatus(null); setAdminNotes(''); setActivationSlots([]); setSelectedActivationSlotId(''); }}>Ø¥Ù„ØºØ§Ø¡</Button>
            <Button onClick={handleStatusChange} disabled={isProcessing}>{isProcessing ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />}ØªØ£ÙƒÙŠØ¯</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferRequest} onOpenChange={() => { setTransferRequest(null); setTransferSlots([]); setTransferTargetSlotId(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-primary" />Ù†Ù‚Ù„ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¥Ù„Ù‰ Ø¥ÙŠÙ…ÙŠÙ„ Ø¢Ø®Ø±</DialogTitle>
          </DialogHeader>

          {transferRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Ø§Ù„Ø¹Ù…ÙŠÙ„:</span><span className="font-medium">{transferRequest.customer?.name || 'Ø¹Ù…ÙŠÙ„'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ø§Ù„Ø®Ø¯Ù…Ø©:</span><span className="font-medium">{transferRequest.service_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„Ø­Ø§Ù„ÙŠ:</span><span className="font-medium text-primary" dir="ltr">{transferRequest.linked_login_email || transferRequest.customer_email || '-'}</span></div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„Ø¬Ø¯ÙŠØ¯</label>
                {transferSlots.length === 0 ? (
                  <div className="text-sm rounded-lg border border-border bg-muted/40 p-3 text-muted-foreground">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥ÙŠÙ…ÙŠÙ„Ø§Øª/Ø³Ù„ÙˆØªØ§Øª Ù…ØªØ§Ø­Ø© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø¯Ù…Ø©</div>
                ) : (
                  <select className="input-field" value={transferTargetSlotId} onChange={(e) => setTransferTargetSlotId(e.target.value)}>
                    <option value="">Ø§Ø®ØªØ± Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„Ø¬Ø¯ÙŠØ¯</option>
                    {transferSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>{slot.email} {slot.slotName ? `- ${slot.slotName}` : ''} ({slot.usersCount})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setTransferRequest(null); setTransferSlots([]); setTransferTargetSlotId(''); }}>Ø¥Ù„ØºØ§Ø¡</Button>
            <Button onClick={handleTransferSlot} disabled={isTransfering || !transferTargetSlotId}>{isTransfering ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <ArrowRightLeft className="w-4 h-4 ml-2" />}Ù†Ù‚Ù„</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => { setDeleteConfirmId(null); setDeleteRequest_(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" />Ø­Ø°Ù Ø§Ù„Ø·Ù„Ø¨</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø·Ù„Ø¨ØŸ</p>
          {deleteRequest_ && deleteRequest_.status !== 'activated' && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3"><p className="text-sm text-warning">Ø³ÙŠØªÙ… Ø§Ø³ØªØ±Ø¯Ø§Ø¯ Ù…Ø¨Ù„Øº {deleteRequest_.price} {getCurrencySymbol(deleteRequest_.currency)} Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¹Ù…ÙŠÙ„</p></div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteConfirmId(null); setDeleteRequest_(null); }}>Ø¥Ù„ØºØ§Ø¡</Button>
            <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 ml-2" />Ø­Ø°Ù</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
