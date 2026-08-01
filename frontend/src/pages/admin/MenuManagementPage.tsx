import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Leaf, Circle, Clock, X } from 'lucide-react'
import { api } from '@/lib/api'

// Types
interface MenuItem {
  id: string
  name: string
  nameTamil: string
  description: string
  descriptionTamil: string
  price: number
  image: string | null
  isVeg: boolean
  spiceLevel: number
  prepTimeMinutes: number
  isAvailable: boolean
  categoryId: string
}

interface Category {
  id: string
  name: string
  nameTamil: string
  description: string
  sortOrder: number
  isActive: boolean
  menuItems: MenuItem[]
}

interface CategoryForm {
  name: string
  nameTamil: string
  description: string
  sortOrder: number
}

interface MenuItemForm {
  name: string
  nameTamil: string
  description: string
  descriptionTamil: string
  price: number
  isVeg: boolean
  spiceLevel: number
  prepTimeMinutes: number
  categoryId: string
}

const emptyCategoryForm: CategoryForm = { name: '', nameTamil: '', description: '', sortOrder: 0 }
const emptyItemForm: MenuItemForm = {
  name: '', nameTamil: '', description: '', descriptionTamil: '',
  price: 0, isVeg: true, spiceLevel: 1, prepTimeMinutes: 10, categoryId: '',
}

