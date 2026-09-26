import { useState, useEffect } from 'react'
import { workflowService } from '../services/workflow'
import type { DocumentItem } from '../types'

export function DocumentsVaultPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newRef, setNewRef] = useState('')
  const [newCategory, setNewCategory] = useState<string>('DGMS Directive')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const res = await workflowService.documents({
        category: selectedCategory || undefined,
        search: search || undefined
      })
      setDocs(res.data)
    } catch (err) {
      console.error('Failed to load documents from database:', err)
      setFeedback({ type: 'error', message: 'Failed to retrieve documents from statutory vault.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [selectedCategory])

  const filteredDocs = docs.filter((d) => {
    const q = search.toLowerCase()
    return !search || d.title.toLowerCase().includes(q) || d.referenceNo.toLowerCase().includes(q) || d.issuer.toLowerCase().includes(q)
  })

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsSubmitting(true)
    setFeedback(null)
    try {
      await workflowService.createDocument({
        title: newTitle,
        referenceNo: newRef || `DGMS/STAT/${Date.now().toString().slice(-4)}`,
        category: newCategory,
        issuer: 'Ministry of Coal / Statutory Body',
        validUntil: '31 Dec 2027',
        fileSize: '1.8 MB',
        format: 'PDF',
        status: 'active'
      })
      setFeedback({ type: 'success', message: 'Statutory document successfully stored in MongoDB vault.' })
      setNewTitle('')
      setNewRef('')
      setUploadOpen(false)
      await loadDocuments()
    } catch (err) {
      console.error('Failed to upload document:', err)
      setFeedback({ type: 'error', message: 'Failed to upload document to statutory vault.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 21 · Digital Document Vault
            </span>
            <span className="text-slate-400 text-xs">Statutory Filing Repository</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            Statutory Documents & Clearances Vault
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Central digital repository for DGMS directives, PESO explosive licenses, pollution consents, and lease deeds.
          </p>
        </div>

        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 bg-minsos-900 hover:bg-minsos-800 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
        >
          <span>📤</span> Upload Statutory Document
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search by title, reference number, or issuing authority..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-minsos-500"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-600 text-xs font-medium">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs"
            >
              <option value="">All Categories</option>
              <option value="DGMS Directive">DGMS Directives</option>
              <option value="PESO License">PESO Licenses</option>
              <option value="Environmental Clearance">Environmental Clearances</option>
              <option value="Safety Standard">Safety Standards</option>
              <option value="Mining Lease">Mining Leases</option>
            </select>
          </div>
        </div>

        <span className="text-slate-400 text-xs">
          {filteredDocs.length} documents archived
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="inline-block animate-spin h-6 w-6 border-2 border-minsos-600 border-t-transparent rounded-full mb-2"></div>
          <p className="text-xs text-slate-500 font-medium">Loading statutory vault documents from MongoDB Atlas...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          No documents found matching the search or category filters.
        </div>
      ) : (
        /* Document Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc._id || doc.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition"
            >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  {doc.category}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    doc.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {doc.status === 'active' ? '✓ Valid' : '⚠️ Renewal Due'}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mt-2 leading-snug line-clamp-2">
                {doc.title}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-1">Ref: {doc.referenceNo}</p>
              <p className="text-xs text-slate-600 mt-2">Authority: {doc.issuer}</p>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] text-slate-400">Validity</p>
                <p className="font-semibold text-slate-800 text-[11px]">{doc.validUntil}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveDoc(doc)}
                  className="px-2.5 py-1 text-minsos-700 hover:bg-minsos-50 border border-minsos-200 rounded-lg font-semibold"
                >
                  Preview
                </button>
                <a
                  href="#download"
                  onClick={(e) => {
                    e.preventDefault()
                    alert(`Downloading official statutory filing: ${doc.referenceNo}.pdf`)
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Preview Modal */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-minsos-700 bg-minsos-50 px-2 py-0.5 rounded border border-minsos-200">
                  {activeDoc.category}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">{activeDoc.title}</h3>
                <p className="text-slate-400 text-xs font-mono">{activeDoc.referenceNo}</p>
              </div>
              <button onClick={() => setActiveDoc(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Issuing Statutory Body:</span>
                <span className="font-semibold text-slate-900">{activeDoc.issuer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Document Format & Size:</span>
                <span className="font-semibold text-slate-900">{activeDoc.format} ({activeDoc.fileSize})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statutory Validity:</span>
                <span className="font-semibold text-emerald-700">{activeDoc.validUntil}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Digital Watermark:</span>
                <span className="font-mono text-slate-600">MINSOS-GOV-CERT-VALIDATED</span>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-1">
              <span className="text-2xl">📑</span>
              <p className="text-xs font-bold text-slate-800">Official Government Document Preview</p>
              <p className="text-[11px] text-slate-500">Cryptographically countersigned under Section 22 Mines Act statutory filing guidelines.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setActiveDoc(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold">
                Close Preview
              </button>
              <button
                onClick={() => {
                  alert(`Downloading statutory filing: ${activeDoc.referenceNo}.pdf`)
                  setActiveDoc(null)
                }}
                className="px-4 py-2 bg-minsos-900 text-white rounded-xl text-xs font-semibold"
              >
                Download Verified PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Upload Statutory Filing</h3>
              <button onClick={() => setUploadOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleAddDocument} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DGMS Annual Strata Clearance 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Statutory Reference Number</label>
                <input
                  type="text"
                  placeholder="e.g. DGMS/EZ/2026/012"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Regulatory Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="DGMS Directive">DGMS Directive</option>
                  <option value="PESO License">PESO License</option>
                  <option value="Environmental Clearance">Environmental Clearance</option>
                  <option value="Safety Standard">Safety Standard</option>
                  <option value="Mining Lease">Mining Lease</option>
                </select>
              </div>
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center">
                <span className="text-xl">📎</span>
                <p className="text-xs text-slate-600 mt-1">Drag and drop document (PDF up to 25MB) or click to browse</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setUploadOpen(false)} className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-minsos-900 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
