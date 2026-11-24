import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface QuizFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPart: number;
  onPartChange: (part: number) => void;
  selectedTier: 'ALL' | 'FREE' | 'PRO';
  onTierChange: (tier: 'ALL' | 'FREE' | 'PRO') => void;
}

export function QuizFilters({
  searchQuery,
  onSearchChange,
  selectedPart,
  onPartChange,
  selectedTier,
  onTierChange,
}: QuizFiltersProps) {
  const parts = [
    { value: 0, label: 'Tất cả Part' },
    { value: 1, label: 'Part 1: Photographs' },
    { value: 2, label: 'Part 2: Question-Response' },
    { value: 3, label: 'Part 3: Conversations' },
    { value: 4, label: 'Part 4: Short Talks' },
    { value: 5, label: 'Part 5: Incomplete Sentences' },
    { value: 6, label: 'Part 6: Text Completion' },
    { value: 7, label: 'Part 7: Reading Comprehension' },
  ];

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề đề thi..."
            className="pl-9 h-10 text-sm"
          />
        </div>

        {/* Part selector */}
        <div className="w-full md:w-64">
          <select
            value={selectedPart}
            onChange={(e) => onPartChange(Number(e.target.value))}
            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer"
          >
            {parts.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tier filter buttons */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
          {(['ALL', 'FREE', 'PRO'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onTierChange(tier)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedTier === tier
                  ? 'bg-white text-primary shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tier === 'ALL' ? 'Tất cả gói' : tier === 'FREE' ? 'Miễn phí' : 'PRO'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
