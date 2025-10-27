'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { formatShare } from '@/lib/share'

interface OwnerSummary {
  id: number
  firstName: string
  lastName?: string | null
  email: string
}

interface OwnershipSummary {
  id: number
  role: string
  shareBps: number
  votingPower: number
  owner: OwnerSummary
}

interface Property {
  id: number
  name: string
  slug: string
  location: string | null
  ownerships: OwnershipSummary[]
}

type ExpenseStatus = 'pending' | 'approved' | 'reimbursed' | 'rejected'

type ExpenseApprovalChoice = 'approve' | 'reject' | 'abstain'

interface ExpenseApproval {
  id: number
  choice: ExpenseApprovalChoice
  rationale: string | null
  createdAt: string
  ownershipId: number
  owner: OwnerSummary
}

interface ExpenseAllocation {
  id: number
  amountCents: number
  amountFormatted: string
  ownershipId: number
  owner: OwnerSummary
}

interface Expense {
  id: number
  propertyId: number
  createdByOwnershipId: number | null
  createdBy: {
    ownershipId: number
    owner: OwnerSummary
  } | null
  paidByOwnershipId: number | null
  paidBy: {
    ownershipId: number
    owner: OwnerSummary
  } | null
  vendorName: string | null
  category: string | null
  memo: string | null
  amountCents: number
  amountFormatted: string
  incurredOn: string
  dueDate: string | null
  status: ExpenseStatus
  decisionSummary: string | null
  receiptUrl: string | null
  createdAt: string
  approvals: ExpenseApproval[]
  allocations: ExpenseAllocation[]
}

const statusStyles: Record<ExpenseStatus, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  reimbursed: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  rejected: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
}

const DEFAULT_CATEGORIES = [
  'Repairs',
  'Utilities',
  'Taxes',
  'Supplies',
  'Insurance',
  'Maintenance',
  'Cleaning',
  'Services',
  'Other',
] as const

