/* BenchBoss Coach HQ — Elite Drill Pack 3 (q98–q157)
   60 additional high-quality drills with drill-specific animation paths.
   Built for v0.10.0 marketability lift:
     - more 8U/10U fundamentals
     - more 12U/14U team concepts
     - more small-area games
     - more goalie-integrated options
     - better half-ice/station practices for crowded rinks
*/

const DUR = { quick: 700, normal: 850, long: 1050 };

function obj(id, type, label, x, y) { return { id, type, label, x, y }; }
function arr(from, to, style = 'straight', label = '', extra = {}) { return { from, to, style, label, ...extra }; }
function step(label, idx, focusIds, durationMs = DUR.normal) { return { label, arrowIndexes: idx, focusIds, durationMs }; }
function goal() { return obj('NET', 'goal', '', 150, 38); }
function puck(x, y) { return obj('P', 'puck', '', x, y); }
function cone(id, x, y) { return obj(id, 'cone', '', x, y); }
function diagram({ rink = 'half_ice', objects = [], arrows = [], sequence = [] }) { return { rink, objects, arrows, sequence }; }

function laneSkillDiagram(kind = 'inside_edges') {
  const labels = {
    inside_edges: ['Start low', 'Inside edge hold', 'Outside edge switch', 'Accelerate out'],
    mohawk: ['Approach', 'Open hips', 'Protect puck', 'Exit with speed'],
    escape: ['Collect puck', 'Fake up wall', 'Escape turn', 'Attack seam'],
    overspeed: ['Explode', 'Fast hands', 'Recover feet', 'Finish through'],
    stops: ['Sprint', 'Hard stop', 'Reload', 'Re-attack'],
  }[kind] || ['Start', 'Work', 'Read', 'Finish'];
  return diagram({
    rink: 'half_ice',
    objects: [obj('A', 'player', 'A', 62, 430), cone('C1', 88, 334), cone('C2', 205, 258), cone('C3', 92, 175), obj('F', 'player', 'Finish', 215, 82), puck(62, 430)],
    arrows: [
      arr('A', 'C1', 'curve', labels[1]),
      arr('C1', 'C2', 'curve', labels[2]),
      arr('C2', 'C3', 'curve', labels[3]),
      arr('C3', 'F', 'curve', 'Explode out'),
    ],
    sequence: [
      step(labels[0], [0], ['A', 'C1']),
      step(labels[1], [0, 1], ['C1', 'C2']),
      step(labels[2], [1, 2], ['C2', 'C3']),
      step(labels[3], [2, 3], ['C3', 'F'], DUR.quick),
    ],
  });
}

function partnerPassingDiagram(kind = 'give_go') {
  const shoot = kind.includes('shot') || kind.includes('finish');
  const support = kind.includes('support') || kind.includes('regroup');
  return diagram({
    rink: 'half_ice',
    objects: [
      obj('P1', 'player', 'P1', 78, 418), obj('P2', 'player', 'P2', 222, 318),
      obj('P3', 'player', 'P3', support ? 150 : 90, 210), obj('D1', 'player', 'D', 168, 150),
      goal(), puck(78, 418)
    ],
    arrows: [
      arr('P1', 'P2', 'straight', 'Pass'),
      arr('P1', 'P3', 'curve', support ? 'Support middle' : 'Drive lane'),
      arr('P2', 'P3', 'straight', 'Return pass'),
      arr('P3', shoot ? 'NET' : 'D1', 'straight', shoot ? 'Quick finish' : 'Next pass'),
    ],
    sequence: [
      step('Puck starts with outside player; head up before pass', [0], ['P1', 'P2']),
      step(support ? 'Middle support times route below puck' : 'Passer follows and becomes the next option', [1], ['P1', 'P3']),
      step('Receiver moves puck before pressure arrives', [2], ['P2', 'P3']),
      step(shoot ? 'Catch and release with traffic at the net' : 'Move the puck to the next layer', [3], ['P3', shoot ? 'NET' : 'D1']),
    ],
  });
}

