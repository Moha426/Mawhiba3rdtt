import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';

const COMPLETIONS_KEY = ['completions'];
const GUEST_KEY = 'guest-completions';

function getGuestCompletions(): number[] {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]') as number[]; } catch { return []; }
}

function setGuestCompletions(ids: number[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(ids)); } catch {}
}

export function useCompletions() {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  const { data: completedIds = [] } = useQuery({
    queryKey: COMPLETIONS_KEY,
    queryFn: async () => {
      if (!isSignedIn) return getGuestCompletions();
      const res = await fetch('/api/completions', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch completions');
      return res.json() as Promise<number[]>;
    },
    enabled: true,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ assignmentId, completed }: { assignmentId: number; completed: boolean }) => {
      if (!isSignedIn) {
        const current = getGuestCompletions();
        const updated = completed
          ? current.filter(id => id !== assignmentId)
          : [...current, assignmentId];
        setGuestCompletions(updated);
        return updated;
      }
      const method = completed ? 'DELETE' : 'POST';
      const res = await fetch(`/api/completions/${assignmentId}`, {
        method,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Toggle failed');
      try { return await res.json(); } catch { return null; }
    },
    onMutate: async ({ assignmentId, completed }) => {
      await queryClient.cancelQueries({ queryKey: COMPLETIONS_KEY });
      const previous = queryClient.getQueryData<number[]>(COMPLETIONS_KEY);
      queryClient.setQueryData<number[]>(COMPLETIONS_KEY, (old = []) =>
        completed ? old.filter(id => id !== assignmentId) : [...old, assignmentId]
      );
      return { previous };
    },
    onError: (_err: unknown, _vars: unknown, context: { previous?: number[] } | undefined) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(COMPLETIONS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY });
    },
  });

  return {
    completedIds,
    toggle: (assignmentId: number, completed: boolean) =>
      toggleMutation.mutateAsync({ assignmentId, completed }),
    isPending: toggleMutation.isPending,
  };
}
