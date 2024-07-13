/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{html,js,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                'vs-gray': {
                    100: '#111215',
                    200: '#22252a', // 34, 37, 42
                    300: '#292c34',
                    400: '#2d3035',
                    500: '#343841',
                    600: '#757980',
                    700: '#b1b4b9',
                    800: '#d8dadf',
                },
                'vs-blue': {
                    100: '#5776c6',
                    200: '#5f8af7',
                },
                theme: {
                    'font-one': '#d8dadf',
                    'font-two': '#b1b4b9',
                    'font-three': '#757980',
                    'background-one': '#111215',
                },
            },
        },
    },
    variants: {
        extend: {
            // Enable before and after variants for backgroundColor, width, etc.
            backgroundColor: ['before', 'active'],
            width: ['before'],
            inset: ['before'],
        },
    },
    plugins: [],
};
