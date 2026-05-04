/* BenchBoss Coach HQ — Elite Drill Pack 2 (q48–q97)
   50 new high-quality drills with diagram-specific animation sequences.
   Coordinate system matches data/drills.js: half-ice portrait, 300 wide × 500 tall.
   Top of canvas (y=50) = offensive zone (goal). Bottom (y=450) = neutral zone / breakout origin.

   Theme coverage filling gaps in elite-drills.js (q01–q47):
     • 8U / 10U fundamentals (8 drills)
     • 10U / 12U skill progressions (10 drills)
     • Stations / half-ice efficient (8 drills)
     • Compete + small-area variants (6 drills)
     • Game-situation / specialty (8 drills)
     • Conditioning + warmup (5 drills)
     • Goalie-specific (5 drills)

   Wiring:
     1. Import this pack alongside the existing eliteDrills:
          import { eliteDrills } from './elite-drills.js';
          import { eliteDrillsPack2 } from './elite-drills-pack-2.js';
          const animatedDrills = [...eliteDrills, ...eliteDrillsPack2, ...baseDrills];
     2. Add this file to sw.js APP_SHELL and bench-mode.js CORE_CACHE_ASSETS so it caches offline.
*/

const DUR = { quick: 700, normal: 850, long: 1000 };

function obj(id, type, label, x, y) { return { id, type, label, x, y }; }
function arr(from, to, style = 'straight', label = '', extra = {}) { return { from, to, style, label, ...extra }; }
function step(label, idx, focusIds, durationMs = DUR.normal) { return { label, arrowIndexes: idx, focusIds, durationMs }; }
function goal() { return obj('NET', 'goal', '', 150, 38); }
function puck(x, y) { return obj('P', 'puck', '', x, y); }
function cone(id, x, y) { return obj(id, 'cone', '', x, y); }
function diagram({ rink = 'half_ice', objects = [], arrows = [], sequence = [] }) { return { rink, objects, arrows, sequence }; }

// ---- Diagram factories ----------------------------------------------------

// Pylon course: cones in a path the skater works through.
function pylonCourseDiagram(kind = 'zigzag') {
  if (kind === 'tight_turns') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('A', 'player', 'A', 75, 430), cone('C1', 150, 350), cone('C2', 150, 250), cone('C3', 150, 160), obj('F', 'player', 'F', 225, 80)],
      arrows: [arr('A', 'C1', 'curve', 'Tight turn left'), arr('C1', 'C2', 'curve', 'Tight turn right'), arr('C2', 'C3', 'curve', 'Tight turn left'), arr('C3', 'F', 'straight', 'Finish')],
      sequence: [
        step('Drop the inside shoulder, knees over toes', [0], ['A', 'C1'], DUR.normal),
        step('Plant outside edge, stay low through turn', [1], ['C1', 'C2'], DUR.normal),
        step('Eyes up — see the next cone before it arrives', [2], ['C2', 'C3'], DUR.normal),
        step('Three hard strides finish through the line', [3], ['C3', 'F'], DUR.quick),
      ],
    });
  }
  if (kind === 'stop_start') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('A', 'player', 'A', 150, 440), cone('C1', 150, 350), cone('C2', 150, 250), cone('C3', 150, 150), obj('F', 'player', 'F', 150, 70)],
      arrows: [arr('A', 'C1', 'straight', 'Sprint'), arr('C1', 'C2', 'straight', 'Stop + go'), arr('C2', 'C3', 'straight', 'Stop + go'), arr('C3', 'F', 'straight', 'Finish')],
      sequence: [
        step('Three quick first steps to top speed', [0], ['A', 'C1'], DUR.quick),
        step('Both feet stop, no glide — explode out', [1], ['C1', 'C2'], DUR.normal),
        step('Reset hips before next acceleration', [2], ['C2', 'C3'], DUR.normal),
        step('Eyes up, finish skating through line', [3], ['C3', 'F'], DUR.quick),
      ],
    });
  }
  if (kind === 'figure_8') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('A', 'player', 'A', 150, 430), cone('C1', 90, 320), cone('C2', 210, 320), cone('C3', 90, 160), cone('C4', 210, 160)],
      arrows: [arr('A', 'C1', 'curve', 'Crossovers left'), arr('C1', 'C2', 'curve', 'Cross under right'), arr('C2', 'C3', 'curve', 'Crossovers left'), arr('C3', 'C4', 'curve', 'Cross under right')],
      sequence: [
        step('Cross over the top foot, do not step around', [0], ['A', 'C1'], DUR.normal),
        step('Underneath leg drives — power comes from there', [1], ['C1', 'C2'], DUR.normal),
        step('Switch direction without standing up', [2], ['C2', 'C3'], DUR.normal),
        step('Build speed each lap, do not coast', [3], ['C3', 'C4'], DUR.normal),
      ],
    });
  }
  // default: simple zigzag pylon stickhandling course
  return diagram({
    rink: 'half_ice',
    objects: [obj('A', 'forward', 'A', 75, 440), cone('C1', 110, 360), cone('C2', 190, 290), cone('C3', 110, 220), cone('C4', 190, 150), obj('F', 'forward', 'F', 150, 80), puck(75, 440)],
    arrows: [arr('A', 'C1', 'curve', 'Hands wide'), arr('C1', 'C2', 'curve', 'Hands tight'), arr('C2', 'C3', 'curve', 'Eyes up'), arr('C3', 'C4', 'curve', 'Speed change'), arr('C4', 'F', 'straight', 'Finish')],
    sequence: [
      step('Hands away from body around the first cone', [0], ['A', 'C1'], DUR.normal),
      step('Tight to the body, eyes up between cones', [1], ['C1', 'C2'], DUR.normal),
      step('Speed change — slow into cone, fast out', [2, 3], ['C2', 'C3', 'C4'], DUR.normal),
      step('Eyes up before the finishing pass or shot', [4], ['F'], DUR.quick),
    ],
  });
}

