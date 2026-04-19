<script lang="ts">
	let props: { type: number } = $props();

	function getObjectPositionY(type: number) {
		switch (type.toString()) {
			case '1':
				return 1;
			default:
				return 0;
		}
	}
</script>

<div class="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
	<img
		class="aspect-square scale-[1.1] overflow-hidden rounded-full object-cover"
		style="object-position: 0px {getObjectPositionY(props.type)}px;"
		loading="lazy"
		src="https://cityexpert.rs/icons/map/pin_{props.type}.png"
		alt={props.type.toString()}
	/>
</div>
