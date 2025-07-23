/**
 * Create a page URL with optional parameters
 * @param pageName - The page name to navigate to
 * @param params - Optional parameters to add as query string
 * @returns The complete URL with parameters
 */
export function createPageUrl(pageName: string, params?: Record<string, any>): string {
    // Validate input
    if (!pageName || typeof pageName !== 'string') {
        console.warn('createPageUrl: Invalid pageName provided:', pageName);
        return '/Welcome'; // Default fallback
    }
    
    // Keep the original case to match route definitions, but handle spaces
    let url = '/' + pageName.trim().replace(/ /g, '-');
    
    // Add query parameters if provided
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                // Convert value to string and trim whitespace
                const stringValue = value.toString().trim();
                if (stringValue) {
                    searchParams.set(key, stringValue);
                }
            }
        });
        
        // Only add query string if we have valid parameters
        const queryString = searchParams.toString();
        if (queryString) {
            url += '?' + queryString;
        }
    }
    
    return url;
}

/**
 * Validate if a page name exists in the application
 * @param pageName - The page name to validate
 * @returns boolean indicating if the page exists
 */
export function isValidPage(pageName: string): boolean {
    const validPages = [
        'Welcome', 'Inspection', 'Sampling', 'AdminDashboard', 
        'InspectionDetails', 'SamplingGuide', 'ThankYou', 
        'MyInspections', 'SignIn', 'SignUp'
    ];
    
    return validPages.includes(pageName);
}

/**
 * Get the current page name from a pathname
 * @param pathname - The current pathname
 * @returns The page name or default
 */
export function getPageFromPath(pathname: string): string {
    if (!pathname) return 'Welcome';
    
    // Remove leading slash and get the first segment
    const segments = pathname.replace(/^\/+/, '').split('/');
    const pageName = segments[0] || 'Welcome';
    
    // Return the page name if valid, otherwise default
    return isValidPage(pageName) ? pageName : 'Welcome';
}