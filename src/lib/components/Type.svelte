<script lang="ts">
	let props: { type: number } = $props();

	const objectPositionY = $derived.by(() => {
		switch (props.type.toString()) {
			case '5':
			case '3':
				return '-15%';
			default:
				return '-20%';
		}
	});
</script>

<img
	class="size-full overflow-hidden rounded-full object-cover"
	style="object-position: 0% {objectPositionY};"
	loading="lazy"
	decoding="async"
	src={`https://cityexpert.rs/icons/map/pin_${props.type}.png`}
	alt={props.type.toString()}
/>
