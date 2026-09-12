"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { STAGES, type StageId } from "@/server/pipeline/stages";
import { moveLeadToStage } from "@/server/pipeline/actions";
import type { Lead } from "@/server/leads/types";

const money = (n: number | null) =>
  (n ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export function PipelineBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    const map = new Map<StageId, Lead[]>();
    for (const s of STAGES) map.set(s.id, []);
    for (const l of leads) map.get(l.stage as StageId)?.push(l);
    return map;
  }, [leads]);

  const activeLead = leads.find((l) => l.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = String(active.id);
    const targetStage = String(over.id) as StageId;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;

    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l)));
    startTransition(() => {
      moveLeadToStage(leadId, targetStage, Date.now());
    });
  }

  return (
    <DndContext
      id="pipeline-board"
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {STAGES.map((stage) => {
          const items = columns.get(stage.id) ?? [];
          const total = items.reduce((s, l) => s + (l.deal_value ?? 0), 0);
          return (
            <Column
              key={stage.id}
              id={stage.id}
              label={stage.label}
              accent={stage.accent}
              count={items.length}
              total={money(total)}
            >
              {items.map((lead) => (
                <Card key={lead.id} lead={lead} />
              ))}
            </Column>
          );
        })}
      </div>

      <DragOverlay>{activeLead ? <CardBody lead={activeLead} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({
  id,
  label,
  accent,
  count,
  total,
  children,
}: {
  id: string;
  label: string;
  accent: string;
  count: number;
  total: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-slate-400">{count}</span>
        <span className="ml-auto text-xs tabular-nums text-slate-400">{total}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-xl border p-2 transition ${
          isOver ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-slate-100/40"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Card({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-40" : ""}>
      <CardBody lead={lead} />
    </div>
  );
}

function CardBody({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm ${
        dragging ? "rotate-2 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{lead.business_name}</span>
        <Link
          href={`/leads/${lead.id}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 text-xs text-slate-400 underline hover:text-slate-900"
        >
          open
        </Link>
      </div>
      {lead.category && <div className="mt-0.5 text-xs text-slate-500">{lead.category}</div>}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{money(lead.deal_value)}</span>
        {lead.has_website === false && (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 font-medium text-rose-700">
            no website
          </span>
        )}
        {lead.website_quality === "outdated" && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
            outdated
          </span>
        )}
      </div>
    </div>
  );
}
