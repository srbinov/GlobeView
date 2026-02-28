// 3519 Malvina Ct, Naperville IL 60564 — residence marker + residents
// Images from src/components/people/ (FIRSTNAME_LASTNAME.png)

import ErikasGurskas from '../components/people/Erikas_Gurskas.png'
import MelanijaGurskatie from '../components/people/Melanija_Gurskatie.png'
import KristinaSellinski from '../components/people/Kristina_Sellinski.png'

// Geocoded via OpenStreetMap Nominatim — 3519 Malvina Court, Rose Hill Farm, Naperville IL 60564
export const MALVINA_RESIDENCE = {
  address: '3519 Malvina Ct, Naperville IL 60564',
  lat: 41.7020725,
  lng: -88.1705245,
}

export const MALVINA_PEOPLE = [
  { name: 'Erikas Gurskas', photo: ErikasGurskas },
  { name: 'Melanija Gurskatie', photo: MelanijaGurskatie },
  { name: 'Kristina Sellinski', photo: KristinaSellinski },
  { name: 'Ranatas Gurskas', photo: null }, // no known photo — show ?
]
