'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LANGUAGES, Language } from '../../lib/i18n/translations';

interface LanguageSwitcherProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export default function LanguageSwitcher({
  variant = 'dark',
  className = '',
}: LanguageSwitcherProps) {
  const { language, setLanguage, currentOption, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isDark = variant === 'dark';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('nav.selectLanguage', {}, 'Select Language')}
        className={`flex items-center space-x-2 px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isDark
            ? 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600 shadow-2xs'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400 shadow-2xs'
        }`}
      >
        <Languages className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <span className="font-semibold tracking-wide">{currentOption.nativeLabel}</span>
        <span
          className={`text-[10px] px-1 py-0.2 rounded font-mono uppercase tracking-wider ${
            isDark
              ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {currentOption.code}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={t('nav.selectLanguage', {}, 'Select Language')}
          className={`absolute right-0 mt-1.5 w-44 rounded-lg shadow-xl border p-1 z-50 animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/50'
              : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/20'
          }`}
        >
          <div
            className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border-b ${
              isDark
                ? 'text-slate-400 border-slate-800'
                : 'text-slate-500 border-slate-100'
            }`}
          >
            {t('nav.language', {}, 'Language')}
          </div>
          <div className="py-1 space-y-0.5">
            {LANGUAGES.map((option) => {
              const isSelected = option.code === language;
              return (
                <button
                  key={option.code}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => {
                    setLanguage(option.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left group ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600/20 text-blue-300 font-semibold'
                        : 'bg-blue-50 text-blue-700 font-semibold'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{option.nativeLabel}</span>
                    {option.nativeLabel !== option.label && (
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({option.label})
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isDark ? 'text-blue-400' : 'text-blue-600'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
