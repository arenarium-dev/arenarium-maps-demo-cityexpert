<script lang="ts">
	import { onMount } from 'svelte';

	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	import IconSliders from '@lucide/svelte/icons/sliders-horizontal';
	import IconEuro from '@lucide/svelte/icons/euro';

	// Categories
	const categories = [
		{ value: 'izdavanje', label: 'Izdavanje stanova' },
		{ value: 'prodaja', label: 'Prodaja stanova' }
	];
	let category = $state(categories[0].value);
	let categoryLabel = $derived(categories.find((c) => c.value === category)?.label ?? '');

	// Cities
	const cities = [
		{ value: '1', label: 'Beograd' },
		{ value: '2', label: 'Novi Sad' },
		{ value: '3', label: 'Niš' }
	];
	let city = $state(cities[0].value);
	let cityLabel = $derived(cities.find((c) => c.value === city)?.label ?? '');

	// Sorting
	let sorts = [
		{ value: 'datedsc', label: 'Najnoviji' },
		{ value: 'dateasc', label: 'Najstariji' },
		{ value: 'pricedsc', label: 'Najjeftiniji' },
		{ value: 'priceasc', label: 'Najskuplji' },
		{ value: 'areadsc', label: 'Najmanji' },
		{ value: 'areaasc', label: 'Najveći' }
	];
	let sort = $state<string>(sorts[0].value);
	let sortLabel = $derived(sorts.find((s) => s.value === sort)?.label ?? '');

	// Locations
	let locations = $state<{ id: string; name: string }[]>([]);
	let locationValues = $state<string[]>([]);
	let locationLabel = $derived(
		locationValues.map((l) => locations.find((l2) => l2.id === l)?.name ?? l).join(' ili ')
	);

	$effect(() => {
		// Clear locations
		locations = [];
		// Fetch locations based on the selected city
		fetch(`/api/locations/${city}`)
			.then((res) => res.json())
			.then((data: { id: string; name: string }[]) => {
				locations = data.toSorted((a, b) => a.name.localeCompare(b.name));
			});
	});

	// Types
	let types = [
		{ value: '1', label: 'Stan' },
		{ value: '2', label: 'Kuća' },
		{ value: '5', label: 'Stan u kući' },
		{ value: '4', label: 'Lokal' },
		{ value: '3', label: 'Poslovni prostor' }
	];
	let typeValues = $state<string[]>([]);
	let typeLabel = $derived(
		typeValues.map((t) => types.find((t2) => t2.value === t)?.label ?? t).join(' ili ')
	);

	// Rooms
	let rooms = [
		{ value: '0.5', label: 'Garsonjera' },
		{ value: '1.0', label: 'Jednosoban' },
		{ value: '1.5', label: 'Jednoiposoban' },
		{ value: '2.0', label: 'Dvosoban' },
		{ value: '2.5', label: 'Dvoiposoban' },
		{ value: '3.0', label: 'Trosoban' },
		{ value: '3.5', label: 'Troiposoban' },
		{ value: '4.0', label: 'Četvorosoban' },
		{ value: '4.5', label: 'Četvoroiposoban' },
		{ value: '5+', label: 'Petrosoban i veci' }
	];
	let roomValues = $state<string[]>([]);
	let roomLabel = $derived(
		roomValues.map((r) => rooms.find((r2) => r2.value === r)?.label ?? r).join(' ili ')
	);

	// Prices
	let priceFrom = $state<number | null>(null);
	let priceTo = $state<number | null>(null);

	// Areas
	let areaFrom = $state<number | null>(null);
	let areaTo = $state<number | null>(null);

	// Label
	let label = $state<string>('');

	onMount(() => {
		label = getLabel();
	});

	function getLabel() {
		let label = `${categoryLabel}, ${cityLabel}, ${sortLabel}`;
		if (locationLabel.length) label += `, ${locationLabel}`;
		if (typeLabel.length) label += `, ${typeLabel}`;
		if (roomLabel.length) label += `, ${roomLabel}`;
		if (priceFrom !== null) label += `, od ${priceFrom} €`;
		if (priceTo !== null) label += `, do ${priceTo} €`;
		if (areaFrom !== null) label += `, ${areaFrom} m²`;
		if (areaTo !== null) label += `, do ${areaTo} m²`;
		return label;
	}

	function onOpenChange() {
		label = getLabel();
	}

	function onReset() {
		label = getLabel();
	}
