/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        constants: false,
        crypto: false,
        os: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
        util: false,
        querystring: false,
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
      }
      
      // Ignore problematic modules
      config.resolve.alias = {
        ...config.resolve.alias,
        encoding: false,
        'iconv-lite': false,
      }
      
      // Add plugins to provide globals
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      )
      
      // Ignore specific warnings
      config.ignoreWarnings = [
        /Module not found: Can't resolve 'encoding'/,
      ]
    }
    return config
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ZEGOCLOUD_APP_ID: process.env.ZEGOCLOUD_APP_ID,
    ZEGOCLOUD_SERVER_SECRET: process.env.ZEGOCLOUD_SERVER_SECRET,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
    CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
  },
}

module.exports = nextConfig
