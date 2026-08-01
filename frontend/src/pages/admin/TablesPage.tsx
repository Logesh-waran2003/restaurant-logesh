import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Plus, Pencil, Trash2, QrCode, Home, TreePine, Merge, X, TableProperties } from 'lucide-react'
import { api } from '@/lib/api'

interface Table {
  id: string
  number: number
  name: string
  capacity: number
  section: 'Indoor' | 'Outdoor'
  qrCode: string
  isActive: boolean
}

type TableForm = Pick<Table, 'number' | 'name' | 'capacity' | 'section'>

const CAPACITIES = [2, 4, 6, 8]
const SECTIONS: Table['section'][] = ['Indoor', 'Outdoor']

export function TablesPage() {
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [qrTable, setQrTable] = useState<Table | null>(null)
  const [mergeSelection, setMergeSelection] = useState<string[]>([])

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get<Table[]>('/tables'),
  })

  const createMutation = useMutation({
    mutationFn: (body: TableForm) => api.post<Table>('/tables', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setShowAddModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: TableForm & { id: string }) =>
      api.put<Table>(`/tables/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setEditingTable(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (table: Table) =>
      api.put<Table>(`/tables/${table.id}`, { ...table, isActive: !table.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })

  const mergeMutation = useMutation({
    mutationFn: () =>
      api.patch(`/tables/${mergeSelection[0]}/merge`, {
        tableIds: mergeSelection,
        primaryTableId: mergeSelection[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setMergeSelection([])
    },
  })

  function toggleMergeSelect(id: string) {
    setMergeSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    )
  }

  const indoor = tables.filter((t) => t.section === 'Indoor')
  const outdoor = tables.filter((t) => t.section === 'Outdoor')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#FF8A00] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Table Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF8A00] text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      {/* Merge toolbar */}
      <AnimatePresence>
        {mergeSelection.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 bg-[#FF8A00]/10 border border-[#FF8A00]/20 rounded-xl px-4 py-3"
          >
            <Merge className="w-4 h-4 text-[#FF8A00]" />
            <span className="text-sm text-orange-300">
              {mergeSelection.length}/2 tables selected for merge
            </span>
            {mergeSelection.length === 2 && (
              <button
                onClick={() => mergeMutation.mutate()}
                disabled={mergeMutation.isPending}
                className="px-3 py-1.5 bg-[#FF8A00] text-white text-sm rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {mergeMutation.isPending ? 'Merging...' : 'Merge Tables'}
              </button>
            )}
            <button
              onClick={() => setMergeSelection([])}
              className="ml-auto text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floor plan sections */}
      {[
        { label: 'Indoor', icon: Home, tables: indoor },
        { label: 'Outdoor', icon: TreePine, tables: outdoor },
      ].map((section) => (
        <div key={section.label}>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <section.icon className="w-5 h-5 text-gray-400" />
            {section.label}
            <span className="text-sm font-normal text-gray-500">({section.tables.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {section.tables.map((table, i) => (
              <TableCard
                key={table.id}
                table={table}
                index={i}
                isSelectedForMerge={mergeSelection.includes(table.id)}
                onToggleMerge={() => toggleMergeSelect(table.id)}
                onEdit={() => setEditingTable(table)}
                onToggleActive={() => toggleMutation.mutate(table)}
                onShowQR={() => setQrTable(table)}
                onDelete={() => { if (confirm(`Delete table "${table.name}"?`)) deleteMutation.mutate(table.id) }}
              />
            ))}
          </div>
        </div>
      ))}

      {tables.length === 0 && (
        <div className="text-center py-16">
          <TableProperties className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No tables yet. Add your first table to get started.</p>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <TableFormModal
            title="Add Table"
            onClose={() => setShowAddModal(false)}
            onSubmit={(form) => createMutation.mutate(form)}
            isPending={createMutation.isPending}
          />
        )}
        {editingTable && (
          <TableFormModal
            title="Edit Table"
            initial={editingTable}
            onClose={() => setEditingTable(null)}
            onSubmit={(form) => updateMutation.mutate({ ...form, id: editingTable.id })}
            isPending={updateMutation.isPending}
          />
        )}
        {qrTable && <QRModal table={qrTable} onClose={() => setQrTable(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ─── Table Card ─── */

function TableCard({
  table,
  index,
  isSelectedForMerge,
  onToggleMerge,
  onEdit,
  onToggleActive,
  onShowQR,
  onDelete,
}: {
  table: Table
  index: number
  isSelectedForMerge: boolean
  onToggleMerge: () => void
  onEdit: () => void
  onToggleActive: () => void
  onShowQR: () => void
  onDelete: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={onToggleMerge}
      className={`relative bg-[#1A1F2E] rounded-[20px] p-4 border cursor-pointer transition-all ${
        isSelectedForMerge
          ? 'border-[#FF8A00] ring-2 ring-[#FF8A00]/30'
          : table.isActive
            ? 'border-white/5 hover:border-white/10'
            : 'border-white/5 opacity-60'
      }`}
    >
      {/* Active badge */}
      <div
        className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${
          table.isActive ? 'bg-[#22C55E]' : 'bg-gray-500'
        }`}
      />

      {/* Table number circle */}
      <div className="w-14 h-14 rounded-full bg-[#FF8A00]/10 text-[#FF8A00] font-bold text-xl flex items-center justify-center mx-auto mb-3">
        {table.number}
      </div>

      <p className="text-sm font-medium text-white text-center truncate">{table.name}</p>
      <p className="text-xs text-gray-400 text-center mt-1">
        {table.capacity} seats
      </p>

      {/* Actions */}
      <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onShowQR}
          className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Show QR Code"
          aria-label={`QR code for ${table.name}`}
        >
          <QrCode className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Edit"
          aria-label={`Edit ${table.name}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Delete"
          aria-label={`Delete ${table.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Table Form Modal ─── */

function TableFormModal({
  title,
  initial,
  onClose,
  onSubmit,
  isPending,
}: {
  title: string
  initial?: TableForm
  onClose: () => void
  onSubmit: (form: TableForm) => void
  isPending: boolean
}) {
  const [number, setNumber] = useState(initial?.number ?? 1)
  const [name, setName] = useState(initial?.name ?? '')
  const [capacity, setCapacity] = useState(initial?.capacity ?? 4)
  const [section, setSection] = useState<Table['section']>(initial?.section ?? 'Indoor')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ number, name, capacity, section })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-[#1A1F2E] border border-white/10 rounded-[20px] shadow-2xl p-6 w-full max-w-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Table Number</label>
          <input
            type="number"
            min={1}
            value={number}
            onChange={(e) => setNumber(+e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Window Booth"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Capacity</label>
          <div className="flex gap-2">
            {CAPACITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCapacity(c)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  capacity === c
                    ? 'bg-[#FF8A00] text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Section</label>
          <div className="flex gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${
                  section === s
                    ? 'bg-[#FF8A00] text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s === 'Indoor' ? <Home className="w-4 h-4" /> : <TreePine className="w-4 h-4" />}
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2 bg-[#FF8A00] text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}

/* ─── QR Modal ─── */

function QRModal({ table, onClose }: { table: Table; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1A1F2E] border border-white/10 rounded-[20px] shadow-2xl p-8 w-full max-w-xs text-center space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">QR Code</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-400">Table {table.number} — {table.name}</p>
        <div className="flex justify-center p-4 bg-white rounded-xl">
          <QRCodeSVG
            value={`http://${window.location.hostname === 'localhost' ? '192.168.0.104' : window.location.hostname}:${window.location.port}/order/table-${table.number}`}
            size={200}
            bgColor="#ffffff"
            fgColor="#111827"
            level="M"
            includeMargin
          />
        </div>
        <p className="text-xs text-gray-500">
          Scan to open: <span className="font-mono text-[#FF8A00]">/order/table-{table.number}</span>
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#FF8A00] text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  )
}
