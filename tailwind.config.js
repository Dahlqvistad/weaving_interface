/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{html,js,ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Menlo', 'ui-sans-serif', 'system-ui'],
            },
            colors: {
                status: {
                    0: '#ba3232', // Inactive
                    1: '#6ea84c', // Active
                    2: '#b0b0b0', // Offline
                    3: '#de8240', // Warning
                },
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
                    'background-two': '#22252a',
                    'background-three': '#292c34',
                    'background-four': '#2d3035',
                    'background-five': '#343841',
                    'background-six': '#757980',
                    'background-seven': '#b1b4b9',
                    'background-eight': '#d8dadf',
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
