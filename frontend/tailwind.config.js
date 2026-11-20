/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        marfil: '#F7F5EF',
        'marfil-oscuro': '#ECE8DD',
        tinta: '#152D39',
        'tinta-suave': '#214252',
        turquesa: '#126F7C',
        'turquesa-claro': '#E5F2F4',
        coral: '#D98164',
        'coral-claro': '#FBF0EC'
      },
      fontFamily: {
        editorial: ['"Fraunces"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
};