export function MenuManagementPage() {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Category modal state
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState<CategoryForm>(emptyCategoryForm)

  // Item modal state
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [itemForm, setItemForm] = useState<MenuItemForm>(emptyItemForm)

  // Fetch menu
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-menu'],
    queryFn: () => api.get<Category[]>('/menu'),
  })

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const filteredItems = selectedCategory?.menuItems ?? []

  // --- Category mutations ---
  const createCategory = useMutation({
    mutationFn: (body: CategoryForm) => api.post('/menu/categories', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-menu'] }); setCatModalOpen(false) },
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CategoryForm }) => api.put(`/menu/categories/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-menu'] }); setCatModalOpen(false) },
  })

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] })
      if (selectedCategoryId === editingCategory?.id) setSelectedCategoryId(null)
    },
  })

  // --- Item mutations ---
  const createItem = useMutation({
    mutationFn: (body: MenuItemForm) => api.post('/menu/items', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-menu'] }); setItemModalOpen(false) },
  })

  const updateItem = useMutation({
    mutationFn: ({ id, body }: { id: string; body: MenuItemForm }) => api.put(`/menu/items/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-menu'] }); setItemModalOpen(false) },
  })

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-menu'] }),
  })

  const toggleAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch(`/menu/items/${id}/availability`, { isAvailable }),
    onMutate: async ({ id, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-menu'] })
      const prev = queryClient.getQueryData<Category[]>(['admin-menu'])
      queryClient.setQueryData<Category[]>(['admin-menu'], (old) =>
        old?.map((cat) => ({
          ...cat,
          menuItems: cat.menuItems.map((item) =>
            item.id === id ? { ...item, isAvailable } : item
          ),
        }))
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['admin-menu'], context.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-menu'] }),
  })

  // --- Handlers ---
  function openAddCategory() {
    setEditingCategory(null)
    setCatForm(emptyCategoryForm)
    setCatModalOpen(true)
  }

  function openEditCategory(cat: Category) {
    setEditingCategory(cat)
    setCatForm({ name: cat.name, nameTamil: cat.nameTamil, description: cat.description, sortOrder: cat.sortOrder })
    setCatModalOpen(true)
  }

  function submitCategory(e: React.FormEvent) {
    e.preventDefault()
    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, body: catForm })
    } else {
      createCategory.mutate(catForm)
    }
  }

  function openAddItem() {
    setEditingItem(null)
    setItemForm({ ...emptyItemForm, categoryId: selectedCategoryId ?? '' })
    setItemModalOpen(true)
  }

  function openEditItem(item: MenuItem) {
    setEditingItem(item)
    setItemForm({
      name: item.name, nameTamil: item.nameTamil, description: item.description,
      descriptionTamil: item.descriptionTamil, price: item.price, isVeg: item.isVeg,
      spiceLevel: item.spiceLevel, prepTimeMinutes: item.prepTimeMinutes, categoryId: item.categoryId,
    })
    setItemModalOpen(true)
  }

  function submitItem(e: React.FormEvent) {
    e.preventDefault()
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, body: itemForm })
    } else {
      createItem.mutate(itemForm)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#FF8A00] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Menu Management</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Categories Panel */}
        <div className="w-full lg:w-80 bg-[#1A1F2E] border border-white/5 rounded-[20px] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Categories</h2>
            <button
              onClick={openAddCategory}
              className="w-9 h-9 flex items-center justify-center bg-[#FF8A00] text-white rounded-xl hover:bg-orange-600 transition-colors"
              aria-label="Add category"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-xl cursor-pointer border transition-all ${
                  selectedCategoryId === cat.id
                    ? 'ring-2 ring-orange-500 bg-white/5 border-white/10'
                    : 'border-white/5 hover:border-white/10 bg-white/[0.02]'
                }`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{cat.name}</p>
                    <p className="text-sm text-gray-400 truncate">{cat.nameTamil}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-xs font-medium text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
                      #{cat.sortOrder}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.isActive ? 'bg-[#22C55E]' : 'bg-gray-500'}`} />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditCategory(cat) }}
                    className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    aria-label={`Edit ${cat.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete "${cat.name}"?`)) deleteCategory.mutate(cat.id)
                    }}
                    className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No categories yet</p>
            )}
          </div>
        </div>

        {/* Menu Items Panel */}
        <div className="flex-1 bg-[#1A1F2E] border border-white/5 rounded-[20px] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedCategory ? `${selectedCategory.name} Items` : 'Select a Category'}
            </h2>
            {selectedCategory && (
              <button
                onClick={openAddItem}
                className="w-9 h-9 flex items-center justify-center bg-[#FF8A00] text-white rounded-xl hover:bg-orange-600 transition-colors"
                aria-label="Add item"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {!selectedCategory ? (
            <p className="text-gray-500 text-center py-12">Select a category to manage items</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No items in this category</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden relative"
                  >
                    {/* Food image */}
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-4">
                    {/* Veg/Non-veg badge */}
                    <span
                      className={`absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.isVeg ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {item.isVeg ? <Leaf className="w-3 h-3" /> : <Circle className="w-3 h-3 fill-current" />}
                      {item.isVeg ? 'VEG' : 'NON-VEG'}
                    </span>

                    <p className="font-semibold text-white pr-20">{item.name}</p>
                    <p className="text-sm text-gray-400">{item.nameTamil}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-lg font-bold text-orange-400">&#8377;{item.price}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {item.prepTimeMinutes} min
                      </span>
                    </div>

                    {/* Availability toggle */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => toggleAvailability.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          item.isAvailable ? 'bg-[#FF8A00]' : 'bg-gray-600'
                        }`}
                        aria-label={`Toggle availability for ${item.name}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                            item.isAvailable ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-medium ${item.isAvailable ? 'text-[#22C55E]' : 'text-gray-500'}`}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openEditItem(item)}
                        className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteItem.mutate(item.id) }}
                        className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <AnimatePresence>
        {catModalOpen && (
          <Modal onClose={() => setCatModalOpen(false)} title={editingCategory ? 'Edit Category' : 'Add Category'}>
            <form onSubmit={submitCategory} className="space-y-4">
              <Field label="Name" value={catForm.name} onChange={(v) => setCatForm({ ...catForm, name: v })} required />
              <Field label="Name (Tamil)" value={catForm.nameTamil} onChange={(v) => setCatForm({ ...catForm, nameTamil: v })} />
              <Field label="Description" value={catForm.description} onChange={(v) => setCatForm({ ...catForm, description: v })} />
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={catForm.sortOrder}
                  onChange={(e) => setCatForm({ ...catForm, sortOrder: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCatModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategory.isPending || updateCategory.isPending}
                  className="px-4 py-2 bg-[#FF8A00] text-white text-sm font-medium rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Item Modal */}
      <AnimatePresence>
        {itemModalOpen && (
          <Modal onClose={() => setItemModalOpen(false)} title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}>
            <form onSubmit={submitItem} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <Field label="Name" value={itemForm.name} onChange={(v) => setItemForm({ ...itemForm, name: v })} required />
              <Field label="Name (Tamil)" value={itemForm.nameTamil} onChange={(v) => setItemForm({ ...itemForm, nameTamil: v })} />
              <Field label="Description" value={itemForm.description} onChange={(v) => setItemForm({ ...itemForm, description: v })} />
              <Field label="Description (Tamil)" value={itemForm.descriptionTamil} onChange={(v) => setItemForm({ ...itemForm, descriptionTamil: v })} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Price (&#8377;)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={itemForm.prepTimeMinutes}
                    onChange={(e) => setItemForm({ ...itemForm, prepTimeMinutes: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Spice Level (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={itemForm.spiceLevel}
                    onChange={(e) => setItemForm({ ...itemForm, spiceLevel: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="" className="bg-[#1A1F2E]">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#1A1F2E]">{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemForm.isVeg}
                  onChange={(e) => setItemForm({ ...itemForm, isVeg: e.target.checked })}
                  className="w-4 h-4 text-[#FF8A00] bg-white/5 border-white/10 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-white">Vegetarian</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setItemModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createItem.isPending || updateItem.isPending}
                  className="px-4 py-2 bg-[#FF8A00] text-white text-sm font-medium rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Reusable components ---

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
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
        className="bg-[#1A1F2E] border border-white/10 rounded-[20px] shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
      />
    </div>
  )
}