function shootingDiagram(kind = 'quick_release') {
  const netfront = kind.includes('screen') || kind.includes('rebound');
  return diagram({
    rink: 'half_ice',
    objects: [
      obj('S1', 'player', 'S1', 70, 405), obj('S2', 'player', 'S2', 225, 325),
      obj('C', 'player', netfront ? 'Screen' : 'C', 150, 172), obj('D', 'player', 'D', 150, 275),
      goal(), puck(70, 405)
    ],
    arrows: [
      arr('S1', 'D', 'straight', 'Pass up'),
      arr('D', 'S2', 'straight', 'Bump across'),
      arr('S2', 'NET', 'straight', kind.includes('one_timer') ? 'One timer' : 'Shot'),
      arr('C', 'NET', 'straight', netfront ? 'Screen/rebound' : 'Net drive'),
    ],
    sequence: [
      step('First pass is firm and flat', [0], ['S1', 'D']),
      step('Middle player moves it without dusting it off', [1], ['D', 'S2']),
      step(kind.includes('one_timer') ? 'Shooter opens hips early for one-timer' : 'Shooter catches and releases in one motion', [2], ['S2', 'NET']),
      step(netfront ? 'Net-front player screens, tips, then hunts rebound' : 'Second player stops at the net for rebound', [3], ['C', 'NET']),
    ],
  });
}

function smallAreaDiagram(kind = '2v2') {
  const players = kind.includes('3v3') ? [
    obj('A1', 'player', 'A1', 85, 330), obj('A2', 'player', 'A2', 145, 310), obj('A3', 'player', 'A3', 210, 335),
    obj('B1', 'player', 'B1', 92, 205), obj('B2', 'player', 'B2', 150, 222), obj('B3', 'player', 'B3', 208, 205)
  ] : [
    obj('A1', 'player', 'A1', 95, 328), obj('A2', 'player', 'A2', 205, 330),
    obj('B1', 'player', 'B1', 105, 218), obj('B2', 'player', 'B2', 197, 218)
  ];
  return diagram({
    rink: 'quarter_ice',
    objects: [...players, goal(), cone('G1', 58, 85), cone('G2', 242, 85), puck(150, 275)],
    arrows: [
      arr('P', 'A1', 'straight', 'Loose puck'),
      arr('A1', 'A2', 'straight', 'Support pass'),
      arr('B1', 'A1', 'straight', 'Pressure angle'),
      arr('A2', 'NET', 'straight', 'Attack net'),
    ],
    sequence: [
      step('Coach spots puck into contested area', [0], ['P', 'A1']),
      step('Puck carrier protects and finds support', [1], ['A1', 'A2']),
      step('Defender angles stick-on-puck, body-on-body', [2], ['B1', 'A1']),
      step('Attack off the win: quick shot, rebound, then reset', [3], ['A2', 'NET']),
    ],
  });
}

function breakoutDiagram(kind = 'wheel') {
  const reverse = kind.includes('reverse');
  const rim = kind.includes('rim');
  return diagram({
    rink: 'half_ice',
    objects: [
      obj('D1', 'player', 'D1', 126, 130), obj('D2', 'player', 'D2', 195, 126),
      obj('C', 'player', 'C', 150, 245), obj('LW', 'player', 'LW', 58, 278), obj('RW', 'player', 'RW', 242, 278),
      obj('F1', 'player', 'F1', 112, 375), obj('F2', 'player', 'F2', 196, 390), goal(), puck(126, 130)
    ],
    arrows: [
      arr('D1', reverse ? 'D2' : 'LW', reverse ? 'straight' : 'curve', reverse ? 'Reverse behind net' : rim ? 'Rim with purpose' : 'Wall outlet'),
      arr(reverse ? 'D2' : 'LW', 'C', 'straight', 'Low center support'),
      arr('C', rim ? 'RW' : 'RW', 'straight', 'Middle bump'),
      arr('RW', 'F1', 'straight', 'Exit with speed'),
      arr('LW', 'F2', 'curve', 'Weakside stretch'),
    ],
    sequence: [
      step('D scans shoulder before first touch', [0], ['D1', reverse ? 'D2' : 'LW']),
      step('Center supports below the puck, not drifting high', [1], [reverse ? 'D2' : 'LW', 'C']),
      step('Middle bump beats the forechecker stick', [2], ['C', 'RW']),
      step('Exit lane attacks between dots with speed', [3,4], ['RW', 'F1', 'LW', 'F2']),
    ],
  });
}