// Stationary formation: passing star, snowplow box, glide line, etc.
function stationaryDrillDiagram(kind = 'star') {
  if (kind === 'snowplow') {
    return diagram({
      rink: 'quarter_ice',
      objects: [obj('A', 'player', 'A', 150, 440), cone('L1', 150, 360), cone('L2', 150, 280), cone('L3', 150, 200), obj('F', 'player', 'F', 150, 110)],
      arrows: [arr('A', 'L1', 'straight', 'Glide'), arr('L1', 'L2', 'straight', 'Snowplow stop'), arr('L2', 'L3', 'straight', 'Push off restart'), arr('L3', 'F', 'straight', 'Finish')],
      sequence: [
        step('Two-foot glide with knees bent', [0], ['A', 'L1'], DUR.normal),
        step('Snowplow — toes in, feel the ice', [1], ['L1', 'L2'], DUR.long),
        step('Push off back foot to restart', [2], ['L2', 'L3'], DUR.normal),
        step('Finish to coach with chest up', [3], ['F'], DUR.quick),
      ],
    });
  }
  if (kind === 'forehand_backhand') {
    return diagram({
      rink: 'quarter_ice',
      objects: [obj('A', 'forward', 'A', 150, 380), cone('L1', 90, 280), cone('R1', 210, 280), cone('L2', 90, 180), cone('R2', 210, 180), puck(150, 380)],
      arrows: [arr('A', 'L1', 'curve', 'Forehand reach'), arr('L1', 'R1', 'curve', 'Backhand pull'), arr('R1', 'L2', 'curve', 'Forehand again'), arr('L2', 'R2', 'curve', 'Backhand finish')],
      sequence: [
        step('Reach to forehand cone — feel the puck', [0], ['A', 'L1'], DUR.normal),
        step('Pull across body to backhand', [1], ['L1', 'R1'], DUR.normal),
        step('No look — feel where puck is on blade', [2], ['R1', 'L2'], DUR.normal),
        step('Finish with eyes up looking at coach', [3], ['L2', 'R2'], DUR.quick),
      ],
    });
  }
  if (kind === 'star_warmup') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('A', 'forward', 'A', 90, 380), obj('B', 'forward', 'B', 210, 380), obj('C', 'forward', 'C', 240, 220), obj('D', 'forward', 'D', 150, 130), obj('E', 'forward', 'E', 60, 220), puck(90, 380)],
      arrows: [arr('A', 'B', 'straight', 'Tape to tape'), arr('B', 'C', 'straight', 'Quick hands'), arr('C', 'D', 'straight', 'Diagonal'), arr('D', 'E', 'straight', 'Across'), arr('E', 'A', 'straight', 'Reset')],
      sequence: [
        step('Saucer or tape pass — receiver shows target', [0], ['A', 'B'], DUR.quick),
        step('One-touch: catch and release in one motion', [1], ['B', 'C'], DUR.quick),
        step('Diagonal pass through the star', [2], ['C', 'D'], DUR.quick),
        step('Move feet after the pass — never stand still', [3, 4], ['D', 'E', 'A'], DUR.normal),
      ],
    });
  }
  if (kind === 'wall_self_pass') {
    return diagram({
      rink: 'quarter_ice',
      objects: [obj('A', 'forward', 'A', 150, 380), cone('W', 280, 280), cone('R', 150, 200), obj('F', 'forward', 'F', 150, 110), puck(150, 380)],
      arrows: [arr('A', 'W', 'straight', 'Bank pass off boards'), arr('W', 'R', 'curve', 'Receive in stride'), arr('R', 'F', 'straight', 'Carry to net'), arr('F', 'NET', 'straight', 'Shoot or pass')],
      sequence: [
        step('Bank the puck off the wall on forehand', [0], ['A', 'W'], DUR.normal),
        step('Skate to receive — do not stand and wait', [1], ['W', 'R'], DUR.normal),
        step('Pick puck up in stride, eyes up', [2], ['R', 'F'], DUR.quick),
        step('Quick decision: shoot or pass to support', [3], ['F'], DUR.quick),
      ],
    });
  }
  // default: 5-spot passing star
  return diagram({
    rink: 'half_ice',
    objects: [obj('A', 'forward', 'A', 75, 380), obj('B', 'forward', 'B', 225, 380), obj('C', 'forward', 'C', 240, 230), obj('D', 'forward', 'D', 150, 140), obj('E', 'forward', 'E', 60, 230), puck(75, 380)],
    arrows: [arr('A', 'C', 'straight', 'Long pass'), arr('C', 'E', 'straight', 'Across'), arr('E', 'B', 'straight', 'Long pass'), arr('B', 'D', 'straight', 'Up'), arr('D', 'A', 'straight', 'Down')],
    sequence: [
      step('Pass receiver shows target before puck arrives', [0], ['A', 'C'], DUR.quick),
      step('Receive on inside foot, redirect to next', [1], ['C', 'E'], DUR.quick),
      step('No spin — flat blade through the puck', [2], ['E', 'B'], DUR.quick),
      step('Crisp tape-to-tape, receivers always moving', [3, 4], ['B', 'D', 'A'], DUR.normal),
    ],
  });
}

// 1v1 attack lane: forward attacks defender, options to shoot/pass.
function oneOnOneDiagram(kind = 'gap') {
  if (kind === 'king_of_hill') {
    return diagram({
      rink: 'quarter_ice',
      objects: [obj('A', 'forward', 'A', 75, 380), obj('B', 'forward', 'B', 225, 380), goal(), puck(150, 280)],
      arrows: [arr('A', 'P', 'straight', 'Race for puck'), arr('B', 'P', 'straight', 'Race for puck'), arr('P', 'NET', 'curve', 'Winner attacks'), arr('A', 'NET', 'straight', 'Second effort')],
      sequence: [
        step('Whistle — both players race to loose puck', [0, 1], ['A', 'B', 'P'], DUR.quick),
        step('Winner protects puck, loser becomes defender', [2], ['P', 'NET'], DUR.normal),
        step('Body position before stick — get inside', [3], ['A', 'NET'], DUR.normal),
        step('Second effort wins — keep working through the rep', [], ['NET'], DUR.quick),
      ],
    });
  }
  if (kind === 'chip_chase') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('A', 'forward', 'A', 90, 430), obj('X', 'defender', 'X', 150, 320), cone('B', 280, 250), goal(), puck(90, 430)],
      arrows: [arr('A', 'B', 'curve', 'Chip puck wide'), arr('A', 'X', 'curve', 'Beat defender outside'), arr('B', 'NET', 'curve', 'Recover puck'), arr('A', 'NET', 'straight', 'Drive to net')],
      sequence: [
        step('Chip puck off boards past defender', [0], ['A', 'B'], DUR.normal),
        step('Take inside lane on the defender', [1], ['A', 'X'], DUR.normal),
        step('Recover own chip with speed', [2], ['B'], DUR.normal),
        step('Finish through net, second effort on rebound', [3], ['NET'], DUR.quick),
      ],
    });
  }
  // default: gap-control 1v1
  return diagram({
    rink: 'half_ice',
    objects: [obj('A', 'forward', 'A', 90, 430), obj('X', 'defender', 'X', 210, 320), goal(), puck(90, 430)],
    arrows: [arr('A', 'X', 'curve', 'Attack with speed'), arr('X', 'A', 'straight', 'Active stick'), arr('A', 'NET', 'curve', 'Inside lane'), arr('A', 'NET', 'straight', 'Net drive')],
    sequence: [
      step('Attacker drives wide with speed', [0], ['A', 'X'], DUR.normal),
      step('Defender stick first, body second', [1], ['X', 'A'], DUR.normal),
      step('Inside-out move beats the defender', [2], ['A'], DUR.normal),
      step('Drive net hard, look for rebound', [3], ['NET'], DUR.quick),
    ],
  });
}

