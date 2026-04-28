/* ==============================================================
   BEAR DEN PLANNER — DRILL LIBRARY (60 preloaded drills)
   Coordinate system: half-ice portrait, 300 wide × 500 tall.
   Top of canvas = offensive zone (goal at y=50).
   Bottom of canvas = neutral zone / breakout origin.
   ============================================================== */

// ---- Diagram pattern helpers ------------------------------------
// Each pattern returns { objects, arrows } ready to render.
// Arrow styles: "straight" | "curve" | "dashed" | "loop"

function breakoutFlow() {
  return {
    rink: "half_ice",
    objects: [
      { id: "D1", type: "defense",  label: "D", x: 150, y: 100 },
      { id: "W1", type: "forward",  label: "W", x:  60, y: 180 },
      { id: "W2", type: "forward",  label: "W", x: 240, y: 180 },
      { id: "C1", type: "forward",  label: "C", x: 150, y: 260 },
      { id: "P",  type: "puck",                 x: 150, y: 105 },
    ],
    arrows: [
      { from: "D1", to: "W1", style: "straight" },
      { from: "W1", to: "C1", style: "curve" },
      { from: "C1", to: "W2", style: "straight" },
    ],
  };
}

function trianglePassing(defender = true) {
  const objs = [
    { id: "P1", type: "player", label: "1", x:  90, y: 200 },
    { id: "P2", type: "player", label: "2", x: 210, y: 200 },
    { id: "P3", type: "player", label: "3", x: 150, y: 310 },
  ];
  if (defender) objs.push({ id: "X1", type: "defender", label: "X", x: 150, y: 250 });
  return {
    rink: "quarter_ice",
    objects: objs,
    arrows: [
      { from: "P1", to: "P2", style: "curve" },
      { from: "P2", to: "P3", style: "curve" },
      { from: "P3", to: "P1", style: "curve" },
    ],
  };
}

function cornerBattle() {
  return {
    rink: "quarter_ice",
    objects: [
      { id: "A1", type: "forward",  label: "A", x: 100, y: 180 },
      { id: "A2", type: "forward",  label: "A", x: 130, y: 220 },
      { id: "D1", type: "defense",  label: "D", x:  90, y: 230 },
      { id: "D2", type: "defense",  label: "D", x: 150, y: 200 },
      { id: "P",  type: "puck",                 x: 110, y: 200 },
    ],
    arrows: [],
  };
}

function forecheckAngle() {
  return {
    rink: "half_ice",
    objects: [
      { id: "D1", type: "defense",  label: "D",  x: 150, y: 120 },
      { id: "F1", type: "forward",  label: "F1", x: 200, y: 260 },
      { id: "F2", type: "forward",  label: "F2", x: 100, y: 280 },
      { id: "P",  type: "puck",                  x: 150, y: 125 },
    ],
    arrows: [
      { from: "F1", to: "D1", style: "curve" },
      { from: "F2", to: "D1", style: "curve", dashed: true },
    ],
  };
}

function giveAndGo() {
  return {
    rink: "half_ice",
    objects: [
      { id: "P1", type: "player", label: "1", x: 100, y: 350 },
      { id: "P2", type: "player", label: "2", x: 220, y: 300 },
      { id: "G",  type: "goal",                x: 150, y:  30 },
    ],
    arrows: [
      { from: "P1", to: "P2", style: "straight" },
      { from: "P2", to: "P1", style: "straight" },
      { from: "P1", to: "G",  style: "curve" },
    ],
  };
}

function lanePassing() {
  return {
    rink: "half_ice",
    objects: [
      { id: "P1", type: "player", label: "1", x:  80, y: 380 },
      { id: "P2", type: "player", label: "2", x: 220, y: 280 },
      { id: "P3", type: "player", label: "3", x:  80, y: 180 },
    ],
    arrows: [
      { from: "P1", to: "P2", style: "straight" },
      { from: "P2", to: "P3", style: "straight" },
    ],
  };
}

function smallAreaGame(count = 3) {
  const offense = [];
  const defense = [];
  for (let i = 0; i < count; i++) {
    offense.push({ id: `A${i+1}`, type: "forward", label: "A", x: 80 + i*60, y: 180 });
    defense.push({ id: `D${i+1}`, type: "defense", label: "D", x: 80 + i*60, y: 300 });
  }
  return {
    rink: "quarter_ice",
    objects: [...offense, ...defense, { id: "P", type: "puck", x: 150, y: 240 }],
    arrows: [],
  };
}

