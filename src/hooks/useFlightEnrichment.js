import { useState, useEffect } from 'react'

// Typical passenger capacity by ICAO aircraft type code
const PAX = {
  B735:130, B736:132, B737:149, B738:162, B739:178, B744:416, B748:467,
  B752:200, B753:243, B762:216, B763:261, B764:261,
  B772:314, B773:368, B77W:396, B788:242, B789:296, B78X:330,
  A318:107, A319:124, A320:150, A321:185, A332:253, A333:277,
  A342:266, A343:295, A345:313, A346:359, A359:280, A35K:369, A388:555,
  E170:70,  E175:80,  E190:100, E195:120,
  CRJ2:50,  CRJ7:70,  CRJ9:90,  AT72:70,  AT76:78,  DH8D:78,
  MD11:293, MD82:155, MD83:155, DC10:250, B712:106, B722:130,
}

export function useFlightEnrichment(flight) {
  const [enriched, setEnriched] = useState(null)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!flight) { setEnriched(null); return }
    setEnriched(null)
    setLoading(true)

    const ctrl = new AbortController()
    const sig  = ctrl.signal

    const fetchAircraft = fetch(
      `https://api.adsbdb.com/v0/aircraft/${flight.id.toLowerCase()}`,
      { signal: sig }
    ).then(r => r.ok ? r.json() : null).catch(() => null)

    const cs = (flight.callsign || '').replace(/\s+/g, '')
    const fetchRoute = cs
      ? fetch(`https://api.adsbdb.com/v0/callsign/${cs}`, { signal: sig })
          .then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null)

    Promise.all([fetchAircraft, fetchRoute]).then(([aData, rData]) => {
      const ac    = aData?.response?.aircraft   || null
      const route = rData?.response?.flightroute || null
      const type  = ac?.type_code || ac?.icao_aircraft_class || null
      setEnriched({
        ac,
        route,
        type,
        manufacturer: ac?.manufacturer || null,
        model:        ac?.type || null,
        operator:     ac?.registered_owner || ac?.operator_flag_code || null,
        pax:          type ? (PAX[type.toUpperCase()] ?? null) : null,
        origin:       route?.origin      || null,
        destination:  route?.destination || null,
      })
      setLoading(false)
    })

    return () => ctrl.abort()
  }, [flight?.id])

  return { enriched, loading }
}