// Small-area game patterns.
function gameDiagram(kind = 'mini_2v2') {
  if (kind === 'cross_ice_3v3') {
    return diagram({
      rink: 'quarter_ice',
      objects: [obj('A1', 'forward', 'A', 90, 380), obj('A2', 'forward', 'A', 150, 380), obj('A3', 'forward', 'A', 210, 380), obj('B1', 'defender', 'B', 90, 180), obj('B2', 'defender', 'B', 150, 180), obj('B3', 'defender', 'B', 210, 180), goal(), puck(150, 280)],
      arrows: [arr('A1', 'A2', 'straight', 'Quick support'), arr('A2', 'A3', 'curve', 'Find lane'), arr('A3', 'NET', 'curve', 'Attack net'), arr('B1', 'A1', 'straight', 'Pressure puck')],
      sequence: [
        step('Always two passing options open for the puck-carrier', [0], ['A1', 'A2', 'A3'], DUR.quick),
        step('Move the puck through pressure, not into it', [1], ['A2', 'A3'], DUR.normal),
        step('Net drive creates time for support to arrive', [2], ['A3', 'NET'], DUR.normal),
        step('Defenders pressure the puck with sticks first', [3], ['B1', 'A1'], DUR.normal),
      ],
    });
  }
  if (kind === 'cross_ice_4v4') {
    return diagram({
      rink: 'quarter_ice',
      objects: [obj('A1', 'forward', 'A', 75, 380), obj('A2', 'forward', 'A', 150, 380), obj('A3', 'forward', 'A', 225, 380), obj('A4', 'defender', 'A', 150, 440), obj('B1', 'defender', 'B', 75, 180), obj('B2', 'defender', 'B', 150, 180), obj('B3', 'defender', 'B', 225, 180), obj('B4', 'forward', 'B', 150, 110), goal(), puck(150, 280)],
      arrows: [arr('A1', 'A2', 'straight', ''), arr('A2', 'A4', 'curve', 'D-up support'), arr('A4', 'A3', 'straight', 'Switch sides'), arr('A3', 'NET', 'curve', 'Attack net')],
      sequence: [
        step('Forwards support low, defender supports high', [0, 1], ['A1', 'A2', 'A4'], DUR.normal),
        step('Use the defender to switch the puck side', [2], ['A4', 'A3'], DUR.normal),
        step('Quick decision after the puck switch', [3], ['A3', 'NET'], DUR.normal),
        step('Score, change of possession to other side', [], ['NET'], DUR.quick),
      ],
    });
  }
  if (kind === 'gates_3v3') {
    return diagram({
      rink: 'quarter_ice',
      objects: [obj('A1', 'forward', 'A', 90, 380), obj('A2', 'forward', 'A', 210, 380), obj('A3', 'forward', 'A', 150, 320), obj('B1', 'defender', 'B', 90, 180), obj('B2', 'defender', 'B', 210, 180), obj('B3', 'defender', 'B', 150, 220), cone('G1', 60, 280), cone('G2', 240, 280), puck(150, 320)],
      arrows: [arr('A3', 'A1', 'straight', 'Pass'), arr('A1', 'G1', 'curve', 'Skate gate'), arr('A1', 'A2', 'straight', 'Switch sides'), arr('A2', 'G2', 'curve', 'Score: skate gate')],
      sequence: [
        step('Score by skating the puck through a gate, no shot allowed', [0], ['A3', 'A1'], DUR.quick),
        step('Forces puck-protection and support, not perimeter passes', [1], ['A1', 'G1'], DUR.normal),
        step('Switch sides quickly when defenders collapse', [2], ['A1', 'A2'], DUR.quick),
        step('Constant motion — short shifts force decisions', [3], ['A2', 'G2'], DUR.normal),
      ],
    });
  }
  if (kind === 'sudden_death') {
    return diagram({
      rink: 'quarter_ice',
      objects: [obj('A', 'forward', 'A', 90, 440), obj('B', 'forward', 'B', 210, 440), goal(), puck(150, 380)],
      arrows: [arr('A', 'P', 'straight', 'Race'), arr('B', 'P', 'straight', 'Race'), arr('P', 'NET', 'curve', 'First shot wins'), arr('A', 'NET', 'straight', 'Second effort')],
      sequence: [
        step('Two players, loose puck, empty net — first goal wins', [0, 1], ['A', 'B', 'P'], DUR.quick),
        step('Body position is everything in the race', [2], ['P', 'NET'], DUR.normal),
        step('Loser becomes defender on next rep', [3], ['A', 'NET'], DUR.normal),
        step('No reaching — skate to the puck', [], [], DUR.quick),
      ],
    });
  }
  // default: 2v2 mini game
  return diagram({
    rink: 'quarter_ice',
    objects: [obj('A1', 'forward', 'A', 105, 380), obj('A2', 'forward', 'A', 195, 380), obj('B1', 'defender', 'B', 105, 180), obj('B2', 'defender', 'B', 195, 180), goal(), puck(150, 280)],
    arrows: [arr('A1', 'A2', 'straight', 'Support'), arr('A2', 'NET', 'curve', 'Attack'), arr('B1', 'A2', 'straight', 'Pressure'), arr('B2', 'NET', 'straight', 'Cover net')],
    sequence: [
      step('Support partner stays under the puck', [0], ['A1', 'A2'], DUR.normal),
      step('Drive net creates the pass option', [1], ['A2', 'NET'], DUR.normal),
      step('Defender pressures stick-on-puck', [2], ['B1', 'A2'], DUR.normal),
      step('Second defender protects net front', [3], ['B2', 'NET'], DUR.quick),
    ],
  });
}

// Four-corner station rotation (the "Stations" preset's home pattern).
function stationsDiagram(kind = 'four_corner') {
  if (kind === 'three_station') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('S1', 'cone', 'S1', 80, 400), obj('S2', 'cone', 'S2', 220, 400), obj('S3', 'cone', 'S3', 150, 180), obj('A', 'forward', 'A', 80, 400), obj('B', 'forward', 'B', 220, 400), obj('C', 'forward', 'C', 150, 180)],
      arrows: [arr('A', 'S2', 'curve', 'Rotate'), arr('B', 'S3', 'curve', 'Rotate'), arr('C', 'S1', 'curve', 'Rotate'), arr('S1', 'S2', 'dashed', '3 minutes')],
      sequence: [
        step('Three stations, three groups, rotate every 3 minutes', [], ['S1', 'S2', 'S3'], DUR.long),
        step('Coach blows whistle — groups rotate clockwise', [0, 1, 2], ['A', 'B', 'C'], DUR.normal),
        step('Each station has a clear single coaching focus', [], ['S1', 'S2', 'S3'], DUR.long),
        step('Reset and repeat — short reps, quick feedback', [3], [], DUR.normal),
      ],
    });
  }
  // default: four-corner stations
  return diagram({
    rink: 'half_ice',
    objects: [obj('S1', 'cone', 'S1', 80, 380), obj('S2', 'cone', 'S2', 220, 380), obj('S3', 'cone', 'S3', 220, 160), obj('S4', 'cone', 'S4', 80, 160), obj('A', 'forward', '1', 80, 380), obj('B', 'forward', '2', 220, 380), obj('C', 'forward', '3', 220, 160), obj('D', 'forward', '4', 80, 160)],
    arrows: [arr('A', 'S2', 'curve', 'Clockwise'), arr('B', 'S3', 'curve', 'Clockwise'), arr('C', 'S4', 'curve', 'Clockwise'), arr('D', 'S1', 'curve', 'Clockwise')],
    sequence: [
      step('Four stations: hands, pass, shoot, battle', [], ['S1', 'S2', 'S3', 'S4'], DUR.long),
      step('Groups rotate clockwise on the whistle', [0, 1, 2, 3], ['A', 'B', 'C', 'D'], DUR.normal),
      step('Each station owns one focus — no mixing', [], [], DUR.long),
      step('Short shifts: 90 seconds work, 30 seconds reset', [], [], DUR.quick),
    ],
  });
}

// Special-teams shapes.
function specialTeamsDiagram(kind = 'umbrella') {
  if (kind === 'diamond_pk') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('PK1', 'defender', 'F1', 150, 240), obj('PK2', 'defender', 'F2', 90, 320), obj('PK3', 'defender', 'D1', 210, 320), obj('PK4', 'defender', 'D2', 150, 380), goal()],
      arrows: [arr('PK1', 'PK2', 'curve', 'Pressure'), arr('PK2', 'PK3', 'curve', 'Rotate'), arr('PK3', 'PK4', 'curve', 'Cover'), arr('PK4', 'PK1', 'curve', 'Reset')],
      sequence: [
        step('F1 pressures puck high — F2/D rotate behind', [0], ['PK1', 'PK2'], DUR.normal),
        step('Box collapses to diamond on side seal', [1], ['PK2', 'PK3'], DUR.normal),
        step('Bottom D protects net-front and slot pass', [2], ['PK3', 'PK4'], DUR.normal),
        step('Reset to box on clears, no chasing', [3], ['PK4', 'PK1'], DUR.normal),
      ],
    });
  }
  if (kind === 'umbrella_5v4') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('PP1', 'forward', 'F1', 150, 80), obj('PP2', 'forward', 'F2', 90, 220), obj('PP3', 'forward', 'F3', 210, 220), obj('PP4', 'forward', 'B', 150, 180), obj('PP5', 'defender', 'QB', 150, 320), goal(), puck(150, 320)],
      arrows: [arr('PP5', 'PP2', 'straight', 'Slip'), arr('PP2', 'PP4', 'straight', 'Bumper'), arr('PP4', 'PP3', 'straight', 'Across'), arr('PP3', 'NET', 'curve', 'Shot tip')],
      sequence: [
        step('QB walks line, finds first option open', [0], ['PP5', 'PP2'], DUR.normal),
        step('Bumper shows in seam between PK box', [1], ['PP2', 'PP4'], DUR.normal),
        step('Quick change of side forces PK rotation', [2], ['PP4', 'PP3'], DUR.normal),
        step('Shot through traffic, F1 tips at net', [3], ['PP3', 'NET'], DUR.quick),
      ],
    });
  }
  // default: 6v5 empty-net cycle
  return diagram({
    rink: 'half_ice',
    objects: [obj('A1', 'forward', 'F', 90, 200), obj('A2', 'forward', 'F', 210, 200), obj('A3', 'forward', 'F', 150, 130), obj('A4', 'defender', 'D', 90, 320), obj('A5', 'defender', 'D', 210, 320), obj('A6', 'forward', 'F6', 150, 280), goal(), puck(90, 200)],
    arrows: [arr('A1', 'A4', 'straight', 'D up'), arr('A4', 'A5', 'straight', 'D-to-D'), arr('A5', 'A2', 'straight', 'F off-side'), arr('A2', 'NET', 'curve', 'Net drive')],
    sequence: [
      step('Cycle low, support up to D for shot', [0], ['A1', 'A4'], DUR.normal),
      step('D-to-D switches the side, opens shooting lane', [1], ['A4', 'A5'], DUR.normal),
      step('F slides into shooting lane on far side', [2], ['A5', 'A2'], DUR.normal),
      step('Shot with traffic — extra attacker screens', [3], ['A2', 'NET'], DUR.quick),
    ],
  });
}

