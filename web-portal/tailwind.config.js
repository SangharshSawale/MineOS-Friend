/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { minsos: { 50: '#edf5fb', 100: '#d7eafb', 200: '#b6d8f1', 500: '#0c5c9c', 600: '#0c447c', 700: '#08365f', 900: '#061f38' } } } },
  plugins: []
}
