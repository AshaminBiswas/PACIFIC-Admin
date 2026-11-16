import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesQuotationsApi } from '../../api/salesQuotationsApi';
import { queryKeys } from '../../lib/queryClient';
import type { SalesQuotation } from '../../types/admin';

export interface QuotationsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  branch?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useQuotationsList(params: QuotationsQueryParams = {}) {
  const {
    page = 1,
    limit = 50,
    search = '',
    status = 'ALL',
    branch = 'ALL',
    sortBy = 'date',
    sortOrder = 'desc',
  } = params;

  return useQuery({
    queryKey: queryKeys.quotations.list({ page, limit, search, status, branch, sortBy, sortOrder }),
    queryFn: async () => {
      const apiParams: Record<string, any> = {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      };
      if (status !== 'ALL') apiParams.status = status;
      if (branch !== 'ALL') apiParams.branch = branch;

      const res = await salesQuotationsApi.list(apiParams);
      const data = res.data?.data;
      const items = (data?.items || []) as SalesQuotation[];
      const total = (data?.total ?? (data as any)?.pagination?.total ?? items.length) as number;
      const totalPages = (data?.totalPages ?? (data as any)?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / limit))) as number;

      return {
        items,
        total,
        totalPages,
        page,
        limit,
      };
    },
    staleTime: 3 * 60 * 1000, // 3 minutes fresh
    placeholderData: (previousData) => previousData, // Seamless pagination with zero layout shift
  });
}

export function useQuotationDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.quotations.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await salesQuotationsApi.getById(id);
      return (res.data?.data || null) as SalesQuotation | null;
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuotationMutations() {
  const queryClient = useQueryClient();

  const invalidateQuotations = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const deleteQuotationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await salesQuotationsApi.delete(id);
      return res.data;
    },
    onSuccess: () => {
      invalidateQuotations();
    },
  });

  const convertToPIMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await salesQuotationsApi.convertToPI(id);
      return res.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proforma.all });
      invalidateQuotations();
    },
  });

  return {
    deleteQuotation: deleteQuotationMutation.mutateAsync,
    isDeleting: deleteQuotationMutation.isPending,
    convertToPI: convertToPIMutation.mutateAsync,
    isConvertingToPI: convertToPIMutation.isPending,
    invalidateQuotations,
  };
}
