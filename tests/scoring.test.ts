import { describe, expect, it } from "vitest";
import {
  budgetPoints,
  computeDateNotes,
  computeResults,
  enumerateDates,
  findCommonWindows,
  groupScore,
  hardFilterBlocks,
  personFit,
  bestWindowFor,
  tallyVotes,
  travelFor,
  travelPoints,
  typePoints,
  whoBlocksDates,
  suggestDates,
  DREAM_BONUS,
} from "@/lib/scoring";
import type { Destination, ParticipantPrefs, TripParams } from "@/lib/types";
import { CATALOG } from "@/lib/catalog-data";

// --- fixtures ---------------------------------------------------------------

const trip: TripParams = { windowStart: "2026-11-10", windowEnd: "2026-11-20", tripLength: 3 };

function dest(over: Partial<Destination> = {}): Destination {
  return {
    id: "beachy",
    name: "Beachy",
    country: "India",
    state: "Test",
    types: ["beach"],
    costMin: 8000,
    costMax: 12000, // midpoint 10,000
    bestMonths: [11, 12, 1],
    travel: {
      Bengaluru: { hours: 4, flight: false },
      Mumbai: { hours: 10, flight: false },
      Delhi: { hours: 5, flight: true },
    },
    hasTreks: false,
    blurb: "",
    ...over,
  };
}

function person(over: Partial<ParticipantPrefs> = {}): ParticipantPrefs {
  return {
    participantId: over.name ?? "p",
    name: "P",
    homeCity: "Bengaluru",
    availableDates: enumerateDates(trip.windowStart, trip.windowEnd),
    maxBudget: 20000,
    typeRanking: ["beach", "hills", "city", "adventure"],
    dealbreakers: [],
    wontGo: [],
    ...over,
  };
}

// --- date overlap -----------------------------------------------------------

describe("findCommonWindows", () => {
  it("finds every N-day stretch everyone can make", () => {
    const a = person({ name: "A", availableDates: enumerateDates("2026-11-10", "2026-11-15") });
    const b = person({ name: "B", availableDates: enumerateDates("2026-11-12", "2026-11-20") });
    expect(findCommonWindows([a, b], trip)).toEqual([
      { start: "2026-11-12", end: "2026-11-14" },
      { start: "2026-11-13", end: "2026-11-15" },
    ]);
  });

  it("requires consecutive days (a gap breaks the window)", () => {
    const a = person({ name: "A", availableDates: ["2026-11-10", "2026-11-11", "2026-11-13", "2026-11-14"] });
    expect(findCommonWindows([a], trip)).toEqual([]);
  });

  it("ignores availability outside the trip window", () => {
    const a = person({ name: "A", availableDates: ["2026-11-19", "2026-11-20", "2026-11-21"] });
    expect(findCommonWindows([a], trip)).toEqual([]);
  });

  it("returns nothing with no participants", () => {
    expect(findCommonWindows([], trip)).toEqual([]);
  });
});

describe("bestWindowFor", () => {
  it("prefers the window with more good-month days, else the earliest", () => {
    const t: TripParams = { windowStart: "2026-10-30", windowEnd: "2026-11-05", tripLength: 3 };
    const windows = findCommonWindows([person({ availableDates: enumerateDates(t.windowStart, t.windowEnd) })], t);
    // Good only in November: first fully-November window starts on the 1st.
    expect(bestWindowFor(dest({ bestMonths: [11] }), windows)?.start).toBe("2026-11-01");
    // Good in both months: earliest wins the tie.
    expect(bestWindowFor(dest({ bestMonths: [10, 11] }), windows)?.start).toBe("2026-10-30");
    expect(bestWindowFor(dest(), [])).toBeNull();
  });
});

describe("whoBlocksDates", () => {
  it("names the one person whose removal opens a window", () => {
    const a = person({ name: "A", participantId: "a" });
    const b = person({ name: "B", participantId: "b" });
    const c = person({ name: "C", participantId: "c", availableDates: ["2026-11-10"] });
    const blocks = whoBlocksDates([a, b, c], trip);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ participantId: "c", rule: "dates" });
  });
});

