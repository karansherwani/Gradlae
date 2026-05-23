import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://adaptive-pace-website.vercel.app';

    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/help', '/feedback', '/privacy', '/terms'],
            disallow: [
                '/dashboard',
                '/advisor',
                '/progress',
                '/profile',
                '/settings',
                '/placements',
                '/quiz',
                '/api/',
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
