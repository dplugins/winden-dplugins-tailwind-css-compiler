import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/utils'
import { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'
import { useEffect, useState } from 'react'

export enum TaskStatus {
    WAITING = 'waiting',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export interface TaskUpdatePayload {
    id?: string
    uuid?: string
    status: string
    styles?: string
    autocomplete?: string
    errors?: string
}

function wait(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function useTaskStatusState() {
    return useQuery({
        queryKey: ['TaskStatus']
    })
}

export function useTaskListState() {
    const fetch = async (): Promise<TaskList> => {
        const { data } = await http().get('tasks')

        return data.data
    }

    return useQuery({
        queryKey: ['tasks'],
        queryFn: () => fetch(),
        retry: 3
    })
}

export function useTaskListMutator() {
    const queryClient = useQueryClient()
    const [payload, setPayload] = useState<TaskUpdatePayload | null>(null);

    useEffect(() => {
        if (payload) {
            updateMutation.mutate();
        }
    }, [payload]);

    const createMutation = useMutation<TaskList, AxiosError<TaskError>>({
        mutationKey: ['tasks'],
        mutationFn: async (): Promise<TaskList> => {
            const { data } = await http().post('tasks', {
                uuid: uuid(),
                status: TaskStatus.WAITING
            });

            queryClient.setQueryData(['TaskStatus'], TaskStatus.WAITING);

            // await wait(3000);

            data.data.push(data.task);
            return data.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['tasks'], data);
            refreshMutation.mutate();
        }
    })

    const refreshMutation = useMutation<TaskList, AxiosError>({
        mutationKey: ['tasks'],
        mutationFn: async (): Promise<TaskList> => {
            const { data } = await http().patch('tasks')

            return data.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['tasks'], data)
        }
    })

    const updateMutation = useMutation<TaskList, AxiosError>({
        mutationKey: ['tasks'],
        mutationFn: async (): Promise<TaskList> => {
            const { data } = await http().post('tasks/update', payload)

            queryClient.setQueryData(['TaskStatus'], payload?.status);

            return data.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['tasks'], data)
        },
        onSettled: () => {
            setPayload(null);
        }
    });

    const update = (payload: TaskUpdatePayload) => {
        setPayload(payload);
    };

    const resetMutation = useMutation<TaskList, AxiosError>({
        mutationKey: ['tasks'],
        mutationFn: async (): Promise<TaskList> => {
            const { data } = await http().delete('tasks')

            queryClient.setQueryData(['TaskStatus'], null);

            return data.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['tasks'], data)
        }
    })

    return {
        createMutation,
        refreshMutation,
        updateMutation,
        update,
        resetMutation
    }
}
