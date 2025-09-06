import { useState } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';

interface NavbarProps {
  onSearch: (query: string) => void;
  searchResults: any[];
  onSelectMovie: (movie: any) => void;
}

export function Navbar({ onSearch, searchResults, onSelectMovie }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
    setShowSearchResults(value.length > 0);
  };

  const handleSelectMovie = (movie: any) => {
    onSelectMovie(movie);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              CLOUDSTREAM
            </h1>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.slice(0, 5).map((movie) => (
                    <div
                      key={movie.id}
                      className="flex items-center p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSelectMovie(movie)}
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded mr-3"
                      />
                      <div>
                        <h4 className="font-medium text-foreground">{movie.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          ⭐ {movie.vote_average?.toFixed(1)} • {movie.release_date?.split('-')[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="#home" className="text-foreground hover:text-primary transition-colors">Home</a>
            <a href="#movies" className="text-foreground hover:text-primary transition-colors">Movies</a>
            <a href="#genres" className="text-foreground hover:text-primary transition-colors">Genres</a>
          </div>

          {/* Mobile Menu Button */}
          <EnhancedButton
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </EnhancedButton>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pb-4 border-t border-border/50">
            <div className="mt-4 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search movies..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                />
              </div>
              
              {/* Mobile Navigation Links */}
              <div className="flex flex-col space-y-2">
                <a href="#home" className="text-foreground hover:text-primary transition-colors py-2">Home</a>
                <a href="#movies" className="text-foreground hover:text-primary transition-colors py-2">Movies</a>
                <a href="#genres" className="text-foreground hover:text-primary transition-colors py-2">Genres</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}