// Goalie-focused movement and tracking.
function goalieDrillDiagram(kind = 't_push') {
  if (kind === 'depth_reset') {
    return diagram({
      rink: 'quarter_ice',
      objects: [goal(), obj('G', 'goalie', 'G', 150, 90), obj('S1', 'forward', 'S', 90, 280), obj('S2', 'forward', 'S', 210, 280), puck(90, 280)],
      arrows: [arr('S1', 'NET', 'straight', 'Shot 1'), arr('G', 'G', 'curve', 'Reset depth'), arr('S2', 'NET', 'straight', 'Shot 2'), arr('G', 'G', 'curve', 'Reset angle')],
      sequence: [
        step('Goalie sets depth at top of crease for first shot', [0], ['G', 'S1'], DUR.normal),
        step('After save, retreat back to post — square first', [1], ['G'], DUR.normal),
        step('Move out only when shooter sets up', [2], ['G', 'S2'], DUR.normal),
        step('Track puck the whole reset, never lose eyes', [3], ['G'], DUR.quick),
      ],
    });
  }
  if (kind === 'cross_crease') {
    return diagram({
      rink: 'quarter_ice',
      objects: [goal(), obj('G', 'goalie', 'G', 150, 90), obj('S1', 'forward', 'S', 80, 200), obj('S2', 'forward', 'S', 220, 200), puck(80, 200)],
      arrows: [arr('S1', 'S2', 'straight', 'Cross-ice pass'), arr('G', 'G', 'curve', 'T-push slide'), arr('S2', 'NET', 'straight', 'One-timer'), arr('G', 'G', 'curve', 'Track and seal')],
      sequence: [
        step('Eyes lock onto pass before it leaves stick', [0], ['S1', 'S2'], DUR.quick),
        step('T-push, stay square — do not rotate early', [1], ['G'], DUR.normal),
        step('Set pads on second post before shot', [2], ['S2', 'NET'], DUR.normal),
        step('Hold seal until puck is fully covered', [3], ['G'], DUR.normal),
      ],
    });
  }
  if (kind === 'breakaway') {
    return diagram({
      rink: 'half_ice',
      objects: [goal(), obj('G', 'goalie', 'G', 150, 90), obj('A', 'forward', 'A', 150, 420), puck(150, 420)],
      arrows: [arr('A', 'NET', 'curve', 'Skating in'), arr('G', 'G', 'straight', 'Match speed'), arr('A', 'NET', 'curve', 'Deke or shoot'), arr('G', 'G', 'curve', 'Read and react')],
      sequence: [
        step('Goalie comes out aggressive, then retreats', [0, 1], ['G', 'A'], DUR.normal),
        step('Match shooter speed — no early commit', [2], ['G', 'A'], DUR.normal),
        step('Read shoulder/eyes — wait for shooter to commit', [3], ['G'], DUR.normal),
        step('Stay big and square, hands ready', [], ['G'], DUR.quick),
      ],
    });
  }
  if (kind === 'rebound_cover') {
    return diagram({
      rink: 'quarter_ice',
      objects: [goal(), obj('G', 'goalie', 'G', 150, 90), obj('S', 'forward', 'S', 150, 280), puck(150, 280)],
      arrows: [arr('S', 'NET', 'straight', 'Hard shot'), arr('NET', 'S', 'straight', 'Rebound out'), arr('S', 'NET', 'straight', 'Second shot'), arr('G', 'G', 'curve', 'Cover')],
      sequence: [
        step('Save with intent — direct rebound to corner', [0], ['G', 'S'], DUR.normal),
        step('If rebound stays in slot, cover immediately', [1], ['G'], DUR.normal),
        step('Recover square before second shot', [2], ['G'], DUR.normal),
        step('Communicate "cover" loud — D needs to hear', [3], ['G'], DUR.quick),
      ],
    });
  }
  // default: lateral T-push
  return diagram({
    rink: 'quarter_ice',
    objects: [goal(), obj('G', 'goalie', 'G', 150, 90), cone('L', 90, 90), cone('R', 210, 90)],
    arrows: [arr('G', 'L', 'straight', 'T-push left'), arr('L', 'G', 'straight', 'Recover'), arr('G', 'R', 'straight', 'T-push right'), arr('R', 'G', 'straight', 'Recover')],
    sequence: [
      step('Push from inside post — no glide', [0], ['G', 'L'], DUR.normal),
      step('Set the pad on the post immediately', [1], ['L', 'G'], DUR.normal),
      step('Cross the crease, eyes track puck', [2], ['G', 'R'], DUR.normal),
      step('Square shoulders, set angle, hold breath', [3], ['R', 'G'], DUR.quick),
    ],
  });
}

