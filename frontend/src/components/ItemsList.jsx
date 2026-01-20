import React, { useMemo } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import ItemRow from "./ItemRow";

export default function ItemsList({ items, setItems, onPersistOrder, onPatchItem, onDeleteItem }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const ids = useMemo(() => items.map((it) => String(it.id)), [items]);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const oldIndex = ids.indexOf(activeId);
    const newIndex = ids.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newList = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      sort_order: idx + 1,
    }));

    setItems(newList);
    onPersistOrder?.(newList);
  }

  return (
    <div className="stack">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              id={String(item.id)}
              item={item}
              onPatchItem={onPatchItem}
              onDelete={onDeleteItem}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
