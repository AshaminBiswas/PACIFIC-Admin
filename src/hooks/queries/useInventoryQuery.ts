import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import { queryKeys } from '../../lib/queryClient';
import type {
  BoardInventoryItem,
  BoardSupplier,
  BoardAnalyticsSummary,
  HardwareInventoryItem,
} from '../../types/admin';

export function useBoardInventoryList(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.boards(params),
    queryFn: async () => {
      const res = await boardInventoryApi.list(params);
      const data = res.data?.data;
      return {
        items: (data?.items || []) as BoardInventoryItem[],
        total: (data?.total || 0) as number,
        totalPages: (data?.totalPages || 1) as number,
      };
    },
    staleTime: 3 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useBoardSuppliersQuery() {
  return useQuery({
    queryKey: queryKeys.inventory.boardSuppliers(),
    queryFn: async () => {
      const res = await boardInventoryApi.listSuppliers(false);
      return (res.data?.data || []) as BoardSupplier[];
    },
    staleTime: 30 * 60 * 1000, // Reference data: 30 mins
  });
}

export function useBoardAnalyticsQuery(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.boardAnalytics(),
    queryFn: async () => {
      const res = await boardInventoryApi.getAnalytics(params);
      return (res.data?.data || null) as BoardAnalyticsSummary | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useHardwareInventoryList(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.hardware(params),
    queryFn: async () => {
      const res = await hardwareInventoryApi.list(params);
      const data = res.data?.data;
      return {
        items: (data?.items || []) as HardwareInventoryItem[],
        total: (data?.total || 0) as number,
        totalPages: (data?.totalPages || 1) as number,
      };
    },
    staleTime: 3 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useInventoryMutations() {
  const queryClient = useQueryClient();

  const invalidateBoards = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
  };

  const inwardBoardMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await boardInventoryApi.inward(data);
      return res.data;
    },
    onSuccess: () => {
      invalidateBoards();
    },
  });

  const issueBoardMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await boardInventoryApi.issue(data);
      return res.data;
    },
    onSuccess: () => {
      invalidateBoards();
    },
  });

  return {
    inwardBoard: inwardBoardMutation.mutateAsync,
    isInwarding: inwardBoardMutation.isPending,
    issueBoard: issueBoardMutation.mutateAsync,
    isIssuing: issueBoardMutation.isPending,
    invalidateBoards,
  };
}
