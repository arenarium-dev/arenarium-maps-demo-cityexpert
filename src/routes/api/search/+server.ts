import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const searchUrl = `https://cityexpert.rs/api/Search/Map?${event.url.searchParams.toString()}`;
	const searchResponse = await fetch(searchUrl);
	const searchJson = await searchResponse.json();
	return json(searchJson);
};
