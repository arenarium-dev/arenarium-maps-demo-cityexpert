import type { SearchRequest } from '$lib/types';

export function getDefaultSearch(): SearchRequest {
	return {
		cityId: 1,
		rentOrSale: 'r',
		searchSource: 'regular',
		sort: 'datedsc'
	};
}

export function getSearchFurnishedLabel(furnished: number): string {
	switch (furnished) {
		case 0:
			return 'Namešten';
		case 1:
			return 'Polunamešten';
		case 3:
			return 'Prazan';
		default:
			return '';
	}
}
