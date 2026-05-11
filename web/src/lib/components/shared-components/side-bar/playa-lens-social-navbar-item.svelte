<script lang="ts">
  import { Route } from '$lib/route';
  import { Icon, Link } from '@immich/ui';
  import { mdiShareVariantOutline } from '@mdi/js';
</script>

<div>
  <div class="relative flex items-center">
    <Link
      href={Route.playaLensSocialPosts()}
      data-sveltekit-reload
      underline={false}
      class="hover:bg-subtle hover:text-primary flex w-full place-items-center gap-4 rounded-e-full ps-5 py-3 transition-[padding] delay-100 duration-100"
    >
      <div class="relative flex w-full place-items-center gap-4">
        <Icon icon={mdiShareVariantOutline} size="1.375em" class="shrink-0" aria-hidden={true} />
        <span class="truncate text-sm font-medium">Social</span>
      </div>
    </Link>
  </div>
</div>
