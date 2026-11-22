import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { QuestionVisual } from "./QuestionVisual";

const meta = {
  title: "game/QuestionVisual",
  component: QuestionVisual,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Pictures the child reads in graph, table and measure questions. Drawn from data only (no answer in them). Bars grow in; no motion under reduced motion. No sound.",
      },
    },
  }, // sounds-note
  args: { visual: { kind: "bars" } },
  decorators: [
    (Story) => (
      <div className="h-[260px] w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuestionVisual>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Bars: Story = {
  args: {
    visual: {
      kind: "bars",
      data: {
        title: { fr: "Fruits vendus", en: "Fruit sold" },
        bars: [
          { label: "Pommes", value: 12 },
          { label: "Poires", value: 7 },
          { label: "Bananes", value: 15 },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("img")).toBeInTheDocument();
  },
};
export const Pictograph: Story = {
  args: {
    visual: {
      kind: "pictograph",
      data: {
        title: { fr: "Oiseaux vus", en: "Birds seen" },
        each: 2,
        rows: [
          { label: "Lundi", count: 3 },
          { label: "Mardi", count: 5 },
        ],
      },
    },
  },
};
export const Clock: Story = {
  args: { visual: { kind: "clock", data: { hour: 3, minute: 20 } } },
};
export const NumberLine: Story = {
  args: {
    visual: {
      kind: "numberline",
      data: { min: 0, max: 20, step: 1, labels: [0, 5, 10, 15, 20], arrow: 14 },
    },
  },
};
export const Grid: Story = {
  args: {
    visual: {
      kind: "grid",
      data: {
        cols: 4,
        rows: 3,
        cells: [
          { x: 1, y: 1, label: "A" },
          { x: 3, y: 0, label: "B" },
        ],
      },
    },
  },
};
export const Fraction: Story = {
  args: { visual: { kind: "fraction", data: { parts: 8, filled: 3 } } },
};
export const Dice: Story = {
  args: { visual: { kind: "dice", data: { dice: [3, 5, 6] } } },
};

/** Rows count from the top: "en bas à gauche" is the last row, first column (espace.carte.103). */
export const GridRowsFromTop: Story = {
  args: {
    visual: {
      kind: "grid",
      data: { cols: 3, rows: 3, cells: [{ x: 1, y: 3, label: "robot" }, { x: 3, y: 1, label: "outils" }] },
    },
  },
};
/** Rover: ramp top-left, down 3 rows ends on the dock row (espace.carte.104). */
export const GridRoverDown: Story = {
  args: {
    visual: { kind: "grid", data: { cols: 4, rows: 4, cells: [{ x: 1, y: 1, label: "rampe" }, { x: 3, y: 4, label: "dock" }] } },
  },
};
export const ClockWall: Story = {
  args: { visual: { kind: "clock", data: { hour: 2, minute: 45 } } },
};
/** Whole-number ticks and a value on every bar (fusee.110). */
export const BarsValues: Story = {
  args: {
    visual: { kind: "bars", data: { title: "Réservoirs", max: 50, bars: [{ label: "A", value: 25 }, { label: "B", value: 40 }, { label: "C", value: 35 }] } },
  },
};
/** The line marks the numbers the story names; the fallen card is the "?" between them (decompte.105). */
export const NumberLineNamedMarks: Story = {
  args: {
    context: "La fiche de lancement montre le 84, puis le 86. Une fiche est tombée entre les deux.",
    visual: { kind: "numberline", data: { min: 80, max: 90, step: 1, labels: [80, 90] } },
  },
};
export const NumberLineNamedMarksSolved: Story = {
  args: { ...NumberLineNamedMarks.args, reveal: { numeric: 85 } },
};
/** Groups of 5 drawn as groups; the icon follows the story object (pions). */
export const PictographGroups: Story = {
  args: {
    context: "Léa pose des pions.",
    visual: { kind: "pictograph", data: { title: "Pions", each: 1, rows: [{ label: "rangée", count: 17 }] } },
  },
};
export const PictographPatterns: Story = {
  args: { visual: { kind: "pictograph", data: { title: "Pansements", each: 1, rows: [{ label: "à pois", count: 9, icon: "bandage" }, { label: "rayés", count: 5, icon: "bandage" }] } } },
};
/** Drawn inline icons for pictures with no file: box, bag, sun, kibble, treat, glove, tile. */
export const DrawnBox: Story = {
  args: { visual: { kind: "pictograph", data: { title: "Boîtes de 10", each: 10, rows: [{ label: "boîtes", count: 3, icon: "box" }] } } },
};
export const VialFilled: Story = {
  args: { visual: { kind: "numberline", data: { style: "vial", max: 20, segments: [{ value: 12, tone: "a" }], unit: "gouttes" } } },
};
/** Partial array before the answer: a loose pile, the remainder is not shown as a row. */
export const ArrayBeforeAnswer: Story = {
  args: { visual: { kind: "grid", data: { cols: 5, rows: 5, cells: Array.from({ length: 23 }, (_, i) => ({ x: (i % 5) + 1, y: Math.floor(i / 5) + 1, label: "img:bandage" })) } } },
};
export const ArrayAnswered: Story = {
  args: { ...ArrayBeforeAnswer.args, reveal: { numeric: 23 } },
};
