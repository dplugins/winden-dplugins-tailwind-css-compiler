import {type ClassValue, clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'
import axios from 'axios'

export function joinPaths(basePath: string, path = '') {
    return (
        basePath + (path != '' ? '/' + path.replace(new RegExp('^/'), '') : '')
    )
}

export function baseUrl(path = '') {
    return joinPaths(window.windenCommon.baseUrl, path)
}

export function apiUrl(path = '') {
    return joinPaths(window.windenCommon.api.url, path)
}

export function workerUrl(path = '') {
    return joinPaths(window.windenCommon.worker.url, path)
}

export function http() {
    const client = axios.create({
        baseURL: apiUrl()
    })

    client.interceptors.request.use(
        (config) => {
            if (import.meta.env.DEV) {
                const token = localStorage.getItem('auth_token')

                if (token !== null) {
                    config.headers.Authorization = `Basic ${btoa(
                        token.replace(' ', '_')
                    )}`
                }
            }

            config.headers['X-WP-Nonce'] = window.windenCommon.api.nonce

            return config
        },
        (error) => Promise.reject(error)
    )

    return client
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date) {
    let diff = new Date() - date;

    if (diff < 1000) {
        return 'just now';
    }

    let sec = Math.floor(diff / 1000);

    if (sec < 60) {
        const plural = sec === 1 ? 'second' : 'seconds'
        return sec + ` ${plural} ago`;
    }

    let min = Math.floor(diff / 60000);
    if (min < 60) {
        const plural = min === 1 ? 'minute' : 'minutes'
        return min + ` ${plural} ago`;
    }

    let d = date;
    d = [
        '0' + d.getDate(),
        '0' + (d.getMonth() + 1),
        '' + d.getFullYear(),
        '0' + d.getHours(),
        '0' + d.getMinutes()
    ].map(component => component.slice(-2));

    return d.slice(0, 3).join('.') + ' ' + d.slice(3).join(':');
}