// --- hard filters -----------------------------------------------------------

describe("hardFilterBlocks", () => {
  it("passes a destination that breaks nothing", () => {
    expect(hardFilterBlocks(dest(), [person()], [])).toEqual([]);
  });

  it("blocks when the band midpoint is over someone's budget", () => {
    const blocks = hardFilterBlocks(dest(), [person({ name: "Tight", maxBudget: 9999 })], []);
    expect(blocks.map((b) => b.rule)).toEqual(["budget"]);
    // exactly at the midpoint is fine
    expect(hardFilterBlocks(dest(), [person({ maxBudget: 10000 })], [])).toEqual([]);
  });

  it("blocks on flights only for people who'd need to fly", () => {
    const noFly = { dealbreakers: ["flights" as const] };
    expect(hardFilterBlocks(dest(), [person({ ...noFly, homeCity: "Bengaluru" })], [])).toEqual([]);
    expect(
      hardFilterBlocks(dest(), [person({ ...noFly, homeCity: "Delhi" })], []).map((b) => b.rule),
    ).toEqual(["flights"]);
  });

  it("blocks on travel over 8 hours", () => {
    const p = person({ name: "M", homeCity: "Mumbai", dealbreakers: ["long_travel"] });
    expect(hardFilterBlocks(dest(), [p], []).map((b) => b.rule)).toEqual(["long_travel"]);
  });

  it("blocks on treks and on the won't-go list", () => {
    const p = person({ dealbreakers: ["treks"], wontGo: ["beachy"] });
    const rules = hardFilterBlocks(dest({ hasTreks: true }), [p], []).map((b) => b.rule);
    expect(rules).toEqual(["treks", "wont_go"]);
  });

  it("drops the destination if ANY one person is blocked", () => {
    const ok = person({ name: "Ok", participantId: "ok" });
    const bad = person({ name: "Bad", participantId: "bad", maxBudget: 5000 });
    const blocks = hardFilterBlocks(dest(), [ok, bad], []);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].participantId).toBe("bad");
  });
});

describe("travelFor", () => {
  it("derives 'Other' from the average of known cities", () => {
    const t = travelFor(dest(), "Other");
    expect(t.hours).toBeCloseTo((4 + 10 + 5) / 3, 1);
    expect(t.flight).toBe(false); // 1 of 3 cities flies
  });
});

// --- scoring ----------------------------------------------------------------

describe("component points", () => {
  it("budget headroom", () => {
    expect(budgetPoints(10000, 10000)).toBe(40);
    expect(budgetPoints(6000, 10000)).toBe(100);
    expect(budgetPoints(8000, 10000)).toBe(70);
    expect(budgetPoints(11000, 10000)).toBe(0);
  });
  it("type rank uses the best matching type", () => {
    const r = ["hills", "city", "beach", "adventure"] as const;
    expect(typePoints(["beach"], [...r])).toBe(40);
    expect(typePoints(["beach", "hills"], [...r])).toBe(100);
    expect(typePoints(["adventure"], [...r])).toBe(10);
  });
  it("travel time", () => {
    expect(travelPoints(1)).toBe(100);
    expect(travelPoints(7)).toBe(50);
    expect(travelPoints(20)).toBe(0);
  });
});

describe("personFit", () => {
  it("applies the 30/35/20/15 weights", () => {
    const window = { start: "2026-11-10", end: "2026-11-12" };
    const f = personFit(dest(), person(), window, trip);
    // budget: 10k of 20k = 50% headroom -> 100; type: 1st -> 100;
    // travel: 4h -> 75; season: all November -> 100
    expect(f.parts).toEqual({ budget: 100, type: 100, travel: 75, season: 100 });
    expect(f.fit).toBe(Math.round(30 + 35 + 0.2 * 75 + 15));
  });
});

