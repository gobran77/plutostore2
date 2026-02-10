import { useState, useRef, useEffect } from 'react';
import {
  Send, Paperclip, Mic, Image as ImageIcon, File as FileIcon,
  Play, Pause, X, Download, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTicketMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface TicketChatProps {
  ticket: SupportTicket;
  isAdmin: boolean;
  senderId?: string;
  onStatusChange?: (status: SupportTicket['status']) => void;
}

export function TicketChat({ ticket, isAdmin, senderId, onStatusChange }: TicketChatProps) {
  const { messages, isLoading, sendMessage, uploadFile } = useTicketMessages(ticket.id);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const actualSenderId = senderId || (isAdmin ? 'admin' : ticket.customer_id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    const success = await sendMessage(
      actualSenderId,
      isAdmin ? 'admin' : 'customer',
      newMessage.trim()
    );
    if (success) {
      setNewMessage('');
    }
    setIsSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSending(true);
    const result = await uploadFile(file);
    if (result) {
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      await sendMessage(
        actualSenderId,
        isAdmin ? 'admin' : 'customer',
        '',
        messageType,
        result.url,
        result.name
      );
    }
    setIsSending(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('لا يمكن الوصول للميكروفون');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setIsSending(true);
    const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    const result = await uploadFile(file);
    if (result) {
      await sendMessage(
        actualSenderId,
        isAdmin ? 'admin' : 'customer',
        '',
        'voice',
        result.url,
        result.name
      );
    }
    setAudioBlob(null);
    setIsSending(false);
  };

  const cancelVoice = () => {
    setAudioBlob(null);
  };

  const renderMessage = (msg: typeof messages[0]) => {
    const isOwnMessage = isAdmin
      ? msg.sender_type === 'admin'
      : msg.sender_type === 'customer';

    return (
      <div
        key={msg.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[75%] rounded-2xl p-3 ${
            isOwnMessage
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          }`}
        >
          {msg.message_type === 'text' && (
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          )}

          {msg.message_type === 'image' && msg.file_url && (
            <div className="space-y-2">
              <img
                src={msg.file_url}
                alt={msg.file_name || 'صورة'}
                className="rounded-lg max-w-full max-h-64 object-contain"
              />
              <a
                href={msg.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs opacity-75 hover:opacity-100"
              >
                <Download className="w-3 h-3" />
                تحميل
              </a>
            </div>
          )}

          {msg.message_type === 'file' && msg.file_url && (
            <a
              href={msg.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-background/20 rounded-lg hover:bg-background/30 transition-colors"
            >
              <FileIcon className="w-8 h-8" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{msg.file_name}</p>
                <p className="text-xs opacity-75">اضغط للتحميل</p>
              </div>
              <Download className="w-4 h-4" />
            </a>
          )}

          {msg.message_type === 'voice' && msg.file_url && (
            <audio controls className="max-w-full">
              <source src={msg.file_url} type="audio/webm" />
              المتصفح لا يدعم تشغيل الصوت
            </audio>
          )}

          <p className={`text-[10px] mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ar })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[60vh]">
      {/* Header with status */}
      {isAdmin && onStatusChange && (
        <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground">
              {ticket.customer?.name} • {ticket.customer?.whatsapp_number}
            </p>
          </div>
          <Select value={ticket.status} onValueChange={(v) => onStatusChange(v as SupportTicket['status'])}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">مفتوحة</SelectItem>
              <SelectItem value="in_progress">قيد المعالجة</SelectItem>
              <SelectItem value="resolved">تم الحل</SelectItem>
              <SelectItem value="closed">مغلقة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            لا توجد رسائل بعد
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice recording preview */}
      {audioBlob && (
        <div className="px-4 py-2 border-t bg-muted/50 flex items-center gap-2">
          <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-10" />
          <Button size="sm" onClick={sendVoiceMessage} disabled={isSending}>
            <Send className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelVoice}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? 'text-destructive animate-pulse' : ''}
            disabled={isSending}
          >
            <Mic className="w-5 h-5" />
          </Button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isSending || isRecording}
          />

          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
