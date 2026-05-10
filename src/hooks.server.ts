import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	const acceptHeader = event.request.headers.get('accept') ?? '';

	const isNotFound = response.status === 404;
	const isHtmlNavigation = acceptHeader.includes('text/html');
	const isApiRoute = event.url.pathname.startsWith('/api');

	if (isNotFound && isHtmlNavigation && !isApiRoute) {
		return Response.redirect(new URL('/', event.url), 302);
	}

	return response;
};