function freeSkate() {
  return {
    rink: "half_ice",
    objects: [
      { id: "P1", type: "player", label: "P", x:  80, y: 220 },
      { id: "P2", type: "player", label: "P", x: 220, y: 260 },
      { id: "P3", type: "player", label: "P", x: 150, y: 180 },
      { id: "P4", type: "player", label: "P", x: 110, y: 340 },
      { id: "P5", type: "player", label: "P", x: 210, y: 380 },
    ],
    arrows: [
      { from: "P1", to: "P2", style: "curve", dashed: true },
      { from: "P3", to: "P4", style: "curve", dashed: true },
    ],
  };
}

function wheelPattern() {
  return {
    rink: "half_ice",
    objects: [
      { id: "D1", type: "defense", label: "D", x: 150, y:  90 },
      { id: "W1", type: "forward", label: "W", x:  70, y: 200 },
      { id: "P",  type: "puck",                x: 180, y: 120 },
    ],
    arrows: [
      { from: "D1", to: "W1", style: "loop" },
    ],
  };
}

function rush2v1() {
  return {
    rink: "half_ice",
    objects: [
      { id: "A1", type: "forward", label: "A", x: 100, y: 380 },
      { id: "A2", type: "forward", label: "A", x: 200, y: 380 },
      { id: "D1", type: "defense", label: "D", x: 150, y: 200 },
      { id: "G",  type: "goal",                x: 150, y:  30 },
    ],
    arrows: [
      { from: "A1", to: "G", style: "curve" },
      { from: "A1", to: "A2", style: "straight" },
    ],
  };
}

// ---- Full drill library ------------------------------------------
// category: warmup | breakout | passing | forecheck | transition | compete
// ice_type: half | quarter
// intensity: low | medium | high

