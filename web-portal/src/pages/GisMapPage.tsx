import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { StatusBadge } from '../components/ui'
import { workflowService } from '../services/workflow'
import { useAuth } from '../context/AuthContext'
import type { GisMapData } from '../types'
import {
  GisMapIcon,
  MinesIcon,
  RefreshIcon,
  TasksIcon,
  ReportsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  CloseIcon,
  MapPinIcon,
  FitAllIcon,
  SatelliteIcon,
  StreetMapIcon,
  DarkOpsIcon,
  TargetIcon,
  CopyIcon,
  InspectionsIcon,
  ViolationsIcon,
  LEAFLET_MINE_SVG,
  LEAFLET_INCIDENT_SVG,
  LEAFLET_TARGET_SVG
} from '../components/icons'

type TileLayerType = 'satellite' | 'osm' | 'dark'
type SidebarTab = 'directory' | 'dossier'

const TILE_LAYERS: Record<TileLayerType, { name: string; url: string; attribution: string; maxZoom: number }> = {
  satellite: {
    name: 'Satellite (Esri World Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18
  },
  osm: {
    name: 'Street (OpenStreetMap)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    maxZoom: 19
  },
  dark: {
    name: 'Carto Dark (Tactical Ops)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    maxZoom: 19
  }
}

const COALFIELD_PRESETS = [
  { name: 'Jharia Basin (BCCL)', lat: 23.7505, lng: 86.4208, zoom: 12 },
  { name: 'Raniganj (ECL)', lat: 23.6212, lng: 87.1245, zoom: 12 },
  { name: 'Korba (SECL)', lat: 22.3595, lng: 82.7501, zoom: 12 },
  { name: 'Singrauli (NCL)', lat: 24.1997, lng: 82.6644, zoom: 12 },
  { name: 'Talcher (MCL)', lat: 20.9509, lng: 85.2167, zoom: 12 }
]

