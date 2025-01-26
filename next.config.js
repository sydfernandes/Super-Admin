/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.compraonline.alcampo.es',
        pathname: '/images-v3/**',
      },
      {
        protocol: 'https',
        hostname: 'sgfm.elcorteingles.es',
        pathname: '/SGFM/dctm/MEDIA03/**',
      },
      {
        protocol: 'https',
        hostname: 'www.carrefour.es',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'prod-mercadona.imgix.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.grupocarrefour.es',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.elcorteingles.es',
        pathname: '/supermercado/**',
      },
      {
        protocol: 'https',
        hostname: 'tienda.mercadona.es',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dia.es',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sfgm.elcorteingles.es',
        pathname: '/**',
      }
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 