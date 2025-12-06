import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/utils'
import { AxiosError } from 'axios'

export function useLicenseState() {
    const fetch = async (): Promise<LicenseState> => {
        const { data } = await http().get('license')

        return data.data
    }

    return useQuery({
        queryKey: ['license'],
        queryFn: () => fetch(),
        retry: 3
    })
}

export function useLicenseMutator() {
    const update = async (payload: LicensePayload): Promise<LicenseState> => {
        const { data } = await http().post('license', payload)

        return data.data
    }

    const queryClient = useQueryClient()

    return useMutation<LicenseState, AxiosError, LicensePayload>({
        mutationKey: ['license'],
        mutationFn: update,
        onSuccess: (data) => {
            queryClient.setQueryData(['license'], data)
        }
    })
}
