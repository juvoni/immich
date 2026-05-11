<script lang="ts">
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import type { AssetResponseDto } from '@immich/sdk';
  import { toastManager } from '@immich/ui';
  import { mdiPlusBoxOutline } from '@mdi/js';

  interface Props {
    asset: AssetResponseDto;
  }

  let { asset }: Props = $props();
  let loading = $state(false);
  let text = $derived(loading ? 'Adding to Social Inbox...' : 'Add to Social Inbox');

  const addToSocialInbox = async () => {
    if (loading) {
      return;
    }

    loading = true;

    try {
      const response = await fetch('/social/api/inbox-items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ asset_id: asset.id, source: 'immich_menu' }),
      });

      if (response.status === 401) {
        toastManager.danger('Sign in to Immich first.');
        return;
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Unable to add asset to Social Inbox (${response.status})`);
      }

      toastManager.primary(
        {
          description: 'Added to Social Inbox',
          button: { label: 'Open Inbox', onclick: () => window.location.assign('/social/inbox') },
        },
        { timeout: 5000 },
      );
    } catch (error) {
      console.error('[playa-lens-social-inbox-action]', error);
      toastManager.danger('Unable to add asset to Social Inbox.');
    } finally {
      loading = false;
    }
  };
</script>

<MenuOption {text} icon={mdiPlusBoxOutline} onClick={addToSocialInbox} />
