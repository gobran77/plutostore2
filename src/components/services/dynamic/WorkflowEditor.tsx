import { WorkflowStep, WorkflowStage, workflowStageLabels, workflowStageColors } from '@/types/dynamicServices';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  PlusCircle, FileText, CreditCard, CheckCircle, Clock, 
  XCircle, Cog, Package, Flag, Ban, ChevronDown, ChevronUp
} from 'lucide-react';

interface WorkflowEditorProps {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
}

const stageIcons: Record<WorkflowStage, React.ElementType> = {
  created: PlusCircle,
  data_entry: FileText,
  pending_payment: CreditCard,
  payment_received: CheckCircle,
  pending_review: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  in_progress: Cog,
  pending_delivery: Package,
  completed: Flag,
  cancelled: Ban,
};

const defaultSteps: WorkflowStep[] = [
  { stage: 'created', enabled: true, order: 0 },
  { stage: 'data_entry', enabled: true, order: 1 },
  { stage: 'pending_payment', enabled: false, order: 2 },
  { stage: 'payment_received', enabled: false, order: 3 },
  { stage: 'pending_review', enabled: false, order: 4 },
  { stage: 'approved', enabled: false, order: 5 },
  { stage: 'in_progress', enabled: true, order: 6 },
  { stage: 'pending_delivery', enabled: false, order: 7 },
  { stage: 'completed', enabled: true, order: 8 },
];

export const WorkflowEditor = ({ steps, onChange }: WorkflowEditorProps) => {
  // Initialize with default steps if empty
  if (steps.length === 0) {
    onChange(defaultSteps);
    return null;
  }

  const toggleStep = (stage: WorkflowStage) => {
    // Don't allow disabling created and completed
    if (stage === 'created' || stage === 'completed') return;
    
    onChange(steps.map(s => 
      s.stage === stage ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    // Update order values
    newSteps.forEach((s, i) => s.order = i);
    onChange(newSteps);
  };

  const enabledSteps = steps.filter(s => s.enabled);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">مسار سير العمل</Label>
        <p className="text-sm text-muted-foreground mt-1">
          حدد المراحل التي يمر بها الطلب من البداية للنهاية
        </p>
      </div>

      {/* Workflow Preview */}
      <div className="flex flex-wrap items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border">
        {enabledSteps.sort((a, b) => a.order - b.order).map((step, index) => {
          const Icon = stageIcons[step.stage];
          return (
            <div key={step.stage} className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${workflowStageColors[step.stage]}`}>
                <Icon className="w-3.5 h-3.5" />
                {workflowStageLabels[step.stage]}
              </div>
              {index < enabledSteps.length - 1 && (
                <div className="w-4 h-0.5 bg-border" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Configuration */}
      <div className="space-y-2">
        {steps.sort((a, b) => a.order - b.order).map((step, index) => {
          const Icon = stageIcons[step.stage];
          const isRequired = step.stage === 'created' || step.stage === 'completed';

          return (
            <div
              key={step.stage}
              className={`p-3 rounded-xl border transition-all ${
                step.enabled 
                  ? 'border-primary/50 bg-card' 
                  : 'border-border bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                {!isRequired && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveStep(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(index, 'down')}
                      disabled={index === steps.length - 1}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  step.enabled ? workflowStageColors[step.stage] : 'bg-muted'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1">
                  <p className="font-medium text-sm">{workflowStageLabels[step.stage]}</p>
                </div>

                {isRequired ? (
                  <span className="text-xs text-muted-foreground">إجباري</span>
                ) : (
                  <Switch
                    checked={step.enabled}
                    onCheckedChange={() => toggleStep(step.stage)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