export function GisMapPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusMineParam = searchParams.get('focusMine')

  const [data, setData] = useState<GisMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMineId, setSelectedMineId] = useState<string | null>(focusMineParam)
  const [activeTab, setActiveTab] = useState<SidebarTab>('directory')
  const [filterRisk, setFilterRisk] = useState<string>('ALL')
  const [showIncidents, setShowIncidents] = useState<boolean>(true)
  const [showZones, setShowZones] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTileType, setActiveTileType] = useState<TileLayerType>('satellite')

  // Coordinate Inspector tool & cursor tracking
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [inspectedCoords, setInspectedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [copySuccess, setCopySuccess] = useState<string>('')

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const zonesLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const inspectorPinGroupRef = useRef<L.LayerGroup | null>(null)
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map())

  const flyToCoords = useCallback((lat: number, lng: number, zoom = 13) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.0 })
    }
  }, [])

  const loadGisData = async () => {
    try {
      setLoading(true)
      const res = await workflowService.gisFeatures()
      setData(res)

      if (focusMineParam) {
        const found = res.mines.find((m) => m.id === focusMineParam)
        if (found) {
          setSelectedMineId(found.id)
          setActiveTab('dossier')
          flyToCoords(found.coordinates.latitude, found.coordinates.longitude, 13)
        }
      } else if (res.mines.length > 0 && !selectedMineId) {
        setSelectedMineId(res.mines[0].id)
      }
    } catch {
      setError('Unable to retrieve spatial telemetry from GIS service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGisData()
  }, [focusMineParam])

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [23.5, 85.5],
      zoom: 6,
      zoomControl: false,
      attributionControl: true
    })

    L.control.zoom({ position: 'topright' }).addTo(map)

    const tileConfig = TILE_LAYERS[activeTileType]
    const initialTile = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom
    }).addTo(map)

    tileLayerRef.current = initialTile
    zonesLayerGroupRef.current = L.layerGroup().addTo(map)
    markersLayerGroupRef.current = L.layerGroup().addTo(map)
    inspectorPinGroupRef.current = L.layerGroup().addTo(map)

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    map.on('mouseout', () => {
      setCursorCoords(null)
    })

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat
      const lng = e.latlng.lng
      setInspectedCoords({ lat, lng })

      if (inspectorPinGroupRef.current) {
        inspectorPinGroupRef.current.clearLayers()
        const pinHtml = `
          <div class="relative flex items-center justify-center cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="absolute -inset-2 rounded-full animate-ping bg-minsos-400 opacity-75"></div>
            <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-minsos-600 border-2 border-white shadow-xl text-white">
              ${LEAFLET_TARGET_SVG}
            </div>
          </div>
        `
        const pinIcon = L.divIcon({
          className: 'custom-inspector-pin',
          html: pinHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
        const pinMarker = L.marker([lat, lng], { icon: pinIcon })
        pinMarker.bindPopup(`
          <div class="p-1 text-xs">
            <div class="font-bold text-slate-900">Inspected Coordinates</div>
            <div class="mt-1 font-mono text-[11px] text-minsos-700 bg-minsos-50 p-1 rounded">
              LAT: ${lat.toFixed(6)}° N<br/>LNG: ${lng.toFixed(6)}° E
            </div>
            <div class="mt-1 text-[10px] text-slate-400">Click "Copy Coordinates" on HUD</div>
          </div>
        `).openPopup()
        inspectorPinGroupRef.current.addLayer(pinMarker)
      }
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // 2. Handle Tile Layer Switch
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current)
    }

    const cfg = TILE_LAYERS[activeTileType]
    const newTile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom
    }).addTo(map)

    newTile.bringToBack()
    tileLayerRef.current = newTile
  }, [activeTileType])

  const filteredMines = useMemo(() => {
    if (!data) return []
    return data.mines.filter((m) => {
      const matchRisk = filterRisk === 'ALL' || m.riskLevel.toUpperCase() === filterRisk
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.location.toLowerCase().includes(searchQuery.toLowerCase())
      return matchRisk && matchSearch
    })
  }, [data, filterRisk, searchQuery])

  const selectedMine = useMemo(() => {
    if (!data || !selectedMineId) return null
    return data.mines.find((m) => m.id === selectedMineId) ?? null
  }, [data, selectedMineId])

  const currentIndex = useMemo(() => {
    return filteredMines.findIndex((m) => m.id === selectedMineId)
  }, [filteredMines, selectedMineId])

  const selectNextMine = useCallback(() => {
    if (filteredMines.length === 0) return
    const nextIdx = (currentIndex + 1) % filteredMines.length
    const next = filteredMines[nextIdx]
    setSelectedMineId(next.id)
    flyToCoords(next.coordinates.latitude, next.coordinates.longitude, 13)
  }, [currentIndex, filteredMines, flyToCoords])

  const selectPrevMine = useCallback(() => {
    if (filteredMines.length === 0) return
    const prevIdx = (currentIndex - 1 + filteredMines.length) % filteredMines.length
    const prev = filteredMines[prevIdx]
    setSelectedMineId(prev.id)
    flyToCoords(prev.coordinates.latitude, prev.coordinates.longitude, 13)
  }, [currentIndex, filteredMines, flyToCoords])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'j') {
        selectNextMine()
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        selectPrevMine()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectNextMine, selectPrevMine])

  const fitAllMines = () => {
    if (!mapInstanceRef.current || !data || data.mines.length === 0) return
    const bounds = L.latLngBounds(data.mines.map((m) => [m.coordinates.latitude, m.coordinates.longitude]))
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
  }

  const handleSelectMine = (mineId: string) => {
    setSelectedMineId(mineId)
    const target = data?.mines.find((m) => m.id === mineId)
    if (target) {
      flyToCoords(target.coordinates.latitude, target.coordinates.longitude, 13)
      const marker = markerMapRef.current.get(mineId)
      if (marker) {
        marker.openPopup()
      }
    }
  }

  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return '#ef4444'
      case 'HIGH':
        return '#f97316'
      case 'MEDIUM':
        return '#eab308'
      case 'LOW':
      default:
        return '#10b981'
    }
  }

  // 3. Render Leaflet Markers with Pure SVG
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current || !zonesLayerGroupRef.current) return

    const markersGroup = markersLayerGroupRef.current
    const zonesGroup = zonesLayerGroupRef.current
    markerMapRef.current.clear()

    markersGroup.clearLayers()
    zonesGroup.clearLayers()

    filteredMines.forEach((m) => {
      const lat = m.coordinates.latitude
      const lng = m.coordinates.longitude
      const color = getRiskColor(m.riskLevel)
      const isSelected = selectedMineId === m.id
      const isCritical = m.riskLevel.toUpperCase() === 'CRITICAL'

      if (showZones) {
        const radius = isCritical ? 6000 : m.riskLevel.toUpperCase() === 'HIGH' ? 4000 : 2500
        const circle = L.circle([lat, lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity: isSelected ? 0.28 : isCritical ? 0.2 : 0.08,
          weight: isSelected ? 2.5 : 1.5,
          dashArray: isSelected ? undefined : '4,4'
        })
        circle.bindTooltip(`DGMS Safety Buffer: ${m.name} (${radius / 1000}km radius)`, {
          sticky: true,
          className: 'text-xs'
        })
        zonesGroup.addLayer(circle)
      }

      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
          ${
            isCritical || isSelected
              ? `<div class="absolute -inset-2.5 rounded-full animate-ping opacity-80" style="background-color: ${color};"></div>`
              : ''
          }
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            isSelected ? 'border-white ring-4 ring-minsos-400 scale-125' : 'border-white'
          } shadow-xl text-white transition-transform duration-200" style="background-color: ${color};">
            ${LEAFLET_MINE_SVG}
          </div>
          <div class="absolute left-10 bg-slate-950/95 text-white px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xl pointer-events-none border border-slate-700/80">
            ${m.name}
          </div>
        </div>
      `

      const customIcon = L.divIcon({
        className: 'custom-mine-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })

      const marker = L.marker([lat, lng], { icon: customIcon })

      marker.on('click', () => {
        setSelectedMineId(m.id)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.6 })
        }
      })

      marker.bindPopup(`
        <div class="p-1.5 text-slate-800 text-xs min-w-[200px]">
          <div class="font-bold text-sm text-slate-900">${m.name}</div>
          <div class="text-slate-500 font-mono text-[10px] mt-0.5">DGMS Code: ${m.code}</div>
          <div class="mt-2 bg-slate-50 p-2 rounded border border-slate-200 grid grid-cols-2 gap-1.5 text-[11px]">
            <div>Risk: <b style="color: ${color}">${m.riskScore}/100</b></div>
            <div>Compliance: <b class="text-emerald-700">${m.compliancePercent}%</b></div>
            <div>Violations: <b class="text-amber-600">${m.openViolations}</b></div>
            <div>Critical: <b class="text-red-600">${m.criticalViolations}</b></div>
          </div>
          <div class="mt-2 font-mono text-[10px] text-slate-500">
            Centroid: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
          </div>
        </div>
      `)

      markerMapRef.current.set(m.id, marker)
      markersGroup.addLayer(marker)
    })

    if (showIncidents && data?.incidents) {
      data.incidents.forEach((inc) => {
        const lat = inc.coordinates.latitude
        const lng = inc.coordinates.longitude

        const incidentHtml = `
          <div class="relative flex items-center justify-center cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-md hover:scale-125 transition-transform">
              ${LEAFLET_INCIDENT_SVG}
            </div>
          </div>
        `

        const incIcon = L.divIcon({
          className: 'custom-incident-marker',
          html: incidentHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })

        const incMarker = L.marker([lat, lng], { icon: incIcon })
        incMarker.bindPopup(`
          <div class="p-1.5 text-xs min-w-[180px]">
            <div class="font-bold text-slate-900">${inc.title}</div>
            <div class="text-amber-600 font-semibold text-[10px] mt-0.5 uppercase tracking-wide">Severity: ${inc.severity}</div>
            <div class="text-slate-600 text-[11px] mt-1">Colliery: ${inc.mineName}</div>
            <div class="font-mono text-[10px] text-slate-400 mt-1">${new Date(inc.occurredAt).toLocaleString()}</div>
          </div>
        `)

        markersGroup.addLayer(incMarker)
      })
    }
  }, [filteredMines, data, showZones, showIncidents, selectedMineId])

  const copyToClipboard = (text: string, label = 'Coordinates') => {
    navigator.clipboard.writeText(text)
    setCopySuccess(`${label} copied to clipboard!`)
    setTimeout(() => setCopySuccess(''), 3000)
  }

  const userRole = user?.role ?? 'admin'

  const riskCounts = useMemo(() => {
    if (!data) return { all: 0, critical: 0, high: 0, normal: 0 }
    return {
      all: data.mines.length,
      critical: data.mines.filter((m) => m.riskLevel === 'CRITICAL').length,
      high: data.mines.filter((m) => m.riskLevel === 'HIGH').length,
      normal: data.mines.filter((m) => m.riskLevel === 'LOW' || m.riskLevel === 'MEDIUM').length
    }
  }, [data])

  return (
    <div className="space-y-4">
      {/* 1. Header with Dark Blue SVG Icon */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-minsos-50 border border-minsos-200 text-minsos-700">
            <GisMapIcon className="h-5 w-5 text-minsos-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                GIS Spatial Mine Surveillance
              </h1>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded font-semibold">
                WGS-84
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive satellite & vector surveillance center across Coal India subsidiaries.
            </p>
          </div>
        </div>

        {/* Header Telemetry Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-xs border-r border-slate-200 pr-3 mr-1">
            <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700">
              Mines: <b>{data?.mines.length ?? 0}</b>
            </span>
            <span className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-800">
              Incidents: <b>{data?.incidents.length ?? 0}</b>
            </span>
            <span className="bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg text-red-800">
              Stop-Work: <b>{riskCounts.critical}</b>
            </span>
          </div>

          <button
            onClick={() => navigate(`/${userRole}/mines`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <MinesIcon className="h-3.5 w-3.5 text-minsos-700" />
            <span>Manage Mines</span>
          </button>
          <button
            onClick={loadGisData}
            className="inline-flex items-center gap-1.5 rounded-lg bg-minsos-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-minsos-700 transition"
          >
            <RefreshIcon className="h-3.5 w-3.5 text-white" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {copySuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 animate-fade-in">
          ✓ {copySuccess}
        </div>
      )}

      {/* 2. Main Workstation: Split-Screen Navigator + Map Area */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* LEFT PANEL: Interactive Mine Navigator & Dossier */}
        <div className="lg:col-span-4 xl:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden h-[660px]">
          {/* Panel Tab Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 p-2">
            <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('directory')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'directory'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TasksIcon className={`h-3.5 w-3.5 ${activeTab === 'directory' ? 'text-minsos-700' : 'text-slate-500'}`} />
                <span>Mine Directory ({filteredMines.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('dossier')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'dossier'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ReportsIcon className={`h-3.5 w-3.5 ${activeTab === 'dossier' ? 'text-minsos-700' : 'text-slate-500'}`} />
                <span>Colliery Dossier</span>
              </button>
            </div>

            {/* Quick Step Navigation: Prev / Next */}
            <div className="flex items-center gap-1">
              <button
                onClick={selectPrevMine}
                disabled={filteredMines.length === 0}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 shadow-xs"
                title="Previous Mine (ArrowLeft)"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5 text-slate-700" />
              </button>
              <span className="text-[11px] font-mono text-slate-500 px-1 font-semibold">
                {currentIndex >= 0 ? `${currentIndex + 1}/${filteredMines.length}` : '-'}
              </span>
              <button
                onClick={selectNextMine}
                disabled={filteredMines.length === 0}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 shadow-xs"
                title="Next Mine (ArrowRight)"
              >
                <ChevronRightIcon className="h-3.5 w-3.5 text-slate-700" />
              </button>
            </div>
          </div>

          {/* TAB 1: MINE DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="flex flex-col h-full overflow-hidden p-3 space-y-2.5">
              {/* Search Bar */}
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search mine by name, code, basin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-minsos-500 focus:outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Risk Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
                <button
                  onClick={() => setFilterRisk('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                    filterRisk === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({riskCounts.all})
                </button>
                <button
                  onClick={() => setFilterRisk('CRITICAL')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                    filterRisk === 'CRITICAL'
                      ? 'bg-red-600 text-white shadow-xs font-bold'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  Critical ({riskCounts.critical})
                </button>
                <button
                  onClick={() => setFilterRisk('HIGH')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                    filterRisk === 'HIGH'
                      ? 'bg-orange-500 text-white shadow-xs font-bold'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  High ({riskCounts.high})
                </button>
                <button
                  onClick={() => setFilterRisk('LOW')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                    filterRisk === 'LOW'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Compliant ({riskCounts.normal})
                </button>
              </div>

              {/* Mine Cards Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loading && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Loading spatial mine units...
                  </div>
                )}
                {!loading && filteredMines.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No mines match your filter criteria.
                  </div>
                )}
                {!loading &&
                  filteredMines.map((m) => {
                    const isSelected = selectedMineId === m.id
                    const riskColor = getRiskColor(m.riskLevel)
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMine(m.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-minsos-50/70 border-minsos-400 ring-2 ring-minsos-400/40 shadow-xs'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: riskColor }}
                              />
                              <p className="font-bold text-slate-900 text-xs truncate">{m.name}</p>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{m.location}</p>
                          </div>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                            style={{
                              backgroundColor: `${riskColor}15`,
                              color: riskColor
                            }}
                          >
                            {m.riskLevel}
                          </span>
                        </div>

                        {/* Telemetry Footer */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                              {m.code}
                            </span>
                            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-slate-400">
                              <MapPinIcon className="h-3 w-3 text-slate-400" />
                              {m.coordinates.latitude.toFixed(3)}°, {m.coordinates.longitude.toFixed(3)}°
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-emerald-700">
                              {m.compliancePercent}%
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectMine(m.id)
                                setActiveTab('dossier')
                              }}
                              className="inline-flex items-center text-[10px] font-semibold text-minsos-600 hover:text-minsos-800 hover:underline"
                            >
                              <span>Dossier</span>
                              <ChevronRightIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Step Tour Helper Tip */}
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Use &larr; / &rarr; keys to tour mines</span>
                <button
                  onClick={() => fitAllMines()}
                  className="inline-flex items-center gap-1 font-semibold text-minsos-600 hover:underline"
                >
                  <FitAllIcon className="h-3 w-3 text-minsos-700" />
                  <span>Fit All on Map</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COLLIERY DOSSIER */}
          {activeTab === 'dossier' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedMine ? (
                <>
                  {/* Mine Title & Badges */}
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                        DGMS: {selectedMine.code}
                      </span>
                      <StatusBadge value={selectedMine.riskLevel} />
                    </div>
                    <h2 className="mt-1.5 text-base font-bold text-slate-900 tracking-tight">
                      {selectedMine.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedMine.location}</p>
                  </div>

                  {/* Centroid Positioning */}
                  <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="h-4 w-4 text-minsos-700" />
                        <span className="font-semibold text-slate-800">WGS-84 Centroid</span>
                      </div>
                      <span className="text-[10px] bg-minsos-100 text-minsos-800 font-semibold px-2 py-0.5 rounded">
                        GPS Fixed
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200">
                      LAT: <b>{selectedMine.coordinates.latitude.toFixed(6)}° N</b><br />
                      LNG: <b>{selectedMine.coordinates.longitude.toFixed(6)}° E</b>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        onClick={() =>
                          flyToCoords(selectedMine.coordinates.latitude, selectedMine.coordinates.longitude, 14)
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-minsos-600 px-2.5 py-1.5 font-semibold text-white hover:bg-minsos-700 text-xs transition"
                      >
                        <TargetIcon className="h-3.5 w-3.5 text-white" />
                        <span>Center Camera</span>
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `${selectedMine.coordinates.latitude.toFixed(6)}, ${selectedMine.coordinates.longitude.toFixed(6)}`,
                            `${selectedMine.name} Coordinates`
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 text-xs transition"
                      >
                        <CopyIcon className="h-3.5 w-3.5 text-slate-700" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  {/* Operational Telemetry Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-xs">
                      <p className="text-[10px] font-medium text-slate-400 uppercase">Risk Index</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{selectedMine.riskScore}/100</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-xs">
                      <p className="text-[10px] font-medium text-slate-400 uppercase">Compliance</p>
                      <p className="mt-1 text-xl font-bold text-emerald-600">
                        {selectedMine.compliancePercent}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-xs">
                      <p className="text-[10px] font-medium text-slate-400 uppercase">Open Violations</p>
                      <p className="mt-1 text-xl font-bold text-amber-600">
                        {selectedMine.openViolations}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-xs">
                      <p className="text-[10px] font-medium text-slate-400 uppercase">Critical DGMS</p>
                      <p className="mt-1 text-xl font-bold text-red-600">
                        {selectedMine.criticalViolations}
                      </p>
                    </div>
                  </div>

                  {/* DGMS Statutory Assessment */}
                  <div className="rounded-xl border border-slate-200 p-3 text-xs bg-slate-50/50">
                    <p className="font-semibold text-slate-800">Operational Assessment</p>
                    <p className="mt-1 text-slate-600 leading-relaxed text-[11px]">
                      {selectedMine.criticalViolations > 0
                        ? 'Statutory section 22 stop-work orders active on working seams. Requires immediate remediation.'
                        : selectedMine.compliancePercent >= 90
                        ? 'Site meets or exceeds DGMS safety standards. Automated surveillance active.'
                        : 'Moderate operational compliance. Routine surveillance inspections advised.'}
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => navigate(`/${userRole}/inspections`)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 p-2 text-xs font-semibold text-slate-700 transition shadow-xs"
                    >
                      <InspectionsIcon className="h-3.5 w-3.5 text-minsos-700" />
                      <span>Inspections</span>
                    </button>
                    <button
                      onClick={() => navigate(`/${userRole}/violations`)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 p-2 text-xs font-semibold text-slate-700 transition shadow-xs"
                    >
                      <ViolationsIcon className="h-3.5 w-3.5 text-amber-700" />
                      <span>Violations</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab('directory')}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold text-center transition"
                  >
                    &larr; Back to Mine Directory
                  </button>
                </>
              ) : (
                <div className="py-20 text-center text-xs text-slate-400">
                  Select a mine from the directory or click a marker on the map to inspect its dossier.
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT MAIN AREA: Map Canvas & Tactical Control HUD */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-3">
          {/* Quick-Jump Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            {/* Quick Mine Dropdown Jump */}
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Jump to:</span>
              <select
                value={selectedMineId ?? ''}
                onChange={(e) => handleSelectMine(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white focus:border-minsos-500 focus:outline-none truncate"
              >
                <option value="" disabled>
                  Select a Mine Site...
                </option>
                {data?.mines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code}) — {m.riskLevel}
                  </option>
                ))}
              </select>
            </div>

            {/* Coalfield Presets & Fit All */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => fitAllMines()}
                className="inline-flex items-center gap-1 rounded-lg bg-minsos-50 hover:bg-minsos-100 border border-minsos-200 px-2.5 py-1 text-minsos-800 font-bold whitespace-nowrap transition shadow-xs"
                title="Fit all mines in camera view"
              >
                <FitAllIcon className="h-3.5 w-3.5 text-minsos-800" />
                <span>Fit All</span>
              </button>
              {COALFIELD_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => flyToCoords(preset.lat, preset.lng, preset.zoom)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-minsos-400 hover:bg-minsos-50 whitespace-nowrap transition"
                >
                  {preset.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Tile Layer & Buffer Toggles */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  onClick={() => setActiveTileType('satellite')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${
                    activeTileType === 'satellite'
                      ? 'bg-white font-bold text-minsos-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Esri High-Resolution Satellite"
                >
                  <SatelliteIcon className="h-3.5 w-3.5 text-minsos-700" />
                  <span>Sat</span>
                </button>
                <button
                  onClick={() => setActiveTileType('osm')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${
                    activeTileType === 'osm'
                      ? 'bg-white font-bold text-minsos-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="OpenStreetMap Street View"
                >
                  <StreetMapIcon className="h-3.5 w-3.5 text-minsos-700" />
                  <span>Street</span>
                </button>
                <button
                  onClick={() => setActiveTileType('dark')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${
                    activeTileType === 'dark'
                      ? 'bg-white font-bold text-minsos-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Carto Dark Tactical Ops"
                >
                  <DarkOpsIcon className="h-3.5 w-3.5 text-minsos-700" />
                  <span>Dark</span>
                </button>
              </div>

              <label className="hidden sm:flex cursor-pointer items-center gap-1 text-[11px] text-slate-700 font-medium ml-1">
                <input
                  type="checkbox"
                  checked={showZones}
                  onChange={(e) => setShowZones(e.target.checked)}
                  className="rounded border-slate-300 text-minsos-600 focus:ring-minsos-500"
                />
                <span>Zones</span>
              </label>
              <label className="hidden sm:flex cursor-pointer items-center gap-1 text-[11px] text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={showIncidents}
                  onChange={(e) => setShowIncidents(e.target.checked)}
                  className="rounded border-slate-300 text-minsos-600 focus:ring-minsos-500"
                />
                <span>Incidents</span>
              </label>
            </div>
          </div>

          {/* Inspected Point HUD Bar */}
          {inspectedCoords && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-minsos-300 bg-minsos-50/90 px-3.5 py-2 text-xs text-minsos-900 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-minsos-700" />
                <span className="font-bold">Clicked Map Position:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-minsos-200 font-semibold text-slate-800">
                  {inspectedCoords.lat.toFixed(6)}° N, {inspectedCoords.lng.toFixed(6)}° E
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${inspectedCoords.lat.toFixed(6)}, ${inspectedCoords.lng.toFixed(6)}`,
                      'Coordinates'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-minsos-600 px-2.5 py-1 font-semibold text-white hover:bg-minsos-700 transition"
                >
                  <CopyIcon className="h-3.5 w-3.5 text-white" />
                  <span>Copy Coordinates</span>
                </button>
                <button
                  onClick={() => setInspectedCoords(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Leaflet Map Canvas */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 shadow-lg">
            {/* Top Tactical HUD Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-2 text-xs text-slate-300 backdrop-blur z-10 relative">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs text-slate-200 font-semibold truncate">
                  RADAR ENGINE · {TILE_LAYERS[activeTileType].name.split(' ')[0]}
                </span>
                {selectedMine && (
                  <span className="hidden md:inline font-mono text-[10px] bg-white/10 text-minsos-300 px-2 py-0.5 rounded">
                    ACTIVE: {selectedMine.name}
                  </span>
                )}
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                {cursorCoords ? (
                  <span className="text-emerald-400 font-medium">
                    CURSOR: {cursorCoords.lat.toFixed(4)}° N, {cursorCoords.lng.toFixed(4)}° E
                  </span>
                ) : (
                  <span>CLICK MAP TO INSPECT COORDINATES</span>
                )}
              </div>
            </div>

            {/* Map Element */}
            <div
              ref={mapContainerRef}
              className="h-[600px] w-full cursor-crosshair"
              style={{ minHeight: '600px' }}
            />

            {/* Bottom Floating Legend */}
            <div className="absolute bottom-3 left-3 z-[400] rounded-xl border border-white/20 bg-slate-950/90 p-2.5 text-[11px] text-slate-200 backdrop-blur shadow-2xl space-y-1.5 max-w-[260px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <p className="font-bold text-white text-[11px]">Surveillance Legend</p>
                <span className="text-[9px] text-slate-400 font-mono">DGMS S.22</span>
              </div>
              <div className="flex flex-col gap-1 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 border border-white flex-shrink-0" />
                  <span>Critical Risk (&ge;75) · Stop-Work Zone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 border border-white flex-shrink-0" />
                  <span>High Risk (50-74) · Active Watch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white flex-shrink-0" />
                  <span>Compliant (&lt;25) · Clear to Operate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 border border-white flex items-center justify-center flex-shrink-0">
                    <ViolationsIcon className="h-2 w-2 text-slate-950" />
                  </span>
                  <span>Incident Evidence Pin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