function forecheckDiagram(kind = '212') {
  return diagram({
    rink: 'half_ice',
    objects: [
      obj('F1', 'player', 'F1', 150, 345), obj('F2', 'player', 'F2', 88, 270), obj('F3', 'player', 'F3', 218, 275),
      obj('D1', 'player', 'D1', 105, 148), obj('D2', 'player', 'D2', 196, 148), obj('O', 'player', 'Opp', 150, 118),
      goal(), puck(150, 118)
    ],
    arrows: [
      arr('F1', 'O', 'straight', kind === 'trap' ? 'Steer outside' : 'Pressure inside shoulder'),
      arr('F2', 'D1', 'curve', 'Seal wall'),
      arr('F3', 'D2', 'curve', 'High support'),
      arr('D1', 'F1', 'straight', 'Pinch read'),
    ],
    sequence: [
      step('F1 arrives under control and takes away the middle', [0], ['F1', 'O']),
      step('F2 reads the rim and seals the wall side', [1], ['F2', 'D1']),
      step('F3 stays above the puck as safety valve', [2], ['F3', 'D2']),
      step('Strong-side D pinches only with F3 above', [3], ['D1', 'F1']),
    ],
  });
}

function dzoneDiagram(kind = 'box_out') {
  return diagram({
    rink: 'half_ice',
    objects: [
      obj('D1', 'player', 'D1', 105, 125), obj('D2', 'player', 'D2', 195, 126),
      obj('C', 'player', 'C', 150, 210), obj('W1', 'player', 'W1', 70, 255), obj('W2', 'player', 'W2', 230, 255),
      obj('O1', 'player', 'O1', 132, 92), obj('O2', 'player', 'O2', 174, 92), goal(), puck(132, 92)
    ],
    arrows: [
      arr('D1', 'O1', 'straight', 'Body position'),
      arr('D2', 'O2', 'straight', 'Box out'),
      arr('C', 'P', 'straight', 'Low support'),
      arr('W1', 'D1', 'straight', 'Collapse/check stick'),
    ],
    sequence: [
      step('Defenders establish inside body position first', [0,1], ['D1','O1','D2','O2']),
      step('Center supports below the puck and calls coverage', [2], ['C','P']),
      step('Weakside wing collapses with stick in lane', [3], ['W1','D1']),
      step('Win rebound, bump to wall, exit quickly', [2,3], ['C','W1']),
    ],
  });
}

function goalieDiagram(kind = 'tracking') {
  return diagram({
    rink: 'half_ice',
    objects: [
      obj('G', 'player', 'G', 150, 58), obj('S1', 'player', 'S1', 65, 330), obj('S2', 'player', 'S2', 235, 270),
      obj('S3', 'player', 'S3', 150, 210), goal(), puck(65, 330)
    ],
    arrows: [
      arr('S1', 'S2', 'straight', 'East-west pass'),
      arr('G', 'S2', 'straight', 'Square + push'),
      arr('S2', 'S3', 'straight', 'Low-high option'),
      arr('S3', 'NET', 'straight', kind === 'rebound' ? 'Shot + rebound' : 'Shot'),
    ],
    sequence: [
      step('Goalie starts square and tracks puck before pass', [0], ['G','S1','S2']),
      step('Explosive push and set feet before release', [1], ['G','S2']),
      step('Read low-high pass and maintain angle', [2], ['S2','S3','G']),
      step(kind === 'rebound' ? 'Control first rebound or recover to second puck' : 'Track shot into body/glove', [3], ['S3','NET','G']),
    ],
  });
}

function specialTeamsDiagram(kind = 'power_play') {
  const pp = kind === 'power_play';
  return diagram({
    rink: 'half_ice',
    objects: [
      obj('P1','player',pp?'QB':'F1',150,238), obj('P2','player',pp?'Wall':'W',64,184),
      obj('P3','player',pp?'Bumper':'C',150,150), obj('P4','player',pp?'Flank':'W',236,184),
      obj('P5','player',pp?'Net':'Net',150,82), obj('K1','player','PK',112,145), obj('K2','player','PK',188,145),
      goal(), puck(150,238)
    ],
    arrows: [
      arr('P1','P2','straight',pp?'Move PK':'Pressure trigger'),
      arr('P2','P3','straight',pp?'Bumper touch':'Middle denial'),
      arr('P3','P4','straight',pp?'Seam pass':'Rotate'),
      arr('P4','NET','straight',pp?'Shot/tip':'Clear lane'),
    ],
    sequence: [
      step(pp ? 'QB sells shot before moving puck' : 'First forward angles puck to wall', [0], ['P1','P2']),
      step(pp ? 'Bumper presents target and releases pressure' : 'Middle defender denies inside pass', [1], ['P2','P3']),
      step(pp ? 'Far flank catches ready to attack' : 'Weakside rotates without overcommitting', [2], ['P3','P4']),
      step(pp ? 'Net-front screens and tracks rebound' : 'Win puck and clear with support', [3], ['P4','NET']),
    ],
  });
}

