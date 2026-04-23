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
		case 1:
			return 'Namešten';
		case 2:
			return 'Polunamešten';
		case 3:
			return 'Prazan';
		default:
			return '';
	}
}

export function getSearchLocation(cityId: number): { lat: number; lng: number } {
	switch (cityId) {
		case 1:
			return { lat: 44.8178, lng: 20.4569 };
		case 2:
			return { lat: 45.2396, lng: 19.8227 };
		default:
			return { lat: 43.3209, lng: 21.8954 };
	}
}
