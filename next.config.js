/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Configure experimental features
  experimental: {
    appDir: false, // Set to true if using app directory
  },
  
  // Configure API routes for file uploads and large payloads
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase to 10MB for appointment slip uploads
    },
    responseLimit: '10mb',
    externalResolver: true,
  },
  
  // Configure image optimization
  images: {
    domains: [
      'localhost',
      'gamca.in',
      'www.gamca.in',
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Configure headers for security and performance
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      {
        // Configure CORS for API routes
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://gamca.in' 
              : 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          }
        ]
      },
      {
        // Configure caching for static assets and uploads
        source: '/uploads/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
  
  // Configure redirects for better UX
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/login',
        permanent: false
      },
      {
        source: '/dashboard',
        destination: '/user/dashboard',
        permanent: false
      }
    ];
  },
  
  // Configure rewrites for clean URLs
  async rewrites() {
    return [
      {
        source: '/appointment',
        destination: '/book-appointment'
      },
      {
        source: '/booking',
        destination: '/book-appointment'
      },
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // Configure webpack for file handling and optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle file uploads and multer on client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Add support for importing .sql files
    config.module.rules.push({
      test: /\.sql$/,
      use: 'raw-loader',
    });
    
    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      },
    };
    
    return config;
  },
  
  // Configure TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Configure ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Configure output for production
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Remove X-Powered-By header for security
  poweredByHeader: false,
  
  // Configure trailing slash
  trailingSlash: false,
  
  // Configure page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Configure compression
  compress: true,
  
  // Configure development settings
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      buildActivity: true,
      buildActivityPosition: 'bottom-right',
    },
  }),
  
  // Configure production settings
  ...(process.env.NODE_ENV === 'production' && {
    generateEtags: true,
    httpAgentOptions: {
      keepAlive: true,
    },
  }),
}

module.exports = nextConfig

