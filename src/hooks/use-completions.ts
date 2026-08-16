import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const COMPLETIONS_KEY = ['completions'];
const STORAGE_KEY = 'user_completions_list';

function getCompletions(): number[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as number[]; } catch { return []; }
}

function setCompletions(ids: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
}

export function useCompletions() {
  const queryClient = useQueryClient();

  const { data: completedIds = [] } = useQuery({
    queryKey: COMPLETIONS_KEY,
    queryFn: async () => {
      try {
        const res = await fetch('/api/completions', { credentials: 'include' });
        if (res.ok) return await res.json();
      } catch {}
      return getCompletions();
    },
    staleTime: 1000 * 60,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ assignmentId, completed }: { assignmentId: number; completed: boolean }) => {
      const current = getCompletions();
      const updated = completed
        ? current.filter(id => id !== assignmentId)
        : [...current, assignmentId];
      setCompletions(updated);

      try {
        const method = completed ? 'DELETE' : 'POST';
        await fetch(`/api/completions/${assignmentId}`, { method, credentials: 'include' });
      } catch {}

      return updated;
    },
    onMutate: async ({ assignmentId, completed }) => {
      await queryClient.cancelQueries({ queryKey: COMPLETIONS_KEY });
      const previous = queryClient.getQueryData<number[]>(COMPLETIONS_KEY);
      queryClient.setQueryData<number[]>(COMPLETIONS_KEY, (old: number[] = []) =>
        completed ? old.filter(id => id !== assignmentId) : [...old, assignmentId]
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(COMPLETIONS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY });
    },
  });

  const toggle = (assignmentId: number, currentCompleted: boolean) => {
    toggleMutation.mutate({ assignmentId, completed: currentCompleted });
  };

  return { completedIds, toggle, isToggling: toggleMutation.isPending };
}
