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
    { value: 'LISTENING' as const, label: 'Listening (Part 1–4)', icon: Headphones },
    { value: 'READING' as const, label: 'Reading (Part 5–7)', icon: BookOpen },
  ];

  const tierOptions = [
    { value: 'ALL' as const, label: 'Tất cả gói' },
    { value: 'FREE' as const, label: 'Miễn phí' },
    { value: 'PRO' as const, label: 'Hội viên PRO' },
  ];

  return (
    <div className="bg-surface p-4 sm:p-5 rounded-lg border-[1.5px] border-border shadow-brutal-sm space-y-4">
      {/* Skill Tabs Shortcut */}
      {onSkillChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/20">
          <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-wider">
            Nhóm kỹ năng
          </span>
          <FilterButtonGroup
            options={skillOptions}
            selectedValue={selectedSkill}
            onChange={onSkillChange}
          />
        </div>
      )}

      {/* Main Filter Row */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex-1 min-w-0">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Tìm kiếm theo tiêu đề đề thi hoặc Part..."
          />
        </div>

        <div className="w-full lg:w-72 shrink-0">
          <Select
            aria-label="Lọc theo Part"
            value={selectedPart}
            onChange={(e) => onPartChange(Number(e.target.value))}
            options={parts}
          />
        </div>

        <div className="shrink-0">
          <FilterButtonGroup
            options={tierOptions}
            selectedValue={selectedTier}
            onChange={onTierChange}
          />
        </div>
      </div>
    </div>
  );
}
