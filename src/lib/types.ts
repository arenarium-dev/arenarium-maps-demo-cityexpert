export interface MapSearchRequest {
	cityId: number;
	rentOrSale: 'r' | 's';
	ptId?: number[];
	searchSource?: 'regular';
	sort?: 'datedsc' | 'dateasc' | 'pricedsc' | 'priceasc';
	isFeatured?: boolean;
	furnished?: number[];
}

export interface MapSearchItem {
	mapLat: number;
	mapLng: number;
	propId: string;
	ptId: number;
	rentOrSale: string;
}

export interface MapSearchItemDetails {
	propId: number;
	isLux: boolean;
	hideProperty: boolean;
	brandedSpace: boolean;
	caseRating: string;
	caseType: string;
	caseId: number;
	cityId: number;
	underConstruction: boolean;
	rentOrSale: 'r' | 's';
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
		coverImage: string;
		imgFiles: string[];
		imageFiles: string[];
	};
}

export type MapSearchResult = MapSearchItem[];
