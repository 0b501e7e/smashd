import { API_BASE_URL } from './apiConstants';

interface ApiOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const api = {
    /**
     * Generic fetch wrapper that handles authentication headers and 401 redirects.
     */
    fetch: async (endpoint: string, options: ApiOptions = {}): Promise<Response> => {
        // Only access localStorage on client side
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Handle full URLs or relative paths
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            if (response.status === 401) {
                // Token expired or invalid
                console.warn('Token expired or invalid, redirecting to login...');

                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');

                    // Only redirect if we are not already on the login page
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login';
                    }
                }

                // Throw proper error to abort subsequent processing
                throw new Error('Session expired');
            }

            return response;
        } catch (error) {
            // Re-throw so callers can handle network errors, or the session expired error
            throw error;
        }
    },

    get: (endpoint: string, options: ApiOptions = {}) => {
        return api.fetch(endpoint, { ...options, method: 'GET' });
    },

    post: (endpoint: string, data: any, options: ApiOptions = {}) => {
        return api.fetch(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    put: (endpoint: string, data: any, options: ApiOptions = {}) => {
        return api.fetch(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    patch: (endpoint: string, data: any, options: ApiOptions = {}) => {
        return api.fetch(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    delete: (endpoint: string, options: ApiOptions = {}) => {
        return api.fetch(endpoint, { ...options, method: 'DELETE' });
    },
};
