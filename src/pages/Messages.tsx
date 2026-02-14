import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MessageLog, MessageTemplate } from '@/types';
import { Mail, MessageCircle, Send, FileText, MoreVertical, Plus, Settings } from 'lucide-react';

// Mock templates
const mockTemplates: MessageTemplate[] = [
  {
    id: '1',
    channel: 'email',
    name: 'تنبيه قرب انتهاء الاشتراك',
    subject: 'اشتراكك سينتهي قريباً',
    body: 'مرحباً {{customer_name}}، اشتراكك في {{plan_name}} سينتهي خلال {{days_left}} يوم.',
    active: true,
  },
  {
    id: '2',
    channel: 'whatsapp',
    name: 'تأكيد الدفع',
    body: 'تم استلام دفعتك بنجاح ✅\nالمبلغ: {{amount}} {{currency}}\nشكراً لك 🌟',
    whatsappTemplateName: 'payment_confirmation',
    active: true,
  },
  {
    id: '3',
    channel: 'email',
    name: 'رسالة ترحيب',
    subject: 'مرحباً بك في خدمتنا',
    body: 'مرحباً {{customer_name}}، نرحب بك في {{plan_name}}. تاريخ بداية اشتراكك: {{subscription_start_date}}',
    active: true,
  },
];

// Mock logs
const mockLogs: MessageLog[] = [
  {
    id: '1',
    customerId: '1',
    customerName: 'أحمد محمد الصالح',
    channel: 'email',
    templateId: '1',
    templateName: 'تنبيه قرب انتهاء الاشتراك',
    content: 'اشتراكك سينتهي خلال 3 أيام...',
    status: 'sent',
    sentAt: new Date('2024-03-15T10:30:00'),
  },
  {
    id: '2',
    customerId: '2',
    customerName: 'سارة أحمد العلي',
    channel: 'whatsapp',
    templateId: '2',
    templateName: 'تأكيد الدفع',
    content: 'تم استلام دفعتك بنجاح...',
    status: 'sent',
    sentAt: new Date('2024-03-15T09:15:00'),
  },
  {
    id: '3',
    customerId: '3',
    customerName: 'خالد عبدالله النمر',
    channel: 'email',
    templateId: '3',
    templateName: 'رسالة ترحيب',
    content: 'مرحباً بك في خدمتنا...',
    status: 'failed',
    error: 'عنوان البريد غير صالح',
    sentAt: new Date('2024-03-14T14:20:00'),
  },
  {
    id: '4',
    customerId: '4',
    customerName: 'منى السعيد',
    channel: 'whatsapp',
    templateId: '2',
    templateName: 'تأكيد الدفع',
    content: 'تم استلام دفعتك بنجاح...',
    status: 'queued',
    sentAt: new Date('2024-03-15T11:00:00'),
  },
];

const Messages = () => {
  const [templates] = useState<MessageTemplate[]>(mockTemplates);
  const [logs] = useState<MessageLog[]>(mockLogs);
  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');

  const templateColumns = [
    {
      key: 'template',
      header: 'القالب',
      render: (template: MessageTemplate) => (
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg ${
              template.channel === 'email'
                ? 'bg-primary/10 text-primary'
                : 'bg-success/10 text-success'
            }`}
          >
            {template.channel === 'email' ? (
              <Mail className="w-5 h-5" />
            ) : (
              <MessageCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{template.name}</p>
            <p className="text-xs text-muted-foreground">
              {template.channel === 'email' ? 'بريد إلكتروني' : 'واتساب'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'الموضوع',
      render: (template: MessageTemplate) => (
        <span className="text-muted-foreground">
          {template.subject || template.whatsappTemplateName || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (template: MessageTemplate) => (
        <span
          className={`status-badge ${template.active ? 'status-active' : 'status-paused'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {template.active ? 'مفعّل' : 'معطّل'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <button className="p-2 rounded-lg hover:bg-muted transition-colors">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      ),
      className: 'w-12',
    },
  ];

  const logColumns = [
    {
      key: 'message',
      header: 'الرسالة',
      render: (log: MessageLog) => (
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg ${
              log.channel === 'email'
                ? 'bg-primary/10 text-primary'
                : 'bg-success/10 text-success'
            }`}
          >
            {log.channel === 'email' ? (
              <Mail className="w-5 h-5" />
            ) : (
              <MessageCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{log.templateName}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {log.content}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'العميل',
      render: (log: MessageLog) => (
        <span className="text-foreground">{log.customerName}</span>
      ),
    },
    {
      key: 'sentAt',
      header: 'وقت الإرسال',
      render: (log: MessageLog) => (
        <span className="text-muted-foreground">
          {log.sentAt.toLocaleString('ar-SA')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (log: MessageLog) => <StatusBadge status={log.status} />,
    },
    {
      key: 'error',
      header: 'الخطأ',
      render: (log: MessageLog) => (
        <span className="text-destructive text-sm">{log.error || '-'}</span>
      ),
    },
  ];

  return (
    <MainLayout>
      <Header
        title="الرسائل"
        subtitle="إدارة القوالب وسجل الإرسال"
        showAddButton
        addButtonLabel="إنشاء قالب"
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">رسائل مرسلة</p>
            <p className="text-2xl font-bold text-success">
              {logs.filter((l) => l.status === 'sent').length}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">في الانتظار</p>
            <p className="text-2xl font-bold text-warning">
              {logs.filter((l) => l.status === 'queued').length}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">فشلت</p>
            <p className="text-2xl font-bold text-destructive">
              {logs.filter((l) => l.status === 'failed').length}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">القوالب النشطة</p>
            <p className="text-2xl font-bold text-primary">
              {templates.filter((t) => t.active).length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'templates'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              القوالب
            </div>
            {activeTab === 'templates' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'logs'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              سجل الإرسال
            </div>
            {activeTab === 'logs' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button className="mr-auto btn-ghost">
            <Settings className="w-4 h-4" />
            إعدادات المزودات
          </button>
        </div>

        {/* Content */}
        {activeTab === 'templates' ? (
          <DataTable
            columns={templateColumns}
            data={templates}
            keyExtractor={(template) => template.id}
          />
        ) : (
          <DataTable
            columns={logColumns}
            data={logs}
            keyExtractor={(log) => log.id}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Messages;
