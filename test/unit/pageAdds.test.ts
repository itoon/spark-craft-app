import { describe, expect, it } from "vitest";

import { addElementToCode, findAddedIds, findElementVariables } from "~/utils/pageAdds";

const userCode = `// --- Connect elements to the page ---

var toolbar1 = new Toolbar('page1_toolbar3');
page.add(toolbar1);

var button = new Button('page1_button1')
page.add(button)

var label = new LabelledInput("page1_labelledinput1")
// page.add(label)

button.onClick(() => {
  notify.alert(label.value)
})`;

describe("findAddedIds", () => {
  it("maps variables to ids and only counts real page.add calls", () => {
    expect(findElementVariables(userCode).get("button")).toBe("page1_button1");
    const ids = findAddedIds(userCode);
    expect(ids.has("page1_toolbar3")).toBe(true);
    expect(ids.has("page1_button1")).toBe(true);
    // commented out → not added
    expect(ids.has("page1_labelledinput1")).toBe(false);
  });

  it("understands page.add(new X('id'))", () => {
    expect(findAddedIds("page.add(new Button('page1_button2'));").has("page1_button2")).toBe(true);
  });

  it("ignores a declared but never added element", () => {
    expect(findAddedIds("var b = new Button('page1_button1');").size).toBe(0);
  });
});

describe("addElementToCode", () => {
  it("inserts after the last page.add and keeps handlers below", () => {
    const next = addElementToCode(userCode, "page1_button2", "Button", "button2");
    expect(findAddedIds(next).has("page1_button2")).toBe(true);
    expect(next.indexOf("page.add(button2);")).toBeLessThan(next.indexOf("button.onClick"));
  });

  it("reuses an existing variable instead of declaring it twice", () => {
    const next = addElementToCode(userCode, "page1_labelledinput1", "LabelledInput", "labelledinput1");
    expect(next.includes("var labelledinput1")).toBe(false);
    expect(findAddedIds(next).has("page1_labelledinput1")).toBe(true);
  });

  it("picks a free variable name", () => {
    const code = "var button2 = 5;\n";
    const next = addElementToCode(code, "page1_button2", "Button", "button2");
    expect(next.includes("var button2_2 = new Button('page1_button2');")).toBe(true);
  });

  it("works on empty code", () => {
    expect(addElementToCode("", "page1_map1", "Map", "map1")).toBe("var map1 = new Map('page1_map1');\npage.add(map1);\n");
  });
});
