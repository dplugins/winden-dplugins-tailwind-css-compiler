import React from "react";
import { Input } from "@el/Input";
import { Button } from "@el/Button";
import { ReactComponent as DeleteOutlineOutlinedIcon } from "@/assets/icons/DeleteOutlineOutlinedIcon.svg";

interface ListItem {
  id?: number;
  name: string;
  value: string | string[];
}

interface ListWithButtonProps {
  /** Array of items to display */
  items: ListItem[];
  /** Callback when item name changes */
  onNameChange: (index: number, value: string) => void;
  /** Callback when item value changes */
  onValueChange: (index: number, value: string) => void;
  /** Callback when item is deleted */
  onDelete: (index: number) => void;
  /** Callback to add new item */
  onAddNew: () => void;
  /** Label for name field */
  label1: string;
  /** Label for value field */
  label2: string;
  /** Label for add button */
  labelButton: string;
}

/**
 * Reusable list component with name/value inputs and add button
 */
const ListWithButton: React.FC<ListWithButtonProps> = ({
  items,
  onNameChange,
  onValueChange,
  onDelete,
  onAddNew,
  label1,
  label2,
  labelButton,
}) => {
  return (
    <div className="flex flex-col items-start gap-8">
      {items.length > 0 && (
        <div className="flex w-full flex-col items-stretch gap-12">
          {items.map((item, index) => (
            <div key={item.id || index} className="flex w-full items-end gap-8">
              <Input
                label={label1}
                type="text"
                value={item.name}
                onChange={(e) => onNameChange(index, e.target.value)}
              />
              <Input
                label={label2}
                type="text"
                value={Array.isArray(item.value) ? item.value.join(', ') : item.value}
                onChange={(e) => onValueChange(index, e.target.value)}
              />
              <Button
                onClick={() => onDelete(index)}
                variant="outline"
                className="!text-danger px-3 h-full"
                size="lg"
              >
                <DeleteOutlineOutlinedIcon />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button size="lg" onClick={onAddNew} variant="default" className="w-full">
        + Add New {labelButton}
      </Button>
    </div>
  );
};

export default ListWithButton;
