<template>
  <div class="ds-notfound">
    <p class="ds-notfound__code">404</p>
    <p class="ds-notfound__text">这个地址没有对应的页面。</p>
    <router-link class="ds-notfound__link" to="/">回到工作台</router-link>
  </div>
</template>

<style scoped>
.ds-notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-3);
  width: 100%;
  height: 100%;
  background: var(--ds-surface);
}

.ds-notfound__code {
  margin: 0;
  font-size: var(--ds-fs-display);
  line-height: var(--ds-lh-display);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text-primary);
  font-variant-numeric: tabular-nums;
}

.ds-notfound__text {
  margin: 0;
  font-size: var(--ds-fs-body);
  line-height: var(--ds-lh-body);
  color: var(--ds-text-secondary);
}

.ds-notfound__link {
  font-size: var(--ds-fs-compact);
  color: var(--ds-text-primary);
}
</style>
