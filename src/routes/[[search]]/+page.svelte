<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { SvelteMap } from 'svelte/reactivity';
	import { outerWidth } from 'svelte/reactivity/window';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	import { POPUP_WIDTH } from '$lib/constants';
	import { getDefaultSearch } from '$lib/search';
	import type { SearchItem, SearchItemDetails, SearchRequest, SearchResult } from '$lib/types';

	import Details from '$lib/components/Details.svelte';
	import Search from '$lib/components/Search.svelte';
	import Map from '$lib/components/Map.svelte';

	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

	import SvgLogo from '$lib/assets/logo.svg';

	import IconList from '@lucide/svelte/icons/rows-3';
	import IconMap from '@lucide/svelte/icons/map';
	import IconGlobe from '@lucide/svelte/icons/globe';
	import IconProfile from '@lucide/svelte/icons/user';
	import IconClose from '@lucide/svelte/icons/x';

	let width = $derived(outerWidth.current ?? 0);
	let compact = $derived(width > 0 && width <= 470 + 32);

	let search = $derived<SearchRequest>(getSearchFromPath(page.params.search));
	let searchDialog = $state<SearchRequest>(getSearchFromPath(page.params.search));
	let searchLoadings = $state(0);
	let searchItems: SvelteMap<string, SearchItem> = new SvelteMap();
	let searchItemDetails: SvelteMap<string, SearchItemDetails> = new SvelteMap();
	let searchItemDetailsLoading: SvelteMap<string, boolean> = new SvelteMap();

	let list = $state(false);
	let listElement = $state<HTMLElement>();
	let listElements = $state<HTMLElement[]>([]);
	let listViewport = $state<HTMLElement | null>(null);
	let listObserver: IntersectionObserver | undefined;

	let listItemGapPadding = 32;
	let listItemRatio = 3 / 3;
	let listItemUnit = 16;
	let listItemHeightUnits = $derived.by(() => {
		if (listElement == undefined) return 0;
		if (compact) return width / listItemUnit - 2;

		const listHeight = listElement.clientHeight;
		const listItemRows = Math.round(listHeight / POPUP_WIDTH) > 3 ? 3 : 2;
		const listItemsHeight = listHeight - listItemGapPadding * (2 + (listItemRows - 1));
		const listItemHeight = listItemsHeight / listItemRows;
		return listItemHeight / listItemUnit;
	});
	let listItemWidthUnits = $derived(listItemHeightUnits * listItemRatio);

	let dialogOpen = $state(false);
	let dialogId = $state<string>('');
	let mapReady = $derived(listItemWidthUnits > 0 && listItemHeightUnits > 0);

	$effect(() => {
		return () => {
			// Clean up the list observer when the component is destroyed
			listObserver?.disconnect();
		};
	});

	$effect(() => {
		// Check if the search dialog is changed
		if (searchDialog) {
			untrack(() => {
				// Compare the current search dialog with the default search and update the URL if they differ
				const oldSearch = getPathFromSearch(search);
				const newSearch = getPathFromSearch(searchDialog);
				// Navigate to the new search URL
				if (oldSearch !== newSearch) goto(`/${newSearch}`);
			});
		}
	});

	$effect(() => {
		// When the search page changes
		if (search) {
			untrack(() => {
				// Update the search dialog to match the search page
				searchDialog = search;
				// Update the search items
				updateSearchItems(search);
			});
		}
	});

	function getSearchFromPath(path: string | undefined): SearchRequest {
		return path ? JSON.parse(decodeURIComponent(atob(path))) : getDefaultSearch();
	}

	function getPathFromSearch(search: SearchRequest): string {
		return btoa(encodeURIComponent(JSON.stringify(search)));
	}

	async function updateSearchItems(search: SearchRequest) {
		try {
			// Increase the search loading counter
			searchLoadings++;

			// Fetch the search results from the API
			const searchUrl = `/api/search?req=${encodeURIComponent(JSON.stringify(search))}`;
			const searchResponse = await fetch(searchUrl);
			if (!searchResponse.ok) throw new Error('Failed to search');
			const searchResult: SearchResult = await searchResponse.json();

			// Scroll to the top of the list
			listViewport?.scrollTo({ top: 0, behavior: 'instant' });

			// Clear the search items and details, then populate with the search results
			searchItems.clear();
			searchItemDetails.clear();
			searchResult.forEach((item) => searchItems.set(item.propId.toString(), item));

			// Wait for the next tick to ensure elements are in the DOM
			await tick();

			// Disconnect the list observer before re-creating it
			listObserver?.disconnect();

			// Create the list observer
			if (listElement) {
				listObserver = new IntersectionObserver(onListObserve, {
					root: listElement,
					threshold: 0
				});

				// Observe list elements for intersection changes
				for (const element of listElements) {
					if (element instanceof HTMLElement) {
						listObserver.observe(element);
					}
				}
			}
		} finally {
			// Decrease the search loading counter
			searchLoadings--;
		}
	}

	async function onSearchDetailsRequest(id: string): Promise<void> {
		// Check if the details are loading
		const loading = searchItemDetailsLoading.get(id) ?? false;
		if (loading) return;

		// Check if the details are already loaded
		const loaded = searchItemDetails.has(id);
		if (loaded) return;

		try {
			// Increase the search loading counter and mark the details as loading
			searchLoadings++;
			searchItemDetailsLoading.set(id, true);

			// Fetch the details from the API
			const url = `api/details?id=${id}`;
			const response = await fetch(url);
			if (!response.ok) return;

			// Parse the response and store the details
			const details: SearchItemDetails = await response.json();
			searchItemDetails.set(id, details);
		} finally {
			// Decrease the search loading counter and mark the details as loaded
			searchItemDetailsLoading.set(id, false);
			searchLoadings--;
		}
	}

	function onListObserve(entries: IntersectionObserverEntry[]) {
		if (!listElement) return;

		for (const entry of entries) {
			if (entry.isIntersecting) {
				const id = entry.target.getAttribute('data-id');
				if (!id) continue;

				// Get the scroll position before checking if entries are intersecting
				let scroll = listElement.scrollTop;
				let scrollDelay = 100;

				const processObservation = async () => {
					let scrolling = listElement?.scrollTop != scroll;
					if (scrolling == false) {
						await onSearchDetailsRequest(id);
					} else {
						scroll = listElement?.scrollTop ?? scroll;
						setTimeout(processObservation, scrollDelay);
					}
				};
				setTimeout(processObservation, scrollDelay);
			}
		}
	}

	function onSearchDetailsOpen(id: string): void {
		dialogId = id;
		dialogOpen = true;
	}
