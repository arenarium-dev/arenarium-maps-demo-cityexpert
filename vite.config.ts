import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		// Replace 'your-package-name' with the name of the package
		// that is importing the CSS file.
		noExternal: ['@arenarium/maps-integration-maplibre', 'maplibre-gl']
	}
});
