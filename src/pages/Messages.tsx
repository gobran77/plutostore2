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
    name: 'ØªÙ†Ø¨ÙŠÙ‡ Ù‚Ø±Ø¨ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ',
    subject: 'Ø§Ø´ØªØ±Ø§ÙƒÙƒ Ø³ÙŠÙ†ØªÙ‡ÙŠ Ù‚Ø±ÙŠØ¨Ø§Ù‹',
    body: 'Ù…Ø±Ø­Ø¨Ø§Ù‹ {{customer_name}}ØŒ Ø§Ø´ØªØ±Ø§ÙƒÙƒ ÙÙŠ {{plan_name}} Ø³ÙŠÙ†ØªÙ‡ÙŠ Ø®Ù„Ø§Ù„ {{days_left}} ÙŠÙˆÙ….',
    active: true,
  },
  {
    id: '2',
    channel: 'whatsapp',
    name: 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¯ÙØ¹',
    body: 'ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø¯ÙØ¹ØªÙƒ Ø¨Ù†Ø¬Ø§Ø­ âœ…\nØ§Ù„Ù…Ø¨Ù„Øº: {{amount}} {{currency}}\nØ´ÙƒØ±Ø§Ù‹ Ù„Ùƒ ðŸŒŸ',
    whatsappTemplateName: 'payment_confirmation',
    active: true,
  },
  {
    id: '3',
    channel: 'email',
    name: 'Ø±Ø³Ø§Ù„Ø© ØªØ±Ø­ÙŠØ¨',
    subject: 'Ù…Ø±Ø­Ø¨Ø§Ù‹ Ø¨Ùƒ ÙÙŠ Ø®Ø¯Ù…ØªÙ†Ø§',
    body: 'Ù…Ø±Ø­Ø¨Ø§Ù‹ {{customer_name}}ØŒ Ù†Ø±Ø­Ø¨ Ø¨Ùƒ ÙÙŠ {{plan_name}}. ØªØ§Ø±ÙŠØ® Ø¨Ø¯Ø§ÙŠØ© Ø§Ø´ØªØ±Ø§ÙƒÙƒ: {{subscription_start_date}}',
    active: true,
  },
];

// Mock logs
const mockLogs: MessageLog[] = [
  {
    id: '1',
    customerId: '1',
    customerName: 'Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„ØµØ§Ù„Ø­',
    channel: 'email',
    templateId: '1',
    templateName: 'ØªÙ†Ø¨ÙŠÙ‡ Ù‚Ø±Ø¨ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ',
    content: 'Ø§Ø´ØªØ±Ø§ÙƒÙƒ Ø³ÙŠÙ†ØªÙ‡ÙŠ Ø®Ù„Ø§Ù„ 3 Ø£ÙŠØ§Ù…...',
    status: 'sent',
    sentAt: new Date('2024-03-15T10:30:00'),
  },
  {
    id: '2',
    customerId: '2',
    customerName: 'Ø³Ø§Ø±Ø© Ø£Ø­Ù…Ø¯ Ø§Ù„Ø¹Ù„ÙŠ',
    channel: 'whatsapp',
    templateId: '2',
    templateName: 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¯ÙØ¹',
    content: 'ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø¯ÙØ¹ØªÙƒ Ø¨Ù†Ø¬Ø§Ø­...',
    status: 'sent',
    sentAt: new Date('2024-03-15T09:15:00'),
  },
  {
    id: '3',
    customerId: '3',
    customerName: 'Ø®Ø§Ù„Ø¯ Ø¹Ø¨Ø¯Ø§Ù„Ù„Ù‡ Ø§Ù„Ù†Ù…Ø±',
    channel: 'email',
    templateId: '3',
    templateName: 'Ø±Ø³Ø§Ù„Ø© ØªØ±Ø­ÙŠØ¨',
    content: 'Ù…Ø±Ø­Ø¨Ø§Ù‹ Ø¨Ùƒ ÙÙŠ Ø®Ø¯Ù…ØªÙ†Ø§...',
    status: 'failed',
    error: 'Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø¨Ø±ÙŠØ¯ ØºÙŠØ± ØµØ§Ù„Ø­',
    sentAt: new Date('2024-03-14T14:20:00'),
  },
  {
    id: '4',
    customerId: '4',
    customerName: 'Ù…Ù†Ù‰ Ø§Ù„Ø³Ø¹ÙŠØ¯',
    channel: 'whatsapp',
    templateId: '2',
    templateName: 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¯ÙØ¹',
    content: 'ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø¯ÙØ¹ØªÙƒ Ø¨Ù†Ø¬Ø§Ø­...',
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
      header: 'Ø§Ù„Ù‚Ø§Ù„Ø¨',
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
              {template.channel === 'email' ? 'Ø¨Ø±ÙŠØ¯ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' : 'ÙˆØ§ØªØ³Ø§Ø¨'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹',
      render: (template: MessageTemplate) => (
        <span className="text-muted-foreground">
          {template.subject || template.whatsappTemplateName || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Ø§Ù„Ø­Ø§Ù„Ø©',
      render: (template: MessageTemplate) => (
        <span
          className={`status-badge ${template.active ? 'status-active' : 'status-paused'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {template.active ? 'Ù…ÙØ¹Ù‘Ù„' : 'Ù…Ø¹Ø·Ù‘Ù„'}
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
      header: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø©',
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
      header: 'Ø§Ù„Ø¹Ù…ÙŠÙ„',
      render: (log: MessageLog) => (
        <span className="text-foreground">{log.customerName}</span>
      ),
    },
    {
      key: 'sentAt',
      header: 'ÙˆÙ‚Øª Ø§Ù„Ø¥Ø±Ø³Ø§Ù„',
      render: (log: MessageLog) => (
        <span className="text-muted-foreground">
          {log.sentAt.toLocaleString('ar-SA-u-ca-gregory')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Ø§Ù„Ø­Ø§Ù„Ø©',
      render: (log: MessageLog) => <StatusBadge status={log.status} />,
    },
    {
      key: 'error',
      header: 'Ø§Ù„Ø®Ø·Ø£',
      render: (log: MessageLog) => (
        <span className="text-destructive text-sm">{log.error || '-'}</span>
      ),
    },
  ];

  return (
    <MainLayout>
      <Header
        title="Ø§Ù„Ø±Ø³Ø§Ø¦Ù„"
        subtitle="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ ÙˆØ³Ø¬Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„"
        showAddButton
        addButtonLabel="Ø¥Ù†Ø´Ø§Ø¡ Ù‚Ø§Ù„Ø¨"
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ø±Ø³Ø§Ø¦Ù„ Ù…Ø±Ø³Ù„Ø©</p>
            <p className="text-2xl font-bold text-success">
              {logs.filter((l) => l.status === 'sent').length}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">ÙÙŠ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±</p>
            <p className="text-2xl font-bold text-warning">
              {logs.filter((l) => l.status === 'queued').length}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">ÙØ´Ù„Øª</p>
            <p className="text-2xl font-bold text-destructive">
              {logs.filter((l) => l.status === 'failed').length}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ Ø§Ù„Ù†Ø´Ø·Ø©</p>
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
              Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨
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
              Ø³Ø¬Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„
            </div>
            {activeTab === 'logs' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button className="mr-auto btn-ghost">
            <Settings className="w-4 h-4" />
            Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯Ø§Øª
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

