import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '../../api/services';
import { queryKeys } from '../../lib/queryClient';
import type { BusinessParty, Customer360Data } from '../../types/admin';

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export function useCustomersList(params: CustomerQueryParams = {}) {
  const { page = 1, limit = 15, search = '', status } = params;

  return useQuery({
    queryKey: queryKeys.customers.list({ page, limit, search, status }),
    queryFn: async () => {
      const res = await crmApi.listCustomers({ page, limit, search, status });
      const data = res.data?.data;
      return {
        items: (data?.items || []) as BusinessParty[],
        total: (data?.total || 0) as number,
        totalPages: (data?.totalPages || 1) as number,
        page: (data?.page || page) as number,
        limit: (data?.limit || limit) as number,
      };
    },
    staleTime: 3 * 60 * 1000, // 3 minutes stale time
    placeholderData: (previousData) => previousData, // Seamless pagination with zero layout shift
  });
}

export function useCustomerDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await crmApi.getCustomer(id);
      return (res.data?.data || null) as BusinessParty | null;
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomer360(id?: string) {
  return useQuery({
    queryKey: queryKeys.customers.customer360(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await crmApi.getCustomer360(id);
      return (res.data?.data || null) as Customer360Data | null;
    },
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCustomerMutations() {
  const queryClient = useQueryClient();

  const invalidateCustomers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
  };

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await crmApi.deleteCustomer(id);
      return res.data;
    },
    onSuccess: () => {
      invalidateCustomers();
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await crmApi.createCustomer(payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateCustomers();
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await crmApi.updateCustomer(id, data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.customer360(variables.id) });
      invalidateCustomers();
    },
  });

  return {
    deleteCustomer: deleteCustomerMutation.mutateAsync,
    isDeleting: deleteCustomerMutation.isPending,
    createCustomer: createCustomerMutation.mutateAsync,
    isCreating: createCustomerMutation.isPending,
    updateCustomer: updateCustomerMutation.mutateAsync,
    isUpdating: updateCustomerMutation.isPending,
    invalidateCustomers,
  };
}
