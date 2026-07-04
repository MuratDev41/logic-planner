import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Check } from '../types'

interface Props {
  mapImage: string
  mapWidth: number
  mapHeight: number
  checks: Check[]
  selectedCheckId: string | null
  onMapClick: (x: number, y: number) => void
  onCheckClick: (check: Check) => void
  cursors: Record<string, { x: number; y: number; name: string; color: string }>
  onCursorMove?: (x: number, y: number) => void
}

const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bff', '#ff9f43', '#00d2d3', '#a29bfe']

function getColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function MapCanvas({
  mapImage, mapWidth, mapHeight, checks, selectedCheckId,
  onMapClick, onCheckClick, cursors, onCursorMove,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const cursorLayersRef = useRef<Map<string, { dot: L.CircleMarker; label: L.DivIcon }>>(new Map())

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4,
      zoomControl: true,
      attributionControl: false,
    })

    const bounds: L.LatLngBoundsExpression = [[0, 0], [mapHeight, mapWidth]]
    L.imageOverlay(mapImage, bounds).addTo(map)
    map.fitBounds(bounds)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lng, e.latlng.lat)
    })

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      onCursorMove?.(e.latlng.lng, e.latlng.lat)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [mapImage, mapWidth, mapHeight])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const markers = markersRef.current
    const seen = new Set<string>()

    checks.forEach(check => {
      seen.add(check.id)
      const existing = markers.get(check.id)
      if (existing) {
        existing.setLatLng([check.y, check.x])
        existing.bindTooltip(check.name, { direction: 'top', offset: L.point(0, -10) })
        if (selectedCheckId === check.id) {
          existing.setIcon(selectedIcon)
        } else {
          existing.setIcon(defaultIcon)
        }
        existing.getTooltip()?.setContent(check.name)
        return
      }

      const icon = selectedCheckId === check.id ? selectedIcon : defaultIcon
      const marker = L.marker([check.y, check.x], { icon })
        .addTo(map)
        .bindTooltip(check.name, { direction: 'top', offset: L.point(0, -10) })
        .on('click', () => onCheckClick(check))

      markers.set(check.id, marker)
    })

    markers.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove()
        markers.delete(id)
      }
    })

    if (selectedCheckId && markers.has(selectedCheckId)) {
      markers.get(selectedCheckId)!.setIcon(selectedIcon)
    }
  }, [checks, selectedCheckId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const layers = cursorLayersRef.current
    const seen = new Set<string>()

    Object.entries(cursors).forEach(([id, cursor]) => {
      if (id === 'self') return
      seen.add(id)

      const existing = layers.get(id)
      if (existing) {
        existing.dot.setLatLng([cursor.y, cursor.x])
        return
      }

      const color = cursor.color || getColor(id)
      const dot = L.circleMarker([cursor.y, cursor.x], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      }).addTo(map)

      const label = L.divIcon({
        className: 'cursor-label',
        html: `<span style="background:${color};color:#fff;padding:2px 6px;border-radius:4px;font-size:11px">${cursor.name}</span>`,
        iconSize: [0, 0],
      })
      L.marker([cursor.y - 15, cursor.x], { icon: label, interactive: false }).addTo(map)

      layers.set(id, { dot, label: label as any })
    })

    layers.forEach((_, id) => {
      if (!seen.has(id)) {
        const layer = layers.get(id)
        if (layer) {
          layer.dot.remove()
          layers.delete(id)
        }
      }
    })
  }, [cursors])

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 500, borderRadius: 8, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 500 }} />
    </div>
  )
}

const defaultIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#ff6b6b;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer">
    <div style="width:6px;height:6px;background:#fff;border-radius:50%"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const selectedIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:#ffd93d;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(255,217,61,0.6);cursor:pointer">
    <div style="width:8px;height:8px;background:#fff;border-radius:50%"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})
