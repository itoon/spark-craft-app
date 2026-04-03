import { describe, expect, it } from "vitest";

import {
  buildDefaultPageCode,
  buildExportFolderName,
  buildIonicProjectFiles,
} from "../../app/utils/ionicExport";
import type { AppElement, Page } from "../../app/composables/useEditorStore";

function makeElement(
  id: string,
  pageId: string,
  type: string,
  props: Record<string, unknown> = {},
  parentId: string | null = null,
  children: string[] = [],
): AppElement {
  return {
    id,
    pageId,
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    props,
    parentId,
    children,
  };
}

describe("ionic export generator", () => {
  it("builds scaffold code from root-level page elements only", () => {
    const pageElements: AppElement[] = [
      makeElement("page1_toolbar1", "page1", "Toolbar"),
      makeElement("page1_container1", "page1", "Container", {}, null, ["page1_button1"]),
      makeElement("page1_button1", "page1", "Button", { label: "Tap" }, "page1_container1"),
    ];

    const code = buildDefaultPageCode(pageElements);

    expect(code).toContain("const toolbar1 = new Toolbar('page1_toolbar1')");
    expect(code).toContain("const container1 = new Container('page1_container1')");
    expect(code).not.toContain("page1_button1");
  });

  it("builds an Ionic Vue + Capacitor project scaffold", () => {
    const pages: Page[] = [
      { id: "page1", name: "Page 1" },
      { id: "page2", name: "Page 2" },
    ];
    const elements: AppElement[] = [
      makeElement("page1_toolbar1", "page1", "Toolbar", { title: "Home" }),
      makeElement("page1_container1", "page1", "Container", {}, null, ["page1_button1"]),
      makeElement("page1_button1", "page1", "Button", { label: "Go" }, "page1_container1"),
      makeElement("page2_container1", "page2", "Container"),
    ];

    const files = buildIonicProjectFiles({
      appName: "CodeCraft Demo",
      pages,
      elements,
      jsCodeByPage: {
        page1: "const toolbar1 = new Toolbar('page1_toolbar1')\npage.add(toolbar1)",
      },
      startPageId: "page1",
    });

    const packageFile = files.find((file) => file.path === "package.json");
    const routerFile = files.find((file) => file.path === "src/router/index.ts");
    const dataFile = files.find((file) => file.path === "src/data/codecraft-app.ts");
    const runtimeFile = files.find((file) => file.path === "src/runtime/codecraft-runtime.ts");

    expect(packageFile?.content).toContain('"@ionic/vue": "latest"');
    expect(packageFile?.content).toContain('"@capacitor/core": "latest"');
    expect(routerFile?.content).toContain("redirect: '/page1'");
    expect(routerFile?.content).toContain("path: '/page2'");
    expect(dataFile?.content).toContain("const toolbar1 = new Toolbar('page1_toolbar1')");
    expect(dataFile?.content).toContain("const container1 = new Container('page2_container1')");
    expect(runtimeFile?.content).toContain("goTo(pageId: string)");
    expect(runtimeFile?.content).toContain("function collectTree(rootId: string)");
  });

  it("creates a stable export folder name", () => {
    const folderName = buildExportFolderName(
      "My Ionic App",
      new Date("2026-04-03T10:20:30.000Z"),
    );

    expect(folderName).toBe("my-ionic-app-2026-04-03T10-20-30-000Z");
  });
});
