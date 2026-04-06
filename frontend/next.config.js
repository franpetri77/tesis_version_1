/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Pasar las imágenes externas sin optimización de Next.js.
    // Unsplash ya sirve imágenes optimizadas con ?w= en la URL,
    // por lo que el optimizador de Next.js no agrega valor y a veces falla.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
    ],
  },
  // Variables de entorno disponibles en el cliente
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_MP_PUBLIC_KEY: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY,
  },
};

module.exports = nextConfig;