// Conditioning + warmup paths (relays, sprints, laps).
function conditioningDiagram(kind = 'gretzky_lap') {
  if (kind === 'sprint_relay') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('A', 'player', 'A', 80, 440), obj('B', 'player', 'B', 220, 440), obj('A2', 'player', 'A', 80, 80), obj('B2', 'player', 'B', 220, 80)],
      arrows: [arr('A', 'A2', 'straight', 'Sprint'), arr('A2', 'A', 'straight', 'Sprint back'), arr('B', 'B2', 'straight', 'Sprint'), arr('B2', 'B', 'straight', 'Sprint back')],
      sequence: [
        step('Two teams race — touch hands to tag in', [0, 2], ['A', 'B'], DUR.quick),
        step('Tag the next skater — full speed every leg', [1, 3], ['A2', 'B2'], DUR.quick),
        step('Mistakes (missed tag, fall) restart that leg', [], [], DUR.normal),
        step('Coach picks a loss penalty — push-ups or skating', [], [], DUR.long),
      ],
    });
  }
  if (kind === 'suicide') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('A', 'player', 'A', 150, 440), cone('L1', 150, 360), cone('L2', 150, 240), cone('L3', 150, 130)],
      arrows: [arr('A', 'L1', 'straight', 'Sprint to blue'), arr('L1', 'A', 'dashed', 'Back'), arr('A', 'L2', 'straight', 'Sprint to red'), arr('A', 'L3', 'straight', 'Sprint to far blue')],
      sequence: [
        step('Sprint to first line, hard stop, back', [0, 1], ['A', 'L1'], DUR.normal),
        step('Sprint to red line, hard stop, back', [2], ['A', 'L2'], DUR.normal),
        step('Sprint to far blue, hard stop, back', [3], ['A', 'L3'], DUR.normal),
        step('No glide on stops — feet must stop fully', [], [], DUR.quick),
      ],
    });
  }
  if (kind === 'crossover_loop') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('A', 'player', 'A', 150, 430), cone('C1', 90, 320), cone('C2', 210, 230), cone('C3', 90, 150), cone('C4', 210, 150)],
      arrows: [arr('A', 'C1', 'curve', 'Crossover'), arr('C1', 'C2', 'curve', 'Crossover'), arr('C2', 'C3', 'curve', 'Crossover'), arr('C3', 'C4', 'curve', 'Crossover')],
      sequence: [
        step('Continuous crossovers — no straight skating', [0], ['A', 'C1'], DUR.normal),
        step('Switch direction smoothly at each cone', [1], ['C1', 'C2'], DUR.normal),
        step('Build conditioning AND edge work', [2], ['C2', 'C3'], DUR.normal),
        step('30 seconds work, 30 seconds rest, repeat 4x', [3], ['C3', 'C4'], DUR.long),
      ],
    });
  }
  // default: Gretzky lap with pucks
  return diagram({
    rink: 'half_ice',
    objects: [obj('A', 'forward', 'A', 90, 440), cone('C1', 240, 320), cone('C2', 240, 180), cone('C3', 60, 180), cone('C4', 60, 320), puck(90, 440)],
    arrows: [arr('A', 'C1', 'curve', 'Lap clockwise'), arr('C1', 'C2', 'curve', 'Stay outside'), arr('C2', 'C3', 'curve', 'Sprint top'), arr('C3', 'A', 'curve', 'Finish corner')],
    sequence: [
      step('Carry puck full speed in a wide loop', [0], ['A', 'C1'], DUR.normal),
      step('Hold the puck on outside edge through turns', [1], ['C1', 'C2'], DUR.normal),
      step('Top of lap is full sprint — head up', [2], ['C2', 'C3'], DUR.quick),
      step('Finish back at start, ready for next lap', [3], ['C3', 'A'], DUR.normal),
    ],
  });
}

// Faceoff plays (D-zone win, O-zone win, NZ read).
function faceoffDiagram(kind = 'oz_win') {
  if (kind === 'dz_win') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('C', 'forward', 'C', 150, 380), obj('LW', 'forward', 'W', 90, 360), obj('RW', 'forward', 'W', 210, 360), obj('LD', 'defender', 'D', 90, 440), obj('RD', 'defender', 'D', 210, 440), obj('X', 'defender', 'X', 150, 360), puck(150, 380)],
      arrows: [arr('C', 'LD', 'straight', 'Win back to D'), arr('LD', 'LW', 'straight', 'D-to-W rim'), arr('LW', 'C', 'curve', 'Wall swing'), arr('C', 'RW', 'straight', 'Stretch pass')],
      sequence: [
        step('Center wins puck back to strong-side D', [0], ['C', 'LD'], DUR.quick),
        step('D rims puck wide to wall winger', [1], ['LD', 'LW'], DUR.quick),
        step('Wall winger hits center swinging through middle', [2], ['LW', 'C'], DUR.normal),
        step('Long pass to far winger to clear zone', [3], ['C', 'RW'], DUR.normal),
      ],
    });
  }
  if (kind === 'nz_read') {
    return diagram({
      rink: 'half_ice',
      objects: [obj('C', 'forward', 'C', 150, 280), obj('LW', 'forward', 'W', 90, 260), obj('RW', 'forward', 'W', 210, 260), obj('LD', 'defender', 'D', 90, 380), obj('RD', 'defender', 'D', 210, 380), puck(150, 280)],
      arrows: [arr('C', 'RW', 'straight', 'Win to W'), arr('RW', 'LD', 'straight', 'Drop to D'), arr('LD', 'C', 'curve', 'Center stretches'), arr('LD', 'LW', 'straight', 'Or wide')],
      sequence: [
        step('Read pressure first — choose strong-side outlet', [0], ['C', 'RW'], DUR.quick),
        step('Quick drop pass back to D for clean start', [1], ['RW', 'LD'], DUR.quick),
        step('Center stretches into open ice', [2], ['LD', 'C'], DUR.normal),
        step('Or wide pass to LW if stretch is covered', [3], ['LD', 'LW'], DUR.normal),
      ],
    });
  }
  // default: o-zone win
  return diagram({
    rink: 'half_ice',
    objects: [obj('C', 'forward', 'C', 150, 200), obj('LW', 'forward', 'W', 90, 180), obj('RW', 'forward', 'W', 210, 180), obj('LD', 'defender', 'D', 90, 320), obj('RD', 'defender', 'D', 210, 320), goal(), puck(150, 200)],
    arrows: [arr('C', 'LD', 'straight', 'Win back'), arr('LD', 'RD', 'straight', 'D-to-D'), arr('RD', 'NET', 'straight', 'Quick shot'), arr('LW', 'NET', 'curve', 'Net front')],
    sequence: [
      step('Center wins puck back cleanly to D', [0], ['C', 'LD'], DUR.quick),
      step('D-to-D opens shooting lane', [1], ['LD', 'RD'], DUR.quick),
      step('Quick shot through traffic, no setup', [2], ['RD', 'NET'], DUR.normal),
      step('Wingers crash hard to net front', [3], ['LW', 'NET'], DUR.quick),
    ],
  });
}

// 3-on-2 with late support.
function rushDiagram(kind = '3v2') {
  return diagram({
    rink: 'half_ice',
    objects: [obj('A1', 'forward', 'F', 90, 430), obj('A2', 'forward', 'F', 150, 430), obj('A3', 'forward', 'F', 210, 430), obj('X1', 'defender', 'X', 110, 280), obj('X2', 'defender', 'X', 190, 280), goal(), puck(150, 430)],
    arrows: [arr('A2', 'A1', 'straight', 'Drop'), arr('A1', 'X1', 'curve', 'Drive wide'), arr('A1', 'A3', 'straight', 'Cross-ice'), arr('A3', 'NET', 'curve', 'Late attack')],
    sequence: [
      step('Drop pass slows the rush, lets D commit', [0], ['A2', 'A1'], DUR.normal),
      step('Wide forward attacks D outside-in', [1], ['A1', 'X1'], DUR.normal),
      step('Cross-ice pass to far winger as D rotates', [2], ['A1', 'A3'], DUR.normal),
      step('Late attacker arrives in shooting lane', [3], ['A3', 'NET'], DUR.quick),
    ],
  });
}

// Pre-existing-pattern reuse for shooting drills (re-used for stations).
function shootingStationDiagram(kind = 'quick') {
  return diagram({
    rink: 'half_ice',
    objects: [obj('A', 'forward', 'A', 90, 380), cone('R', 150, 280), goal(), puck(90, 380)],
    arrows: [arr('A', 'R', 'straight', 'Receive'), arr('R', 'NET', 'straight', 'Quick shot'), arr('A', 'NET', 'curve', 'Crash net'), arr('NET', 'A', 'dashed', 'Rebound')],
    sequence: [
      step('Pass arrives at top of slot, catch in stride', [0], ['A', 'R'], DUR.quick),
      step('One-touch release — no extra stickhandle', [1], ['R', 'NET'], DUR.quick),
      step('Crash for rebound on every shot', [2], ['A', 'NET'], DUR.normal),
      step('Score, look for tip, look for screen', [3], [], DUR.quick),
    ],
  });
}

// ---- Drill specs (50 entries) --------------------------------------------
// Format: [id, name, category, family, diagram, tags, skillFocus, ageLevels, difficulty, duration, playerCount, setupTime, funRating, goalie]

