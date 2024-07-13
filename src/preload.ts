// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

window.addEventListener('DOMContentLoaded', () => {
  // Create a link element for the Tailwind CSS file
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './main.css'; // Update this path to where your Tailwind CSS file is located

  // Append the link element to the head of the document
  document.head.appendChild(link);

  // Optionally, inject some HTML content that uses Tailwind CSS classes
  const content = document.createElement('div');
  content.className = 'p-4 max-w-md mx-auto text-center bg-red-700';
  content.innerHTML = `
	<h1 class="text-2xl font-bold mb-4">Hello, World!</h1>
	<p class="mb-4">This is styled with Tailwind CSS.</p>
	<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
	  Click Me
	</button>
  `;
  document.body.appendChild(content);
});
