'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { formatShare } from '@/lib/share'
import {
  AdminPage,
  AdminSection,
  AdminMetric,
  AdminMetricGrid,
  AdminCard,
  AdminSplit,
} from '@/components/ui/AdminPage'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

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
  pending: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-200',
  approved: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-200',
  reimbursed: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-200',
  rejected: 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-200',
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
  const [categoryOptions, setCategoryOptions] = useState<string[]>(() => [...DEFAULT_CATEGORIES])
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
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/properties')
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }
      const data: Property[] = await response.json()
      setProperties(data)

      if (data.length > 0) {
        setSelectedPropertyId(current => {
          if (current && data.some(property => property.id === current)) {
            return current
          }
          return data[0].id
        })
        setActiveOwnershipId(current => {
          if (current && data.some(property => property.ownerships.some(ownership => ownership.id === current))) {
            return current
          }
          return data[0].ownerships[0]?.id ?? null
        })
      } else {
        setSelectedPropertyId(null)
        setActiveOwnershipId(null)
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
    setError(null)
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
        setCategoryOptions((prev) => {
          const next = new Set<string>([...DEFAULT_CATEGORIES, ...prev])
          categoriesFromData.forEach((category) => next.add(category))
          return Array.from(next)
        })
        setExpenses(normalized)
      } else {
        setExpenses([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load expenses')
      setExpenses([])
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

  

const pendingExpensesForSelectedProperty = useMemo(
  () => expenses.filter((expense) => expense.status === 'pending'),
  [expenses],
)
const outstandingAmountCents = useMemo(
  () => pendingExpensesForSelectedProperty.reduce((sum, expense) => sum + expense.amountCents, 0),
  [pendingExpensesForSelectedProperty],
)
const reimbursedCount = useMemo(
  () => expenses.filter((expense) => expense.status === 'reimbursed').length,
  [expenses],
)
const approvedCount = useMemo(
  () => expenses.filter((expense) => expense.status === 'approved').length,
  [expenses],
)

if (loading) {
  return (
    <AdminPage
      title="Shared expenses"
      description="Capture invoices, route approvals, and keep every owner’s share clear in one place."
      >
      <div className="rounded-3xl border border-border/60 bg-surface p-6 text-sm text-muted-foreground shadow-soft">
        Loading…
      </div>
    </AdminPage>
  )
}

return (
  <AdminPage
    title="Shared expenses"
    description="Capture invoices, route approvals, and keep every owner’s share clear in one place."
  >
    <AdminMetricGrid className="md:grid-cols-2 xl:grid-cols-4">
      <AdminMetric label="Properties" value={properties.length} />
      <AdminMetric label="Expenses logged" value={expenses.length} />
      <AdminMetric label="Pending approvals" value={pendingExpensesForSelectedProperty.length} />
      <AdminMetric
        label="Outstanding amount"
        value={formatMoney(outstandingAmountCents)}
        description={
          reimbursedCount ? `${reimbursedCount} reimbursed · ${approvedCount} approved` : undefined
        }
      />
    </AdminMetricGrid>

    {error ? (
      <AdminSection subdued>
        <p className="text-sm text-destructive">{error}</p>
      </AdminSection>
    ) : null}

    <AdminSection
      title="Select property"
      description="Pick the cottage and owner identity you’re logging expenses for."
    >
      <div className="space-y-6">
        <Select
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
        >
          <option value="">Choose a property…</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name} ({property.location ?? 'location TBD'})
            </option>
          ))}
        </Select>

        {selectedProperty ? (
          <AdminCard title="Ownership split">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {selectedProperty.ownerships.map((ownership) => (
                <li
                  key={ownership.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background px-3 py-2"
                >
                  <span className="font-medium text-foreground">
                    {ownership.owner.firstName} {ownership.owner.lastName ?? ''}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Share {formatShare(ownership.shareBps)} · Power {ownership.votingPower}
                  </span>
                </li>
              ))}
            </ul>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              You are logging this as
            </label>
            <Select
              value={activeOwnershipId ?? ''}
              onChange={(event) => setActiveOwnershipId(event.target.value ? Number(event.target.value) : null)}
              className="mt-2"
            >
              <option value="">Choose an owner…</option>
              {selectedProperty.ownerships.map((ownership) => (
                <option key={ownership.id} value={ownership.id}>
                  {ownership.owner.firstName} {ownership.owner.lastName ?? ''} ({ownership.role.toLowerCase()})
                </option>
              ))}
            </Select>
          </AdminCard>
        ) : null}
      </div>
    </AdminSection>

    {selectedProperty && ownerBalances.length > 0 && expenses.length > 0 ? (
      <AdminSection
        title="Running balances"
        description="Positive balances mean the group owes that owner money. Negative balances mean they owe the pool."
      >
        <ul className="space-y-3 text-sm text-muted-foreground">
          {ownerBalances.map(({ ownership, paidCents, owedCents, netCents }) => (
            <li key={ownership.id} className="rounded-xl border border-border/40 bg-background px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {ownership.owner.firstName} {ownership.owner.lastName ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Share {formatShare(ownership.shareBps)} · Paid {formatMoney(paidCents)} · Owes {formatMoney(owedCents)}
                  </p>
                </div>
                <span
                  className={`inline-flex min-w-[6rem] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                    netCents > 0
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : netCents < 0
                      ? 'bg-rose-500/10 text-rose-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Net {formatMoney(netCents)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </AdminSection>
    ) : null}

    {selectedPropertyId ? (
      <AdminSection>
        <div ref={formSectionRef}>
          <AdminSplit
            className="items-start gap-6"
            primary={
              <AdminCard
                title={isEditing ? 'Edit expense' : 'Log a shared expense'}
                description="Owners will see this immediately and can approve or reject it."
              >
            {validationErrors.length > 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <h3 className="text-sm font-semibold uppercase tracking-wide">Fix these details</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {validationErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-foreground">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Vendor
                      </span>
                      <Input
                        value={formData.vendorName}
                        onChange={(e) => handleFormChange('vendorName', e.target.value)}
                        placeholder="Simcoe Plumbing, Home Depot…"
                        autoComplete="organization"
                      />
                </label>
                    <label className="block text-sm text-foreground">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Category
                      </span>
                      <Select
                        value={formData.category}
                        onChange={(e) => handleFormChange('category', e.target.value)}
                      >
                        <option value="">Select a category…</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </Select>
                </label>
              </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block text-sm text-foreground">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Amount
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => handleFormChange('amount', e.target.value)}
                        placeholder="0.00"
                        min="0"
                      />
                </label>
                    <label className="block text-sm text-foreground">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Incurred on
                      </span>
                      <Input
                        type="date"
                        value={formData.incurredOn}
                        onChange={(e) => handleFormChange('incurredOn', e.target.value)}
                        required
                      />
                </label>
                    <label className="block text-sm text-foreground">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Due date
                      </span>
                      <Input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => handleFormChange('dueDate', e.target.value)}
                      />
                </label>
              </div>

                  <label className="block text-sm text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </span>
                    <Textarea
                      value={formData.memo}
                      onChange={(e) => handleFormChange('memo', e.target.value)}
                      rows={3}
                      placeholder="What was this for? Any special context the family should know?"
                    />
              </label>

                  <label className="block text-sm text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Paid by (optional)
                    </span>
                    <Select
                      value={formData.paidByOwnershipId}
                      onChange={(event) => handleFormChange('paidByOwnershipId', event.target.value)}
                    >
                      <option value="">Not recorded yet</option>
                      {selectedProperty?.ownerships.map((ownership) => (
                        <option key={ownership.id} value={ownership.id}>
                          {ownership.owner.firstName} {ownership.owner.lastName ?? ''} ({formatShare(ownership.shareBps)})
                        </option>
                      ))}
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select who actually paid the bill to track running balances.
                    </p>
                  </label>

              <div className="space-y-3 rounded-xl border border-border/50 bg-background px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receipts & proof</p>
                    <p className="text-xs text-muted-foreground">Snap a photo or upload a document. You can still paste a link below.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={triggerPhotoCapture}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:bg-muted-foreground/40"
                      disabled={uploadingReceipt}
                    >
                      {uploadingReceipt ? 'Uploading…' : 'Take photo'}
                    </button>
                    <button
                      type="button"
                      onClick={triggerDocumentPicker}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent disabled:border-border/30 disabled:text-muted-foreground"
                      disabled={uploadingReceipt}
                    >
                      Upload document
                    </button>
                  </div>
                </div>

                {hasReceiptAttachment ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{receiptDisplayName}</p>
                      <a
                        href={receiptHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-accent hover:text-accent-strong"
                      >
                        View file ↗
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={clearReceiptAttachment}
                      className="self-start rounded-lg border border-destructive/30 px-3 py-1 text-xs font-semibold text-destructive transition hover:border-destructive hover:text-destructive sm:self-center"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}

                  <label className="block text-sm text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Paste a link instead
                    </span>
                    <Input
                      type="url"
                      value={formData.receiptUrl}
                      onChange={(e) => handleFormChange('receiptUrl', e.target.value)}
                      placeholder="https://drive.google.com/... (optional)"
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
                      className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:bg-muted-foreground/40 sm:flex-1"
                    >
                      {submitting
                        ? isEditing
                          ? 'Saving changes…'
                          : 'Submitting expense…'
                        : isEditing
                        ? 'Save changes'
                        : 'Submit for approval'}
                    </button>
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={resetFormState}
                        disabled={submitting}
                        className="w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:border-border/30 disabled:text-muted-foreground sm:w-auto"
                      >
                        Cancel editing
                      </button>
                    ) : null}
                  </div>
                </form>
              </AdminCard>
            }
            secondary={
              <AdminCard
                title="Recent expenses"
                description="Everyone sees the same ledger. Voting closes the loop and locks in settlements."
              >
            {expenses.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-background px-4 py-6 text-sm text-muted-foreground">
                No expenses logged yet. Add one on the left to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => {
                  const statusStyle =
                    statusStyles[expense.status] ?? 'border-border/40 bg-background-muted text-foreground'
                  const activeOwnership = selectedProperty?.ownerships.find((o) => o.id === activeOwnershipId)
                  const isEditingThisExpense = editingExpense?.id === expense.id
                  const cardBorderClass = isEditingThisExpense
                    ? 'border-accent/60 ring-1 ring-accent/20'
                    : 'border-border/50'

                  return (
                    <div
                      key={expense.id}
                      className={`space-y-4 rounded-2xl border bg-background px-5 py-5 shadow-inner shadow-black/10 transition hover:border-accent/25 ${cardBorderClass}`}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-foreground">
                              {expense.vendorName || expense.category || 'Expense'}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusStyle}`}>
                              {expense.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {expense.category ? `${expense.category} · ` : ''}
                            {formatDisplayDate(expense.incurredOn)}
                            {expense.dueDate ? <> · Due {formatDisplayDate(expense.dueDate)}</> : null}
                          </p>
                          {expense.memo ? (
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{expense.memo}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                          <div className="text-right text-base font-semibold text-foreground">
                            {expense.amountFormatted}
                          </div>
                          <div className="flex flex-col text-xs text-muted-foreground">
                            {expense.createdBy ? (
                              <span>
                                Created by {expense.createdBy.owner.firstName} {expense.createdBy.owner.lastName ?? ''}
                              </span>
                            ) : null}
                            {expense.paidBy ? (
                              <span>
                                Paid by {expense.paidBy.owner.firstName} {expense.paidBy.owner.lastName ?? ''}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap justify-end gap-2 text-xs">
                            {expense.receiptUrl ? (
                              <a
                                href={expense.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-border/40 px-3 py-1 font-semibold text-foreground transition hover:border-accent hover:text-accent"
                              >
                                View receipt
                              </a>
                            ) : null}
                            {isEditingThisExpense ? (
                              <button
                                type="button"
                                onClick={resetFormState}
                                className="rounded-full border border-border/40 px-3 py-1 font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive"
                              >
                                Cancel edit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => beginEditingExpense(expense)}
                                className="rounded-full border border-border/40 px-3 py-1 font-semibold text-muted-foreground transition hover:border-accent hover:text-accent"
                              >
                                Edit expense
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 border-t border-border/40 pt-4 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approvals</p>
                          <ul className="mt-2 space-y-1 text-xs">
                            {expense.approvals.length === 0 ? (
                              <li className="text-muted-foreground/80">No approvals yet.</li>
                            ) : (
                              expense.approvals.map((approval) => (
                                <li key={approval.id} className="flex items-center justify-between">
                                  <span>
                                    {approval.owner.firstName} {approval.owner.lastName ?? ''}
                                  </span>
                                  <span className="font-medium capitalize">{approval.choice}</span>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allocations</p>
                          <ul className="mt-2 space-y-1 text-xs">
                            {expense.allocations.map((allocation) => (
                              <li key={allocation.id} className="flex items-center justify-between">
                                <span>
                                  {allocation.owner.firstName} {allocation.owner.lastName ?? ''}
                                </span>
                                <span className="font-medium">{allocation.amountFormatted}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {expense.status === 'pending' && activeOwnership ? (
                        <div className="rounded-xl border border-border/50 bg-background px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cast your vote</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            You&apos;re logged in as {activeOwnership.owner.firstName}. Only owners can approve or reject expenses.
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:bg-muted-foreground/40"
                              onClick={() => handleVote(expense.id, 'approve')}
                              disabled={voteSubmitting || !activeOwnershipId}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-400 disabled:bg-muted-foreground/40"
                              onClick={() => handleVote(expense.id, 'reject')}
                              disabled={voteSubmitting || !activeOwnershipId}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-border/50 bg-background px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-accent disabled:border-border/30 disabled:text-muted-foreground"
                              onClick={() => handleVote(expense.id, 'abstain')}
                              disabled={voteSubmitting || !activeOwnershipId}
                            >
                              Abstain
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
              </AdminCard>
            }
          />
        </div>
      </AdminSection>
    ) : null}
  </AdminPage>
);
}
