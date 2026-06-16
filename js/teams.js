/* ============================================================
   RETRO CUP — Base de dados de seleções históricas
   Posições: GK | DEF | MID | ATT
   Atributos 0-99: pac(velocidade) pas(passe) sho(finalização)
                   def(defesa/desarme) gk(goleiro)
   Cada XI é fiel à escalação real do torneio citado.
   ============================================================ */

function P(name, pos, ovr, pac, pas, sho, def, gk) {
  return { name, pos, ovr, pac, pas, sho, def, gk: gk || 25 };
}

const TEAMS = [
  {
    id: 'bra70', name: 'Brasil', year: 1970, short: 'BRA', color: '#f7d716', color2: '#1f7a3d', text: '#1f7a3d',
    players: [
      P('Félix',        'GK', 80, 60, 55, 30, 55, 84),
      P('Carlos Alberto','DEF',88, 82, 78, 72, 84, 25),
      P('Brito',        'DEF', 81, 70, 62, 50, 84, 25),
      P('Piazza',       'DEF', 82, 72, 70, 55, 83, 25),
      P('Everaldo',     'DEF', 79, 75, 66, 48, 80, 25),
      P('Clodoaldo',    'MID', 84, 78, 84, 66, 80, 25),
      P('Gérson',       'MID', 89, 70, 92, 80, 72, 25),
      P('Rivelino',     'MID', 90, 78, 88, 89, 66, 25),
      P('Jairzinho',    'ATT', 90, 90, 78, 88, 50, 25),
      P('Tostão',       'ATT', 88, 80, 86, 86, 45, 25),
      P('Pelé',         'ATT', 97, 90, 92, 96, 55, 25),
    ]
  },
  {
    id: 'bra82', name: 'Brasil', year: 1982, short: 'BRA', color: '#f7d716', color2: '#1f7a3d', text: '#1f7a3d',
    players: [
      P('Waldir Peres', 'GK', 76, 55, 52, 28, 52, 80),
      P('Leandro',      'DEF', 84, 84, 80, 66, 80, 25),
      P('Oscar',        'DEF', 81, 72, 66, 45, 84, 25),
      P('Luizinho',     'DEF', 79, 70, 64, 44, 81, 25),
      P('Júnior',       'DEF', 86, 84, 84, 70, 78, 25),
      P('Cerezo',       'MID', 83, 78, 82, 66, 78, 25),
      P('Falcão',       'MID', 90, 74, 90, 84, 78, 25),
      P('Sócrates',     'MID', 91, 72, 92, 85, 72, 25),
      P('Zico',         'ATT', 93, 82, 90, 93, 55, 25),
      P('Éder',         'ATT', 86, 86, 80, 88, 48, 25),
      P('Serginho',     'ATT', 78, 74, 62, 78, 42, 25),
    ]
  },
  {
    id: 'bra02', name: 'Brasil', year: 2002, short: 'BRA', color: '#f7d716', color2: '#1f7a3d', text: '#1f7a3d',
    players: [
      P('Marcos',        'GK', 85, 58, 56, 30, 58, 87),
      P('Cafu',          'DEF', 87, 90, 80, 60, 82, 25),
      P('Lúcio',         'DEF', 87, 80, 72, 62, 88, 25),
      P('Roque Júnior',  'DEF', 80, 72, 64, 48, 82, 25),
      P('Roberto Carlos','DEF', 89, 92, 80, 84, 80, 25),
      P('Gilberto Silva','MID', 83, 78, 80, 60, 84, 25),
      P('Kléberson',     'MID', 80, 80, 78, 64, 78, 25),
      P('Edmílson',      'DEF', 80, 76, 76, 52, 82, 25),
      P('Ronaldinho',    'MID', 93, 86, 92, 88, 60, 25),
      P('Rivaldo',       'ATT', 92, 82, 90, 92, 58, 25),
      P('Ronaldo',       'ATT', 96, 94, 84, 96, 45, 25),
    ]
  },
  {
    id: 'arg86', name: 'Argentina', year: 1986, short: 'ARG', color: '#75aadb', color2: '#ffffff', text: '#0b3d91',
    players: [
      P('Pumpido',      'GK', 79, 56, 54, 28, 54, 82),
      P('Cuciuffo',     'DEF', 78, 76, 64, 45, 80, 25),
      P('Ruggeri',      'DEF', 84, 76, 68, 58, 86, 25),
      P('Brown',        'DEF', 80, 72, 64, 50, 84, 25),
      P('Olarticoechea','DEF', 80, 82, 70, 50, 80, 25),
      P('Giusti',       'MID', 81, 78, 76, 60, 82, 25),
      P('Batista',      'MID', 82, 76, 80, 62, 82, 25),
      P('Burruchaga',   'MID', 85, 80, 86, 82, 70, 25),
      P('Enrique',      'MID', 80, 78, 80, 66, 76, 25),
      P('Maradona',     'ATT', 97, 88, 94, 92, 55, 25),
      P('Valdano',      'ATT', 84, 82, 80, 84, 50, 25),
    ]
  },
  {
    id: 'arg22', name: 'Argentina', year: 2022, short: 'ARG', color: '#75aadb', color2: '#ffffff', text: '#0b3d91',
    players: [
      P('E. Martínez',   'GK', 88, 60, 62, 32, 60, 89),
      P('Molina',        'DEF', 82, 88, 76, 55, 80, 25),
      P('Romero',        'DEF', 85, 80, 74, 60, 87, 25),
      P('Otamendi',      'DEF', 83, 74, 72, 56, 86, 25),
      P('Tagliafico',    'DEF', 81, 82, 76, 52, 81, 25),
      P('De Paul',       'MID', 85, 82, 86, 74, 80, 25),
      P('Enzo Fernández','MID', 84, 80, 86, 76, 78, 25),
      P('Mac Allister',  'MID', 85, 78, 86, 80, 78, 25),
      P('Di María',      'ATT', 89, 88, 88, 86, 58, 25),
      P('Messi',         'ATT', 97, 86, 96, 94, 50, 25),
      P('J. Álvarez',    'ATT', 86, 90, 80, 88, 55, 25),
    ]
  },
  {
    id: 'ger74', name: 'Alemanha', year: 1974, short: 'GER', color: '#ffffff', color2: '#111111', text: '#111111',
    players: [
      P('Maier',        'GK', 86, 58, 58, 30, 58, 88),
      P('Vogts',        'DEF', 84, 82, 72, 52, 88, 25),
      P('Beckenbauer',  'DEF', 93, 80, 92, 78, 90, 25),
      P('Schwarzenbeck','DEF', 80, 72, 64, 48, 84, 25),
      P('Breitner',     'DEF', 85, 82, 84, 74, 82, 25),
      P('Bonhof',       'MID', 83, 80, 82, 74, 80, 25),
      P('Overath',      'MID', 86, 74, 88, 80, 74, 25),
      P('Hoeneß',       'MID', 84, 84, 82, 80, 70, 25),
      P('Grabowski',    'ATT', 82, 86, 78, 80, 50, 25),
      P('Müller',       'ATT', 92, 80, 76, 95, 45, 25),
      P('Hölzenbein',   'ATT', 80, 82, 76, 78, 48, 25),
    ]
  },
  {
    id: 'ger90', name: 'Alemanha', year: 1990, short: 'GER', color: '#ffffff', color2: '#111111', text: '#111111',
    players: [
      P('Illgner',      'GK', 83, 58, 56, 30, 56, 85),
      P('Berthold',     'DEF', 80, 80, 72, 50, 81, 25),
      P('Kohler',       'DEF', 84, 80, 70, 54, 88, 25),
      P('Augenthaler',  'DEF', 83, 74, 78, 60, 86, 25),
      P('Buchwald',     'DEF', 82, 78, 74, 56, 85, 25),
      P('Brehme',       'DEF', 86, 80, 84, 80, 82, 25),
      P('Matthäus',     'MID', 92, 84, 90, 88, 82, 25),
      P('Häßler',       'MID', 83, 84, 84, 78, 66, 25),
      P('Littbarski',   'MID', 82, 84, 82, 80, 60, 25),
      P('Klinsmann',    'ATT', 89, 88, 80, 90, 50, 25),
      P('Völler',       'ATT', 87, 84, 80, 88, 48, 25),
    ]
  },
  {
    id: 'ger14', name: 'Alemanha', year: 2014, short: 'GER', color: '#ffffff', color2: '#111111', text: '#111111',
    players: [
      P('Neuer',         'GK', 92, 70, 72, 34, 64, 93),
      P('Lahm',          'DEF', 88, 86, 86, 60, 84, 25),
      P('Boateng',       'DEF', 85, 80, 78, 56, 87, 25),
      P('Hummels',       'DEF', 86, 74, 82, 62, 88, 25),
      P('Höwedes',       'DEF', 80, 76, 72, 50, 84, 25),
      P('Schweinsteiger','MID', 88, 78, 90, 80, 82, 25),
      P('Khedira',       'MID', 83, 80, 80, 70, 82, 25),
      P('Kroos',         'MID', 89, 72, 94, 82, 76, 25),
      P('Özil',          'MID', 88, 82, 92, 82, 60, 25),
      P('Müller',        'ATT', 88, 82, 82, 89, 58, 25),
      P('Klose',         'ATT', 85, 78, 76, 88, 50, 25),
    ]
  },
  {
    id: 'fra98', name: 'França', year: 1998, short: 'FRA', color: '#1f4fb3', color2: '#ffffff', text: '#ffffff',
    players: [
      P('Barthez',   'GK', 85, 62, 60, 30, 58, 86),
      P('Thuram',    'DEF', 87, 86, 78, 58, 88, 25),
      P('Blanc',     'DEF', 84, 70, 80, 64, 86, 25),
      P('Desailly',  'DEF', 86, 80, 76, 58, 89, 25),
      P('Lizarazu',  'DEF', 83, 86, 78, 56, 82, 25),
      P('Deschamps', 'MID', 83, 78, 84, 64, 84, 25),
      P('Petit',     'MID', 83, 80, 82, 72, 82, 25),
      P('Karembeu',  'MID', 80, 84, 76, 62, 80, 25),
      P('Zidane',    'MID', 95, 80, 96, 90, 64, 25),
      P('Djorkaeff', 'ATT', 85, 82, 86, 86, 56, 25),
      P('Guivarcʼh', 'ATT', 76, 78, 70, 76, 46, 25),
    ]
  },
  {
    id: 'fra18', name: 'França', year: 2018, short: 'FRA', color: '#1f4fb3', color2: '#ffffff', text: '#ffffff',
    players: [
      P('Lloris',    'GK', 87, 64, 64, 32, 60, 88),
      P('Pavard',    'DEF', 82, 82, 76, 56, 83, 25),
      P('Varane',    'DEF', 87, 86, 76, 56, 89, 25),
      P('Umtiti',    'DEF', 83, 80, 74, 54, 85, 25),
      P('L. Hernández','DEF',83, 86, 76, 56, 84, 25),
      P('Kanté',     'MID', 89, 88, 82, 60, 90, 25),
      P('Pogba',     'MID', 87, 82, 90, 82, 80, 25),
      P('Matuidi',   'MID', 82, 82, 80, 70, 82, 25),
      P('Griezmann', 'ATT', 90, 84, 90, 90, 62, 25),
      P('Mbappé',    'ATT', 92, 97, 84, 90, 50, 25),
      P('Giroud',    'ATT', 82, 70, 78, 84, 52, 25),
    ]
  },
  {
    id: 'ned74', name: 'Holanda', year: 1974, short: 'NED', color: '#ff7a00', color2: '#ffffff', text: '#ffffff',
    players: [
      P('Jongbloed',   'GK', 78, 56, 56, 28, 54, 80),
      P('Suurbier',    'DEF', 81, 84, 74, 52, 81, 25),
      P('Rijsbergen',  'DEF', 80, 74, 68, 50, 83, 25),
      P('Haan',        'DEF', 84, 78, 84, 76, 82, 25),
      P('Krol',        'DEF', 86, 82, 82, 64, 86, 25),
      P('Jansen',      'MID', 82, 80, 80, 64, 82, 25),
      P('Neeskens',    'MID', 88, 84, 86, 84, 82, 25),
      P('Van Hanegem', 'MID', 86, 70, 90, 82, 74, 25),
      P('Rep',         'ATT', 84, 86, 78, 84, 50, 25),
      P('Cruyff',      'ATT', 96, 92, 94, 90, 58, 25),
      P('Rensenbrink', 'ATT', 86, 86, 84, 86, 50, 25),
    ]
  },
  {
    id: 'ita82', name: 'Itália', year: 1982, short: 'ITA', color: '#1f8a4c', color2: '#ffffff', text: '#ffffff',
    players: [
      P('Zoff',     'GK', 88, 56, 60, 30, 60, 90),
      P('Gentile',  'DEF', 84, 78, 70, 50, 89, 25),
      P('Collovati','DEF', 80, 76, 68, 48, 84, 25),
      P('Scirea',   'DEF', 87, 78, 84, 66, 88, 25),
      P('Cabrini',  'DEF', 83, 84, 80, 60, 83, 25),
      P('Bergomi',  'DEF', 82, 80, 72, 52, 86, 25),
      P('Oriali',   'MID', 80, 78, 78, 60, 82, 25),
      P('Tardelli', 'MID', 85, 82, 82, 80, 82, 25),
      P('Conti',    'MID', 85, 86, 86, 80, 64, 25),
      P('Rossi',    'ATT', 88, 82, 78, 92, 46, 25),
      P('Graziani', 'ATT', 81, 80, 74, 82, 48, 25),
    ]
  },
  {
    id: 'esp10', name: 'Espanha', year: 2010, short: 'ESP', color: '#c8102e', color2: '#f7d716', text: '#ffffff',
    players: [
      P('Casillas','GK', 90, 64, 66, 32, 62, 91),
      P('Ramos',   'DEF', 87, 86, 78, 64, 87, 25),
      P('Piqué',   'DEF', 86, 76, 80, 60, 88, 25),
      P('Puyol',   'DEF', 85, 78, 72, 56, 89, 25),
      P('Capdevila','DEF',79, 80, 74, 52, 80, 25),
      P('Busquets','MID', 86, 72, 88, 60, 86, 25),
      P('Xabi Alonso','MID',87,72, 92, 80, 80, 25),
      P('Xavi',    'MID', 92, 76, 96, 80, 70, 25),
      P('Iniesta', 'MID', 93, 84, 94, 86, 66, 25),
      P('Villa',   'ATT', 89, 86, 82, 91, 50, 25),
      P('Pedro',   'ATT', 82, 88, 80, 80, 52, 25),
    ]
  },
  {
    id: 'eng66', name: 'Inglaterra', year: 1966, short: 'ENG', color: '#ffffff', color2: '#c8102e', text: '#0b3d91',
    players: [
      P('Banks',       'GK', 88, 58, 58, 30, 58, 90),
      P('Cohen',       'DEF', 80, 82, 72, 48, 82, 25),
      P('J. Charlton', 'DEF', 82, 70, 70, 52, 86, 25),
      P('Moore',       'DEF', 89, 76, 86, 64, 90, 25),
      P('Wilson',      'DEF', 80, 80, 72, 48, 82, 25),
      P('Stiles',      'MID', 80, 76, 74, 56, 85, 25),
      P('B. Charlton', 'MID', 91, 80, 90, 90, 70, 25),
      P('Peters',      'MID', 83, 80, 82, 78, 76, 25),
      P('Ball',        'MID', 83, 86, 82, 78, 74, 25),
      P('Hurst',       'ATT', 85, 80, 80, 88, 52, 25),
      P('Hunt',        'ATT', 80, 80, 74, 80, 50, 25),
    ]
  },
];

// Calcula overall médio do time (para seeds e dificuldade)
TEAMS.forEach(t => {
  t.rating = Math.round(t.players.reduce((s, p) => s + p.ovr, 0) / t.players.length);
});

if (typeof module !== 'undefined') module.exports = { TEAMS, P };