const drillSpecs = [
  // 8U / 10U fundamentals (8)
  ['q48', 'Pylon Stickhandling Course', 'puck', 'puck handling', pylonCourseDiagram('zigzag'), ['Fundamentals', 'PuckHandling', 'HalfIce'], ['puck handling', 'eyes up', 'edges'], ['8U', '10U'], 'beginner', 8, 'all', 'low', 8, false],
  ['q49', 'Stop-Start Whistle Drill', 'skating', 'warmup', pylonCourseDiagram('stop_start'), ['Fundamentals', 'Skating', 'Warmup'], ['skating', 'stops', 'acceleration'], ['8U', '10U'], 'beginner', 6, 'all', 'low', 7, false],
  ['q50', 'Tight Turns Both Ways', 'skating', 'warmup', pylonCourseDiagram('tight_turns'), ['Fundamentals', 'Edges', 'Skating'], ['skating', 'edges', 'agility'], ['8U', '10U'], 'beginner', 7, 'all', 'low', 7, false],
  ['q51', 'Two-Foot to One-Foot Glide', 'skating', 'warmup', stationaryDrillDiagram('snowplow'), ['Fundamentals', 'Balance', 'Skating'], ['skating', 'balance', 'edges'], ['8U'], 'beginner', 5, 'all', 'low', 6, false],
  ['q52', 'Snowplow to Hockey Stop', 'skating', 'warmup', stationaryDrillDiagram('snowplow'), ['Fundamentals', 'Stops', 'Skating'], ['skating', 'stops', 'control'], ['8U', '10U'], 'beginner', 7, 'all', 'low', 7, false],
  ['q53', 'Forehand-Backhand Touch Series', 'puck', 'puck handling', stationaryDrillDiagram('forehand_backhand'), ['Fundamentals', 'PuckHandling'], ['puck handling', 'soft hands'], ['8U', '10U'], 'beginner', 6, 'all', 'low', 7, false],
  ['q54', 'Pass Receive No Skate', 'passing', 'passing', stationaryDrillDiagram('star_warmup'), ['Fundamentals', 'Passing', 'Warmup'], ['passing', 'soft hands', 'targets'], ['8U', '10U'], 'beginner', 6, '6-12', 'low', 7, false],
  ['q55', 'Goalie Big Save Wide V', 'goalie', 'goalie', goalieDrillDiagram('t_push'), ['Goalie', 'Fundamentals'], ['goalie', 'angles', 'V-position'], ['8U', '10U'], 'beginner', 7, '2-4', 'low', 7, true],

  // 10U / 12U skill progressions (10)
  ['q56', 'Crossover Figure 8 Race', 'skating', 'conditioning', pylonCourseDiagram('figure_8'), ['Crossovers', 'Skating', 'Race'], ['skating', 'crossovers', 'edges'], ['10U', '12U', '14U'], 'intermediate', 7, 'all', 'low', 9, false],
  ['q57', 'Backwards C-Cut to Forward Pivot', 'skating', 'warmup', pylonCourseDiagram('tight_turns'), ['Skating', 'Pivots', 'Edges'], ['skating', 'pivots', 'edges'], ['10U', '12U'], 'intermediate', 7, 'all', 'low', 7, false],
  ['q58', 'Chip and Chase 1v1', 'compete', 'compete', oneOnOneDiagram('chip_chase'), ['Compete', '1v1', 'PuckRecovery'], ['puck recovery', 'compete', 'speed'], ['10U', '12U', '14U'], 'intermediate', 8, '4-8', 'low', 9, true],
  ['q59', 'Tight Space Possession Box', 'sag', 'small area', gameDiagram('mini_2v2'), ['SmallArea', 'Possession', 'Compete'], ['puck protection', 'support', 'spacing'], ['10U', '12U', '14U'], 'intermediate', 9, '4-8', 'low', 9, false],
  ['q60', 'Mohawk Edge Series', 'skating', 'warmup', pylonCourseDiagram('zigzag'), ['Edges', 'Skating', 'Mohawks'], ['skating', 'edges', 'pivots'], ['10U', '12U', '14U'], 'intermediate', 6, 'all', 'low', 7, false],
  ['q61', 'Three Cone Quick Hands', 'puck', 'puck handling', pylonCourseDiagram('zigzag'), ['PuckHandling', 'Hands', 'Stations'], ['puck handling', 'speed change'], ['10U', '12U', '14U'], 'intermediate', 7, 'all', 'low', 8, false],
  ['q62', 'Stationary Pass Star Pattern', 'passing', 'passing', stationaryDrillDiagram('star'), ['Passing', 'Warmup', 'Tape'], ['passing', 'targets', 'one-touch'], ['10U', '12U', '14U', 'HS'], 'beginner', 6, '5-10', 'low', 7, false],
  ['q63', 'Speed Through the Middle', 'transition', 'transition', rushDiagram('3v2'), ['Transition', 'Speed', 'Rush'], ['transition', 'speed', 'support'], ['10U', '12U', '14U'], 'intermediate', 8, '6-12', 'low', 9, true],
  ['q64', 'Wall Pass Self Receive', 'puck', 'puck handling', stationaryDrillDiagram('wall_self_pass'), ['PuckHandling', 'Walls', 'StridePickup'], ['puck handling', 'walls', 'reception'], ['10U', '12U', '14U'], 'intermediate', 7, '6-12', 'low', 8, false],
  ['q65', 'Backhand Saucer Pass Series', 'passing', 'passing', stationaryDrillDiagram('star_warmup'), ['Passing', 'Saucer', 'Backhand'], ['passing', 'backhand', 'creativity'], ['12U', '14U', 'HS'], 'intermediate', 7, '5-10', 'low', 7, false],

  // Stations / half-ice efficient (8)
  ['q66', 'Four Corner Skill Stations', 'skating', 'warmup', stationsDiagram('four_corner'), ['Stations', 'Rotation', 'AllSkill'], ['skating', 'puck handling', 'shooting'], ['8U', '10U', '12U', '14U'], 'beginner', 12, '12-20', 'medium', 8, false],
  ['q67', 'Station 1 — Tight Hands Lane', 'puck', 'puck handling', pylonCourseDiagram('zigzag'), ['Stations', 'PuckHandling'], ['puck handling', 'eyes up'], ['8U', '10U', '12U', '14U'], 'beginner', 4, '3-5', 'low', 7, false],
  ['q68', 'Station 2 — Pass and Replace', 'passing', 'passing', stationaryDrillDiagram('star'), ['Stations', 'Passing'], ['passing', 'movement', 'support'], ['10U', '12U', '14U'], 'beginner', 4, '3-5', 'low', 7, false],
  ['q69', 'Station 3 — Quick Shot Series', 'shooting', 'shooting', shootingStationDiagram('quick'), ['Stations', 'Shooting'], ['shooting', 'release', 'rebounds'], ['10U', '12U', '14U', 'HS'], 'beginner', 4, '3-5', 'low', 8, true],
  ['q70', 'Station 4 — Battle Box 1v1', 'battle', 'compete', oneOnOneDiagram('king_of_hill'), ['Stations', 'Compete', 'Battle'], ['compete', 'body position'], ['10U', '12U', '14U'], 'intermediate', 4, '3-5', 'low', 9, false],
  ['q71', 'Half Ice 3-Station Rotation', 'skating', 'warmup', stationsDiagram('three_station'), ['Stations', 'Rotation', 'HalfIce'], ['skating', 'puck handling', 'compete'], ['10U', '12U', '14U'], 'intermediate', 12, '9-15', 'medium', 8, false],
  ['q72', 'Two-Pad Slide Stations', 'goalie', 'goalie', goalieDrillDiagram('cross_crease'), ['Stations', 'Goalie'], ['goalie', 'lateral movement'], ['12U', '14U', 'HS'], 'intermediate', 6, '2-4', 'low', 7, true],
  ['q73', 'Wall Battle Station', 'battle', 'compete', oneOnOneDiagram('chip_chase'), ['Stations', 'Battle', 'Walls'], ['compete', 'walls', 'recovery'], ['10U', '12U', '14U'], 'intermediate', 5, '4-8', 'low', 9, false],

  // Compete / SAG variants (6)
  ['q74', 'King of the Hill 1v1', 'compete', 'compete', oneOnOneDiagram('king_of_hill'), ['Compete', '1v1', 'NetDrive'], ['compete', 'second effort'], ['10U', '12U', '14U', 'HS'], 'intermediate', 8, '4-8', 'low', 10, true],
  ['q75', '2v2 Cross-Ice Mini Game', 'sag', 'small area', gameDiagram('mini_2v2'), ['SmallArea', 'Game', 'CrossIce'], ['decision making', 'support'], ['8U', '10U', '12U'], 'intermediate', 10, '4-8', 'low', 10, true],
  ['q76', '3v3 Below the Tops Score Game', 'sag', 'small area', gameDiagram('cross_ice_3v3'), ['SmallArea', 'Game', 'OZone'], ['compete', 'support', 'spacing'], ['10U', '12U', '14U'], 'intermediate', 12, '6-10', 'low', 10, true],
  ['q77', 'Reverse Score Keepaway', 'sag', 'small area', gameDiagram('gates_3v3'), ['SmallArea', 'Possession', 'NoShot'], ['puck protection', 'spacing'], ['10U', '12U', '14U'], 'intermediate', 8, '6-10', 'low', 9, false],
  ['q78', '4v4 Net-to-Net Cross Ice', 'sag', 'small area', gameDiagram('cross_ice_4v4'), ['SmallArea', 'Game', 'Transition'], ['transition', 'compete'], ['10U', '12U', '14U', 'HS'], 'intermediate', 12, '8-12', 'low', 10, true],
  ['q79', 'Sudden Death Empty Net Race', 'compete', 'compete', gameDiagram('sudden_death'), ['Compete', '1v1', 'Race'], ['compete', 'speed', 'second effort'], ['8U', '10U', '12U'], 'beginner', 6, '4-8', 'low', 10, false],

  // Game-situation / specialty (8)
  ['q80', 'Defensive Zone Faceoff Win Setup', 'dzone', 'defense', faceoffDiagram('dz_win'), ['Faceoff', 'DZone', 'Structure'], ['faceoff', 'breakout', 'team structure'], ['12U', '14U', 'HS'], 'advanced', 8, '8-12', 'medium', 6, true],
  ['q81', 'Offensive Zone Faceoff Play', 'ozone', 'offense', faceoffDiagram('oz_win'), ['Faceoff', 'OZone', 'SetPlay'], ['faceoff', 'set play', 'shooting'], ['12U', '14U', 'HS'], 'advanced', 8, '8-12', 'medium', 7, true],
  ['q82', 'Neutral Zone Faceoff Read', 'transition', 'transition', faceoffDiagram('nz_read'), ['Faceoff', 'NZ', 'Read'], ['faceoff', 'transition', 'reads'], ['12U', '14U', 'HS'], 'advanced', 7, '8-12', 'medium', 6, false],
  ['q83', '5v4 Power Play Umbrella', 'pp', 'power play', specialTeamsDiagram('umbrella_5v4'), ['PowerPlay', 'Umbrella', 'TeamPlay'], ['power play', 'rotation'], ['12U', '14U', 'HS'], 'advanced', 12, '5-10', 'medium', 7, true],
  ['q84', '4v5 Penalty Kill Diamond', 'pk', 'penalty kill', specialTeamsDiagram('diamond_pk'), ['PenaltyKill', 'Diamond', 'TeamPlay'], ['penalty kill', 'rotation'], ['12U', '14U', 'HS'], 'advanced', 12, '5-10', 'medium', 6, true],
  ['q85', '6v5 Empty Net Cycle', 'ozone', 'offense', specialTeamsDiagram('umbrella'), ['EmptyNet', '6v5', 'Cycle'], ['cycle', 'team play'], ['14U', 'HS'], 'advanced', 10, '6-12', 'medium', 7, false],
  ['q86', '5v6 Empty Net Defense', 'dzone', 'defense', specialTeamsDiagram('diamond_pk'), ['EmptyNet', '5v6', 'Defense'], ['defense', 'rotation', 'pressure'], ['14U', 'HS'], 'advanced', 8, '6-12', 'medium', 6, false],
  ['q87', '3-on-2 Late Pressure Read', 'transition', 'transition', rushDiagram('3v2'), ['Transition', '3v2', 'Rush'], ['transition', 'support', 'reads'], ['10U', '12U', '14U', 'HS'], 'intermediate', 9, '6-10', 'low', 9, true],

  // Conditioning + warmup (5)
  ['q88', 'Gretzky Lap with Pucks', 'cond', 'conditioning', conditioningDiagram('gretzky_lap'), ['Conditioning', 'Lap', 'Pucks'], ['skating', 'puck handling', 'conditioning'], ['10U', '12U', '14U'], 'intermediate', 8, 'all', 'low', 8, false],
  ['q89', 'Two-Whistle Suicide Skate', 'cond', 'conditioning', conditioningDiagram('suicide'), ['Conditioning', 'Skating', 'Hard'], ['skating', 'conditioning', 'mental'], ['12U', '14U', 'HS'], 'advanced', 6, 'all', 'low', 5, false],
  ['q90', 'Star Pattern Warmup', 'warmup', 'warmup', stationaryDrillDiagram('star_warmup'), ['Warmup', 'Passing', 'Movement'], ['passing', 'movement', 'tempo'], ['8U', '10U', '12U', '14U', 'HS'], 'beginner', 6, '5-10', 'low', 7, false],
  ['q91', 'Continuous Crossover Loop', 'cond', 'conditioning', conditioningDiagram('crossover_loop'), ['Conditioning', 'Crossovers', 'Edges'], ['skating', 'edges', 'conditioning'], ['10U', '12U', '14U'], 'intermediate', 7, 'all', 'low', 7, false],
  ['q92', 'Four Corner Sprint Relay', 'cond', 'conditioning', conditioningDiagram('sprint_relay'), ['Conditioning', 'Race', 'Team'], ['skating', 'conditioning', 'compete'], ['10U', '12U', '14U', 'HS'], 'intermediate', 8, '8-16', 'low', 9, false],

  // Goalie-specific (5)
  ['q93', 'Lateral T-Push Drill', 'goalie', 'goalie', goalieDrillDiagram('t_push'), ['Goalie', 'TPush', 'Lateral'], ['goalie', 'movement', 'lateral'], ['10U', '12U', '14U', 'HS'], 'intermediate', 7, '2-4', 'low', 7, true],
  ['q94', 'Depth and Angle Reset', 'goalie', 'goalie', goalieDrillDiagram('depth_reset'), ['Goalie', 'Depth', 'Angles'], ['goalie', 'angles', 'tracking'], ['12U', '14U', 'HS'], 'intermediate', 6, '2-4', 'low', 6, true],
  ['q95', 'Rebound Control to Cover', 'goalie', 'goalie', goalieDrillDiagram('rebound_cover'), ['Goalie', 'Rebound', 'Cover'], ['goalie', 'rebound control', 'cover'], ['12U', '14U', 'HS'], 'intermediate', 7, '2-4', 'low', 7, true],
  ['q96', 'Cross-Crease Track Drill', 'goalie', 'goalie', goalieDrillDiagram('cross_crease'), ['Goalie', 'CrossCrease', 'Tracking'], ['goalie', 'tracking', 'lateral'], ['12U', '14U', 'HS'], 'advanced', 8, '3-6', 'low', 8, true],
  ['q97', 'Breakaway Save Sequence', 'goalie', 'goalie', goalieDrillDiagram('breakaway'), ['Goalie', 'Breakaway', 'Reads'], ['goalie', 'breakaway', 'reads'], ['10U', '12U', '14U', 'HS'], 'intermediate', 6, '2-6', 'low', 9, true],
];

