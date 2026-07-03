<script lang="ts">
  import MenuOption from '$lib/components/shared-components/context-menu/MenuOption.svelte';
  import type { AssetResponseDto } from '@immich/sdk';
  import { IconButton, toastManager } from '@immich/ui';
  import { mdiImageSearch } from '@mdi/js';

  interface Props {
    asset: AssetResponseDto;
    menuItem?: boolean;
  }

  interface PlSimilarClient {
    open: (assetId: string, options?: { sourceTitle?: string }) => void;
  }

  let { asset, menuItem = true }: Props = $props();

  const text = 'Find Playa Lens similar media';
  const client = (): PlSimilarClient | undefined => (globalThis as { __plSimilar?: PlSimilarClient }).__plSimilar;

  const openSimilarMedia = () => {
    const pl = client();
    if (!pl) {
      toastManager.danger('Similar media helper not loaded. Reload Immich.');
      return;
    }

    pl.open(asset.id, { sourceTitle: asset.originalFileName || asset.id });
  };
</script>

{#if menuItem}
  <MenuOption {text} icon={mdiImageSearch} onClick={openSimilarMedia} />
{:else}
  <IconButton
    aria-label={text}
    title={text}
    color="secondary"
    variant="ghost"
    shape="round"
    icon={mdiImageSearch}
    onclick={openSimilarMedia}
  />
{/if}
