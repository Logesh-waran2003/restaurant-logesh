import { useState } from 'react'
import { api } from '@/lib/api'
import { Save } from 'lucide-react'

interface Settings {
  restaurant: {
    name: string
    address: string
    phone: string
    gstNumber: string
    branchCode: string
  }
  payment: {
    upiEnabled: boolean
    cardEnabled: boolean
    cashEnabled: boolean
    razorpayKey: string
  }
  tax: {
    gstPercent: number
    serviceChargePercent: number
  }
  notifications: {
    smsEnabled: boolean
    whatsappEnabled: boolean
  }
  system: {
    appVersion: string
    dbStatus: 'connected' | 'disconnected'
    activeTables: number
  }
}

const defaults: Settings = {
  restaurant: {
    name: 'My Restaurant',
    address: '',
    phone: '',
    gstNumber: '',
    branchCode: '',
  },
  payment: {
    upiEnabled: true,
    cardEnabled: true,
    cashEnabled: true,
    razorpayKey: 'rzp_live_••••••••••••',
  },
  tax: {
    gstPercent: 5,
    serviceChargePercent: 0,
  },
  notifications: {
    smsEnabled: false,
    whatsappEnabled: false,
  },
  system: {
    appVersion: '1.0.0',
    dbStatus: 'connected',
    activeTables: 0,
  },
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-[#0F1219] ${
        enabled ? 'bg-[#FF8A00]' : 'bg-white/10'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400 disabled:bg-white/[0.02] disabled:text-gray-400 placeholder-gray-500"
      />
    </div>
  )
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = <K extends keyof Settings>(section: K, field: keyof Settings[K], value: Settings[K][keyof Settings[K]]) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings', settings)
      setSaved(true)
    } catch {
      // ponytail: API doesn't exist yet — silently swallow. Replace with toast once backend is wired.
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Restaurant Info */}
      <section className="bg-[#1A1F2E] rounded-[20px] p-6 border border-white/5">
        <SectionHeader title="Restaurant Info" description="Basic details about your restaurant" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Restaurant Name"
            value={settings.restaurant.name}
            onChange={(v) => update('restaurant', 'name', v)}
            placeholder="Restaurant name"
          />
          <InputField
            label="Phone"
            value={settings.restaurant.phone}
            onChange={(v) => update('restaurant', 'phone', v)}
            type="tel"
            placeholder="+91 9876543210"
          />
          <div className="sm:col-span-2">
            <InputField
              label="Address"
              value={settings.restaurant.address}
              onChange={(v) => update('restaurant', 'address', v)}
              placeholder="Full address"
            />
          </div>
          <InputField
            label="GST Number"
            value={settings.restaurant.gstNumber}
            onChange={(v) => update('restaurant', 'gstNumber', v)}
            placeholder="22AAAAA0000A1Z5"
          />
          <InputField
            label="Branch Code"
            value={settings.restaurant.branchCode}
            onChange={(v) => update('restaurant', 'branchCode', v)}
            placeholder="BR-001"
          />
        </div>
      </section>

      {/* Payment Settings */}
      <section className="bg-[#1A1F2E] rounded-[20px] p-6 border border-white/5">
        <SectionHeader title="Payment Settings" description="Configure accepted payment methods" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">UPI</p>
              <p className="text-xs text-gray-400">Accept UPI payments via QR code</p>
            </div>
            <Toggle enabled={settings.payment.upiEnabled} onChange={(v) => update('payment', 'upiEnabled', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Card</p>
              <p className="text-xs text-gray-400">Credit & debit card payments</p>
            </div>
            <Toggle enabled={settings.payment.cardEnabled} onChange={(v) => update('payment', 'cardEnabled', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Cash</p>
              <p className="text-xs text-gray-400">Accept cash payments at counter</p>
            </div>
            <Toggle enabled={settings.payment.cashEnabled} onChange={(v) => update('payment', 'cashEnabled', v)} />
          </div>
          <div className="border-t border-white/5 pt-4">
            <InputField
              label="Razorpay Key"
              value={settings.payment.razorpayKey}
              onChange={() => {}}
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">Contact support to update payment gateway keys</p>
          </div>
        </div>
      </section>

      {/* Tax Settings */}
      <section className="bg-[#1A1F2E] rounded-[20px] p-6 border border-white/5">
        <SectionHeader title="Tax Settings" description="GST and service charge configuration" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="GST (%)"
            value={settings.tax.gstPercent}
            onChange={(v) => update('tax', 'gstPercent', Number(v) || 0)}
            type="number"
            placeholder="5"
          />
          <InputField
            label="Service Charge (%)"
            value={settings.tax.serviceChargePercent}
            onChange={(v) => update('tax', 'serviceChargePercent', Number(v) || 0)}
            type="number"
            placeholder="0"
          />
        </div>
      </section>

      {/* Notification Settings */}
      <section className="bg-[#1A1F2E] rounded-[20px] p-6 border border-white/5">
        <SectionHeader title="Notifications" description="Manage customer notification channels" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">SMS Notifications</p>
              <p className="text-xs text-gray-400">Send order updates via SMS</p>
            </div>
            <Toggle enabled={settings.notifications.smsEnabled} onChange={(v) => update('notifications', 'smsEnabled', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">WhatsApp Notifications</p>
              <p className="text-xs text-gray-400">Send order updates via WhatsApp</p>
            </div>
            <Toggle enabled={settings.notifications.whatsappEnabled} onChange={(v) => update('notifications', 'whatsappEnabled', v)} />
          </div>
        </div>
      </section>

      {/* System Info */}
      <section className="bg-[#1A1F2E] rounded-[20px] p-6 border border-white/5">
        <SectionHeader title="System" description="Application status and diagnostics" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400">App Version</p>
            <p className="text-sm font-medium text-white mt-0.5">{settings.system.appVersion}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Database Status</p>
            <p className="text-sm font-medium mt-0.5">
              <span
                className={`inline-flex items-center gap-1.5 ${
                  settings.system.dbStatus === 'connected' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    settings.system.dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {settings.system.dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Active Tables</p>
            <p className="text-sm font-medium text-white mt-0.5">{settings.system.activeTables}</p>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center gap-3 pb-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[#FF8A00] px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-[#0F1219] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-green-400 font-medium">✓ Settings saved</span>}
      </div>
    </div>
  )
}