// ---- Coaching content builders -------------------------------------------

function buildInstructions(name, family) {
  const base = {
    breakout: 'Start with a retrieval or coach rim. Freeze the first read, then run short reps with clear support routes.',
    passing: 'Keep players moving through the pass. Reward passes that arrive in stride and immediate support after the pass.',
    transition: 'Run continuous reps with a clear read. Coach the decision before the result.',
    offense: 'Teach puck protection and support below the dots, then connect the play to a shot/rebound.',
    compete: 'Score the rep, keep it safe, and reward body position plus second effort.',
    'small area': 'Use short shifts and constraints. The game should teach the concept without long stoppages.',
    forecheck: 'Walk routes once, then run at controlled speed. Stop early if F3 or support shape breaks.',
    defense: 'Start from a dangerous slot/net-front situation. Coach sticks, body position, and rotation order.',
    goalie: 'Goalie details are primary. Shooters should support the goalie objective with consistent releases.',
    shooting: 'Prioritize release timing, net traffic, and second effort rather than just shooting volume.',
    warmup: 'Use as a tempo setter. Corrections should be short and repeated in the next rep.',
    'puck handling': 'Add pressure only after players can keep eyes up and change speed.',
    conditioning: 'Conditioning must still include a hockey skill or game cue.',
    'power play': 'Freeze the possession shape and show the pressure release before live puck movement.',
    'penalty kill': 'Teach pressure triggers and recovery shape before making it fully live.',
  };
  return base[family] || `Run ${name} with short reps, clear teaching cues, and a game-transfer finish.`;
}

