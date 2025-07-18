import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterSectionProps {
  genres: any[];
  selectedGenre: string;
  selectedYear: string;
  selectedSort: string;
  onGenreChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

export function FilterSection({
  genres,
  selectedGenre,
  selectedYear,
  selectedSort,
  onGenreChange,
  onYearChange,
  onSortChange
}: FilterSectionProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Genre Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Genre</label>
            <Select value={selectedGenre} onValueChange={onGenreChange}>
              <SelectTrigger className="bg-card/50 border-border/50">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="">All Genres</SelectItem>
                {genres.map((genre) => (
                  <SelectItem key={genre.id} value={genre.id.toString()}>
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Year</label>
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="bg-card/50 border-border/50">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-60">
                <SelectItem value="">All Years</SelectItem>
                {years.slice(0, 30).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Sort By</label>
            <Select value={selectedSort} onValueChange={onSortChange}>
              <SelectTrigger className="bg-card/50 border-border/50">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="popularity.desc">Most Popular</SelectItem>
                <SelectItem value="vote_average.desc">Highest Rated</SelectItem>
                <SelectItem value="release_date.desc">Latest Release</SelectItem>
                <SelectItem value="title.asc">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}