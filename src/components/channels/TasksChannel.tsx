import { useState } from 'react';
import { Plus, Check, Clock, User } from 'lucide-react';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface TasksChannelProps {
  channel: Channel;
  onToggleMembers?: () => void;
  showMembers?: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  dueDate?: Date;
  createdAt: Date;
}

const priorityColors = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-red-500/20 text-red-400',
};

const priorityLabels = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

export function TasksChannel({ channel, onToggleMembers, showMembers }: TasksChannelProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const tasks: Task[] = [];

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'pending') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <StreamlineTasks className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h2 className="font-semibold text-foreground truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">
          <div className="flex rounded-md border border-border overflow-hidden">
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 sm:px-3 py-1 text-xs sm:text-sm transition-colors',
                  filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <span className="hidden sm:inline">{f === 'all' ? 'Toutes' : f === 'pending' ? 'En cours' : 'Terminées'}</span>
                <span className="sm:hidden">{f === 'all' ? 'All' : f === 'pending' ? '⏳' : '✓'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Task */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Ajouter une tâche..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTaskTitle.trim()) {
                // Create task
                setNewTaskTitle('');
              }
            }}
            className="flex-1"
          />
          <Button disabled={!newTaskTitle.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <StreamlineTasks className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune tâche</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajoutez des tâches pour organiser le travail de votre équipe.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'p-4 hover:bg-muted/30 cursor-pointer transition-colors',
                  task.completed && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    className={cn(
                      'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      task.completed
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground hover:border-primary'
                    )}
                  >
                    {task.completed && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      'font-medium',
                      task.completed && 'line-through text-muted-foreground'
                    )}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className={cn('text-xs', priorityColors[task.priority])}>
                        {priorityLabels[task.priority]}
                      </Badge>
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {task.dueDate.toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {task.assignee && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          {task.assignee}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