describe("groupScore", () => {
  it("is the average when nobody is below 50", () => {
    expect(groupScore([80, 70, 60])).toBe(70);
  });
  it("subtracts 15 for each person below 50", () => {
    // avg 70, one person at 40 -> 55
    expect(groupScore([90, 90, 90, 40, 40])).toBe(Math.round(70 - 30));
  });
  it("prefers an option that works for everyone over one that works for 4, not 1", () => {
    const fourGreatOneBad = groupScore([95, 95, 95, 95, 30]);
    const decentForAll = groupScore([78, 78, 78, 78, 78]);
    expect(decentForAll).toBeGreaterThan(fourGreatOneBad);
  });
  it("never goes below zero", () => {
    expect(groupScore([10, 10])).toBe(0);
  });
});

// --- full pipeline ----------------------------------------------------------

describe("computeResults", () => {
  it("returns the top 3 passing options, best group score first", () => {
    const people = [
      person({ name: "A", participantId: "a" }),
      person({ name: "B", participantId: "b", homeCity: "Mumbai", typeRanking: ["hills", "beach", "city", "adventure"] }),
    ];
    const res = computeResults(CATALOG, people, trip);
    expect(res.status).toBe("ok");
    expect(res.options).toHaveLength(3);
    const scores = res.options.map((o) => o.groupScore);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
    for (const o of res.options) {
      expect(o.blocks).toEqual([]);
      expect(o.window).not.toBeNull();
      expect(o.fits).toHaveLength(2);
    }
  });

  it("nobody passes: returns closest options with exactly who blocks them", () => {
    const a = person({ name: "Asha", participantId: "a", maxBudget: 20000 });
    const b = person({ name: "Bala", participantId: "b", maxBudget: 20000, wontGo: ["cheap"] });
    const destinations = [
      dest({ id: "cheap", name: "Cheap" }), // blocked by Bala's won't-go
      dest({ id: "pricey", name: "Pricey", costMin: 30000, costMax: 40000 }), // over both budgets
    ];
    const res = computeResults(destinations, [a, b], trip);
    expect(res.status).toBe("none_pass");
    expect(res.options).toEqual([]);
    expect(res.closest.map((o) => o.destination.id)).toEqual(["cheap", "pricey"]);
    expect(res.closest[0].blocks).toEqual([
      expect.objectContaining({ participantId: "b", name: "Bala", rule: "wont_go" }),
    ]);
    expect(res.closest[1].blocks.map((x) => [x.name, x.rule])).toEqual([
      ["Asha", "budget"],
      ["Bala", "budget"],
    ]);
  });

  it("nobody passes because there are no shared dates", () => {
    const a = person({ name: "A", participantId: "a", availableDates: enumerateDates("2026-11-10", "2026-11-13") });
    const b = person({ name: "B", participantId: "b", availableDates: enumerateDates("2026-11-15", "2026-11-20") });
    const res = computeResults([dest()], [a, b], trip);
    expect(res.status).toBe("none_pass");
    expect(res.commonWindows).toEqual([]);
    expect(res.closest[0].blocks.every((x) => x.rule === "dates")).toBe(true);
  });

  it("handles no participants", () => {
    expect(computeResults(CATALOG, [], trip).status).toBe("no_participants");
  });
});

describe("computeDateNotes", () => {
  it("groups consecutive days by who can't make them", () => {
    const a = person({ name: "A", availableDates: enumerateDates("2026-11-10", "2026-11-17") });
    const b = person({ name: "B", availableDates: enumerateDates("2026-11-12", "2026-11-17") });
    expect(computeDateNotes([a, b], trip)).toEqual([
      { start: "2026-11-10", end: "2026-11-11", unavailable: ["B"], everyone: false },
      { start: "2026-11-18", end: "2026-11-20", unavailable: ["A", "B"], everyone: true },
    ]);
  });
});

