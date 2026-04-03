<template>
  <ion-page>
    <ion-header v-if="toolbarElement">
      <ion-toolbar :style="toolbarStyle">
        <ion-buttons slot="start" v-if="toolbarElement.props.showBack">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>{{ toolbarElement.props.title || currentPage?.name || 'CodeCraft App' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="page-body">
        <ion-note v-if="runtimeError" color="danger" class="runtime-error">
          {{ runtimeError }}
        </ion-note>

        <CodeCraftRenderer
          v-for="element in bodyElements"
          :key="element.id"
          :element="element"
          :elements-map="elementsMap"
          :click-handlers="clickHandlers"
          @run-click="handleClick"
          @run-input="handleInput"
        />

        <ion-fab
          v-for="element in fabElements"
          :key="element.id"
          :horizontal="String(element.props.horizontalAlignment || 'end')"
          :vertical="String(element.props.verticalAlignment || 'bottom')"
          :edge="Boolean(element.props.edge)"
        >
          <ion-fab-button
            :style="{ '--background': String(element.props.backgroundColor || '#3880ff') }"
            @click="handleClick(element.id)"
          >
            <ion-icon :icon="add" />
          </ion-fab-button>
        </ion-fab>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { add } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import CodeCraftRenderer from '../components/CodeCraftRenderer.vue';
import {
  appName,
  codeByPage,
  elements,
  pages,
  type CodeCraftElement,
} from '../data/codecraft-app';
import { executeCode } from '../runtime/codecraft-runtime';

const props = defineProps<{
  pageId: string;
}>();

const router = useRouter();
const runtimeElements = ref<CodeCraftElement[]>([]);
const clickHandlers = ref<Record<string, () => void>>({});
const runtimeError = ref('');

const currentPage = computed(() => pages.find((page) => page.id === props.pageId));
const pageElements = computed(() => elements.filter((element) => element.pageId === props.pageId));
const elementsMap = computed(() => new Map(runtimeElements.value.map((element) => [element.id, element])));

const toolbarElement = computed(
  () => runtimeElements.value.find((element) => element.type === 'Toolbar' && element.parentId === null) || null,
);

const fabElements = computed(() =>
  runtimeElements.value.filter(
    (element) => element.type === 'FloatingActionButton' && element.parentId === null,
  ),
);

const bodyElements = computed(() =>
  runtimeElements.value.filter(
    (element) =>
      element.parentId === null &&
      element.type !== 'Toolbar' &&
      element.type !== 'FloatingActionButton',
  ),
);

const toolbarStyle = computed(() => ({
  '--background': String(toolbarElement.value?.props.backgroundColor || '#3880ff'),
  '--color': '#ffffff',
}));

watch(
  () => props.pageId,
  () => {
    runPage();
  },
  { immediate: true },
);

function runPage() {
  runtimeError.value = '';
  const baseElements = JSON.parse(JSON.stringify(pageElements.value)) as CodeCraftElement[];
  const code = codeByPage[props.pageId] || '';

  try {
    const result = executeCode(
      code,
      baseElements,
      (id, patch) => {
        runtimeElements.value = runtimeElements.value.map((element) =>
          element.id === id
            ? {
                ...element,
                props: { ...element.props, ...patch },
              }
            : element,
        );
      },
      (targetPageId) => {
        router.push({ name: targetPageId });
      },
    );

    runtimeElements.value = result.pageElements;
    clickHandlers.value = Object.fromEntries(
      result.instances
        .filter((instance) => Boolean(instance.__onClick))
        .map((instance) => [instance.__el.id, instance.__onClick as () => void]),
    );
  } catch (error) {
    runtimeElements.value = baseElements;
    clickHandlers.value = {};
    runtimeError.value = error instanceof Error ? error.message : 'Unknown runtime error';
  }
}

function handleClick(id: string) {
  clickHandlers.value[id]?.();
}

function handleInput(id: string, patch: Record<string, unknown>) {
  runtimeElements.value = runtimeElements.value.map((element) =>
    element.id === id
      ? {
          ...element,
          props: { ...element.props, ...patch },
        }
      : element,
  );
}
</script>

<style scoped>
.page-body {
  position: relative;
  min-height: 100%;
  padding: 16px;
  box-sizing: border-box;
}

.runtime-error {
  display: block;
  margin-bottom: 16px;
}
</style>
