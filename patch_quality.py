from pathlib import Path
p=Path('/mnt/data/quality_work/data/drills.js')
s=p.read_text()
insert=r'''
// ---- Quality Pack v0.4.0 ---------------------------------------
// These drills are intentionally written as complete coaching products:
// drill-specific diagram, playback sequence, realistic timing, setup,
// coaching cues, common mistakes, and progression/regression notes.
// They are preferred by the AI/local planner so practices feel coherent.

function eliteBreakoutLowCenter() {
  return {
    rink: "half_ice",
    objects: [
      { id: "D1", type: "defense", label: "D1", x: 150, y: 95 },
      { id: "F1", type: "forward", label: "F1", x: 210, y: 145 },
      { id: "LW", type: "forward", label: "LW", x: 62, y: 220 },
      { id: "C", type: "forward", label: "C", x: 150, y: 285 },
      { id: "RW", type: "forward", label: "RW", x: 238, y: 225 },
      { id: "X", type: "defender", label: "X", x: 180, y: 175 },
      { id: "P", type: "puck", x: 150, y: 95 },
    ],
    arrows: [
      { from: "D1", to: "LW", style: "straight", label: "D hits wall winger" },
      { from: "LW", to: "C", style: "curve", label: "Wall winger bumps to low center" },
      { from: "C", to: "RW", style: "straight", label: "Center exits weak side" },
      { from: "F1", to: "D1", style: "curve", dashed: true, label: "Forechecker pressures inside shoulder" },
    ],
    sequence: [
      { label: "D retrieves, shoulder checks, uses net protection", arrowIndexes: [3], focusIds: ["D1","F1"], durationMs: 900 },
      { label: "First pass goes to wall winger's forehand", arrowIndexes: [0], focusIds: ["D1","LW"], durationMs: 900 },
      { label: "Center stays low and available under pressure", arrowIndexes: [1], focusIds: ["LW","C"], durationMs: 900 },
      { label: "Exit weak side with speed and spacing", arrowIndexes: [2], focusIds: ["C","RW"], durationMs: 900 },
    ],
  };
}

function eliteThreeLanePassShot() {
  return {
    rink: "half_ice",
    objects: [
      { id: "A", type: "player", label: "A", x: 65, y: 395 },
      { id: "B", type: "player", label: "B", x: 150, y: 345 },
      { id: "C", type: "player", label: "C", x: 235, y: 395 },
      { id: "S", type: "player", label: "S", x: 150, y: 145 },
      { id: "G", type: "goal", x: 150, y: 30 },
      { id: "P", type: "puck", x: 65, y: 395 },
    ],
    arrows: [
      { from: "A", to: "B", style: "straight", label: "A passes middle" },
      { from: "B", to: "C", style: "straight", label: "B one-touch to wide lane" },
      { from: "C", to: "S", style: "curve", label: "C attacks and feeds shooter" },
      { from: "S", to: "G", style: "straight", label: "Quick catch-release" },
    ],
    sequence: [
      { label: "Three lanes start with spacing and moving feet", arrowIndexes: [0], focusIds: ["A","B"], durationMs: 800 },
      { label: "Middle player one-touches; no dusting puck off", arrowIndexes: [1], focusIds: ["B","C"], durationMs: 700 },
      { label: "Wide lane attacks downhill and passes to shooter", arrowIndexes: [2], focusIds: ["C","S"], durationMs: 900 },
      { label: "Shooter releases quickly, then drives rebound", arrowIndexes: [3], focusIds: ["S","G"], durationMs: 650 },
    ],
  };
}

function eliteCornerBattleToNet() {
  return {
    rink: "quarter_ice",
    objects: [
      { id: "A1", type: "forward", label: "A", x: 78, y: 190 },
      { id: "D1", type: "defense", label: "D", x: 108, y: 215 },
      { id: "SUP", type: "forward", label: "S", x: 190, y: 270 },
      { id: "NET", type: "goal", x: 150, y: 65 },
      { id: "P", type: "puck", x: 88, y: 200 },
    ],
    arrows: [
      { from: "A1", to: "D1", style: "curve", dashed: true, label: "Win inside body position" },
      { from: "A1", to: "SUP", style: "straight", label: "Bump to support" },
      { from: "SUP", to: "NET", style: "curve", label: "Support attacks net" },
      { from: "A1", to: "NET", style: "curve", label: "Original battler drives second chance" },
    ],
    sequence: [
      { label: "First player gets hips low and inside hands", arrowIndexes: [0], focusIds: ["A1","D1"], durationMs: 900 },
      { label: "Do not throw blind; bump puck to support", arrowIndexes: [1], focusIds: ["A1","SUP"], durationMs: 700 },
      { label: "Support attacks net immediately", arrowIndexes: [2], focusIds: ["SUP","NET"], durationMs: 850 },
      { label: "Battler follows for rebound/second effort", arrowIndexes: [3], focusIds: ["A1","NET"], durationMs: 850 },
    ],
  };
}

function eliteTwoOneRead() {
  return {
    rink: "half_ice",
    objects: [
      { id: "A1", type: "forward", label: "Puck", x: 85, y: 395 },
      { id: "A2", type: "forward", label: "Wide", x: 215, y: 395 },
      { id: "D", type: "defense", label: "D", x: 150, y: 205 },
      { id: "G", type: "goal", x: 150, y: 30 },
      { id: "P", type: "puck", x: 85, y: 395 },
    ],
    arrows: [
      { from: "A1", to: "D", style: "curve", label: "Puck carrier attacks defender's feet" },
      { from: "A2", to: "G", style: "curve", dashed: true, label: "Wide player drives far post" },
      { from: "A1", to: "A2", style: "straight", label: "Pass if defender commits" },
      { from: "A1", to: "G", style: "straight", label: "Shoot if defender gives lane" },
    ],
    sequence: [
      { label: "Puck carrier attacks middle lane; wide player stays available", arrowIndexes: [0,1], focusIds: ["A1","A2","D"], durationMs: 1000 },
      { label: "Read defender's stick/feet", arrowIndexes: [2], focusIds: ["A1","D","A2"], durationMs: 750 },
      { label: "Second option: shot through lane with rebound drive", arrowIndexes: [3], focusIds: ["A1","G"], durationMs: 700 },
    ],
  };
}

function eliteForecheckAngle() {
  return {
    rink: "half_ice",
    objects: [
      { id: "D", type: "defense", label: "D", x: 155, y: 105 },
      { id: "F1", type: "forward", label: "F1", x: 230, y: 320 },
      { id: "F2", type: "forward", label: "F2", x: 70, y: 255 },
      { id: "F3", type: "forward", label: "F3", x: 150, y: 360 },
      { id: "P", type: "puck", x: 155, y: 105 },
    ],
    arrows: [
      { from: "F1", to: "D", style: "curve", label: "F1 angles outside-in" },
      { from: "F2", to: "D", style: "curve", dashed: true, label: "F2 takes wall option" },
      { from: "F3", to: "F2", style: "curve", dashed: true, label: "F3 supports high slot" },
    ],
    sequence: [
      { label: "F1 skates an arc, not a straight line", arrowIndexes: [0], focusIds: ["F1","D"], durationMs: 950 },
      { label: "F2 reads wall lane and stays above puck", arrowIndexes: [1], focusIds: ["F2","D"], durationMs: 850 },
      { label: "F3 remains high; no third forward below dots", arrowIndexes: [2], focusIds: ["F3","F2"], durationMs: 850 },
    ],
  };
}

function eliteGoalieReboundTrack() {
  return {
    rink: "quarter_ice",
    objects: [
      { id: "S1", type: "player", label: "S1", x: 75, y: 245 },
      { id: "S2", type: "player", label: "S2", x: 225, y: 245 },
      { id: "G", type: "goalie", label: "G", x: 150, y: 70 },
      { id: "NET", type: "goal", x: 150, y: 45 },
      { id: "P", type: "puck", x: 75, y: 245 },
    ],
    arrows: [
      { from: "S1", to: "G", style: "straight", label: "Low shot to pad" },
      { from: "G", to: "S2", style: "straight", dashed: true, label: "Rebound angle" },
      { from: "S2", to: "NET", style: "straight", label: "Second shot" },
    ],
    sequence: [
      { label: "Goalie starts set before first shot", arrowIndexes: [0], focusIds: ["S1","G"], durationMs: 800 },
      { label: "Goalie tracks rebound with eyes/head first", arrowIndexes: [1], focusIds: ["G","S2"], durationMs: 800 },
      { label: "Recover square to second shot", arrowIndexes: [2], focusIds: ["S2","G"], durationMs: 750 },
    ],
  };
}

function eliteRegroupThreeLane() {
  return {
    rink: "half_ice",
    objects: [
      { id: "D", type: "defense", label: "D", x: 150, y: 400 },
      { id: "F1", type: "forward", label: "F1", x: 80, y: 300 },
      { id: "F2", type: "forward", label: "F2", x: 220, y: 300 },
      { id: "F3", type: "forward", label: "F3", x: 150, y: 210 },
      { id: "G", type: "goal", x: 150, y: 35 },
      { id: "P", type: "puck", x: 150, y: 400 },
    ],
    arrows: [
      { from: "D", to: "F1", style: "straight", label: "Regroup pass wide" },
      { from: "F1", to: "F3", style: "curve", label: "Middle support touch" },
      { from: "F3", to: "F2", style: "straight", label: "Weak-side speed" },
      { from: "F2", to: "G", style: "curve", label: "Attack with width" },
    ],
    sequence: [
      { label: "D scans and moves puck to wide lane", arrowIndexes: [0], focusIds: ["D","F1"], durationMs: 850 },
      { label: "Middle player posts up as support", arrowIndexes: [1], focusIds: ["F1","F3"], durationMs: 850 },
      { label: "Weak-side forward catches in stride", arrowIndexes: [2], focusIds: ["F3","F2"], durationMs: 800 },
      { label: "Enter with width; middle lane drives net", arrowIndexes: [3], focusIds: ["F2","G"], durationMs: 850 },
    ],
  };
}

export const eliteDrills = [
  { id: "q01", quality: "elite", name: "Low Center Breakout Under Pressure", category: "breakout", tags: ["Breakout","PassingUnderPressure","TeamPlay","HalfIce"], skillFocus: ["breakout","passing","support","transition"], ageLevels: ["10U","12U","14U","HS"], ice_type: "half", iceUsage: "half ice", intensity: "medium", difficulty: "intermediate", duration: 10, playerCount: "8-12", setupTime: "medium", funRating: 7, goalie: false,
    coaching_points: ["D shoulder checks before first touch", "Center stays low and below puck", "Winger receives on forehand and bumps quickly", "Exit weak side with speed"],
    instructions: "Run from a rim/retrieval. Add one forechecker. The teaching point is the low center support route, not just completing the pass.",
    commonMistakes: ["Center flies the zone early", "D stickhandles into pressure", "Winger stops moving before receiving"],
    progressions: ["Walk routes without pressure", "Add one forechecker", "Add weak-side read", "Finish with 3v2 rush"],
    regressions: ["Remove forechecker", "Start puck on D stick", "Freeze after first pass to correct support"],
    diagram: eliteBreakoutLowCenter() },
  { id: "q02", quality: "elite", name: "Three-Lane Passing to Quick Release", category: "passing", tags: ["Passing","Shooting","Warmup","HalfIce"], skillFocus: ["passing","shooting","timing"], ageLevels: ["8U","10U","12U","14U"], ice_type: "half", iceUsage: "half ice", intensity: "medium", difficulty: "beginner", duration: 8, playerCount: "6-12", setupTime: "low", funRating: 8, goalie: true,
    coaching_points: ["Passes arrive in stride", "Middle player one-touches", "Shooter releases before goalie gets set", "Drive rebound after shot"],
    instructions: "Three lanes move together. Use one-touch middle pass, wide attack, and a quick release from the slot.",
    commonMistakes: ["Players flatten out across same line", "Receiver coasts before shot", "Shooter dusts puck too long"],
    progressions: ["One-touch required", "Add back pressure", "Add rebound race"],
    regressions: ["Allow two touches", "Slow first rep and freeze spacing"],
    diagram: eliteThreeLanePassShot() },
  { id: "q03", quality: "elite", name: "Corner Battle Bump to Net", category: "compete", tags: ["Compete","SmallArea","Battle","QuarterIce"], skillFocus: ["compete","puck protection","net drive"], ageLevels: ["10U","12U","14U","HS"], ice_type: "quarter", iceUsage: "quarter ice", intensity: "high", difficulty: "intermediate", duration: 8, playerCount: "4-8", setupTime: "low", funRating: 9, goalie: true,
    coaching_points: ["Win inside body position before reaching", "Bump puck to support instead of throwing blind", "Support attacks net immediately", "Original battler follows for second chance"],
    instructions: "Start 1v1 in corner with support player low slot. Battler must protect, bump to support, then drive net for rebound.",
    commonMistakes: ["Players reach with stick instead of using legs", "Support drifts too high", "No second effort after pass"],
    progressions: ["Add second defender", "Require escape turn before pass", "Make it winner-stays-on"],
    regressions: ["Start with passive defender", "Use body-position only before live puck"],
    diagram: eliteCornerBattleToNet() },
  { id: "q04", quality: "elite", name: "2v1 Rush Read: Pass or Shoot", category: "transition", tags: ["Transition","Attack","Shooting","HalfIce"], skillFocus: ["transition","decision making","shooting"], ageLevels: ["10U","12U","14U","HS"], ice_type: "half", iceUsage: "half ice", intensity: "high", difficulty: "intermediate", duration: 9, playerCount: "5-10", setupTime: "low", funRating: 9, goalie: true,
    coaching_points: ["Puck carrier attacks defender's feet", "Wide player stays available and drives far post", "Make decision by hashmarks", "Shoot for rebound when pass is taken away"],
    instructions: "Continuous 2v1 rushes. Coach grades the read, not just the goal.",
    commonMistakes: ["Puck carrier passes too early", "Wide player skates into defender's lane", "Players slow down to make decision"],
    progressions: ["Add backchecker", "Require deception before pass", "Add second puck after rebound"],
    regressions: ["Start from closer spacing", "Make defender passive for first reps"],
    diagram: eliteTwoOneRead() },
  { id: "q05", quality: "elite", name: "F1 Angle, F2 Wall, F3 High", category: "forecheck", tags: ["Forecheck","TeamPlay","HalfIce"], skillFocus: ["forecheck","angling","team structure"], ageLevels: ["12U","14U","HS"], ice_type: "half", iceUsage: "half ice", intensity: "medium", difficulty: "advanced", duration: 10, playerCount: "8-15", setupTime: "medium", funRating: 7, goalie: false,
    coaching_points: ["F1 angles outside-in and controls the dots", "F2 takes wall option, not the puck carrier's back", "F3 stays high and protects middle", "Stop play to show spacing"],
    instructions: "Run as a controlled forecheck pattern. The animation shows the lane responsibilities; keep reps short and correct routes early.",
    commonMistakes: ["F1 skates straight and gets beat", "F3 dives below the puck", "F2 puck-watches instead of taking wall"],
    progressions: ["Add live breakout read", "Score after turnover", "Add weak-side D pinch decision"],
    regressions: ["Walk routes without puck", "Use cones for lanes"],
    diagram: eliteForecheckAngle() },
  { id: "q06", quality: "elite", name: "Goalie Rebound Track + Second Shot", category: "goalie", tags: ["Goalie","Rebound","Shooting","QuarterIce"], skillFocus: ["goalie","rebound control","shooting"], ageLevels: ["8U","10U","12U","14U","HS"], ice_type: "quarter", iceUsage: "quarter ice", intensity: "medium", difficulty: "beginner", duration: 7, playerCount: "3-6", setupTime: "low", funRating: 7, goalie: true,
    coaching_points: ["Goalie set before first release", "Eyes track rebound before body moves", "Recover square to second puck", "Shooters aim low pad first"],
    instructions: "Shooter 1 intentionally shoots low pad. Goalie tracks rebound to Shooter 2, then recovers for second shot.",
    commonMistakes: ["Goalie guesses instead of tracking", "Shooter misses rebound target", "Second shooter waits too long"],
    progressions: ["Add screen", "Add third rebound", "Make second shot one-touch"],
    regressions: ["Coach places rebound", "Slow tempo until recovery mechanics are clean"],
    diagram: eliteGoalieReboundTrack() },
  { id: "q07", quality: "elite", name: "Three-Lane Regroup with Middle Support", category: "transition", tags: ["Transition","Regroup","Passing","HalfIce"], skillFocus: ["transition","passing","support"], ageLevels: ["10U","12U","14U","HS"], ice_type: "half", iceUsage: "half ice", intensity: "medium", difficulty: "intermediate", duration: 9, playerCount: "6-12", setupTime: "medium", funRating: 8, goalie: true,
    coaching_points: ["D scans before moving puck", "Middle support presents a target", "Weak-side forward catches in stride", "Enter with width, then drive middle"],
    instructions: "D regroups to wide lane, puck moves through middle support, then weak-side speed attacks.",
    commonMistakes: ["Forwards skate flat", "Middle player hides behind coverage", "Weak side receives standing still"],
    progressions: ["Add passive NZ defender", "Add back pressure", "Finish 3v2"],
    regressions: ["Start stationary routes", "Remove shot finish"],
    diagram: eliteRegroupThreeLane() },
];

drills.unshift(...eliteDrills);

'''
s=s.replace('// ---- Convenience API -------------------------------------------', insert+'// ---- Convenience API -------------------------------------------')
p.write_text(s)