function coachingPoints(family) {
  const map = {
    skating: ['Stay low through the whole route', 'Recover feet under hips before accelerating', 'Finish every rep through the line'],
    puck: ['Eyes up before pressure arrives', 'Use body position to protect the puck', 'Change speed after the move'],
    passing: ['Present a target before the puck arrives', 'Move after every pass', 'Pass to space, not just to sticks'],
    shooting: ['Load before the puck arrives', 'Release quickly without extra stickhandles', 'Stop at the net for second effort'],
    compete: ['Win inside body position', 'Stick on puck, body through hands', 'Play until possession or whistle'],
    breakout: ['Scan before retrieval', 'Center supports below the puck', 'Exit with speed between dots'],
    forecheck: ['F1 controls the middle first', 'F2 seals the next option', 'F3 stays above the puck'],
    defense: ['Protect inside ice first', 'Communicate switches early', 'Win rebound and exit'],
    goalie: ['Set feet before release', 'Track puck all the way in', 'Recover under control to the next angle'],
    special: ['Move defenders before attacking', 'Keep stick detail disciplined', 'Know the next read before the puck arrives'],
  };
  return map[family] || ['Keep tempo high', 'Freeze the key read once', 'Correct details between reps'];
}

function mistakes(family) {
  const map = {
    skating: ['Standing up before the turn', 'Gliding after the cone', 'Crossing hands over body'],
    puck: ['Looking down too long', 'Exposing puck to pressure', 'No speed change after move'],
    passing: ['Flat-footed receiver', 'Pass behind support option', 'No communication'],
    shooting: ['Dusting puck off', 'Missing net from prime area', 'Skating past rebound'],
    compete: ['Reaching instead of moving feet', 'Wrong body side', 'Stopping before possession'],
    breakout: ['Wingers too high', 'Center drifting away from puck', 'D not scanning before retrieval'],
    forecheck: ['F1 skating past puck', 'F2 guessing instead of reading', 'F3 below the puck too early'],
    defense: ['Watching puck and losing stick', 'No box out', 'Weak rebound recovery'],
    goalie: ['Moving while shot is released', 'Over-sliding past angle', 'Dropping before read'],
    special: ['Static players', 'Forcing seam without deception', 'Losing defensive spacing'],
  };
  return map[family] || ['Low tempo', 'Poor spacing', 'No communication'];
}

function progression(family) {
  const map = {
    skating: ['Add puck carry', 'Add chase pressure', 'Time every rep'],
    puck: ['Add active stick pressure', 'Require a pass after escape', 'Score each clean exit'],
    passing: ['One-touch only', 'Add defender stick lane', 'Finish with shot/rebound'],
    shooting: ['Add screen/tip', 'Require catch-and-release', 'Add rebound point'],
    compete: ['Make it 2v2', 'Add transition outlet', 'Score possession wins'],
    breakout: ['Add forechecker pressure', 'Require reverse read', 'Finish with rush shot'],
    forecheck: ['Add live breakout opponent', 'Score turnovers', 'Rotate weakside D pinch'],
    defense: ['Add second puck/rebound', 'Turn into breakout', 'Score clean exits'],
    goalie: ['Add screen', 'Add rebound shot', 'Add east-west pass'],
    special: ['Add timer', 'Require two puck reversals', 'Switch into live PK/PP'],
  };
  return map[family] || ['Add pressure', 'Add scoring', 'Add time constraint'];
}

