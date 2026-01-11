import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/utils'
import { AxiosError } from 'axios'
import type { EditorState, EditorPayload, FileState } from '@/types/api.d'

/**
 * Callback type for editor cache updates
 */
type EditorCacheCallback = () => void;

export function useEditorState() {
    const fetch = async (): Promise<EditorState> => {
        const { data } = await http().get('editor')

        return data.data
    }

    return useQuery({
        queryKey: ['editor'],
        queryFn: () => fetch(),
        retry: 3,
        refetchOnWindowFocus: false,
        refetchOnMount: false
    })
}

export function useEditorMutator() {
    const update = async (payload: EditorPayload): Promise<EditorState> => {
        const { data } = await http().post('editor', payload)

        return data.data
    }

    const queryClient = useQueryClient()

    return useMutation<EditorState, AxiosError, EditorPayload>({
        mutationKey: ['editor'],
        mutationFn: update,
        onSuccess: (data) => {
            queryClient.setQueryData(['editor'], data)
        }
    })
}

export function useEditorCache() {
    const queryClient = useQueryClient()

    const update = (filename: string, data: Partial<FileState>, callback?: EditorCacheCallback): void => {
        queryClient.setQueryData(['editor'], (oldState: EditorState | undefined) => {
            if (!oldState) return []

            return JSON.parse(JSON.stringify(oldState)).map(
                (file: FileState) => {
                    if (file.name === filename) {
                        file = Object.assign(file, data)
                    }

                    return file
                }
            )
        })

        // Execute callback if provided
        if (callback) {
            callback()
        }
    }

    return {
        update
    }
}
