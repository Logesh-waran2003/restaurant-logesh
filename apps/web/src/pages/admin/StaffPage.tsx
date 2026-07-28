import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { X } from 'lucide-react'

interface Staff {
  id: string
  name: string
  phone: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'CHEF' | 'WAITER'
  createdAt: string
}

type StaffRole = Staff['role']

const ROLES: StaffRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'CHEF', 'WAITER']

const ROLE_COLORS: Record<StaffRole, string> = {
  OWNER: 'bg-purple-500/15 text-purple-400',
  ADMIN: 'bg-blue-500/15 text-blue-400',
  MANAGER: 'bg-amber-500/15 text-amber-400',
  CASHIER: 'bg-green-500/15 text-green-400',
  CHEF: 'bg-orange-500/15 text-orange-400',
  WAITER: 'bg-white/10 text-gray-400',
}

interface StaffFormData {
  name: string
  phone: string
  email: string
  password: string
  role: StaffRole
}

interface EditFormData {
  name: string
  phone: string
  email: string
  role: StaffRole
}

export function StaffPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null)

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => api.get<Staff[]>('/admin/staff'),
  })

  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => api.post('/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
      setShowAddModal(false)
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditFormData }) =>
      api.put(`/admin/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
      setEditingStaff(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
      setDeletingStaff(null)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Staff Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#FF8A00] text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
        >
          + Add Staff
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#1A1F2E] rounded-[20px] p-5 border border-white/5 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
              <div className="h-3 bg-white/10 rounded w-1/2 mb-2" />
              <div className="h-3 bg-white/10 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-[#1A1F2E] rounded-[20px] p-12 border border-white/5 text-center">
          <p className="text-gray-400 text-lg">No staff members yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first staff member to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <div
              key={member.id}
              className="bg-[#1A1F2E] rounded-[20px] p-5 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{member.name}</h3>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]}`}
                  >
                    {member.role}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingStaff(member)}
                    className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-md transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeletingStaff(member)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <p>{member.phone}</p>
                <p>{member.email}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Added {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSubmit={(data) => editMutation.mutate({ id: editingStaff.id, data })}
          isLoading={editMutation.isPending}
          error={editMutation.error?.message}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <DeleteConfirmModal
          staff={deletingStaff}
          onClose={() => setDeletingStaff(null)}
          onConfirm={() => deleteMutation.mutate(deletingStaff.id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

/* ─── Modals ─── */

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1A1F2E] rounded-[20px] p-6 w-full max-w-md border border-white/10 mx-4">
        {children}
      </div>
    </div>
  )
}

function AddStaffModal({
  onClose,
  onSubmit,
  isLoading,
  error,
}: {
  onClose: () => void
  onSubmit: (data: StaffFormData) => void
  isLoading: boolean
  error?: string
}) {
  const [form, setForm] = useState<StaffFormData>({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'WAITER',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Add Staff Member</h2>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded transition-colors">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none placeholder-gray-500"
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none placeholder-gray-500"
            placeholder="9876543210"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none placeholder-gray-500"
            placeholder="staff@restaurant.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none placeholder-gray-500"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[#FF8A00] text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Adding...' : 'Add Staff'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  )
}

function EditStaffModal({
  staff,
  onClose,
  onSubmit,
  isLoading,
  error,
}: {
  staff: Staff
  onClose: () => void
  onSubmit: (data: EditFormData) => void
  isLoading: boolean
  error?: string
}) {
  const [form, setForm] = useState<EditFormData>({
    name: staff.name,
    phone: staff.phone,
    email: staff.email,
    role: staff.role,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Edit Staff Member</h2>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded transition-colors">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[#FF8A00] text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  )
}

function DeleteConfirmModal({
  staff,
  onClose,
  onConfirm,
  isLoading,
}: {
  staff: Staff
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
}) {
  return (
    <ModalBackdrop onClose={onClose}>
      <h2 className="text-lg font-semibold text-white mb-2">Delete Staff Member</h2>
      <p className="text-gray-400 mb-6">
        Are you sure you want to remove <span className="font-medium text-white">{staff.name}</span> ({staff.role})? This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </ModalBackdrop>
  )
}