describe("tallyVotes", () => {
  const opts = [
    { destinationId: "x", groupScore: 80 },
    { destinationId: "y", groupScore: 75 },
    { destinationId: "z", groupScore: 70 },
  ];
  it("majority wins", () => {
    const t = tallyVotes(opts, [{ destinationId: "y" }, { destinationId: "y" }, { destinationId: "x" }]);
    expect(t.winnerId).toBe("y");
    expect(t.counts).toEqual({ x: 1, y: 2, z: 0 });
  });
  it("a tie goes to the higher group score", () => {
    const t = tallyVotes(opts, [{ destinationId: "z" }, { destinationId: "y" }]);
    expect(t.winnerId).toBe("y");
  });
  it("ignores votes for options no longer in the top 3", () => {
    const t = tallyVotes(opts, [{ destinationId: "gone" }, { destinationId: "z" }]);
    expect(t).toMatchObject({ winnerId: "z", totalVotes: 1 });
  });
});

describe("formatting", async () => {
  const { formatDeadline, formatRange } = await import("@/lib/format");
  it("shows deadlines in IST", () => {
    expect(formatDeadline("2026-09-30T18:29:00Z")).toBe("30 Sep, 11:59 PM");
  });
  it("formats date ranges", () => {
    expect(formatRange("2026-11-18", "2026-11-20")).toBe("18–20 Nov");
    expect(formatRange("2026-11-30", "2026-12-02")).toBe("30 Nov – 2 Dec");
  });
});

describe("dream destination", () => {
  const window = { start: "2026-11-10", end: "2026-11-12" };
  it("adds a flat bonus to that person's fit only", () => {
    const plain = personFit(dest({ types: ["city"] }), person(), window, trip);
    const dreamy = personFit(dest({ types: ["city"] }), person({ dreamDestination: "beachy" }), window, trip);
    expect(dreamy.fit).toBe(plain.fit + DREAM_BONUS);
    expect(dreamy.dream).toBe(true);
    expect(plain.dream).toBe(false);
  });
  it("is capped at 100", () => {
    expect(personFit(dest(), person({ dreamDestination: "beachy", homeCity: "Bengaluru" }), window, trip).fit).toBeLessThanOrEqual(100);
  });
  it("never overrides a hard filter", () => {
    const p = person({ dreamDestination: "beachy", maxBudget: 5000 });
    const res = computeResults([dest()], [p], trip);
    expect(res.status).toBe("none_pass");
  });
  it("lists who dreams of each option", () => {
    const res = computeResults([dest()], [person({ name: "Riya", participantId: "r", dreamDestination: "beachy" }), person({ name: "Sid", participantId: "s" })], trip);
    expect(res.options[0].dreamOf).toEqual(["Riya"]);
  });
});

describe("suggestDates", () => {
  it("suggests the window most people can make, and a shorter one everyone can", () => {
    const a = person({ name: "A", participantId: "a", availableDates: enumerateDates("2026-11-10", "2026-11-14") });
    const b = person({ name: "B", participantId: "b", availableDates: enumerateDates("2026-11-10", "2026-11-14") });
    const c = person({ name: "C", participantId: "c", availableDates: enumerateDates("2026-11-13", "2026-11-20") });
    const s = suggestDates([a, b, c], trip);
    expect(s.best).toEqual({ start: "2026-11-10", end: "2026-11-12", available: ["A", "B"], missing: ["C"] });
    expect(s.shorter).toEqual({ start: "2026-11-13", end: "2026-11-14", days: 2 });
  });
  it("is attached to results only when no window works", () => {
    const a = person({ name: "A", participantId: "a", availableDates: ["2026-11-10"] });
    const b = person({ name: "B", participantId: "b", availableDates: ["2026-11-15"] });
    const res = computeResults([dest()], [a, b], trip);
    expect(res.dateSuggestion?.shorter).toBeNull();
    expect(res.dateSuggestion?.best).toBeNull();
    expect(computeResults([dest()], [person()], trip).dateSuggestion).toBeNull();
  });
});

describe("suggestionLine", async () => {
  const { suggestionLine } = await import("@/lib/format");
  it("reads as one line", () => {
    expect(
      suggestionLine(
        { best: { start: "2026-11-10", end: "2026-11-12", available: ["A", "B"], missing: ["C"] }, shorter: { start: "2026-11-13", end: "2026-11-14", days: 2 } },
        3,
      ),
    ).toBe("10–12 Nov works for 2 of 3 (everyone except C), or everyone can make a 2-day trip on 13–14 Nov.");
  });
});
