import { Select } from '@/components/atoms/Select';
import { SearchInput } from '@/components/molecules/SearchInput';
import { FilterButtonGroup } from '@/components/molecules/FilterButtonGroup';
import { Headphones, BookOpen, Layers } from 'lucide-react';

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

  const skillOptions = [
    { value: 'ALL' as const, label: 'Tất cả kỹ năng', icon: Layers },
    { value: 'LISTENING' as const, label: 'Listening (Part 1 - 4)', icon: Headphones },
    { value: 'READING' as const, label: 'Reading (Part 5 - 7)', icon: BookOpen },
  ];

  const tierOptions = [
    { value: 'ALL' as const, label: 'Tất cả gói' },
    { value: 'FREE' as const, label: 'Miễn phí' },
    { value: 'PRO' as const, label: 'Hội viên PRO' },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      {/* Skill Tabs Shortcut using FilterButtonGroup */}
      {onSkillChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kỹ năng:</span>
          <FilterButtonGroup
            options={skillOptions}
            selectedValue={selectedSkill}
            onChange={onSkillChange}
          />
        </div>
      )}

      {/* Main Filter Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input molecule */}
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Tìm kiếm theo tiêu đề đề thi hoặc Part..."
            className="rounded-xl"
          />
        </div>

        {/* Part selector atom */}
        <div className="w-full md:w-64">
          <Select
            value={selectedPart}
            onChange={(e) => onPartChange(Number(e.target.value))}
            className="rounded-xl"
            options={parts}
          />
        </div>

        {/* Tier filter buttons */}
        <FilterButtonGroup
          options={tierOptions}
          selectedValue={selectedTier}
          onChange={onTierChange}
        />
      </div>
    </div>
  );
}