function buildInstructions(name, family) {
  const base = {
    skating: 'Set cones in a clear lane. Players run short, high-tempo reps with full reset between repetitions.',
    puck: 'Start with puck control through pressure. Coach freezes once to correct body position and eyes-up detail.',
    passing: 'Players exchange pucks through support layers. Rotate lines quickly and demand communication before passes.',
    shooting: 'Run continuous shots with net-front traffic and second effort. Keep reload pucks ready.',
    compete: 'Coach spots a puck into a small area. Players compete until possession, shot, or whistle.',
    breakout: 'Start from a retrieval or coach rim. Players execute support routes and exit with speed.',
    forecheck: 'Coach starts puck with defenders. Forwards execute pressure roles and recover above the puck.',
    defense: 'Start low in the defensive zone. Players identify coverage, box out, and exit on possession.',
    goalie: 'Goalie tracks puck through movement and shot. Shooters rotate quickly and include rebound detail.',
    special: 'Run special-team structure at controlled tempo, then add pressure and scoring constraints.',
  }[family] || 'Run in short reps with one clear teaching point.';
  return `${name}: ${base}`;
}

const drillSpecs = [
  // Fundamentals and skating/puck control
  ['q98','Inside Edge Figure-8 Relay','skating','skating',laneSkillDiagram('inside_edges'),['Skating','Edges','Relay','HalfIce'],['edges','balance','acceleration'],['8U','10U'],'beginner',7,'all','low',8,false],
  ['q99','Mohawk Puck Carry Gates','puck','puck',laneSkillDiagram('mohawk'),['PuckHandling','Edges','HalfIce'],['puck control','mohawk','eyes up'],['10U','12U'],'intermediate',8,'all','low',8,false],
  ['q100','Stop-Start Puck Race','skating','skating',laneSkillDiagram('stops'),['Skating','Race','Compete'],['stops','starts','acceleration'],['8U','10U','12U'],'beginner',7,'all','low',9,false],
  ['q101','Overspeed Hands Through Gates','puck','puck',laneSkillDiagram('overspeed'),['PuckHandling','Overspeed','Warmup'],['hands','speed','control'],['10U','12U','14U'],'intermediate',8,'all','low',8,false],
  ['q102','Escape Turn Wall Attack','puck','puck',laneSkillDiagram('escape'),['PuckProtection','Escape','HalfIce'],['escape turn','protection','attack'],['10U','12U','14U'],'intermediate',8,'6-12','low',8,false],
  ['q103','One-Puck Partner Give-Go','passing','passing',partnerPassingDiagram('give_go'),['Passing','Support','Warmup'],['passing','support','timing'],['8U','10U','12U'],'beginner',7,'all','low',8,false],
  ['q104','Middle Support Triangle','passing','passing',partnerPassingDiagram('support'),['Passing','Support','HalfIce'],['support','middle lane','passing'],['10U','12U','14U'],'intermediate',8,'6-12','low',8,false],
  ['q105','Quick Release Catch and Shoot','shooting','shooting',shootingDiagram('quick_release'),['Shooting','QuickRelease','HalfIce'],['release','shooting','rebound'],['10U','12U','14U'],'intermediate',8,'6-14','low',8,true],
  ['q106','Screen-Tip Rebound Series','shooting','shooting',shootingDiagram('screen_rebound'),['Shooting','NetFront','Goalie'],['screen','tip','rebound'],['12U','14U','HS'],'intermediate',9,'8-14','low',8,true],
  ['q107','One-Timer Flank Timing','shooting','shooting',shootingDiagram('one_timer'),['Shooting','Timing','SpecialTeams'],['one timer','passing','timing'],['12U','14U','HS'],'advanced',9,'8-12','medium',7,true],

  // Small-area compete and game transfer
  ['q108','2v2 Low Slot Box Out','battle','compete',smallAreaDiagram('2v2'),['SmallArea','Compete','Defense'],['box out','compete','rebound'],['10U','12U','14U'],'intermediate',8,'4-8','low',9,true],
  ['q109','3v3 Bumper Support Game','battle','compete',smallAreaDiagram('3v3'),['SmallArea','Game','Support'],['support','quick decisions','compete'],['10U','12U','14U'],'intermediate',10,'6-12','low',9,true],
  ['q110','Corner Puck Protection King','battle','compete',smallAreaDiagram('2v2'),['Battle','PuckProtection','Corner'],['protection','battle','body position'],['10U','12U','14U'],'intermediate',8,'4-8','low',9,false],
  ['q111','Royal Road Mini Game','battle','compete',smallAreaDiagram('3v3'),['SmallArea','Shooting','Game'],['royal road','passing','finish'],['12U','14U','HS'],'advanced',10,'6-10','low',9,true],
  ['q112','Outlet After Battle','battle','compete',smallAreaDiagram('2v2'),['Compete','Transition','Outlet'],['battle','outlet','transition'],['10U','12U','14U'],'intermediate',9,'6-10','low',9,false],
  ['q113','Net-Front Second Effort','battle','compete',smallAreaDiagram('2v2'),['NetFront','Compete','Goalie'],['rebound','battle','finish'],['10U','12U','14U'],'intermediate',8,'4-8','low',9,true],
  ['q114','3v3 Low Cycle Game','battle','compete',smallAreaDiagram('3v3'),['Cycle','SmallArea','Game'],['cycle','support','compete'],['12U','14U','HS'],'advanced',10,'6-12','low',9,true],
  ['q115','Two-Net Transition Game','transition','compete',smallAreaDiagram('3v3'),['Transition','SmallArea','Game'],['transition','read','attack'],['10U','12U','14U'],'intermediate',10,'6-12','medium',9,true],
  ['q116','Possession to Point Shot','battle','compete',smallAreaDiagram('3v3'),['Possession','Shooting','TeamPlay'],['possession','point shot','screen'],['12U','14U','HS'],'advanced',10,'8-12','medium',8,true],
  ['q117','Line Change Small-Area Game','battle','compete',smallAreaDiagram('3v3'),['SmallArea','Change','Compete'],['line change','awareness','support'],['12U','14U','HS'],'advanced',10,'8-14','medium',9,true],

  // Breakout and transition concepts
  ['q118','Wheel Breakout With Low Center','breakout','breakout',breakoutDiagram('wheel'),['Breakout','DZone','TeamPlay'],['breakout','wheel','support'],['10U','12U','14U'],'intermediate',10,'8-14','medium',7,true],
  ['q119','Reverse Breakout Under F1','breakout','breakout',breakoutDiagram('reverse'),['Breakout','Reverse','Pressure'],['reverse','support','pressure'],['12U','14U','HS'],'advanced',10,'8-14','medium',7,true],
  ['q120','Rim Bump Breakout','breakout','breakout',breakoutDiagram('rim'),['Breakout','WallPlay','Transition'],['wall play','breakout','bump'],['10U','12U','14U'],'intermediate',9,'8-14','medium',7,true],
  ['q121','Center Swing Regroup','transition','passing',partnerPassingDiagram('regroup'),['Regroup','Transition','Passing'],['regroup','support','timing'],['12U','14U','HS'],'intermediate',9,'8-14','medium',7,false],
  ['q122','D-to-D Escape Regroup','transition','passing',breakoutDiagram('reverse'),['Regroup','Defense','Transition'],['regroup','D-to-D','timing'],['12U','14U','HS'],'advanced',10,'8-14','medium',7,false],
  ['q123','Neutral Zone Width Attack','transition','passing',partnerPassingDiagram('support_finish'),['Transition','Attack','Width'],['wide lanes','support','finish'],['12U','14U','HS'],'advanced',10,'8-14','medium',8,true],
  ['q124','Middle Lane Drive 3v2','transition','passing',partnerPassingDiagram('shot_finish'),['Rush','Transition','Shooting'],['middle drive','rush','finish'],['10U','12U','14U'],'intermediate',9,'8-14','medium',8,true],
  ['q125','Second Wave Trailer Shot','transition','shooting',shootingDiagram('screen_rebound'),['Transition','Trailer','Shooting'],['trailer','shot','screen'],['12U','14U','HS'],'advanced',10,'8-14','medium',8,true],
  ['q126','Low-to-High Cycle Release','offense','shooting',shootingDiagram('screen_rebound'),['Cycle','LowHigh','Shooting'],['cycle','low-high','screen'],['12U','14U','HS'],'advanced',10,'8-14','medium',8,true],
  ['q127','Behind-Net Support Attack','offense','passing',partnerPassingDiagram('support_finish'),['OZone','Support','Shooting'],['support','net play','finish'],['10U','12U','14U'],'intermediate',9,'6-12','medium',8,true],

  // Forecheck/team defense
  ['q128','2-1-2 F1 Angle Drill','forecheck','forecheck',forecheckDiagram('212'),['Forecheck','TeamPlay','Pressure'],['F1 angle','pressure','support'],['12U','14U','HS'],'advanced',10,'8-14','medium',7,false],
  ['q129','F2 Wall Seal Read','forecheck','forecheck',forecheckDiagram('212'),['Forecheck','WallPlay','TeamPlay'],['F2','wall seal','pressure'],['12U','14U','HS'],'advanced',10,'8-14','medium',7,false],
  ['q130','F3 Above Puck Safety','forecheck','forecheck',forecheckDiagram('212'),['Forecheck','F3','TeamPlay'],['F3','above puck','support'],['12U','14U','HS'],'advanced',10,'8-14','medium',7,false],
  ['q131','Neutral Zone Trap Angle','forecheck','forecheck',forecheckDiagram('trap'),['NeutralZone','Forecheck','Defense'],['trap','angle','support'],['14U','HS'],'advanced',10,'8-14','medium',6,false],
  ['q132','D-Zone Box-Out Rotation','defense','defense',dzoneDiagram('box_out'),['Defense','DZone','BoxOut'],['coverage','box out','rebound'],['10U','12U','14U'],'intermediate',9,'8-14','medium',7,true],
  ['q133','Weakside Collapse and Exit','defense','defense',dzoneDiagram('collapse'),['Defense','DZone','Breakout'],['collapse','exit','support'],['12U','14U','HS'],'intermediate',10,'8-14','medium',7,true],
  ['q134','Net-Front Stick Lift Circuit','defense','defense',dzoneDiagram('box_out'),['Defense','NetFront','Compete'],['stick detail','net front','box out'],['10U','12U','14U'],'intermediate',8,'6-12','low',8,true],
  ['q135','Shot Block Lane Read','defense','defense',dzoneDiagram('collapse'),['Defense','ShotBlock','PK'],['shot block','lane','courage'],['12U','14U','HS'],'advanced',8,'6-10','medium',6,true],
  ['q136','Breakout After Rebound Win','defense','breakout',dzoneDiagram('box_out'),['Defense','Breakout','Transition'],['rebound','breakout','transition'],['10U','12U','14U'],'intermediate',10,'8-14','medium',8,true],
  ['q137','Low Switch Communication','defense','defense',dzoneDiagram('switch'),['Defense','Communication','DZone'],['switch','communication','coverage'],['12U','14U','HS'],'advanced',10,'8-14','medium',7,true],

  // Goalies and goalie-integrated
  ['q138','Goalie East-West Tracking','goalie','goalie',goalieDiagram('tracking'),['Goalie','Tracking','Shooting'],['tracking','angle','set feet'],['10U','12U','14U'],'intermediate',8,'4-8','low',7,true],
  ['q139','Goalie Rebound Recovery Race','goalie','goalie',goalieDiagram('rebound'),['Goalie','Rebound','Compete'],['rebound','recovery','second shot'],['10U','12U','14U'],'intermediate',8,'4-8','low',8,true],
  ['q140','Goalie Screen Tracking Series','goalie','goalie',shootingDiagram('screen_rebound'),['Goalie','Screen','NetFront'],['screen','tracking','rebound'],['12U','14U','HS'],'intermediate',9,'6-10','low',7,true],
  ['q141','Goalie Pass-Out Read','goalie','goalie',partnerPassingDiagram('support_finish'),['Goalie','Read','Passing'],['low-high','tracking','angle'],['12U','14U','HS'],'advanced',9,'6-10','medium',7,true],
  ['q142','Goalie Post-Seal to Slot Shot','goalie','goalie',goalieDiagram('rebound'),['Goalie','PostSeal','Recovery'],['post seal','push','slot shot'],['12U','14U','HS'],'advanced',9,'4-8','medium',7,true],
  ['q143','Goalie Puck-Handle Rim Stop','goalie','goalie',breakoutDiagram('rim'),['Goalie','PuckHandling','Breakout'],['puck handling','rim stop','breakout'],['12U','14U','HS'],'advanced',9,'6-10','medium',7,true],

  // Special teams and specialty situations
  ['q144','Power Play Bumper Touch','special','special',specialTeamsDiagram('power_play'),['PowerPlay','Bumper','SpecialTeams'],['bumper','seam','net front'],['12U','14U','HS'],'advanced',10,'8-14','medium',7,true],
  ['q145','Power Play Low Seam','special','special',specialTeamsDiagram('power_play'),['PowerPlay','Seam','Shooting'],['seam','one touch','finish'],['14U','HS'],'advanced',10,'8-14','medium',7,true],
  ['q146','Penalty Kill Wall Pressure','special','special',specialTeamsDiagram('penalty_kill'),['PenaltyKill','Wall','Defense'],['PK','pressure','clear'],['12U','14U','HS'],'advanced',10,'8-14','medium',6,true],
  ['q147','PK Clear and Change','special','special',specialTeamsDiagram('penalty_kill'),['PenaltyKill','Clear','Change'],['clear','line change','pressure'],['12U','14U','HS'],'advanced',9,'8-14','medium',6,true],
  ['q148','6v5 Net-Front Scramble','special','compete',smallAreaDiagram('3v3'),['ExtraAttacker','NetFront','Compete'],['6v5','scramble','rebound'],['14U','HS'],'advanced',10,'8-14','medium',9,true],
  ['q149','Empty-Net Exit Decision','special','breakout',breakoutDiagram('reverse'),['EmptyNet','Breakout','Decision'],['exit','decision','support'],['14U','HS'],'advanced',10,'8-14','medium',7,false],
  ['q150','Faceoff Win to Shot','special','shooting',shootingDiagram('quick_release'),['Faceoff','Shooting','SetPlay'],['faceoff','shot','timing'],['10U','12U','14U'],'intermediate',8,'5-10','low',8,true],
  ['q151','Faceoff Loss Recovery','special','defense',dzoneDiagram('collapse'),['Faceoff','Defense','Recovery'],['faceoff','coverage','recovery'],['10U','12U','14U'],'intermediate',8,'5-10','low',7,true],

  // Stations / mixed practice builders
  ['q152','Three-Station Skill Rotation','stations','skating',laneSkillDiagram('inside_edges'),['Stations','Skating','PuckHandling'],['stations','edges','puck control'],['8U','10U','12U'],'beginner',12,'all','medium',8,false],
  ['q153','Half-Ice Passing Stations','stations','passing',partnerPassingDiagram('support'),['Stations','Passing','HalfIce'],['stations','passing','support'],['8U','10U','12U'],'beginner',12,'all','medium',8,false],
  ['q154','Half-Ice Shooting Stations','stations','shooting',shootingDiagram('quick_release'),['Stations','Shooting','Goalie'],['stations','shooting','rebound'],['10U','12U','14U'],'intermediate',12,'all','medium',8,true],
  ['q155','Battle Station Rotation','stations','compete',smallAreaDiagram('2v2'),['Stations','Compete','SmallArea'],['stations','battle','compete'],['10U','12U','14U'],'intermediate',12,'all','medium',9,true],
  ['q156','Game-Transfer Circuit','stations','compete',smallAreaDiagram('3v3'),['Stations','Game','Decision'],['stations','decision','game transfer'],['12U','14U','HS'],'advanced',14,'all','medium',9,true],
  ['q157','Practice Finisher: Two-Minute Challenge','battle','compete',smallAreaDiagram('3v3'),['Finisher','Compete','Game'],['finish','compete','scoring'],['10U','12U','14U','HS'],'intermediate',6,'all','low',10,true],
];

export const eliteDrillsPack3 = drillSpecs.map(([id, name, category, family, diagramObj, tags, skillFocus, ageLevels, difficulty, duration, playerCount, setupTime, funRating, goalie]) => ({
  id,
  quality: 'elite',
  qualityScore: family === 'compete' ? 10 : 9,
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
  animationSummary: diagramObj.sequence.map(s => s.label).join(' -> '),
  animationSteps: diagramObj.sequence.map(s => s.label),
  coaching_points: coachingPoints(family),
  coachingPoints: coachingPoints(family),
  instructions: buildInstructions(name, family),
  commonMistakes: mistakes(family),
  progressions: progression(family),
  regressions: ['Remove pressure', 'Slow the first rep', 'Freeze at the key read', 'Use cones to mark spacing'],
  equipment: setupTime === 'medium' ? ['pucks', 'cones', 'nets'] : ['pucks', 'nets'],
  diagram: diagramObj,
}));