function coachingPoints(family) {
  const points = {
    breakout: ['Shoulder check before first touch', 'Support stays under the puck', 'First pass arrives on forehand', 'Exit with width and speed'],
    passing: ['Present a target early', 'Pass to space/stride', 'Move after the pass', 'Talk before pressure arrives'],
    transition: ['Attack with speed', 'Make the read before hashmarks', 'Support away from pressure', 'Finish with rebound pressure'],
    offense: ['Protect puck with hips', 'Find support before panic pass', 'Get puck to inside ice', 'Arrive for rebound'],
    compete: ['Low hips and inside hands', 'Win body position first', 'Second effort after contact', 'Keep sticks safe and down'],
    'small area': ['Short shifts', 'Support triangles', 'Quick decisions', 'Play through possession changes'],
    forecheck: ['Angle, do not chase', 'F2 takes the next option', 'F3 stays above puck', 'Reload after turnover'],
    defense: ['Sticks in lanes first', 'Protect dangerous ice', 'Box out with feet', 'Communicate rotation'],
    goalie: ['Set feet before release', 'Track puck with eyes first', 'Recover square', 'Control or steer rebounds'],
    shooting: ['Catch and release', 'Change the goalie angle', 'Hit the net', 'Crash for second chance'],
    warmup: ['Knees bent', 'Full extension', 'Eyes up', 'Finish through line'],
    'puck handling': ['Hands away from body', 'Protect through pressure', 'Change speed after move', 'Eyes up before final touch'],
    conditioning: ['Sprint through line', 'Skill before speed', 'Recover quickly', 'Compete safely'],
    'power play': ['Move puck before box settles', 'Bumper shows early', 'Net-front screens legally', 'Recover loose pucks'],
    'penalty kill': ['Pressure on triggers', 'Protect middle seam', 'Stick detail first', 'Clear and reload'],
  };
  return points[family] || ['Run with pace', 'Coach one detail at a time', 'Transfer into game context'];
}

function mistakes(family) {
  return ({
    breakout: ['Center leaves zone early', 'D stickhandles into pressure', 'Wall winger stops feet'],
    passing: ['Standing still after pass', 'Passing to feet', 'No communication'],
    transition: ['Passing too early', 'Wide player drifts flat', 'Decision happens too late'],
    offense: ['Throwing blind pucks', 'No net drive', 'Too much perimeter play'],
    compete: ['Reaching instead of skating', 'Unsafe stick contact', 'No second effort'],
    'small area': ['Long shifts', 'Players watch after passing', 'No support below puck'],
    forecheck: ['F1 chases straight', 'F3 dives below puck', 'F2 puck-watches'],
    defense: ['Chasing behind net', 'Ignoring net-front stick', 'Late communication'],
    goalie: ['Guessing on rebound', 'Recovering without tracking', 'Not set before shot'],
    shooting: ['Dusting puck too long', 'Missing net', 'No rebound route'],
    warmup: ['Standing upright', 'Coasting between cones', 'Lazy finish'],
    'puck handling': ['Eyes glued to puck', 'Hands tight to body', 'No speed change'],
    conditioning: ['Racing with sloppy skills', 'Stopping before line'],
    'power play': ['Static flanks', 'No net-front screen'],
    'penalty kill': ['Pressure without support', 'Opening seam pass'],
  })[family] || ['Low tempo', 'Poor spacing'];
}

function progression(family) {
  return ({
    breakout: ['Walk routes', 'Add one forechecker', 'Add second read', 'Finish with rush'],
    passing: ['Stationary reps', 'Add movement', 'Add pressure', 'Finish with shot/game'],
    transition: ['Pattern rep', 'Add passive defender', 'Make defender live', 'Add back pressure'],
    offense: ['No pressure pattern', 'Add defender stick', 'Live puck protection', 'Finish with rebound battle'],
    compete: ['Body-position only', 'Live puck', 'Add support', 'Winner attacks net'],
    'small area': ['Constraint game', 'Add scoring rule', 'Add transition rule', 'Tournament scoring'],
    forecheck: ['Walk lanes', 'Controlled breakout', 'Live breakout', 'Score after turnover'],
    defense: ['Static coverage', 'Add puck movement', 'Live recovery', 'Clear and reload'],
    goalie: ['Set and track', 'Add rebound', 'Add screen', 'Make it compete'],
    shooting: ['Catch-release', 'Add pass angle', 'Add screen', 'Add rebound race'],
    warmup: ['Mechanics', 'Pace', 'Add puck', 'Relay/competition'],
    'puck handling': ['No pressure', 'Passive pressure', 'Live pressure', 'Compete finish'],
    conditioning: ['Timed reps', 'Partner race', 'Team relay', 'Puck added'],
    'power play': ['Shape only', 'One-touch movement', 'Add PK sticks', 'Live PP rep'],
    'penalty kill': ['Walk shape', 'Controlled puck movement', 'Pressure triggers', 'Live clear'],
  })[family] || ['Teach', 'Pressure', 'Game transfer'];
}

// ---- Final export --------------------------------------------------------

export const eliteDrillsPack2 = drillSpecs.map(([id, name, category, family, diagramObj, tags, skillFocus, ageLevels, difficulty, duration, playerCount, setupTime, funRating, goalie]) => ({
  id,
  quality: 'elite',
  qualityScore: 9,
  name,
  category,
  tags,
  skillFocus,
  ageLevels,
  ice_type: diagramObj.rink.includes('quarter') ? 'quarter' : 'half',
  iceUsage: diagramObj.rink.includes('quarter') ? 'quarter ice' : 'half ice',
  intensity: difficulty === 'advanced' ? 'high' : 'medium',
  difficulty,
  duration,
  playerCount,
  setupTime,
  funRating,
  goalie,
  animated: true,
  animationKey: id,
  animationSummary: diagramObj.sequence.map(s => s.label).join(' → '),
  coaching_points: coachingPoints(family),
  instructions: buildInstructions(name, family),
  commonMistakes: mistakes(family),
  progressions: progression(family),
  regressions: ['Remove pressure', 'Slow the first rep', 'Freeze at the main read', 'Use cones to mark spacing'],
  equipment: setupTime === 'medium' ? ['pucks', 'cones', 'nets'] : ['pucks', 'nets'],
  diagram: diagramObj,
}));