export default function ExpensesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([...DEFAULT_CATEGORIES])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [voteSubmitting, setVoteSubmitting] = useState(false)
  const [activeOwnershipId, setActiveOwnershipId] = useState<number | null>(null)
  const todayIso = () => new Date().toISOString().split('T')[0]

  const formatDisplayDate = (iso: string) => {
    const parsed = new Date(`${iso}T00:00:00`)
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100)

  const createInitialFormState = () => ({
    vendorName: '',
    category: '',
    amount: '',
    incurredOn: todayIso(),
    dueDate: '',
    memo: '',
    receiptUrl: '',
    paidByOwnershipId: '',
  })

  const [formData, setFormData] = useState(createInitialFormState)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null)
  const [uploadedReceiptName, setUploadedReceiptName] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const documentInputRef = useRef<HTMLInputElement | null>(null)
  const formSectionRef = useRef<HTMLDivElement | null>(null)
  const previousActiveOwnershipIdRef = useRef<number | null>(null)

  const fetchProperties = useCallback(async () => {
    try {
      const response = await fetch('/api/properties')
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }
      const data: Property[] = await response.json()
      setProperties(data)

      if (data.length > 0) {
        setSelectedPropertyId(prev => prev ?? data[0].id)
        setActiveOwnershipId(prev => prev ?? (data[0].ownerships[0]?.id ?? null))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const fetchExpenses = useCallback(async (propertyId: number) => {
    try {
      const response = await fetch(`/api/expenses?propertyId=${propertyId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }
      const data = await response.json()
      if (Array.isArray(data.expenses)) {
        const sorted = [...data.expenses].sort((a, b) => {
          const aDate = new Date(`${a.incurredOn}T00:00:00`).getTime()
          const bDate = new Date(`${b.incurredOn}T00:00:00`).getTime()
          if (bDate !== aDate) return bDate - aDate
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        const normalized = sorted.map((expense) => ({
          ...expense,
          dueDate: expense.dueDate ?? null,
        }))
        const categoriesFromData = Array.from(
          new Set(
            normalized
              .map((expense) => expense.category)
              .filter((category): category is string => Boolean(category) && category.trim().length > 0),
          ),
        )
        if (categoriesFromData.length > 0) {
          setCategoryOptions((prev) => Array.from(new Set([...prev, ...categoriesFromData])))
        }
        setExpenses(normalized)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load expenses')
    }
  }, [])

  useEffect(() => {
    if (selectedPropertyId) {
      fetchExpenses(selectedPropertyId)
    }
  }, [selectedPropertyId, fetchExpenses])

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)
  const isEditing = Boolean(editingExpense)

  const resetFormState = () => {
    setFormData(createInitialFormState())
    setUploadedReceiptUrl(null)
    setUploadedReceiptName(null)
    setEditingExpense(null)
    setValidationErrors([])
    if (previousActiveOwnershipIdRef.current !== null) {
      setActiveOwnershipId(previousActiveOwnershipIdRef.current)
      previousActiveOwnershipIdRef.current = null
    }
  }

  const beginEditingExpense = (expense: Expense) => {
    setError(null)
    setValidationErrors([])

    const isUploaded = Boolean(expense.receiptUrl && expense.receiptUrl.startsWith('/uploads/expenses/'))
    if (expense.category && !categoryOptions.includes(expense.category)) {
      setCategoryOptions((prev) => Array.from(new Set([...prev, expense.category!])))
    }
    setFormData({
      vendorName: expense.vendorName ?? '',
      category: expense.category ?? '',
      amount: (expense.amountCents / 100).toFixed(2),
      incurredOn: expense.incurredOn,
      dueDate: expense.dueDate ?? '',
      memo: expense.memo ?? '',
      receiptUrl: isUploaded ? '' : expense.receiptUrl ?? '',
      paidByOwnershipId: expense.paidByOwnershipId ? String(expense.paidByOwnershipId) : '',
    })

    if (isUploaded) {
      setUploadedReceiptUrl(expense.receiptUrl)
      const guessedName = expense.receiptUrl?.split('/').pop()
      setUploadedReceiptName(guessedName && guessedName.length > 0 ? guessedName : 'Uploaded receipt')
    } else {
      setUploadedReceiptUrl(null)
      setUploadedReceiptName(null)
    }

    if (expense.createdByOwnershipId) {
      if (previousActiveOwnershipIdRef.current === null) {
        previousActiveOwnershipIdRef.current = activeOwnershipId
      }
      setActiveOwnershipId(expense.createdByOwnershipId)
    }

    setEditingExpense(expense)
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleReceiptUpload = async (file?: File | null) => {
    if (!file) return

    setError(null)
    setUploadingReceipt(true)

    try {
      const body = new FormData()
      body.append('file', file)

      const response = await fetch('/api/expenses/upload', {
        method: 'POST',
        body,
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload || typeof payload.url !== 'string') {
        const message = payload?.error ?? 'Failed to upload file'
        throw new Error(message)
      }

      setUploadedReceiptUrl(payload.url)
      setUploadedReceiptName(payload.originalName || file.name)
      setFormData(prev => (prev.receiptUrl ? { ...prev, receiptUrl: '' } : prev))
      if (validationErrors.length > 0) {
        setValidationErrors([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload file')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const clearReceiptAttachment = () => {
    setFormData(prev => ({ ...prev, receiptUrl: '' }))
    setUploadedReceiptUrl(null)
    setUploadedReceiptName(null)
  }

  const triggerPhotoCapture = () => {
    photoInputRef.current?.click()
  }

  const triggerDocumentPicker = () => {
    documentInputRef.current?.click()
  }

  const manualReceiptUrl = formData.receiptUrl.trim()
  const receiptHref = uploadedReceiptUrl ?? manualReceiptUrl
  const hasReceiptAttachment = Boolean(receiptHref)
  const receiptIsUploaded = Boolean(uploadedReceiptUrl)
  const receiptDisplayName = receiptIsUploaded
    ? uploadedReceiptName ?? 'Uploaded receipt'
    : manualReceiptUrl
    ? manualReceiptUrl.replace(/^https?:\/\//, '')
    : ''

  const ownerBalances = useMemo(() => {
    if (!selectedProperty) {
      return [] as Array<{
        ownership: OwnershipSummary
        paidCents: number
        owedCents: number
        netCents: number
      }>;
    }

    const ledger = new Map<number, { ownership: OwnershipSummary; paidCents: number; owedCents: number }>()
    selectedProperty.ownerships.forEach((ownership) => {
      ledger.set(ownership.id, { ownership, paidCents: 0, owedCents: 0 })
    })

    const propertyExpenses = expenses.filter((expense) => expense.propertyId === selectedProperty.id)

    propertyExpenses.forEach((expense) => {
      if (expense.status === 'rejected') {
        return
      }

      expense.allocations.forEach((allocation) => {
        const entry = ledger.get(allocation.ownershipId)
        if (entry) {
          entry.owedCents += allocation.amountCents
        }
      })

      if (expense.paidByOwnershipId) {
        const entry = ledger.get(expense.paidByOwnershipId)
        if (entry) {
          entry.paidCents += expense.amountCents
        }
      }
    })

    return Array.from(ledger.values()).map(({ ownership, paidCents, owedCents }) => ({
      ownership,
      paidCents,
      owedCents,
      netCents: paidCents - owedCents,
    }))
  }, [expenses, selectedProperty])

  const validateForm = (createdById: number | null) => {
    const errors: string[] = []

    if (!selectedPropertyId) {
      errors.push('Select a property')
    }
    if (!createdById) {
      errors.push('Select which owner is submitting this expense')
    }
    if (!formData.amount.trim() || Number.isNaN(Number(formData.amount))) {
      errors.push('Enter a valid amount')
    }
    if (!formData.incurredOn) {
      errors.push('Choose the date the expense was incurred')
    }
    if (formData.dueDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dueDate)) {
        errors.push('Due date must be in YYYY-MM-DD format')
      } else if (formData.dueDate < formData.incurredOn) {
        errors.push('Due date cannot be before the incurred date')
      }
    }

    return errors
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'receiptUrl') {
      setUploadedReceiptUrl(null)
      setUploadedReceiptName(null)
    }
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const createdByOwnershipId = activeOwnershipId
    const propertyId = selectedPropertyId ?? editingExpense?.propertyId ?? null
    const errors = validateForm(createdByOwnershipId ?? null)
    setValidationErrors(errors)
    if (errors.length > 0) return

    if (!propertyId || !createdByOwnershipId) return

    const cents = Math.round(Number(formData.amount) * 100)
    if (Number.isNaN(cents) || cents <= 0) {
      setValidationErrors(['Amount must be greater than zero'])
      return
    }

    const paidByOwnershipId = formData.paidByOwnershipId
      ? Number(formData.paidByOwnershipId)
      : undefined

    setSubmitting(true)
    setError(null)

    try {
      const endpoint = '/api/expenses'
      const method = isEditing ? 'PATCH' : 'POST'
      const payload = {
        propertyId,
        createdByOwnershipId,
        vendorName: formData.vendorName || undefined,
        category: formData.category || undefined,
        memo: formData.memo || undefined,
      amountCents: cents,
      incurredOn: formData.incurredOn,
      dueDate: formData.dueDate || undefined,
      paidByOwnershipId,
      receiptUrl: receiptHref || undefined,
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEditing
            ? { ...payload, expenseId: editingExpense?.id }
            : payload
        ),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record expense')
      }

      const propertyToRefresh = propertyId
      resetFormState()

      if (propertyToRefresh) {
        await fetchExpenses(propertyToRefresh)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (expenseId: number, choice: ExpenseApprovalChoice) => {
    if (!activeOwnershipId) {
      setError('Select which owner you are before voting')
      return
    }
    setVoteSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/expense-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId,
          ownershipId: activeOwnershipId,
          choice,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record approval')
      }

      if (selectedPropertyId) {
        await fetchExpenses(selectedPropertyId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record approval')
    } finally {
      setVoteSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold tracking-tight">Shared Expenses</h1>
          <p className="mt-4 text-slate-300">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">Shared Expenses</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Capture invoices, route approvals, and keep every owner’s share clear in one place. Auth will lock this down later—right now it’s wide open for faster iteration.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20 backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">Select property</h2>
          <p className="mt-1 text-sm text-slate-400">Pick the cottage and owner identity you’re logging expenses for.</p>

          <select
            value={selectedPropertyId ?? ''}
            onChange={(event) => {
              const value = event.target.value ? Number(event.target.value) : null
              setSelectedPropertyId(value)
              if (value) {
                const property = properties.find((p) => p.id === value)
                setActiveOwnershipId(property?.ownerships[0]?.id ?? null)
              } else {
                setActiveOwnershipId(null)
              }
              setFormData((prev) => ({ ...prev, paidByOwnershipId: '' }))
            }}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Choose a property…</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} ({property.location ?? 'location TBD'})
              </option>
            ))}
          </select>

          {selectedProperty && (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Ownership split</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                {selectedProperty.ownerships.map((ownership) => (
                  <li
                    key={ownership.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                  >
                    <span className="font-medium text-slate-100">
                      {ownership.owner.firstName} {ownership.owner.lastName ?? ''}
                    </span>
                    <span className="text-xs text-slate-400">
                      Share {formatShare(ownership.shareBps)} · Power {ownership.votingPower}
                    </span>
                  </li>
                ))}
              </ul>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                You are logging this as
              </label>
              <select
                value={activeOwnershipId ?? ''}
                onChange={(event) => setActiveOwnershipId(event.target.value ? Number(event.target.value) : null)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Choose an owner…</option>
                {selectedProperty.ownerships.map((ownership) => (
                  <option key={ownership.id} value={ownership.id}>
                    {ownership.owner.firstName} {ownership.owner.lastName ?? ''} ({ownership.role.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {selectedProperty && ownerBalances.length > 0 && expenses.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">Running balances</h2>
            <p className="mt-1 text-sm text-slate-400">
              Positive balances mean the group owes that owner money. Negative balances mean they owe the pool.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {ownerBalances.map((entry) => {
                const { ownership, paidCents, owedCents, netCents } = entry
                const owesOthers = netCents < 0
                const badgeClass = owesOthers
                  ? 'bg-rose-500/10 text-rose-200 border border-rose-500/30'
                  : netCents > 0
                  ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'

                return (
                  <li
                    key={ownership.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-base font-medium text-slate-100">
                        {ownership.owner.firstName} {ownership.owner.lastName ?? ''}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Share {formatShare(ownership.shareBps)} · Paid {formatMoney(paidCents)} · Owes {formatMoney(owedCents)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                      {netCents === 0
                        ? 'Settled'
                        : owesOthers
                        ? `${formatMoney(Math.abs(netCents))} owed to others`
                        : `${formatMoney(netCents)} owed to them`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {selectedPropertyId && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div
              ref={formSectionRef}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20"
            >
              <h2 className="text-lg font-semibold tracking-tight text-slate-100">Log a shared expense</h2>
              <p className="mt-1 text-sm text-slate-400">Owners will see this immediately and can approve or reject it.</p>

              {validationErrors.length > 0 && (
                <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  <ul className="space-y-1">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isEditing && editingExpense && (
                <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  <p>
                    Editing “{editingExpense.vendorName || 'Untitled expense'}” from {formatDisplayDate(editingExpense.incurredOn)}
                    {editingExpense.dueDate ? ` · Due ${formatDisplayDate(editingExpense.dueDate)}` : ''}. Saving will reset
                    approvals for this expense.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor</span>
                    <input
                      type="text"
                      value={formData.vendorName}
                      onChange={(e) => handleFormChange('vendorName', e.target.value)}
                      placeholder="Simcoe Plumbing, Home Depot…"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Category</span>
                    <select
                      value={formData.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select category</option>
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Amount (CAD)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleFormChange('amount', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Incurred on</span>
                    <input
                      type="date"
                      value={formData.incurredOn}
                      onChange={(e) => handleFormChange('incurredOn', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Due date</span>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleFormChange('dueDate', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                </div>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</span>
                  <textarea
                    value={formData.memo}
                    onChange={(e) => handleFormChange('memo', e.target.value)}
                    rows={3}
                    placeholder="What was this for? Any special context the family should know?"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Paid by (optional)
                  </span>
                  <select
                    value={formData.paidByOwnershipId}
                    onChange={(event) => handleFormChange('paidByOwnershipId', event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Not recorded yet</option>
                    {selectedProperty?.ownerships.map((ownership) => (
                      <option key={ownership.id} value={ownership.id}>
                        {ownership.owner.firstName} {ownership.owner.lastName ?? ''} ({formatShare(ownership.shareBps)})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Select who actually paid the bill to track running balances.
                  </p>
                </label>

                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Receipts & proof</p>
                      <p className="text-xs text-slate-500">Snap a photo or upload a document. You can still paste a link below.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={triggerPhotoCapture}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:bg-slate-600"
                        disabled={uploadingReceipt}
                      >
                        {uploadingReceipt ? 'Uploading…' : 'Take photo'}
                      </button>
                      <button
                        type="button"
                        onClick={triggerDocumentPicker}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 disabled:border-slate-800 disabled:text-slate-500"
                        disabled={uploadingReceipt}
                      >
                        Upload document
                      </button>
                    </div>
                  </div>

                  {hasReceiptAttachment && (
                    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{receiptDisplayName}</p>
                        <a
                          href={receiptHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
                        >
                          View file ↗
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={clearReceiptAttachment}
                        className="self-start rounded-lg border border-rose-500/30 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:border-rose-400 hover:text-rose-100 sm:self-center"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <label className="block text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Paste a link instead</span>
                    <input
                      type="url"
                      value={formData.receiptUrl}
                      onChange={(e) => handleFormChange('receiptUrl', e.target.value)}
                      placeholder="https://drive.google.com/... (optional)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    void handleReceiptUpload(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                <input
                  ref={documentInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.heic,.heif,.webp"
                  className="hidden"
                  onChange={(event) => {
                    void handleReceiptUpload(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:bg-slate-600 sm:flex-1"
                  >
                    {submitting
                      ? isEditing
                        ? 'Saving changes…'
                        : 'Submitting expense…'
                      : isEditing
                      ? 'Save changes'
                      : 'Submit for approval'}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetFormState}
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-rose-400 hover:text-rose-100 disabled:border-slate-800 disabled:text-slate-500 sm:w-auto"
                    >
                      Cancel editing
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
              <h2 className="text-lg font-semibold tracking-tight text-slate-100">Recent expenses</h2>
              <p className="mt-1 text-sm text-slate-400">
                Everyone sees the same ledger. Voting closes the loop and locks in settlements.
              </p>

              {expenses.length === 0 ? (
                <p className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-sm text-slate-400">
                  No expenses logged yet. Add one on the left to get started.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {expenses.map((expense) => {
                    const statusClass = statusStyles[expense.status] ?? 'border-slate-700 bg-slate-900/60 text-slate-200'
                    const activeOwnership = selectedProperty?.ownerships.find((o) => o.id === activeOwnershipId)
                    const isEditingThisExpense = editingExpense?.id === expense.id
                    const cardBorderClass = isEditingThisExpense ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-slate-800'

                    return (
                      <div
                        key={expense.id}
                        className={`space-y-4 rounded-2xl border bg-slate-950/70 p-5 shadow-inner shadow-black/30 transition hover:border-emerald-500/30 ${cardBorderClass}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-100">
                              {expense.vendorName || 'Untitled expense'}
                            </h3>
                            <p className="text-sm text-slate-400">
                              {expense.category ? `${expense.category} · ` : ''}
                              {formatDisplayDate(expense.incurredOn)}
                              {expense.dueDate ? <> · Due {formatDisplayDate(expense.dueDate)}</> : null}
                            </p>
                            {expense.memo && (
                              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{expense.memo}</p>
                            )}
                            {expense.receiptUrl && (
                              <a
                                href={expense.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex text-xs font-medium text-emerald-300 hover:text-emerald-200"
                              >
                                View receipt ↗
                              </a>
                            )}
                          </div>
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <div className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold capitalize ${statusClass}`}>
                              {expense.status}
                            </div>
                            {isEditingThisExpense ? (
                              <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                                Editing
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => beginEditingExpense(expense)}
                                className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-200"
                                disabled={submitting}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 text-sm text-slate-300 md:grid-cols-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
                            <p className="text-lg font-semibold text-slate-100">{expense.amountFormatted}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Logged by</p>
                            <p>
                              {expense.createdBy ? (
                                <>
                                  {expense.createdBy.owner.firstName} {expense.createdBy.owner.lastName ?? ''}
                                </>
                              ) : (
                                '—'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Paid by</p>
                            <p>
                              {expense.paidBy ? (
                                <>
                                  {expense.paidBy.owner.firstName} {expense.paidBy.owner.lastName ?? ''}
                                </>
                              ) : (
                                'Not recorded'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Decision</p>
                            <p>{expense.decisionSummary ?? 'Waiting for votes'}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner shares</p>
                          <ul className="mt-2 space-y-2 text-sm text-slate-300">
                            {expense.allocations.map((allocation) => (
                              <li
                                key={allocation.id}
                                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                              >
                                <span>
                                  {allocation.owner.firstName} {allocation.owner.lastName ?? ''}
                                </span>
                                <span className="font-medium text-slate-100">{allocation.amountFormatted}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approval trail</p>
                          {expense.approvals.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-400">No votes yet.</p>
                          ) : (
                            <ul className="mt-3 space-y-1 text-sm text-slate-300">
                              {expense.approvals.map((approval) => (
                                <li key={approval.id}>
                                  <span className="font-medium text-slate-100">
                                    {approval.owner.firstName} {approval.owner.lastName ?? ''}
                                  </span>{' '}
                                  <span className="capitalize">{approval.choice}</span>
                                  {approval.rationale ? ` — ${approval.rationale}` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {expense.status === 'pending' && (
                          <div className="border-t border-slate-800 pt-4">
                            <p className="mb-2 text-sm text-slate-400">
                              {activeOwnership
                                ? `Voting as ${activeOwnership.owner.firstName} ${activeOwnership.owner.lastName ?? ''}`
                                : 'Select which owner you are to vote'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:bg-slate-600"
                                onClick={() => handleVote(expense.id, 'approve')}
                                disabled={voteSubmitting || !activeOwnershipId}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:bg-slate-600"
                                onClick={() => handleVote(expense.id, 'reject')}
                                disabled={voteSubmitting || !activeOwnershipId}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-500 disabled:border-slate-800 disabled:text-slate-500"
                                onClick={() => handleVote(expense.id, 'abstain')}
                                disabled={voteSubmitting || !activeOwnershipId}
                              >
                                Abstain
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
