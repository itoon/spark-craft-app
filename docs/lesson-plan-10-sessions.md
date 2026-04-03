# CodeCraft Lesson Plan

10 sessions, 1 hour 30 minutes each  
Audience: secondary students (roughly ม.4-ม.6)  
Approach: one project per session, moving from visual UI building to logic, navigation, plugins, and sharing

## Course Goals

By the end of the course, students should be able to:

- build mobile-style screens in Design mode
- connect elements with Code mode
- use inputs, labels, buttons, lists, and navigation
- understand `page.add(...)`, `onClick(...)`, and `page.goTo(...)`
- work with simple state using `.value`, `.text`, `.content`
- preview, test, and share projects with PWA links

---

## Session 1: My First Screen

### Project

Profile Card App

### Learning Focus

- understand the editor layout
- add elements to the canvas
- edit properties
- use `Heading`, `Label`, `Image`, `Card`, `Spacer`

### Outcome

Students build a simple profile screen with picture, name, class, and short bio.

### Suggested Flow

- 15 min: intro to CodeCraft workspace
- 20 min: teacher demo of adding and editing elements
- 40 min: students build the profile card
- 15 min: share and reflect

### Homework / Extension

Change the screen into a favorite artist, athlete, or game character card.

---

## Session 2: Interactive Buttons

### Project

Mood Button App

### Learning Focus

- add `Button`, `Label`, `Heading`
- enter Code mode
- use `page.add(...)`
- write first `onClick(...)`
- update text using `.content`

### Outcome

Students make buttons like Happy, Sad, Excited, Sleepy and update a label when clicked.

### Sample Challenge

When clicking each button, show a different message in the result label.

---

## Session 3: Simple Calculator

### Project

Two-Number Calculator

### Learning Focus

- use `Input`, `Label`, `Button`
- read `.value`
- convert text to numbers
- show result using `.content`

### Outcome

Students build addition, subtraction, multiplication, and division buttons.

### Suggested Stretch

Show an error message when dividing by zero.

---

## Session 4: Quiz App

### Project

One-Page Quiz Checker

### Learning Focus

- use `Checkbox`, `Radio`, `Label`, `Button`
- compare answers
- show score and feedback

### Outcome

Students create a 3-5 question quiz with a Check Answer button.

### Suggested Stretch

Use color or badges to show correct / incorrect results.

---

## Session 5: Daily Planner

### Project

Mini Planner App

### Learning Focus

- use `DatePicker`, `Textarea`, `Label`, `Separator`, `Spacer`
- structure content clearly on screen
- collect user input and display summary

### Outcome

Students make a planner screen where they choose a date and write a short task plan.

### Suggested Stretch

Add a button that displays: “Your plan for [date] is ready.”

---

## Session 6: Multi-Page Story App

### Project

Choose Your Adventure Story

### Learning Focus

- create multiple pages
- use `page.goTo(...)`
- connect buttons to different story endings

### Outcome

Students build a branching story with at least 3 pages.

### Suggested Stretch

Make one good ending and one bad ending.

---

## Session 7: Shop Menu App

### Project

Snack Shop Ordering Screen

### Learning Focus

- use `List`, `Card`, `Segment`, `Badge`, `Button`
- organize app content visually
- build selection flow with logic

### Outcome

Students create a small snack menu and show the chosen item in a result label.

### Suggested Stretch

Use tabs or segments such as Drinks, Snacks, Desserts.

---

## Session 8: Smart Device Controller

### Project

Home Control Panel

### Learning Focus

- use `Toggle`, `Range`, `Label`, `Icon`
- simulate device state changes
- update labels based on controls

### Outcome

Students build a control panel for fan speed, room lights, or air conditioner settings.

### Suggested Stretch

Show text like “Light is ON” or “Fan speed = 80”.

---

## Session 9: Camera and Media App

### Project

Photo Booth Starter

### Learning Focus

- use `Camera`, `Button`, `Label`
- understand plugin-like behavior
- open and close camera with code
- discuss browser permissions and testing conditions

### Outcome

Students build a simple app where clicking a button opens the camera view.

### Example Code Goal

```js
var camera1 = new Camera('page1_camera1');
var button1 = new Button('page1_button1');

page.add(camera1);
page.add(button1);

button1.onClick(() => {
  camera1.open();
});
```

### Suggested Stretch

Add a second button to close the camera.

---

## Session 10: Final Project and Share Day

### Project

Student Choice App

### Learning Focus

- plan app flow
- combine design + code
- debug with console
- run preview and share with PWA link

### Outcome

Students create and present one complete mini app using skills from previous sessions.

### Suggested Project Choices

- study timer
- mood journal
- mini food order app
- class voting app
- travel checklist
- simple health tracker

### Presentation Goal

Each student or pair should show:

- what the app does
- what elements they used
- one code part they understand well
- one challenge they solved

---

## Recommended Session Structure

Use this same rhythm each week:

- 10 min: review last session
- 15 min: teacher demo
- 45 min: student build time
- 10 min: debugging / help checkpoints
- 10 min: showcase or reflection

---

## Skills Map By Session

- Session 1: layout and property editing
- Session 2: buttons and click events
- Session 3: input and output logic
- Session 4: conditions and checking answers
- Session 5: forms and structured content
- Session 6: multi-page navigation
- Session 7: organizing data visually
- Session 8: simulated controls and dynamic feedback
- Session 9: plugin thinking and browser permissions
- Session 10: independent app design and presentation

---

## Assessment Ideas

- build completion
- screen layout quality
- correct use of elements
- correct use of `page.add(...)`
- correct use of `onClick(...)`
- correct use of `.value`, `.content`, or `.text`
- presentation clarity

---

## Teacher Notes

- Keep Session 1-3 very guided.
- Let students personalize visuals early to keep motivation high.
- From Session 6 onward, allow more creative freedom.
- Pair programming works especially well for Session 9 and Session 10.
- Use the share link often so students feel they are building real apps for phones.
