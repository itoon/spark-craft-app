import type { CodeCraftElement } from '../data/codecraft-app';

export interface RuntimeInstance {
  __el: CodeCraftElement;
  __onClick: (() => void) | null;
  onClick(cb: () => void): RuntimeInstance;
}

export interface RuntimeResult {
  pageElements: CodeCraftElement[];
  instances: RuntimeInstance[];
}

function updateProps(
  elements: CodeCraftElement[],
  id: string,
  patch: Record<string, unknown>,
): CodeCraftElement[] {
  return elements.map((element) =>
    element.id === id
      ? {
          ...element,
          props: { ...element.props, ...patch },
        }
      : element,
  );
}

export function executeCode(
  code: string,
  allElements: CodeCraftElement[],
  onUpdate: (id: string, patch: Record<string, unknown>) => void,
  onNavigate: (pageId: string) => void,
): RuntimeResult {
  const pageElements: CodeCraftElement[] = [];
  const instances: RuntimeInstance[] = [];

  function getElement(id: string, className: string): CodeCraftElement {
    const element = allElements.find((candidate) => candidate.id === id);
    if (!element) {
      throw new Error(`${className}('${id}') could not be found in this exported app.`);
    }
    return JSON.parse(JSON.stringify(element));
  }

  class BaseElement implements RuntimeInstance {
    __el: CodeCraftElement;
    __onClick: (() => void) | null = null;

    constructor(id: string, className: string) {
      this.__el = getElement(id, className);

      for (const propName of ['value', 'label', 'title', 'placeholder', 'text']) {
        Object.defineProperty(this, propName, {
          get: () => {
            return this.__el.props[propName];
          },
          set: (nextValue) => {
            this.__el.props[propName] = nextValue;
            onUpdate(this.__el.id, { [propName]: nextValue });
          },
          configurable: true,
          enumerable: true,
        });
      }
    }

    onClick(cb: () => void) {
      this.__onClick = cb;
      return this;
    }
  }

  function collectTree(rootId: string): CodeCraftElement[] {
    const root = allElements.find((element) => element.id === rootId);
    if (!root) return [];

    return [
      JSON.parse(JSON.stringify(root)),
      ...root.children.flatMap((childId) => collectTree(childId)),
    ];
  }

  const make = (name: string) =>
    class extends BaseElement {
      constructor(id: string) {
        super(id, name);
      }
    };

  const Toolbar = make('Toolbar');
  const Button = make('Button');
  const FAB = make('FAB');
  const Searchbar = make('Searchbar');
  const LabelledInput = make('LabelledInput');
  const Input = make('Input');
  const Select = make('Select');
  const Range = make('Range');
  const DateTimePicker = make('DateTimePicker');
  const Checkbox = make('Checkbox');
  const Radio = make('Radio');
  const Toggle = make('Toggle');
  const Badge = make('Badge');
  const Chip = make('Chip');
  const Spinner = make('Spinner');
  const Image = make('Image');
  const Icon = make('Icon');
  const List = make('List');
  const Card = make('Card');
  const Segment = make('Segment');
  const Container = make('Container');

  const page = {
    add(element: BaseElement) {
      if (!(element instanceof BaseElement)) {
        throw new TypeError('page.add expects an element created by new ClassName(id)');
      }

      for (const item of collectTree(element.__el.id)) {
        if (!pageElements.some((existing) => existing.id === item.id)) {
          pageElements.push(item);
        }
      }
      instances.push(element);
    },
    goTo(pageId: string) {
      onNavigate(pageId);
    },
  };

  const runner = new Function(
    'page',
    'console',
    'Toolbar',
    'Button',
    'FAB',
    'Searchbar',
    'LabelledInput',
    'Input',
    'Select',
    'Range',
    'DateTimePicker',
    'Checkbox',
    'Radio',
    'Toggle',
    'Badge',
    'Chip',
    'Spinner',
    'Image',
    'Icon',
    'List',
    'Card',
    'Segment',
    'Container',
    code,
  );

  runner(
    page,
    console,
    Toolbar,
    Button,
    FAB,
    Searchbar,
    LabelledInput,
    Input,
    Select,
    Range,
    DateTimePicker,
    Checkbox,
    Radio,
    Toggle,
    Badge,
    Chip,
    Spinner,
    Image,
    Icon,
    List,
    Card,
    Segment,
    Container,
  );

  return {
    pageElements,
    instances,
  };
}
