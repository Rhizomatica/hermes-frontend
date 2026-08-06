interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}

export default function SearchInput({ value, onChange, placeholder, autoFocus }: SearchInputProps) {
  return (
    <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <input
        autoFocus={autoFocus}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}
