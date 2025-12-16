/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone', // Enable standalone output for Docker
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb'
        }
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'yt3.ggpht.com',
                pathname: '**',
            },
        ],
    },
};

export default nextConfig;
