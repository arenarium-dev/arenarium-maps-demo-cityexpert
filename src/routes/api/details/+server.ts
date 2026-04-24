import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const dataUrl = `https://cityexpert.rs/api/propertyView/${event.url.searchParams.get('id')}/r`;
	const dataResponse = await event.fetch(dataUrl);
	const dataJson = await dataResponse.json();
	return json(dataJson);
};
