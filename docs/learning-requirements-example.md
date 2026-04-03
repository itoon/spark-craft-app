# Learning Requirement Checks

Use `requirements` on each learning page to block `Continue` until the student completes the task.

## Supported Rule Types

### 1. `element-count`
Checks the design canvas structure.

```ts
{
  id: "need-button",
  type: "element-count",
  pageId: "page1",
  elementType: "Button",
  minCount: 1,
  message: "Please add at least 1 Button to Page 1."
}
```

### 2. `element-props`
Checks element props without caring about element id.

Use `"__exists__"` when you only want to check that a prop exists and is not empty.

```ts
{
  id: "input-needs-placeholder",
  type: "element-props",
  pageId: "page1",
  elementType: "Input",
  minCount: 1,
  props: {
    placeholder: "__exists__"
  },
  message: "Please add an Input with a placeholder."
}
```

```ts
{
  id: "button-label-next",
  type: "element-props",
  pageId: "page1",
  elementType: "Button",
  minCount: 1,
  props: {
    label: "Next"
  },
  message: "Please create a Button with label 'Next'."
}
```

### 3. `runtime-added`
Checks whether student code actually adds that type to the page with `page.add(...)`.

```ts
{
  id: "button-added-runtime",
  type: "runtime-added",
  pageId: "page1",
  elementType: "Button",
  minCount: 1,
  message: "Please add a Button to the runtime page using page.add(...)."
}
```

### 4. `runtime-handler`
Checks whether runtime instances have an event handler such as `onClick(...)`.

```ts
{
  id: "button-click-handler",
  type: "runtime-handler",
  pageId: "page1",
  elementType: "Button",
  event: "onClick",
  minCount: 1,
  message: "Please attach onClick(...) to at least 1 Button."
}
```

### 5. `code-pattern`
Checks whether the page code contains a string or matches a regex.

Simple string match:

```ts
{
  id: "uses-goto",
  type: "code-pattern",
  pageId: "page1",
  pattern: "page.goTo(",
  mode: "includes",
  message: "Please use page.goTo(...)."
}
```

Regex match:

```ts
{
  id: "declares-function",
  type: "code-pattern",
  pageId: "page1",
  pattern: "function\\s+addOperation\\s*\\(",
  mode: "regex",
  flags: "i",
  message: "Please declare function addOperation(...)."
}
```

## Full Example

```ts
requirements: [
  {
    id: "step1-button-count",
    type: "element-count",
    pageId: "page1",
    elementType: "Button",
    minCount: 1,
    message: "Please add at least 1 Button to Page 1."
  },
  {
    id: "step1-button-label",
    type: "element-props",
    pageId: "page1",
    elementType: "Button",
    minCount: 1,
    props: {
      label: "__exists__"
    },
    message: "The Button should have a label."
  },
  {
    id: "step1-button-added-runtime",
    type: "runtime-added",
    pageId: "page1",
    elementType: "Button",
    minCount: 1,
    message: "Please add the Button with page.add(...)."
  },
  {
    id: "step1-has-onclick",
    type: "runtime-handler",
    pageId: "page1",
    elementType: "Button",
    event: "onClick",
    minCount: 1,
    message: "Please attach onClick(...) to the Button."
  },
  {
    id: "step1-code-pattern",
    type: "code-pattern",
    pageId: "page1",
    pattern: ".onClick(",
    mode: "includes",
    message: "Your code should include .onClick(...)."
  }
]
```

## Admin Notes

- Rules do not depend on specific element ids.
- `element-count` and `element-props` check the design canvas.
- `runtime-added` and `runtime-handler` check the executed page code.
- `code-pattern` checks the source code text directly.
- If a rule is not met, the student cannot continue to the next learning page.