export const drills = [
  // ---------- BREAKOUTS & TRANSITION (1–20) ----------
  { id: "d01", name: "Black Bear Breakout Flow", category: "breakout", tags: ["Breakout","Warmup","HalfIce"], ice_type: "half", intensity: "low",
    coaching_points: ["Shoulder check before retrieval", "Quick first pass, no stickhandle", "Centers stay low and support"],
    instructions: "D retrieves puck behind net, passes to wing on boards. Wing moves puck to center swinging low. Flow up ice, repeat on both sides.",
    diagram: breakoutFlow() },

  { id: "d02", name: "Den Entry Passing", category: "passing", tags: ["Warmup","Passing","HalfIce"], ice_type: "half", intensity: "low",
    coaching_points: ["Pass in stride", "Call for puck", "Soft hands receiving"],
    instructions: "Players loop through neutral zone making continuous passes. Start slow, build pace.",
    diagram: lanePassing() },

  { id: "d03", name: "Paw Control Warm-Up", category: "warmup", tags: ["Warmup","PuckControl","HalfIce"], ice_type: "half", intensity: "low",
    coaching_points: ["Head up", "Protect puck with body", "Tight turns"],
    instructions: "All players with pucks in zone. Free movement with constraints — edges, turns, puck protection.",
    diagram: freeSkate() },

  { id: "d04", name: "Bear Trap Passing", category: "passing", tags: ["PassingUnderPressure","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["Move to open ice", "Quick decisions", "Stick ready to receive"],
    instructions: "3v1 keep-away in tight space. Defender tries to intercept, offense maintains possession.",
    diagram: trianglePassing(true) },

  { id: "d05", name: "Quick Claw Give & Go", category: "passing", tags: ["Passing","Attack","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Don't admire your pass", "Explode after pass", "Timing matters"],
    instructions: "Player passes to partner then immediately moves to receive it back, drives to net.",
    diagram: giveAndGo() },

  { id: "d06", name: "Pressure Lane Passing", category: "passing", tags: ["Passing","Breakout","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Fake before pass", "Keep feet moving", "Protect puck"],
    instructions: "Players pass through lanes while coach applies light pressure. Decision making under traffic.",
    diagram: lanePassing() },

  { id: "d07", name: "Breakout Under Fire", category: "breakout", tags: ["Breakout","PassingUnderPressure","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Shoulder check early", "Use net as protection", "Quick decision"],
    instructions: "D retrieves puck with forechecker chasing. Must make clean breakout under pressure.",
    diagram: wheelPattern() },

  { id: "d08", name: "Black Bear 5-Man Breakout", category: "breakout", tags: ["Breakout","TeamPlay","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Spacing", "Communication", "Timing of routes"],
    instructions: "Full five-player unit breakout — D to W to C support to exit zone.",
    diagram: breakoutFlow() },

  { id: "d09", name: "Reverse the Den", category: "breakout", tags: ["Breakout","Decision","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Read pressure", "Communicate reverse call", "Don't panic"],
    instructions: "D must decide to reverse puck to partner under pressure. Read and react.",
    diagram: wheelPattern() },

  { id: "d10", name: "1-2 Bear Hunt Drill", category: "forecheck", tags: ["Forecheck","Pressure","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Stick on puck", "Angle, don't chase", "Cut off lanes"],
    instructions: "F1 pressures puck carrier, F2 supports in second layer. Take away time and space.",
    diagram: forecheckAngle() },

  { id: "d11", name: "Corner Chaos", category: "forecheck", tags: ["Forecheck","SmallArea","Compete","QuarterIce"], ice_type: "quarter", intensity: "high",
    coaching_points: ["Win body position", "Quick decisions", "Protect puck"],
    instructions: "2v2 battle in corner — winning team breaks out or scores on mini net.",
    diagram: cornerBattle() },

  { id: "d12", name: "Bear Hunt Forecheck", category: "forecheck", tags: ["Forecheck","Transition","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["First 3 strides explosive", "Take away time/space", "Finish pressure"],
    instructions: "Dump-in, forecheckers chase, defense tries to break out. Full-speed rep.",
    diagram: forecheckAngle() },

  { id: "d13", name: "Den Domination 3v3", category: "compete", tags: ["Compete","Game","SmallArea","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Quick transitions", "Shoot fast", "Stay engaged"],
    instructions: "3v3 cross-ice game. Short shifts, continuous play.",
    diagram: smallAreaGame(3) },

  { id: "d14", name: "King of the Den", category: "compete", tags: ["Compete","PuckControl","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["Strong base", "Awareness", "Protect puck"],
    instructions: "Players try to keep puck while knocking others out. Last one with puck wins.",
    diagram: freeSkate() },

  { id: "d15", name: "Last Bear Standing", category: "compete", tags: ["Compete","Fun","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Compete level", "Creativity", "Awareness"],
    instructions: "Elimination-style puck battle. Lose your puck, you're out until next round.",
    diagram: freeSkate() },

  { id: "d16", name: "Bear Cage Breakout", category: "breakout", tags: ["Breakout","PassingUnderPressure","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Head up early", "Support low (center always available)", "Don't force boards if pressured"],
    instructions: "Defense retrieves puck behind net with passive forechecker. Work through breakout options.",
    diagram: breakoutFlow() },

  { id: "d17", name: "Escape the Den", category: "breakout", tags: ["Breakout","Decision","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["Read pressure early", "Protect puck with body", "Don't panic into boards"],
    instructions: "D starts pinned in corner with puck. Two outlets available — must choose based on pressure.",
    diagram: cornerBattle() },

  { id: "d18", name: "Reverse & Release", category: "breakout", tags: ["Breakout","PassingUnderPressure","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Use net as shield", "Communicate reverse call", "Quick second pass beats pressure"],
    instructions: "Forechecker forces D behind net. D reverses to partner who exits zone.",
    diagram: wheelPattern() },

  { id: "d19", name: "Bear Chain Passing", category: "passing", tags: ["Warmup","Passing","HalfIce"], ice_type: "half", intensity: "low",
    coaching_points: ["Pass in stride", "Call name before receiving", "No standing still"],
    instructions: "Three to four players in a continuous skating loop, passing as they move.",
    diagram: lanePassing() },

  { id: "d20", name: "Pressure Box Passing", category: "passing", tags: ["PassingUnderPressure","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["Move puck faster than defender", "Use deception", "Open hips before receiving"],
    instructions: "Four players form a box, one defender in the middle. Quick passing around the box.",
    diagram: trianglePassing(true) },

  // ---------- PASSING UNDER PRESSURE (21–40) ----------
  { id: "d21", name: "One-Touch Bear Relay", category: "passing", tags: ["Passing","QuickDecision","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Soft hands", "No stickhandling", "Pass to space not skates"],
    instructions: "Three lines passing through middle lane. One-touch passing only, up ice.",
    diagram: lanePassing() },

  { id: "d22", name: "Bear Swipe Forecheck", category: "forecheck", tags: ["Forecheck","Pressure","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Don't chase straight lines", "Angle body, not speed", "Force turnovers, not hits"],
    instructions: "Dump puck into corner. F1 angles puck carrier, F2 cuts outlet lane.",
    diagram: forecheckAngle() },

  { id: "d23", name: "Corner Clamp", category: "forecheck", tags: ["Forecheck","SmallArea","Compete","QuarterIce"], ice_type: "quarter", intensity: "high",
    coaching_points: ["Win inside body position", "Stick on puck, not ice", "Quick puck decisions after win"],
    instructions: "2v2 in tight corner box. Continuous battle for puck possession.",
    diagram: cornerBattle() },

  { id: "d24", name: "Den Lock Pressure Game", category: "forecheck", tags: ["Forecheck","Compete","SmallArea","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["First player pressure", "Second player support", "Stay active on puck loss"],
    instructions: "3v3 small zone game with focus on constant puck pressure.",
    diagram: smallAreaGame(3) },

  { id: "d25", name: "Bear Turn & Burn", category: "transition", tags: ["Transition","Skating","Speed","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Quick pivot", "First 3 strides explosive", "Head up immediately"],
    instructions: "Player receives puck, executes hard turn, explodes up ice.",
    diagram: giveAndGo() },

  { id: "d26", name: "Chaos Outlet Drill", category: "breakout", tags: ["Breakout","Transition","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Communication first", "Support puck carrier", "No standing still"],
    instructions: "Multiple pucks dumped at once. Players react and break out whichever is closest.",
    diagram: breakoutFlow() },

  { id: "d27", name: "Bear Race Breakout", category: "breakout", tags: ["Breakout","Compete","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Speed under control", "Clean passes", "No turnovers in neutral zone"],
    instructions: "Two teams race breakout to shot on net. Fastest clean execution wins.",
    diagram: breakoutFlow() },

  { id: "d28", name: "Den Scramble 3v3", category: "compete", tags: ["Compete","Game","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "high",
    coaching_points: ["Move feet constantly", "Quick puck decisions", "Support puck carrier"],
    instructions: "3v3 in tight space, continuous play, quick whistle resets.",
    diagram: smallAreaGame(3) },

  { id: "d29", name: "King of the Bear Pile", category: "compete", tags: ["Compete","PuckControl","Battle","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Balance", "Awareness", "Strong stick protection"],
    instructions: "Everyone in zone with pucks. Protect your puck, knock others off balance.",
    diagram: freeSkate() },

  { id: "d30", name: "Final Bear Push Game", category: "compete", tags: ["Compete","Game","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Structure under chaos", "Support puck", "Don't force shots"],
    instructions: "Mini scrimmage with constraint — must complete 3 passes before shot.",
    diagram: smallAreaGame(3) },

  { id: "d31", name: "Bear Outlet Ladder", category: "breakout", tags: ["Breakout","Passing","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Always support puck below hashmarks", "Don't rush first pass", "Skate into space before receiving"],
    instructions: "Three staggered outlet lanes up ice. D to W to C sequential exits.",
    diagram: breakoutFlow() },

  { id: "d32", name: "Pressure Release Wheel", category: "breakout", tags: ["Breakout","PassingUnderPressure","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Use speed to beat pressure", "Protect puck on inside shoulder", "Don't cut into pressure"],
    instructions: "D starts behind net, loops around cage and escapes the forecheck.",
    diagram: wheelPattern() },

  { id: "d33", name: "Bear Swing Breakout", category: "breakout", tags: ["Breakout","Flow","HalfIce"], ice_type: "half", intensity: "low",
    coaching_points: ["Timing is everything", "Stay in motion", "Always present outlet"],
    instructions: "D to W to C swing pattern — continuous swing support exits.",
    diagram: breakoutFlow() },

  { id: "d34", name: "Corner Escape Series", category: "breakout", tags: ["Breakout","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["Head up early", "Use boards if needed", "Quick second play"],
    instructions: "Corner box with 2 outlets. D must escape under pressure through either.",
    diagram: cornerBattle() },

  { id: "d35", name: "Quick Den Exit", category: "breakout", tags: ["Breakout","Speed","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["No hesitation", "First pass must be clean", "Support low"],
    instructions: "2 D behind net with 2 outlets. Fast puck retrieval into immediate exit.",
    diagram: breakoutFlow() },

  { id: "d36", name: "Reverse & Rebuild", category: "breakout", tags: ["Breakout","Decision","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Read pressure first", "Don't force boards", "Stay calm under pressure"],
    instructions: "D under pressure behind net. Reverse pass to partner who rebuilds breakout.",
    diagram: wheelPattern() },

  { id: "d37", name: "Bear Rush Exit", category: "transition", tags: ["Transition","Speed","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Explode after pass", "Keep spacing", "Don't overhandle puck"],
    instructions: "Defensive zone to neutral lane — breakout straight into rush.",
    diagram: rush2v1() },

  { id: "d38", name: "Net Shield Breakout", category: "breakout", tags: ["Breakout","PuckControl","HalfIce"], ice_type: "half", intensity: "low",
    coaching_points: ["Use net to block pressure", "Protect puck first", "Quick decision after curl"],
    instructions: "D uses net as shield — curl behind net and pass outlet.",
    diagram: wheelPattern() },

  { id: "d39", name: "Outlet Under Fire", category: "breakout", tags: ["Breakout","PassingUnderPressure","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Shoulder check early", "Move puck fast", "Support must be available"],
    instructions: "Forechecker chasing D — D forced to react quickly with outlet.",
    diagram: forecheckAngle() },

  { id: "d40", name: "Den Flow Exit Game", category: "breakout", tags: ["Breakout","Compete","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Clean execution", "Speed with control", "Communication always"],
    instructions: "Full zone breakout lanes. Timed breakout races between units.",
    diagram: breakoutFlow() },

  // ---------- MIDDLE LIBRARY (41–55) ----------
  { id: "d41", name: "Bear Pressure Grid", category: "passing", tags: ["PassingUnderPressure","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["Move puck quickly", "Open passing lanes", "Stay mobile"],
    instructions: "4-square passing grid with continuous passing under defender pressure.",
    diagram: trianglePassing(true) },

  { id: "d42", name: "One-Touch Den Flow", category: "passing", tags: ["Passing","Speed","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["No puck holding", "Soft hands", "Pass in stride"],
    instructions: "Triangle passing structure, one-touch only.",
    diagram: trianglePassing(false) },

  { id: "d43", name: "Chaos Passing Circle", category: "passing", tags: ["PassingUnderPressure","Awareness","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["Head up constantly", "Fake passes", "Don't panic under pressure"],
    instructions: "Circle of players with one defender in middle. Quick passes around the circle.",
    diagram: trianglePassing(true) },

  { id: "d44", name: "Pressure Triangle Escape", category: "passing", tags: ["PassingUnderPressure","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "high",
    coaching_points: ["Support puck carrier", "Move to open ice", "Quick decisions"],
    instructions: "3v1 triangle keep-away — maintain possession under pressure.",
    diagram: trianglePassing(true) },

  { id: "d45", name: "Bear Wall Passing", category: "passing", tags: ["Passing","HalfIce"], ice_type: "half", intensity: "low",
    coaching_points: ["Pass off boards when needed", "Stay in motion", "Communication key"],
    instructions: "Players along boards passing up ice in wall-to-wall sequence.",
    diagram: lanePassing() },

  { id: "d46", name: "Give & Go Attack Chain", category: "passing", tags: ["Passing","Attack","Transition","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Don't admire pass", "Explode after pass", "Time your cut"],
    instructions: "Diagonal attacking lanes — pass, move, receive, attack net.",
    diagram: giveAndGo() },

  { id: "d47", name: "2v1 Pressure Release", category: "transition", tags: ["Transition","Passing","Attack","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Draw defender first", "Pass at right moment", "Don't force shot"],
    instructions: "2 attackers vs 1 defender. Create passing lane under pressure and finish.",
    diagram: rush2v1() },

  { id: "d48", name: "Den Quick Hands Game", category: "compete", tags: ["Compete","Passing","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "medium",
    coaching_points: ["Quick puck movement", "No standing still", "Support constantly"],
    instructions: "Small box zone. Fast-paced keep-away with constraints.",
    diagram: smallAreaGame(3) },

  { id: "d49", name: "Bear Angle Chase", category: "forecheck", tags: ["Forecheck","Defense","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Take away middle", "Don't chase straight", "Force boards"],
    instructions: "F1 angles puck carrier toward boards — controlled pursuit.",
    diagram: forecheckAngle() },

  { id: "d50", name: "2-Man Hunt System", category: "forecheck", tags: ["Forecheck","TeamPlay","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Communication", "Angle support", "Stay disciplined"],
    instructions: "F1 and F2 coordinated pressure — trap puck carrier in corner.",
    diagram: forecheckAngle() },

  { id: "d51", name: "Den Lock Cycle Pressure", category: "forecheck", tags: ["Forecheck","Cycle","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Keep puck moving", "Stay on puck", "Don't overcommit"],
    instructions: "Offensive zone cycle with continuous puck pressure.",
    diagram: forecheckAngle() },

  { id: "d52", name: "Corner Cage Battle", category: "compete", tags: ["Compete","Forecheck","SmallArea","QuarterIce"], ice_type: "quarter", intensity: "high",
    coaching_points: ["Body position wins battles", "Stick active", "Quick puck exits"],
    instructions: "Tight corner box, 2v2 battle with quick outs after winning puck.",
    diagram: cornerBattle() },

  { id: "d53", name: "Bear Chase Turnover", category: "forecheck", tags: ["Forecheck","Transition","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["React instantly", "Stick pressure first", "Don't glide"],
    instructions: "Pressure immediately after turnover — win the puck back inside 3 seconds.",
    diagram: forecheckAngle() },

  { id: "d54", name: "Pressure Wall Trap", category: "forecheck", tags: ["Forecheck","Defense","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Angle correctly", "Cut escape lanes", "Force mistakes"],
    instructions: "Force puck carrier to boards using angle and trap.",
    diagram: forecheckAngle() },

  { id: "d55", name: "King of the Den Elite", category: "compete", tags: ["Compete","PuckControl","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Protect puck", "Stay balanced", "No giveaways"],
    instructions: "Half-ice chaos grid with multi-directional puck flow. Last one standing.",
    diagram: freeSkate() },

  // ---------- COMPETE / GAME DRILLS (56–60) ----------
  { id: "d56", name: "Bear Battle 3v3 Continuous", category: "compete", tags: ["Compete","Game","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Fast transitions", "Quick support", "Communication"],
    instructions: "Half-ice zone, continuous 3v3 shifts. Short bursts, quick changes.",
    diagram: smallAreaGame(3) },

  { id: "d57", name: "First to 3 Goals", category: "compete", tags: ["Compete","Game","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Quality shots", "Defensive awareness", "Transition speed"],
    instructions: "Full half-ice game. First team to 3 goals wins.",
    diagram: smallAreaGame(3) },

  { id: "d58", name: "Den Control Game", category: "compete", tags: ["Compete","Game","HalfIce"], ice_type: "half", intensity: "medium",
    coaching_points: ["Structure under pressure", "Move puck deliberately", "Don't rush shots"],
    instructions: "Controlled zone play — must complete 3 passes before shooting.",
    diagram: smallAreaGame(3) },

  { id: "d59", name: "Bear Power Rush", category: "transition", tags: ["Transition","Attack","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Speed with control", "Read defender", "Pass at right time"],
    instructions: "2v1 rush lanes — fast break attacks across neutral zone.",
    diagram: rush2v1() },

  { id: "d60", name: "Final Shift Showdown", category: "compete", tags: ["Compete","Game","HalfIce"], ice_type: "half", intensity: "high",
    coaching_points: ["Maximum effort", "Smart decisions", "Compete to end"],
    instructions: "Full half-ice scrimmage — last 5 minutes of practice, winner gets bragging rights.",
    diagram: smallAreaGame(3) },
];

// ---- Convenience API -------------------------------------------
export function getAllDrills() {
  const custom = loadCustomDrills();
  return drills.concat(custom);
}

export function loadCustomDrills() {
  try {
    return JSON.parse(localStorage.getItem("customDrills") || "[]");
  } catch {
    return [];
  }
}

export function saveCustomDrill(drill) {
  const custom = loadCustomDrills();
  custom.push(drill);
  localStorage.setItem("customDrills", JSON.stringify(custom));
}

export function deleteCustomDrill(id) {
  const custom = loadCustomDrills().filter(d => d.id !== id);
  localStorage.setItem("customDrills", JSON.stringify(custom));
}

export function findDrill(id) {
  return getAllDrills().find(d => d.id === id);
}

export function findDrillByName(name) {
  return getAllDrills().find(d => d.name === name);
}
