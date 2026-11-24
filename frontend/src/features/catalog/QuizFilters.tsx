import { Input } from '@/components/ui/input';
import { Search, Headphones, BookOpen, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPart: number;
  onPartChange: (part: number) => void;
  selectedTier: 'ALL' | 'FREE' | 'PRO';
  onTierChange: (tier: 'ALL' | 'FREE' | 'PRO') => void;
  selectedSkill?: 'ALL' | 'LISTENING' | 'READING';
  onSkillChange?: (skill: 'ALL' | 'LISTENING' | 'READING') => void;
}

export function QuizFilters({
  searchQuery,
  onSearchChange,
  selectedPart,
  onPartChange,
  selectedTier,
  onTierChange,
  selectedSkill = 'ALL',
  onSkillChange,
}: QuizFiltersProps) {
  const parts = [
    { value: 0, label: 'Tất cả các Part (1 - 7)' },
    { value: 1, label: 'Part 1: Photographs (Listening)' },
    { value: 2, label: 'Part 2: Question-Response (Listening)' },
    { value: 3, label: 'Part 3: Conversations (Listening)' },
    { value: 4, label: 'Part 4: Short Talks (Listening)' },
    { value: 5, label: 'Part 5: Incomplete Sentences (Reading)' },
    { value: 6, label: 'Part 6: Text Completion (Reading)' },
    { value: 7, label: 'Part 7: Reading Comprehension (Reading)' },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      {/* Skill Tabs Shortcut */}
      {onSkillChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kỹ năng:</span>
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100/70">
            <button
              type="button"
              onClick={() => onSkillChange('ALL')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors',
                selectedSkill === 'ALL'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Layers className="h-3.5 w-3.5" /> Tất cả kỹ năng
            </button>
            <button
              type="button"
              onClick={() => onSkillChange('LISTENING')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors',
                selectedSkill === 'LISTENING'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Headphones className="h-3.5 w-3.5" /> Listening (Part 1 - 4)
            </button>
            <button
              type="button"
              onClick={() => onSkillChange('READING')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors',
                selectedSkill === 'READING'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <BookOpen className="h-3.5 w-3.5" /> Reading (Part 5 - 7)
            </button>
          </div>
        </div>
      )}

      {/* Main Filter Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề đề thi hoặc Part..."
            className="pl-9 h-10 text-xs sm:text-sm rounded-xl"
          />
        </div>

        {/* Part selector */}
        <div className="w-full md:w-64">
          <select
            value={selectedPart}
            onChange={(e) => onPartChange(Number(e.target.value))}
            className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer"
          >
            {parts.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tier filter buttons */}
        <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 shrink-0">
          {(['ALL', 'FREE', 'PRO'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onTierChange(tier)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors',
                selectedTier === tier
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tier === 'ALL' ? 'Tất cả gói' : tier === 'FREE' ? 'Miễn phí' : 'Hội viên PRO'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
