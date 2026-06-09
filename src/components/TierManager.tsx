import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TicketTier } from "../types";

export interface TierDraft {
  name: string;
  description: string;
  price: number;       // in paisa
  slots: number;
  max_quantity: string; // empty string = unlimited
}

const EMPTY_TIER: TierDraft = {
  name: "",
  description: "",
  price: 0,
  slots: 1,
  max_quantity: "",
};

interface Props {
  tiers: TierDraft[];
  onChange: (tiers: TierDraft[]) => void;
  // If editing an existing event with saved tiers, show them as base
  savedTiers?: TicketTier[];
}

const SLOT_OPTIONS = [
  { value: 1, label: "Single (1 person)" },
  { value: 2, label: "Couple (2 people)" },
  { value: 3, label: "Trio (3 people)" },
  { value: 4, label: "Group of 4" },
  { value: 5, label: "Group of 5" },
  { value: 6, label: "Group of 6" },
  { value: 8, label: "Group of 8" },
  { value: 10, label: "Group of 10" },
];

export default function TierManager({ tiers, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(tiers.length === 0 ? null : 0);

  function addTier() {
    const next = [...tiers, { ...EMPTY_TIER }];
    onChange(next);
    setExpanded(next.length - 1);
  }

  function removeTier(index: number) {
    const next = tiers.filter((_, i) => i !== index);
    onChange(next);
    setExpanded(next.length > 0 ? Math.min(index, next.length - 1) : null);
  }

  function updateTier(index: number, patch: Partial<TierDraft>) {
    const next = tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-panel rounded-xl overflow-hidden"
          >
            {/* Header row */}
            <button
              type="button"
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left tap-active"
            >
              <span className="font-medium text-sm truncate">
                {tier.name || `Tier ${i + 1}`}
                {tier.price > 0 && (
                  <span className="ml-2 text-purple-400 text-xs">
                    ₹{(tier.price / 100).toFixed(0)}
                  </span>
                )}
                {tier.price === 0 && tier.name && (
                  <span className="ml-2 text-green-400 text-xs">Free</span>
                )}
                {tier.slots > 1 && (
                  <span className="ml-2 text-blue-400 text-xs">{tier.slots} slots</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTier(i); }}
                  className="text-red-400 hover:text-red-300 p-1 tap-active"
                  title="Remove tier"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${expanded === i ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded fields */}
            <AnimatePresence>
              {expanded === i && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                    {/* Name */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Tier name *</label>
                      <input
                        type="text"
                        className="input-luxe w-full"
                        placeholder="e.g. Stag, Couple, Ladies, VIP..."
                        value={tier.name}
                        maxLength={100}
                        onChange={(e) => updateTier(i, { name: e.target.value })}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Description (optional)</label>
                      <input
                        type="text"
                        className="input-luxe w-full"
                        placeholder="Brief detail about this entry type..."
                        value={tier.description}
                        maxLength={300}
                        onChange={(e) => updateTier(i, { description: e.target.value })}
                      />
                    </div>

                    {/* Price & Slots */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Price (₹)</label>
                        <input
                          type="number"
                          className="input-luxe w-full"
                          placeholder="0 = free"
                          min={0}
                          step={1}
                          value={tier.price === 0 ? "" : tier.price / 100}
                          onChange={(e) => {
                            const rupees = parseFloat(e.target.value) || 0;
                            updateTier(i, { price: Math.round(rupees * 100) });
                          }}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Entry type</label>
                        <select
                          className="input-luxe w-full"
                          value={tier.slots}
                          onChange={(e) => updateTier(i, { slots: Number(e.target.value) })}
                        >
                          {SLOT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Max quantity */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Max tickets available (leave blank for unlimited)
                      </label>
                      <input
                        type="number"
                        className="input-luxe w-full"
                        placeholder="Unlimited"
                        min={1}
                        step={1}
                        value={tier.max_quantity}
                        onChange={(e) => updateTier(i, { max_quantity: e.target.value })}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        type="button"
        onClick={addTier}
        className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/50 text-purple-400 text-sm font-medium hover:bg-purple-500/10 transition-colors tap-active"
      >
        + Add Entry Type
      </button>

      {tiers.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          You can add Free tiers too (e.g. Ladies Night, Guest List)
        </p>
      )}
    </div>
  );
}
