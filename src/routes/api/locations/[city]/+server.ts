import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const dataUrl = `https://cityexpert.rs/api/Polygon/getList/${event.params.city}`;
	const dataResponse = await event.fetch(dataUrl);
	const dataJson = await dataResponse.json();
	return json(dataJson);
};
