import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SectionCard, StatusBadge } from '../components/ui'
import { workflowService } from '../services/workflow'
import type { MineRecord } from '../types'
import {
  PlusIcon,
  MapPinIcon,
  GisMapIcon,
  TargetIcon,
  SatelliteIcon,
  SearchIcon
} from '../components/icons'

const COALFIELD_PRESETS = [
  { name: 'Jharia Coalfield (BCCL)', lat: 23.7505, lng: 86.4208 },
  { name: 'Raniganj Basin (ECL)', lat: 23.6212, lng: 87.1245 },
  { name: 'Korba Coalfield (SECL)', lat: 22.3595, lng: 82.7501 },
  { name: 'Singrauli Basin (NCL)', lat: 24.1997, lng: 82.6644 },
  { name: 'Talcher Coalfield (MCL)', lat: 20.9509, lng: 85.2167 },
  { name: 'Bokaro Coalfield (CCL)', lat: 23.7836, lng: 85.9622 }
]

export function MinesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mines, setMines] = useState<MineRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Add Mine Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [location, setLocation] = useState('')
  const [operator, setOperator] = useState('Coal India Limited')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [attendanceRadius, setAttendanceRadius] = useState('100')
  const [submitting, setSubmitting] = useState(false)

  // Edit Coordinates Modal
  const [editingMine, setEditingMine] = useState<MineRecord | null>(null)
  const [editLatitude, setEditLatitude] = useState('')
  const [editLongitude, setEditLongitude] = useState('')
  const [updatingCoords, setUpdatingCoords] = useState(false)

  // GPS Fetch state
  const [fetchingGps, setFetchingGps] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null)

  const loadMines = async () => {
    try {
      setLoading(true)
      const data = await workflowService.minesFullList()
      setMines(data)
    } catch {
      setError('Unable to load mine records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMines()
  }, [])

  const handleFetchLocation = (mode: 'add' | 'edit') => {
    if (!navigator.geolocation) {
      setGpsStatus({
        type: 'error',
        message: 'Geolocation is not supported by your browser.'
      })
      return
    }

    setFetchingGps(true)
    setGpsStatus({ type: 'info', message: 'Acquiring high-accuracy GPS coordinates...' })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)
        const accuracy = Math.round(position.coords.accuracy)

        if (mode === 'add') {
          setLatitude(lat)
          setLongitude(lng)
        } else {
          setEditLatitude(lat)
          setEditLongitude(lng)
        }

        setGpsStatus({
          type: 'success',
          message: `Coordinates fetched successfully: ${lat}, ${lng} (Accuracy: ±${accuracy}m)`
        })
        setFetchingGps(false)
      },
      (geoError) => {
        setFetchingGps(false)
        let msg = 'Failed to acquire location.'
        if (geoError.code === 1) {
          msg = 'Permission denied. Please allow location permissions in your browser or select a coalfield preset.'
        } else if (geoError.code === 2) {
          msg = 'Position unavailable. Please ensure your device GPS or network connection is active.'
        } else if (geoError.code === 3) {
          msg = 'Location request timed out. Please try again or select a preset.'
        }
        setGpsStatus({ type: 'error', message: msg })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const applyPreset = (preset: { name: string; lat: number; lng: number }, mode: 'add' | 'edit') => {
    const latStr = preset.lat.toFixed(6)
    const lngStr = preset.lng.toFixed(6)
    if (mode === 'add') {
      setLatitude(latStr)
      setLongitude(lngStr)
    } else {
      setEditLatitude(latStr)
      setEditLongitude(lngStr)
    }
    setGpsStatus({
      type: 'info',
      message: `Preset loaded: ${preset.name} (${latStr}, ${lngStr})`
    })
  }

  const handleCreateMine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !code || !location) {
      alert('Please fill out all required fields.')
      return
    }

    let coords: { latitude: number; longitude: number } | undefined
    if (latitude && longitude) {
      const latNum = parseFloat(latitude)
      const lngNum = parseFloat(longitude)
      if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        alert('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.')
        return
      }
      coords = { latitude: latNum, longitude: lngNum }
    }

    try {
      setSubmitting(true)
      setError('')
      const radiusNum = parseInt(attendanceRadius, 10)
      await workflowService.createMine({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        location: location.trim(),
        operator: operator.trim(),
        coordinates: coords,
        ...(radiusNum > 0 ? { attendanceRadius: radiusNum } : {})
      })
      setSuccess(`Mine site ${name} registered successfully.`)
      setShowAddModal(false)
      setName('')
      setCode('')
      setLocation('')
      setLatitude('')
      setLongitude('')
      setAttendanceRadius('100')
      setGpsStatus(null)
      loadMines()
    } catch {
      setError('Failed to register mine. Check if mine code is already in use.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEditCoords = (mine: MineRecord) => {
    setEditingMine(mine)
    setEditLatitude(mine.coordinates?.latitude ? mine.coordinates.latitude.toString() : '')
    setEditLongitude(mine.coordinates?.longitude ? mine.coordinates.longitude.toString() : '')
    setGpsStatus(null)
  }

  const handleSaveCoords = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMine) return

    if (!editLatitude || !editLongitude) {
      alert('Please provide both latitude and longitude.')
      return
    }

    const latNum = parseFloat(editLatitude)
    const lngNum = parseFloat(editLongitude)
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      alert('Invalid coordinates. Latitude must be -90 to 90, Longitude must be -180 to 180.')
      return
    }

    try {
      setUpdatingCoords(true)
      await workflowService.updateMine(editingMine._id, {
        coordinates: { latitude: latNum, longitude: lngNum }
      })
      setSuccess(`Updated coordinates for ${editingMine.name}. Reflected on GIS Map.`)
      setEditingMine(null)
      loadMines()
    } catch {
      setError('Failed to update mine coordinates.')
    } finally {
      setUpdatingCoords(false)
    }
  }

  const handleDeleteMine = async (id: string, mineName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${mineName} from operations?`)) return
    try {
      await workflowService.deleteMine(id)
      setSuccess(`Mine ${mineName} removed successfully.`)
      loadMines()
    } catch {
      setError('Failed to delete mine site.')
    }
  }

  const navigateToGis = (mineId: string) => {
    const role = user?.role ?? 'admin'
    navigate(`/${role}/gis?focusMine=${mineId}`)
  }

  const filteredMines = mines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const userRole = user?.role ?? 'worker'
  const canManage = ['admin', 'mine_manager', 'manager'].includes(userRole)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <p className="font-medium text-minsos-600 text-sm">Site Operations · Asset Register</p>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            Coal Mine Sites & Operational Assets
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Operational boundaries, concession codes, registered operators, spatial GPS coordinates, and site compliance overviews.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setGpsStatus(null)
              setShowAddModal(true)
            }}
            className="inline-flex items-center gap-2 bg-minsos-600 hover:bg-minsos-700 px-4 py-2.5 rounded-lg font-semibold text-white text-sm shadow-xs transition"
          >
            <PlusIcon className="h-4 w-4 text-white" />
            <span>Add Mine Site</span>
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
      {success && <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-xl text-emerald-800 text-sm">{success}</div>}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 border border-slate-200 rounded-xl">
        <div className="relative flex-1 min-w-[240px]">
          <SearchIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by mine name, code, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-minsos-500"
          />
        </div>
        <span className="text-slate-400 text-xs">
          Showing {filteredMines.length} of {mines.length} sites
        </span>
      </div>

      {/* Mine Sites Table */}
      <SectionCard title="Registered Coal Mine Operations" subtitle="All sites tracked under the MINSOS statutory surveillance umbrella">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Mine Site</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Location / Basin</th>
                <th className="px-4 py-3 font-semibold">Operator</th>
                <th className="px-4 py-3 font-semibold">Coordinates (WGS-84)</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">Loading mine sites...</td>
                </tr>
              )}
              {!loading && filteredMines.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No mine sites matched your search.</td>
                </tr>
              )}
              {!loading &&
                filteredMines.map((m) => {
                  const hasCoords = m.coordinates && m.coordinates.latitude != null && m.coordinates.longitude != null
                  return (
                    <tr key={m._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{m.name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 text-xs font-semibold">
                          {m.code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{m.location}</td>
                      <td className="px-4 py-3.5 text-slate-700 text-xs">{m.operator}</td>
                      <td className="px-4 py-3.5">
                        {hasCoords ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              <MapPinIcon className="h-3 w-3 text-minsos-700" />
                              {m.coordinates!.latitude.toFixed(4)}°, {m.coordinates!.longitude.toFixed(4)}°
                            </span>
                            <div>
                              <button
                                onClick={() => navigateToGis(m._id)}
                                className="text-[11px] font-semibold text-minsos-600 hover:text-minsos-800 hover:underline inline-flex items-center gap-1"
                              >
                                <GisMapIcon className="h-3.5 w-3.5 text-minsos-700" />
                                <span>View on GIS Map</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                              Coalfield Preset
                            </span>
                            {canManage && (
                              <div>
                                <button
                                  onClick={() => handleOpenEditCoords(m)}
                                  className="text-[11px] font-semibold text-minsos-600 hover:text-minsos-800 hover:underline"
                                >
                                  + Set Coordinates
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge value={m.status === 'active' ? 'Compliant' : 'Observations'} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                        {canManage && (
                          <button
                            onClick={() => handleOpenEditCoords(m)}
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-minsos-700 text-xs font-semibold px-2 py-1 rounded hover:bg-slate-100 transition"
                            title="Edit GPS Coordinates"
                          >
                            <MapPinIcon className="h-3 w-3 text-slate-500" />
                            <span>Edit GPS</span>
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDeleteMine(m._id, m.name)}
                            className="text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Add Mine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white p-6 border border-slate-200 rounded-2xl shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Register Mine Site</h2>
                <p className="text-slate-500 text-xs">Provide operational details and GPS coordinates for GIS tracking</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateMine} className="space-y-4">
              <div>
                <label className="block font-medium text-slate-700 text-xs">Mine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jharia Colliery No. 5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 text-xs">Concession Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JHR-05"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm uppercase focus:ring-2 focus:ring-minsos-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 text-xs">Operator / Subsidiary</label>
                  <input
                    type="text"
                    required
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 text-xs">Geographic Location / District *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dhanbad, Jharkhand"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
                />
              </div>

              {/* Spatial Coordinates & Fetch Location Box */}
              <div className="rounded-xl border border-minsos-200 bg-minsos-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SatelliteIcon className="h-4 w-4 text-minsos-700" />
                    <span className="text-xs font-bold text-minsos-900 uppercase tracking-wide">
                      Spatial GIS Coordinates (WGS-84)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFetchLocation('add')}
                    disabled={fetchingGps}
                    className="inline-flex items-center gap-1 bg-minsos-600 hover:bg-minsos-700 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-xs transition"
                  >
                    {fetchingGps ? (
                      <>
                        <span className="inline-block animate-spin">⟳</span> Fetching...
                      </>
                    ) : (
                      <>
                        <TargetIcon className="h-3.5 w-3.5 text-white" />
                        <span>Fetch Location</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-slate-500 text-xs">
                  Coordinates define the mine centroid and buffer perimeter on the GIS satellite map.
                </p>

                {gpsStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-xs border ${
                      gpsStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : gpsStatus.type === 'error'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {gpsStatus.message}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium text-xs">Latitude (°N)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 23.750500"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:ring-2 focus:ring-minsos-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium text-xs">Longitude (°E)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 86.420800"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:ring-2 focus:ring-minsos-500"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-minsos-200/60">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                    Quick Coalfield Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COALFIELD_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset, 'add')}
                        className="text-[11px] bg-white hover:bg-minsos-100 text-slate-700 hover:text-minsos-800 border border-slate-200 px-2 py-1 rounded transition"
                      >
                        {preset.name.split(' ')[0]} ({preset.lat.toFixed(2)}, {preset.lng.toFixed(2)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Attendance Geofence Radius */}
              <div>
                <label className="block font-medium text-slate-700 text-xs">Attendance Radius (metres)</label>
                <p className="text-xs text-slate-500 mb-1">Workers must check in within this distance from the mine centroid. Default: 100m.</p>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  step="10"
                  placeholder="100"
                  value={attendanceRadius}
                  onChange={(e) => setAttendanceRadius(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white hover:bg-slate-50 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-minsos-600 hover:bg-minsos-700 px-4 py-2 rounded-lg font-semibold text-white text-sm transition"
                >
                  {submitting ? 'Registering...' : 'Register Mine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Coordinates Modal */}
      {editingMine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md bg-white p-6 border border-slate-200 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Calibrate Coordinates</h2>
                <p className="text-slate-500 text-xs">{editingMine.name} ({editingMine.code})</p>
              </div>
              <button onClick={() => setEditingMine(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveCoords} className="space-y-4">
              <div className="rounded-xl border border-minsos-200 bg-minsos-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-minsos-900 uppercase">GPS Location (WGS-84)</span>
                  <button
                    type="button"
                    onClick={() => handleFetchLocation('edit')}
                    disabled={fetchingGps}
                    className="inline-flex items-center gap-1 bg-minsos-600 hover:bg-minsos-700 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-xs transition"
                  >
                    {fetchingGps ? (
                      <>
                        <span className="inline-block animate-spin">⟳</span> Fetching...
                      </>
                    ) : (
                      <>
                        <TargetIcon className="h-3.5 w-3.5 text-white" />
                        <span>Fetch Location</span>
                      </>
                    )}
                  </button>
                </div>

                {gpsStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-xs border ${
                      gpsStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : gpsStatus.type === 'error'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {gpsStatus.message}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium text-xs">Latitude (°N) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 23.750500"
                      value={editLatitude}
                      onChange={(e) => setEditLatitude(e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:ring-2 focus:ring-minsos-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium text-xs">Longitude (°E) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 86.420800"
                      value={editLongitude}
                      onChange={(e) => setEditLongitude(e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:ring-2 focus:ring-minsos-500"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-minsos-200/60">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                    Coalfield Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COALFIELD_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset, 'edit')}
                        className="text-[11px] bg-white hover:bg-minsos-100 text-slate-700 hover:text-minsos-800 border border-slate-200 px-2 py-1 rounded transition"
                      >
                        {preset.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMine(null)}
                  className="bg-white hover:bg-slate-50 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCoords}
                  className="bg-minsos-600 hover:bg-minsos-700 px-4 py-2 rounded-lg font-semibold text-white text-sm transition"
                >
                  {updatingCoords ? 'Saving...' : 'Save Coordinates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
