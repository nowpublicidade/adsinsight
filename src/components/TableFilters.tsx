import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface TableFiltersProps {
  nameFilter: string;
  onNameFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  namePlaceholder?: string;
  /** Status options — defaults to Meta ("ACTIVE"/"PAUSED") */
  statusOptions?: { value: string; label: string }[];
}

const defaultStatusOptions = [
  { value: "all", label: "Todos" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "PAUSED", label: "Pausado" },
];

export default function TableFilters({
  nameFilter,
  onNameFilterChange,
  statusFilter,
  onStatusFilterChange,
  namePlaceholder = "Buscar por nome…",
  statusOptions = defaultStatusOptions,
}: TableFiltersProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={nameFilter}
          onChange={(e) => onNameFilterChange(e.target.value)}
          placeholder={namePlaceholder}
          className="pl-8 h-8 text-xs"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Case-insensitive substring match */
export function matchesName(name: string | undefined, filter: string): boolean {
  if (!filter) return true;
  if (!name) return false;
  return name.toLowerCase().includes(filter.toLowerCase());
}

/** Status match — "all" matches everything */
export function matchesStatus(status: string | undefined, filter: string): boolean {
  if (filter === "all") return true;
  return status === filter;
}
