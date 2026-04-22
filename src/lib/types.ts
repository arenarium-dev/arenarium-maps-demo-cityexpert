export interface SearchRequest {
	rentOrSale: string;
	cityId: number;
	sort: string;
	polygonsArray?: string[];
	ptId?: number[];
	structure?: string[];
	minPrice?: number;
	maxPrice?: number;
	minSize?: number;
	maxSize?: number;
	searchSource?: string;
}

export interface SearchItem {
	mapLat: number;
	mapLng: number;
	propId: string;
	ptId: number;
	rentOrSale: string;
}

export interface SearchItemDetails {
	propId: number;
	isLux: boolean;
	hideProperty: boolean;
	brandedSpace: boolean;
	caseRating: string;
	caseType: string;
	caseId: number;
	cityId: number;
	underConstruction: boolean;
	rentOrSale: string;
	price: number;
	firstPublished: string;
	mapLat: number;
	mapLng: number;
	street: string;
	floor: string;
	size: number;
	structure: string;
	ptId: number;
	municipality: string;
	neighbourhoods: string[];
	selectedNeighbourhoods: string[];
	onsite: {
		basInfFurnished: number;
		coverImage: string;
		imgFiles: string[];
		imageFiles: string[];
	};
}

export type SearchResult = SearchItem[];
