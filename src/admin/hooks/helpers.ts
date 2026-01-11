import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/utils'
import { AxiosError } from 'axios'
import type { HelpersState, HelpersPayload } from '@/types/api.d'

export function useHelpersState() {
    const fetch = async (): Promise<HelpersState> => {
        const { data } = await http().get('helper_options')

        return data.data
    }

    return useQuery({
        queryKey: ['helper_options'],
        queryFn: () => fetch(),
        retry: 3
    })
}

export function useHelpersMutator() {
    const update = async (payload: HelpersPayload): Promise<HelpersState> => {
        const { data } = await http().post('helper_options', payload)

        return data.data
    }

    const queryClient = useQueryClient()

    return useMutation<HelpersState, AxiosError, HelpersPayload>({
        mutationKey: ['helper_options'],
        mutationFn: update,
        onSuccess: (data) => {
            queryClient.setQueryData(['helper_options'], data)
        }
    })
}

export function useHelpers() {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
        // Initialize state from localStorage
        const saved = localStorage.getItem('helperSidebarOpen');
        return saved === 'true';
    });

    const toggleSidebar = (callback?: () => void) => {
        setSidebarOpen(!sidebarOpen);
        if (typeof callback === 'function') {
            callback();
        }
        // Update localStorage
        localStorage.setItem('helperSidebarOpen', (!sidebarOpen).toString());
    };

    return {
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar
    }
}
