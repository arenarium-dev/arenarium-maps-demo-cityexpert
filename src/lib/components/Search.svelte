<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	import IconSliders from '@lucide/svelte/icons/sliders-horizontal';

	const categories = [
		{ value: 'izdavanje', label: 'Izdavanje' },
		{ value: 'prodaja', label: 'Prodaja' }
	];
	let category = $state(categories[0].value);
	let categoryLabel = $derived(categories.find((c) => c.value === category)?.label ?? '');

	const cities = [
		{ value: '1', label: 'Beograd' },
		{ value: '2', label: 'Novi Sad' },
		{ value: '3', label: 'Niš' }
	];
	let city = $state(cities[0].value);
	let cityLabel = $derived(cities.find((c) => c.value === city)?.label ?? '');

	let locations = $state<{ id: string; name: string }[]>([]);
	let locationValues = $state<string[]>([]);

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
</script>

<Dialog.Root>
	<Dialog.Trigger
		type="button"
		class={[
			buttonVariants({ variant: 'outline' }),
			'max-w-156 grow cursor-pointer justify-start gap-3 border border-gray-100 bg-gray-50! px-4 font-medium text-muted-foreground'
		]}
	>
		<span class="grow text-start">{categoryLabel} stanova, {cityLabel}</span>
		<IconSliders class="w-5" />
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-100">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">Pretraga</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-2">
			<Select.Root type="single" bind:value={category}>
				<Select.Trigger class="w-full gap-3">
					<span class="grow text-start">{categoryLabel}</span>
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
					<span class="grow text-start">{cityLabel}</span>
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
			<Select.Root type="multiple" bind:value={locationValues}>
				<Select.Trigger class="w-full gap-3">
					<span class="grow text-start">
						{locationValues.length == 0 ? 'Lokacija' : locationValues.join(', ')}
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
		</div>
		<Dialog.Footer>
			<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
				Resetuj
			</Dialog.Close>
			<Button type="submit">Pretraži</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
