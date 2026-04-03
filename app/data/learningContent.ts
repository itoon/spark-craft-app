export type LearningBlock =
  | {
      id: string;
      type: "text";
      content: string;
    }
  | {
      id: string;
      type: "tip" | "note" | "warning";
      content: string;
    }
  | {
      id: string;
      type: "bullet-list";
      items: string[];
    }
  | {
      id: string;
      type: "tags";
      items: string[];
    }
  | {
      id: string;
      type: "code";
      title?: string;
      language?: string;
      code: string;
    }
  | {
      id: string;
      type: "image";
      src: string;
      alt?: string;
      caption?: string;
    }
  | {
      id: string;
      type: "youtube";
      videoId: string;
      title?: string;
      caption?: string;
      thumbnail?: string;
    };

export interface LearningPage {
  id: string;
  title: string;
  heroImage: string;
  heroAlt?: string;
  blocks: LearningBlock[];
}

export interface LearningContentDocument {
  title: string;
  pages: LearningPage[];
}

export const learningContent: LearningContentDocument = {
  title: "Calculator App",
  pages: [
    {
      id: "welcome",
      title: "Welcome to CodeCraft",
      heroImage:
        "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400&h=225&fit=crop",
      heroAlt: "Calculator tutorial cover",
      blocks: [
        {
          id: "welcome-text",
          type: "text",
          content:
            "In this tutorial you will build a fully working Calculator app from scratch using the CodeCraft visual editor. No prior coding knowledge is required. Just follow each step.",
        },
        {
          id: "welcome-tip",
          type: "tip",
          content:
            "Each step builds on the last. Take your time and experiment freely.",
        },
        {
          id: "welcome-tags",
          type: "tags",
          items: ["Beginner", "Calculator"],
        },
      ],
    },
    {
      id: "design-canvas",
      title: "The Design Canvas",
      heroImage:
        "https://images.unsplash.com/photo-1545665277-5937489579f2?w=400&h=225&fit=crop",
      heroAlt: "Design canvas concept",
      blocks: [
        {
          id: "canvas-text",
          type: "text",
          content:
            "The center area is your Design Canvas. This is where your app takes shape. You can drag elements from the panel into the phone screen and arrange them in order.",
        },
        {
          id: "canvas-list",
          type: "bullet-list",
          items: [
            "Use the left panel to learn each step",
            "Use the center to design the UI",
            "Use the right panel to edit properties",
          ],
        },
        {
          id: "canvas-note",
          type: "note",
          content:
            "Try dragging a Button element onto the canvas now to get a feel for it.",
        },
      ],
    },
    {
      id: "logic-example",
      title: "Writing the Logic",
      heroImage:
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop",
      heroAlt: "Code tutorial",
      blocks: [
        {
          id: "logic-text",
          type: "text",
          content:
            "Switch to the Code tab at the top. For each button, write logic that reads the two input values, performs the math operation, and writes the result to the result box.",
        },
        {
          id: "logic-image",
          type: "image",
          src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop",
          alt: "Code example screenshot",
          caption: "Click the image to see a larger example.",
        },
        {
          id: "logic-youtube",
          type: "youtube",
          videoId: "dQw4w9WgXcQ",
          title: "Watch a walkthrough",
          caption: "Click to open the video in a larger overlay.",
        },
        {
          id: "logic-code",
          type: "code",
          title: "Code Example",
          language: "javascript",
          code: `// Define addition function
function addOperation() {
  // Add the numbers together and show the result in the result box
  result.text = number1.value + number2.value;
}

// Run the function when additionButton is clicked
additionButton.onClick(addOperation);`,
        },
        {
          id: "logic-warning",
          type: "warning",
          content:
            "Fill the inputs and click the button to run the function and check the mission.",
        },
      ],
    },
    {
      id: "export-share",
      title: "Export & Share",
      heroImage:
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop",
      heroAlt: "Export and share",
      blocks: [
        {
          id: "export-text",
          type: "text",
          content:
            "Use PWA Link to create a shareable preview URL, or use Export Local to generate a local Ionic project for further development.",
        },
        {
          id: "export-note",
          type: "note",
          content:
            "Congratulations on finishing your first CodeCraft app. Try building something new next.",
        },
        {
          id: "export-tags",
          type: "tags",
          items: ["Export", "Deploy", "Share"],
        },
      ],
    },
  ],
};
