/**
 * Optimistic Mutation Hook
 *
 * Provides a simplified API for optimistic updates with React Query.
 * Handles rollback on error and cache invalidation.
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

export interface OptimisticMutationOptions<TData, TVariables, TContext = unknown> {
  /** Query key(s) to invalidate on success */
  invalidateKeys?: QueryKey[];
  /** Query key to update optimistically */
  optimisticKey?: QueryKey;
  /** Function to generate optimistic data */
  getOptimisticData?: (variables: TVariables, currentData: TData | undefined) => TData;
  /** Callback after successful mutation */
  onSuccess?: (data: unknown, variables: TVariables) => void;
  /** Callback after failed mutation */
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
  /** Show toast notifications */
  showToasts?: boolean;
  /** Success message for toast */
  successMessage?: string;
  /** Error message for toast */
  errorMessage?: string;
}

/**
 * Hook for creating optimistic mutations
 *
 * Example usage:
 * ```tsx
 * const { mutate, isPending } = useOptimisticMutation({
 *   mutationFn: (task: Task) => updateTask(task),
 *   optimisticKey: ['tasks', spaceId],
 *   getOptimisticData: (newTask, currentTasks) =>
 *     currentTasks?.map(t => t.id === newTask.id ? newTask : t),
 *   invalidateKeys: [['tasks', spaceId]],
 * });
 * ```
 */
export function useOptimisticMutation<TData, TVariables, TResponse = unknown>({
  mutationFn,
  optimisticKey,
  getOptimisticData,
  invalidateKeys = [],
  onSuccess,
  onError,
}: {
  mutationFn: (variables: TVariables) => Promise<TResponse>;
} & OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    // Optimistic update before mutation
    onMutate: async (variables: TVariables) => {
      if (!optimisticKey || !getOptimisticData) {
        return { previousData: undefined };
      }

      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: optimisticKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(optimisticKey);

      // Optimistically update the cache
      queryClient.setQueryData<TData>(optimisticKey, (old) =>
        getOptimisticData(variables, old)
      );

      // Return context with previous data for rollback
      return { previousData };
    },

    // Rollback on error
    onError: (error: Error, variables: TVariables, context) => {
      // Restore previous data if we have it
      if (context?.previousData !== undefined && optimisticKey) {
        queryClient.setQueryData(optimisticKey, context.previousData);
      }

      onError?.(error, variables, context);
    },

    // Always refetch after error or success
    onSettled: async () => {
      // Invalidate related queries to ensure fresh data
      for (const key of invalidateKeys) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
    },

    onSuccess: (data: TResponse, variables: TVariables) => {
      onSuccess?.(data, variables);
    },
  });
}

/**
 * Hook for creating list mutations with optimistic add/remove/update
 */
export function useOptimisticListMutation<TItem extends { id: string }>({
  queryKey,
  addFn,
  updateFn,
  deleteFn,
  invalidateKeys = [],
}: {
  queryKey: QueryKey;
  addFn?: (item: Omit<TItem, 'id'>) => Promise<TItem>;
  updateFn?: (item: TItem) => Promise<TItem>;
  deleteFn?: (id: string) => Promise<void>;
  invalidateKeys?: QueryKey[];
}) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: addFn,
    onMutate: async (newItem: Omit<TItem, 'id'>) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);

      // Add with temporary ID
      const tempItem = {
        ...newItem,
        id: `temp-${Date.now()}`,
      } as TItem;

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) => [...old, tempItem]);

      return { previous, tempId: tempItem.id };
    },
    onError: (_err, _newItem, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (data, _variables, context) => {
      // Replace temp item with real item
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map((item) => (item.id === context?.tempId ? data : item))
      );
    },
    onSettled: async () => {
      for (const key of [queryKey, ...invalidateKeys]) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onMutate: async (updatedItem: TItem) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );

      return { previous };
    },
    onError: (_err, _updatedItem, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: async () => {
      for (const key of [queryKey, ...invalidateKeys]) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.filter((item) => item.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: async () => {
      for (const key of [queryKey, ...invalidateKeys]) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  return {
    add: addMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPending: addMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}

/**
 * Hook for toggle mutations (like marking tasks complete)
 */
export function useOptimisticToggle<TItem extends { id: string }>({
  queryKey,
  toggleField,
  mutationFn,
  invalidateKeys = [],
}: {
  queryKey: QueryKey;
  toggleField: keyof TItem;
  mutationFn: (id: string, value: boolean) => Promise<TItem>;
  invalidateKeys?: QueryKey[];
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => mutationFn(id, value),
    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map((item) =>
          item.id === id ? { ...item, [toggleField]: value } : item
        )
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: async () => {
      for (const key of [queryKey, ...invalidateKeys]) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/**
 * Helper to create offline-aware optimistic mutation
 * Falls back to queue when offline
 */
export function createOfflineOptimisticMutation<TData, TVariables>({
  mutationFn,
  offlineAction,
  ...options
}: {
  mutationFn: (variables: TVariables) => Promise<unknown>;
  offlineAction: {
    type: string;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  };
} & OptimisticMutationOptions<TData, TVariables>) {
  return {
    mutationFn: async (variables: TVariables) => {
      if (!navigator.onLine) {
        // Return a resolved promise - the offline queue will handle it
        return Promise.resolve({ queued: true, variables });
      }
      return mutationFn(variables);
    },
    ...options,
    offlineAction,
  };
}
