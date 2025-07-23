


export function createPageUrl(pageName: string, params?: Record<string, any>) {
    // Keep the original case to match route definitions, but handle spaces
    let url = '/' + pageName.replace(/ /g, '-');
    
    if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                searchParams.set(key, value.toString());
            }
        });
        url += '?' + searchParams.toString();
    }
    
    return url;
}