</script>

{#if width > 0}
	<div
		class={{
			'fixed top-0 left-0 grid h-full w-full bg-white': true,
			'grid-rows-[60px_1fr_60px]': compact,
			'grid-rows-[96px_1fr]': !compact
		}}
	>
		<!-- Header -->
		<header
			class={{
				'z-1 flex h-full w-full shrink-0 items-center gap-4 overflow-auto bg-white shadow-sm': true,
				'px-4': compact,
				'px-8': !compact
			}}
		>
			<a
				href="https://cityexpert.rs"
				class="flex h-8 shrink-0 items-center justify-center rounded-lg bg-white"
			>
				{#if compact}
					<img src="/favicon.ico" alt="logo" class="m-2" />
				{:else}
					<img src={SvgLogo} alt="logo" class="mx-3 mt-1 w-36" />
				{/if}
			</a>

			<div class="flex grow items-center justify-center">
				<Search searchPage={search} bind:searchDialog />
			</div>

			{#if !compact}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								class=" bg-white! text-muted-foreground"
							>
								<IconGlobe />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="mt-6 mr-4 w-56" align="start">
						<DropdownMenu.Label>Jezik</DropdownMenu.Label>
						<DropdownMenu.Group>
							<DropdownMenu.Item>Srpski</DropdownMenu.Item>
							<DropdownMenu.Item>English</DropdownMenu.Item>
							<DropdownMenu.Item>Russian</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="icon" class=" bg-white! text-muted-foreground">
							<IconProfile />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="mt-6 mr-4 w-56" align="start">
					<DropdownMenu.Label>Moj nalog</DropdownMenu.Label>
					<DropdownMenu.Group>
						<DropdownMenu.Item>Prijavi se</DropdownMenu.Item>
					</DropdownMenu.Group>
					<DropdownMenu.Separator />
					<DropdownMenu.Label>Informacije</DropdownMenu.Label>
					<DropdownMenu.Group>
						<DropdownMenu.Item>Kreditni savetnik</DropdownMenu.Item>
						<DropdownMenu.Item>Cenovnik</DropdownMenu.Item>
						<DropdownMenu.Item>O nama</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			{#if searchLoadings > 0}
				<div
					class="absolute bottom-0 left-0 w-full"
					transition:fade={{ duration: 100, delay: 100 }}
				>
					<Skeleton class="h-0.5 w-full bg-[#df2d43]" />
				</div>
			{/if}
		</header>

		<!-- Main -->
		<div class={{ 'relative flex min-h-0': true, 'gap-8 px-8': !compact }}>
			<!-- List -->
			<div
				bind:this={listElement}
				class={{
					'absolute top-0 left-0 h-full w-full': compact,
					relative: !compact,
					hidden: compact && !list
				}}
			>
				<ScrollArea
					bind:viewportRef={listViewport}
					class="h-full w-full rounded-md"
					scrollbarYClasses="my-8 -mr-4.75 w-2!"
				>
					<div
						class={{
							'grid gap-8': true,
							'grid-cols-1 p-4': compact,
							'grid-cols-2 py-8': !compact
						}}
						style:width={`${listItemWidthUnits * (compact ? 1 : 2) + (compact ? 0 : 2)}rem`}
					>
						{#each searchItems.values() as item, i (item.propId)}
							<div
								bind:this={listElements[i]}
								data-id={item.propId.toString()}
								style:height={`${listItemHeightUnits}rem`}
								style:width={`${listItemWidthUnits}rem`}
							>
								<Details id={item.propId.toString()} data={searchItemDetails} />
							</div>
						{/each}
					</div>
				</ScrollArea>
			</div>

			<!-- Map -->
			<div
				class={{
					'relative grow overflow-hidden bg-white': true,
					'my-8 rounded-2xl': !compact,
					hidden: list
				}}
			>
				{#if mapReady}
					<Map
						{compact}
						{search}
						{searchItems}
						{searchItemDetails}
						{onSearchDetailsRequest}
						{onSearchDetailsOpen}
					/>
				{/if}
				<div
					class={{
						'pointer-events-none absolute top-0 right-0 bottom-0 left-0 inset-shadow-sm': true,
						'rounded-2xl': !compact
					}}
				></div>
			</div>
		</div>

		<!-- Footer -->
		{#if compact}
			<footer class="z-1 h-full w-full shrink-0 border-t bg-white px-4">
				<div class="flex h-full w-full items-center gap-4">
					<Button
						onclick={() => (list = true)}
						variant="ghost"
						class={{
							'grow bg-stone-100 inset-shadow-sm transition-all duration-150': true,
							'bg-[#df2d43] text-white': list
						}}
					>
						<IconList /> Lista
					</Button>
					<Button
						onclick={() => (list = false)}
						variant="ghost"
						class={{
							'grow bg-stone-100 inset-shadow-sm transition-all duration-150': true,
							'bg-[#df2d43] text-white': !list
						}}
					>
						<IconMap /> Mapa
					</Button>
				</div>
			</footer>
		{/if}

		<!-- Details -->
		<Dialog.Root bind:open={dialogOpen}>
			<Dialog.Content
				class={{ 'flex flex-col rounded-3xl! p-2': true, 'max-w-100': !compact }}
				autofocus={false}
				trapFocus={false}
				showCloseButton={false}
			>
				<div style:height={`${listItemHeightUnits}rem`}>
					<Details id={dialogId} data={searchItemDetails} />
				</div>
				<Dialog.Close class="absolute top-3.5 right-3.5">
					<Button variant="ghost" class="size-10 text-white">
						<IconClose class="w-4" strokeWidth={3} />
					</Button>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Root>
	</div>
{/if}
