import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/utils'
import { AxiosError } from 'axios'

export function useSettingsState() {
    const fetch = async (): Promise<SettingsState> => {
        const { data } = await http().get('options')

        return data.data
    }

    return useQuery({
        queryKey: ['options'],
        queryFn: () => fetch(),
        retry: 3
    })
}

export function useSettingsMutator() {
    const update = async (payload: SettingsState): Promise<SettingsState> => {
        const { data } = await http().post('options', payload)

        return data.data
    }

    const queryClient = useQueryClient()

    return useMutation<SettingsState, AxiosError, SettingsState>({
        mutationKey: ['options'],
        mutationFn: update,
        onSuccess: (data) => {
            queryClient.setQueryData(['options'], data)
        }
    })
}