</script>

<Dialog.Root {onOpenChange}>
	<Dialog.Trigger
		type="button"
		class="grid h-9 w-full cursor-pointer grid-cols-[1fr_auto] items-center justify-start gap-3 rounded-lg border border-gray-100 bg-gray-50! px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
	>
		<span class="truncate text-start">{label}</span>
		<IconSliders class="w-4" />
	</Dialog.Trigger>
	<Dialog.Content class="flex flex-col sm:max-w-100">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">Pretraga</Dialog.Title>
		</Dialog.Header>
		<div class="flex w-full max-w-full flex-col gap-2">
			<Select.Root type="single" bind:value={category}>
				<Select.Trigger class="w-full gap-3">
					<span class="grow truncate text-start">{categoryLabel}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Kategorija</Select.Label>
						{#each categories as category (category.value)}
							<Select.Item value={category.value} label={category.label}>
								{category.label}
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
			<Select.Root type="single" bind:value={city}>
				<Select.Trigger class="w-full gap-3">
					<span class="grow truncate text-start">{cityLabel}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Grad</Select.Label>
						{#each cities as city (city.value)}
							<Select.Item value={city.value} label={city.label}>
								{city.label}
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
			<Select.Root type="single" bind:value={sort}>
				<Select.Trigger class="w-full gap-3">
					<span class="grow truncate text-start">{sortLabel}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Redosled</Select.Label>
						{#each sorts as sort (sort.value)}
							<Select.Item value={sort.value} label={sort.label}>
								{sort.label}
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
			<Select.Root type="multiple" bind:value={locationValues}>
				<Select.Trigger class="w-full gap-3">
					<span class="grow truncate text-start">
						{locationLabel.length == 0 ? 'Lokacija' : locationLabel}
					</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Group class="max-h-75">
						<Select.Label>Lokacija</Select.Label>
						{#each locations as location (location.id)}
							<Select.Item value={location.name} label={location.name}>
								{location.name}
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
			<Select.Root type="multiple" bind:value={typeValues}>
				<Select.Trigger class="w-full gap-3">
					<span class="grow truncate text-start">
						{typeLabel.length == 0 ? 'Tip' : typeLabel}
					</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Tip</Select.Label>
						{#each types as type (type.value)}
							<Select.Item value={type.value} label={type.label}>
								{type.label}
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
			<Select.Root type="multiple" bind:value={roomValues}>
				<Select.Trigger class="w-full gap-3">
					<span class="grow truncate text-start">
						{roomLabel.length == 0 ? 'Struktura' : roomLabel}
					</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Struktura</Select.Label>
						{#each rooms as room (room.value)}
							<Select.Item value={room.value} label={room.label}>
								{room.label}
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
			<div class="grid grid-cols-2 gap-2">
				<div class="relative">
					<Input
						bind:value={priceFrom}
						type="number"
						placeholder="Od"
						class="w-full pr-7 text-sm"
					/>
					<IconEuro class="absolute top-2 right-2 size-4 text-muted-foreground" />
				</div>
				<div class="relative">
					<Input bind:value={priceTo} type="number" placeholder="Do" class="w-full pr-7 text-sm" />
					<IconEuro class="absolute top-2 right-2 size-4 text-muted-foreground" />
				</div>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<div class="relative">
					<Input bind:value={areaFrom} type="number" placeholder="Od" class="w-full pr-7 text-sm" />
					<div class="absolute top-2 right-2 text-xs font-semibold text-muted-foreground">
						m<sup>2</sup>
					</div>
				</div>
				<div class="relative">
					<Input bind:value={areaTo} type="number" placeholder="Do" class="w-full pr-7 text-sm" />
					<div class="absolute top-2 right-2 text-xs font-semibold text-muted-foreground">
						m<sup>2</sup>
					</div>
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline">Resetuj</Button>
			<Dialog.Close type="button" class={buttonVariants({ variant: 'default' })}>
				Pretraži
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
