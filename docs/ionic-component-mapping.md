# Ionic Component Mapping

This project now renders the main canvas elements with `@ionic/vue` components where a direct match exists.

## Mapped Elements

| Design Element | Ionic Vue Component | Main Attrs Kept |
| --- | --- | --- |
| `Toolbar` | `IonToolbar` + `IonTitle` | `title`, `showBack`, `backgroundColor` |
| `Button` | `IonButton` | `label`, `fill`, `backgroundColor`, `borderRadius` |
| `Searchbar` | `IonSearchbar` | `placeholder`, `value`, `backgroundColor` |
| `LabelledInput` | `IonInput` | `label`, `value`, `placeholder` |
| `Input` | `IonInput` | `value`, `placeholder` |
| `RangeInput` | `IonRange` | `min`, `max`, `value`, `color` |
| `Checkbox` | `IonCheckbox` + `IonLabel` | `label`, `checked`, `color` |
| `RadioButton` | `IonRadioGroup` + `IonRadio` + `IonLabel` | `label`, `selected`, `color` |
| `Toggle` | `IonToggle` + `IonLabel` | `content`, `fontSize`, `on`, `color` |
| `Select` | `IonSelect` + `IonSelectOption` | `placeholder`, `options`, `value`, `interface` |
| `Card` | `IonCard` + `IonCardHeader` + `IonCardTitle` + `IonCardSubtitle` + `IonCardContent` | `title`, `subtitle`, `backgroundColor` |
| `List` | `IonList` + `IonItem` + `IonLabel` | `items`, `backgroundColor` |
| `Segment` | `IonSegment` + `IonSegmentButton` + `IonLabel` | `options`, `selected`, `color` |
| `Badge` | `IonBadge` | `text`, `color` |
| `Chip` | `IonChip` + `IonLabel` | `label`, `color`, `outline` |
| `Spinner` | `IonSpinner` | `color` |
| `Heading` | `IonLabel` | `text`, `level`, `color` |
| `Label` | `IonLabel` | `content`, `fontSize`, `color` |
| `TextBox` / `Textarea` | `IonTextarea` | `content`, `placeholder`, `fontSize`, `textAlign`, `wrap`, `color` |
| `Image` | `IonImg` | `src`, `borderRadius` |

## Custom / Partial Mapping

These elements are still custom because the requested import list does not include a direct Ionic match, or because the editor needs special layout behavior:

| Design Element | Status | Reason |
| --- | --- | --- |
| `Container` | Custom | Layout-only editor wrapper, no direct Ionic container component |
| `FloatingActionButton` | Partial custom | `IonFab` / `IonFabButton` were not included in the requested import list |
| `DateTimePicker` | Custom fallback | `IonDatetime` was not included in the requested import list |
| `Separator` | Custom | No direct Ionic separator component in the requested list |
| `Spacer` | Custom | Layout helper only |
| `Link` | Custom | Uses plain anchor-style text behavior |
| `Camera` | Custom | Plugin/runtime preview card, not a base Ionic form/display component |
| `Icon` | Not mapped | `IonIcon` needs the `ionicons` icon set and icon-name mapping, which this app does not currently provide |

## Attribute Scope

To keep the editor simple for students, the attr set stays shallow:

- color
- font size
- label/content text
- value
- placeholder
- radius
- basic options like `fill`, `outline`, `selected`, `checked`, `on`

The editor intentionally does **not** expose deeper Ionic props yet.
