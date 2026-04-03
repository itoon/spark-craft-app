# CodeCraft Code Cheat Sheet

For students using Code mode in CodeCraft.

## 1. Basic Pattern

```js
var button1 = new Button('page1_button1');
page.add(button1);

button1.onClick(() => {
  console.log('Button clicked');
});
```

## 2. Rules To Remember

- Every element starts with `new ClassName('element_id')`
- Show an element on screen with `page.add(element)`
- If an element is not added with `page.add(...)`, it will not show in Run mode
- Parent `Container` elements are auto-added behind the scenes when needed
- Add click logic with `.onClick(() => { ... })`
- Use `page.goTo('page2')` to move to another page

## 3. Page Object

### `page.add(element)`

Adds an element to the current page.

```js
var heading1 = new Heading('page1_heading1');
page.add(heading1);
```

### `page.goTo(pageIdOrPageName)`

Moves to another page by page id or page name.

```js
button1.onClick(() => {
  page.goTo('page2');
});
```

You can also use a page name:

```js
page.goTo('Page 2');
```

## 4. Console

Use the debug console while learning:

```js
console.log('hello');
console.warn('check this');
console.error('something went wrong');
```

## 5. Common Element Properties

Many elements support these easy properties:

- `.text`
- `.value`
- `.label`
- `.content`
- `.src`
- `.title`
- `.placeholder`

Example:

```js
var input1 = new Input('page1_input1');
page.add(input1);

console.log(input1.value);
```

## 6. Input And Output Example

```js
var number1 = new Input('page1_input1');
var number2 = new Input('page1_input2');
var result = new Label('page1_label1');
var addButton = new Button('page1_button1');

page.add(number1);
page.add(number2);
page.add(result);
page.add(addButton);

addButton.onClick(() => {
  result.content = String(Number(number1.value) + Number(number2.value));
});
```

## 7. Element Classes

### Layout

#### `Toolbar`

```js
var toolbar1 = new Toolbar('page1_toolbar1');
page.add(toolbar1);
```

Used for app title bars.

#### `Card`

```js
var card1 = new Card('page1_card1');
page.add(card1);
```

Used for grouped content.

#### `List`

```js
var list1 = new List('page1_list1');
page.add(list1);
```

Used for item lists.

#### `Segment`

```js
var segment1 = new Segment('page1_segment1');
page.add(segment1);
```

Used for switching between options.

#### `Separator`

```js
var separator1 = new Separator('page1_separator1');
page.add(separator1);
```

Used for divider lines.

#### `Spacer`

```js
var spacer1 = new Spacer('page1_spacer1');
page.add(spacer1);
```

Used to add empty vertical space.

#### `Container`

```js
var container1 = new Container('page1_container1');
```

Usually you do not need to add `Container` in student code because CodeCraft auto-adds parent containers for layout.

### Input

#### `Button`

```js
var button1 = new Button('page1_button1');
page.add(button1);
```

Use `.onClick(...)` for actions.

#### `FAB`

```js
var fab1 = new FAB('page1_floatingactionbutton1');
page.add(fab1);
```

Floating Action Button.

#### `Searchbar`

```js
var searchbar1 = new Searchbar('page1_searchbar1');
page.add(searchbar1);
```

#### `LabelledInput`

```js
var labelledInput1 = new LabelledInput('page1_labelledinput1');
page.add(labelledInput1);
```

#### `Input`

```js
var input1 = new Input('page1_input1');
page.add(input1);
```

#### `Select`

```js
var select1 = new Select('page1_select1');
page.add(select1);
```

#### `Range`

```js
var range1 = new Range('page1_rangeinput1');
page.add(range1);
```

#### `DatePicker`

```js
var date1 = new DatePicker('page1_datetimepicker1');
page.add(date1);
```

#### `Checkbox`

```js
var checkbox1 = new Checkbox('page1_checkbox1');
page.add(checkbox1);
```

#### `Radio`

```js
var radio1 = new Radio('page1_radiobutton1');
page.add(radio1);
```

#### `Toggle`

```js
var toggle1 = new Toggle('page1_toggle1');
page.add(toggle1);
```

### Display

#### `Heading`

```js
var heading1 = new Heading('page1_heading1');
page.add(heading1);
```

#### `Label`

```js
var label1 = new Label('page1_label1');
page.add(label1);
```

Good for short text output.

#### `Textarea`

```js
var textarea1 = new Textarea('page1_textbox1');
page.add(textarea1);
```

Design name is `Textarea`, internal element type is based on the textbox component.

#### `Badge`

```js
var badge1 = new Badge('page1_badge1');
page.add(badge1);
```

#### `Chip`

```js
var chip1 = new Chip('page1_chip1');
page.add(chip1);
```

#### `Spinner`

```js
var spinner1 = new Spinner('page1_spinner1');
page.add(spinner1);
```

#### `Image`

```js
var image1 = new Image('page1_image1');
page.add(image1);
```

#### `Link`

```js
var link1 = new Link('page1_link1');
page.add(link1);
```

#### `Video`

```js
var video1 = new Video('page1_video1');
page.add(video1);
```

#### `Icon`

This element exists in Design mode, but is not available as a runtime class in Code mode right now.

## 8. Simple Navigation Example

```js
var nextButton = new Button('page1_button1');
page.add(nextButton);

nextButton.onClick(() => {
  page.goTo('page2');
});
```

## 9. Simple Form Example

```js
var nameInput = new Input('page1_input1');
var submitButton = new Button('page1_button1');
var resultLabel = new Label('page1_label1');

page.add(nameInput);
page.add(submitButton);
page.add(resultLabel);

submitButton.onClick(() => {
  resultLabel.content = 'Hello ' + nameInput.value;
});
```

## 10. Quick Memory Tips

- `new ClassName('id')` creates the element
- `page.add(...)` shows it
- `.onClick(...)` gives it behavior
- `.value` reads user input
- `page.goTo(...)` changes page
- `console.log(...)` helps debug
