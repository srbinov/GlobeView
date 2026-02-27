// ICAO 3-letter callsign prefix → airline livery colors + name
// Used by Aircraft3DViewer and FlightDetailPanel

export const AIRLINE_COLORS = {
  // ── North America ──────────────────────────────
  AAL: { primary: '#C8102E', secondary: '#003087', name: 'American Airlines' },
  UAL: { primary: '#005DAA', secondary: '#FFFFFF', name: 'United Airlines' },
  DAL: { primary: '#C01933', secondary: '#003366', name: 'Delta Air Lines' },
  SWA: { primary: '#304CB2', secondary: '#FFBF27', name: 'Southwest Airlines' },
  ASA: { primary: '#01426A', secondary: '#00A3E0', name: 'Alaska Airlines' },
  JBU: { primary: '#003876', secondary: '#00A0DC', name: 'JetBlue Airways' },
  NKS: { primary: '#8B008B', secondary: '#FFFF00', name: 'Spirit Airlines' },
  FFT: { primary: '#00A651', secondary: '#FF6600', name: 'Frontier Airlines' },
  SKW: { primary: '#003087', secondary: '#AAAAAA', name: 'SkyWest Airlines' },
  ACA: { primary: '#C8102E', secondary: '#000000', name: 'Air Canada' },
  WJA: { primary: '#0064BC', secondary: '#9BC4E2', name: 'WestJet' },
  TSC: { primary: '#003087', secondary: '#FF6600', name: 'Air Transat' },
  VOI: { primary: '#00A651', secondary: '#FFFFFF', name: 'Volaris' },
  AMX: { primary: '#0057A8', secondary: '#006847', name: 'Aeromexico' },
  VIV: { primary: '#FF6600', secondary: '#FFFFFF', name: 'VivaAerobus' },
  AZU: { primary: '#FF6600', secondary: '#003087', name: 'Azul' },
  GLO: { primary: '#FF6600', secondary: '#003087', name: 'GOL' },
  LAN: { primary: '#CC0000', secondary: '#003087', name: 'LATAM' },

  // ── Europe ─────────────────────────────────────
  BAW: { primary: '#003087', secondary: '#C8102E', name: 'British Airways' },
  EZY: { primary: '#FF6600', secondary: '#FFFFFF', name: 'easyJet' },
  RYR: { primary: '#003087', secondary: '#FFDD00', name: 'Ryanair' },
  WZZ: { primary: '#C8379A', secondary: '#FFFFFF', name: 'Wizz Air' },
  DLH: { primary: '#05164D', secondary: '#FFAD00', name: 'Lufthansa' },
  EWG: { primary: '#7B0D1E', secondary: '#FFFFFF', name: 'Eurowings' },
  CFG: { primary: '#003087', secondary: '#FFD700', name: 'Condor' },
  AFR: { primary: '#002157', secondary: '#CE1126', name: 'Air France' },
  TVF: { primary: '#009A44', secondary: '#003087', name: 'Transavia France' },
  KLM: { primary: '#009CE0', secondary: '#FFFFFF', name: 'KLM' },
  TRA: { primary: '#009A44', secondary: '#FFFFFF', name: 'Transavia' },
  EJU: { primary: '#FF6600', secondary: '#FFFFFF', name: 'easyJet Europe' },
  IBE: { primary: '#CC0000', secondary: '#FFD700', name: 'Iberia' },
  VLG: { primary: '#003087', secondary: '#F7A800', name: 'Vueling' },
  SAS: { primary: '#003068', secondary: '#9BC4E2', name: 'Scandinavian Airlines' },
  NAX: { primary: '#D82B2B', secondary: '#FFFFFF', name: 'Norwegian' },
  THY: { primary: '#C8102E', secondary: '#FFFFFF', name: 'Turkish Airlines' },
  PGT: { primary: '#FF6600', secondary: '#003087', name: 'Pegasus Airlines' },
  FIN: { primary: '#003580', secondary: '#C8102E', name: 'Finnair' },
  LOT: { primary: '#003087', secondary: '#C8102E', name: 'LOT Polish Airlines' },
  AUA: { primary: '#CC0000', secondary: '#FFFFFF', name: 'Austrian Airlines' },
  BEL: { primary: '#4B006E', secondary: '#FFD700', name: 'Brussels Airlines' },
  TAP: { primary: '#00A651', secondary: '#CC0000', name: 'TAP Portugal' },
  ICE: { primary: '#003087', secondary: '#00A0DC', name: 'Icelandair' },
  EIN: { primary: '#006837', secondary: '#FFFFFF', name: 'Aer Lingus' },
  VIR: { primary: '#CC0000', secondary: '#FFFFFF', name: 'Virgin Atlantic' },
  AZA: { primary: '#003087', secondary: '#009A44', name: 'ITA Airways' },

  // ── Middle East ────────────────────────────────
  UAE: { primary: '#CC0000', secondary: '#C8A96E', name: 'Emirates' },
  ETD: { primary: '#BD8B13', secondary: '#003087', name: 'Etihad Airways' },
  QTR: { primary: '#5C0632', secondary: '#C8A96E', name: 'Qatar Airways' },
  SVA: { primary: '#006847', secondary: '#FFFFFF', name: 'Saudia' },
  GFA: { primary: '#881C1C', secondary: '#C8A96E', name: 'Gulf Air' },
  OMA: { primary: '#C01933', secondary: '#8B4513', name: 'Oman Air' },
  AHY: { primary: '#009CE0', secondary: '#003087', name: 'Azerbaijan Airlines' },

  // ── Asia-Pacific ───────────────────────────────
  ANA: { primary: '#003087', secondary: '#00A0DC', name: 'All Nippon Airways' },
  JAL: { primary: '#CC0000', secondary: '#FFFFFF', name: 'Japan Airlines' },
  JJP: { primary: '#FF6600', secondary: '#003087', name: 'Jetstar Japan' },
  CPA: { primary: '#006564', secondary: '#003087', name: 'Cathay Pacific' },
  CES: { primary: '#CC0000', secondary: '#003087', name: 'China Eastern' },
  CCA: { primary: '#CC0000', secondary: '#003087', name: 'Air China' },
  CSN: { primary: '#003087', secondary: '#CC0000', name: 'China Southern' },
  CHH: { primary: '#003087', secondary: '#CC0000', name: 'Hainan Airlines' },
  SIA: { primary: '#F0A500', secondary: '#003087', name: 'Singapore Airlines' },
  MAS: { primary: '#CC0000', secondary: '#003087', name: 'Malaysia Airlines' },
  AXM: { primary: '#FF0000', secondary: '#CC0000', name: 'AirAsia' },
  THA: { primary: '#54197A', secondary: '#FFD700', name: 'Thai Airways' },
  GIA: { primary: '#003087', secondary: '#009A44', name: 'Garuda Indonesia' },
  LNI: { primary: '#FF6600', secondary: '#CC0000', name: 'Lion Air' },
  KAL: { primary: '#003087', secondary: '#003087', name: 'Korean Air' },
  AAR: { primary: '#B22222', secondary: '#FFFFFF', name: 'Asiana Airlines' },
  JNA: { primary: '#FFD700', secondary: '#003087', name: 'Jin Air' },
  QFA: { primary: '#CC0000', secondary: '#FFFFFF', name: 'Qantas' },
  JST: { primary: '#FF6600', secondary: '#FFFFFF', name: 'Jetstar' },

  // ── Africa ─────────────────────────────────────
  ETH: { primary: '#006847', secondary: '#FFDD00', name: 'Ethiopian Airlines' },
  KQA: { primary: '#CC0000', secondary: '#003087', name: 'Kenya Airways' },
  RAM: { primary: '#009A44', secondary: '#CC0000', name: 'Royal Air Maroc' },

  // ── Russia/CIS ─────────────────────────────────
  AFL: { primary: '#003087', secondary: '#CC0000', name: 'Aeroflot' },
  SDM: { primary: '#003087', secondary: '#FFFFFF', name: 'Rossiya Airlines' },
  SBI: { primary: '#006400', secondary: '#FFFFFF', name: 'S7 Airlines' },
}

// Returns airline info for a callsign, or null if unknown
export function getAirlineInfo(callsign = '') {
  const prefix = callsign.trim().slice(0, 3).toUpperCase()
  return AIRLINE_COLORS[prefix] || null
}
