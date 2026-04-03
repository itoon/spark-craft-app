export interface CodeCraftPageDefinition {
  id: string;
  name: string;
}

export interface CodeCraftElement {
  id: string;
  pageId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
  parentId: string | null;
  children: string[];
}

export const appName = "CodeCraft Ionic App";
export const startPageId = "page1";
export const pages = [
  {
    "id": "page1",
    "name": "Page 1"
  }
] satisfies CodeCraftPageDefinition[];
export const elements = [
  {
    "id": "page1_container1",
    "pageId": "page1",
    "type": "Container",
    "x": 0,
    "y": 0,
    "width": 393,
    "height": 852,
    "props": {
      "direction": "col",
      "gap": 16,
      "padding": 16,
      "backgroundColor": "transparent"
    },
    "parentId": null,
    "children": [
      "page1_card1"
    ],
    "direction": "col"
  },
  {
    "id": "page1_toolbar1",
    "pageId": "page1",
    "type": "Toolbar",
    "x": 0,
    "y": 0,
    "width": 340,
    "height": 56,
    "props": {
      "title": "My App",
      "showBack": false,
      "backgroundColor": "#3880ff"
    },
    "parentId": null,
    "children": []
  },
  {
    "id": "page1_card1",
    "pageId": "page1",
    "type": "Card",
    "x": 0,
    "y": 0,
    "width": 300,
    "height": 120,
    "props": {
      "title": "Card Title",
      "subtitle": "Subtitle",
      "backgroundColor": "#ffffff"
    },
    "parentId": "page1_container1",
    "children": []
  }
] satisfies CodeCraftElement[];
export const codeByPage = {
  "page1": "// --- Connect elements to the page ---\n\nvar toolbar1 = new Toolbar('page1_toolbar1');\npage.add(toolbar1);\n\nvar container1 = new Container('page1_container1');\npage.add(container1);\n\nvar card1 = new Card('page1_card1');\npage.add(card1);"
} satisfies Record<string, string>;
