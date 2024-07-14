// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

window.addEventListener('DOMContentLoaded', () => {
    // Create a link element for the Tailwind CSS file
    const spinner = document.createElement('div');
    spinner.className =
        'spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full';
    spinner.style.position = 'fixed';
    spinner.style.top = '50%';
    spinner.style.left = '50%';
    spinner.style.transform = 'translate(-50%, -50%)';
    spinner.style.borderTopColor = 'transparent'; // Make the top border transparent
    document.body.appendChild(spinner);
});
